import { GoogleGenAI } from "@google/genai";
import { WordData } from '../types';
import { getSongSegment } from './musicService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Image generation with robust fallback
export const generateWordImage = async (word: string): Promise<string | null> => {
  // 1. Try Gemini
  try {
    const prompt = `Minimalist vector icon for "${word}", white background, flat design, single object, colorful.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      }
    });

    if (response.candidates && response.candidates.length > 0) {
       for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
             return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
       }
    }
  } catch (error) {
    console.warn(`Gemini Image Generation failed for ${word}, trying fallback...`);
  }

  // 2. Fallback to Pollinations AI (Free, fast, reliable)
  try {
      const seed = Math.floor(Math.random() * 10000);
      const safeWord = encodeURIComponent(word);
      return `https://image.pollinations.ai/prompt/minimalist%20flat%20vector%20icon%20${safeWord}%20white%20background?nologo=true&seed=${seed}&width=512&height=512`;
  } catch (e) {
      return null;
  }
};

// Helper to fetch media for a single word independently
export const fetchMediaForWord = async (word: WordData): Promise<WordData> => {
  const updatedWord = { ...word };
  let hasChanges = false;

  // A. Generate Image
  if (!updatedWord.imageUrl) {
      const imageUrl = await generateWordImage(updatedWord.word);
      if (imageUrl) {
          updatedWord.imageUrl = imageUrl;
          hasChanges = true;
      }
  }

  // B. Match Music
  if (updatedWord.songCandidates && updatedWord.songCandidates.length > 0 && !updatedWord.songData) {
      // Try candidates strictly in order.
      for (const candidate of updatedWord.songCandidates) {
          try {
              const songData = await getSongSegment(candidate.songInfo, updatedWord.word);
              if (songData) {
                  updatedWord.songData = songData;
                  updatedWord.songInfo = candidate.songInfo;
                  hasChanges = true;
                  break; 
              }
          } catch (e) {
              console.warn(`Error fetching music for candidate (${candidate.songInfo})`, e);
          }
      }
  }

  return hasChanges ? updatedWord : word;
};

// STREAMING Implementation
export const streamVocabularyEnrichment = async (
  words: string[],
  onWordReceived: (word: WordData) => void
): Promise<void> => {
  if (words.length === 0) return;

  const prompt = `
    I have a list of English vocabulary words: ${words.join(', ')}.
    
    For EACH word, generate a JSON object.
    
    IMPORTANT FORMATTING RULES:
    1. Output strictly **NDJSON** (Newline Delimited JSON). 
    2. Write ONE valid JSON object per line.
    3. Do NOT wrap the output in [ ] or a list.
    
    Schema for each object:
    {
      "word": "string (lowercase)",
      "definition": "string (Concise Simplified Chinese definition)",
      "partOfSpeech": "string (e.g. noun, verb)",
      "exampleSentence": "string (English sentence with the word replaced by '_______')",
      "songCandidates": [
          { 
            "songInfo": "string (Artist - Song Name)", 
            "songLyric": "string (The specific line containing the word)"
          }
      ]
    }

    CRITICAL INSTRUCTION FOR SONGS:
    - Provide **3 distinct song candidates** for each word.
    - **CRUCIAL**: The target word MUST be clearly audible in the lyric line you provide.
    - **Selection**: Choose POPULAR, GLOBAL HITS (Pop, Rock, Disney, Country) that are likely to be in standard music databases.
    - Format songInfo as "Song Name - Artist Name".
  `;

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    let buffer = '';

    for await (const chunk of response) {
      const text = chunk.text;
      if (!text) continue;
      
      buffer += text;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        processLine(line, onWordReceived);
      }
    }

    if (buffer.trim()) {
      processLine(buffer, onWordReceived);
    }

  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    throw new Error("生成流中断，请重试。");
  }
};

const processLine = (line: string, callback: (word: WordData) => void) => {
  const cleanLine = line.trim();
  if (!cleanLine) return;

  let jsonString = cleanLine
    .replace(/^```json/, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .replace(/^\[/, '') 
    .replace(/,$/, '')  
    .replace(/\]$/, '');

  try {
    const item = JSON.parse(jsonString);
    
    if (item.word && item.definition) {
        const primaryCandidate = item.songCandidates?.[0];
        
        const wordData: WordData = {
          id: crypto.randomUUID(),
          word: item.word.toLowerCase().trim(),
          definition: item.definition,
          exampleSentence: item.exampleSentence || "No example available.",
          partOfSpeech: item.partOfSpeech || "",
          
          songLyric: primaryCandidate?.songLyric,
          songInfo: primaryCandidate?.songInfo,
          
          songCandidates: item.songCandidates || [],
          
          correctCount: 0,
          imageUrl: undefined,
          songData: null
        };
        callback(wordData);
    }
  } catch (e) {
    // Ignore invalid lines
  }
};