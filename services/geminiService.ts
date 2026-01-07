import { GoogleGenAI } from "@google/genai";
import { WordData } from '../types';

// Access the API key injected by Vite at build time
const API_KEY = process.env.API_KEY;

// Initialize lazily and safely
const getAi = () => {
  if (!API_KEY) {
    throw new Error("API Key 未配置。请在 Vercel 环境变量中添加 API_KEY 并重新部署 (Redeploy)。");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

// ==========================================
// UTILS
// ==========================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// IMAGE GENERATION
// ==========================================

export const generateWordImage = async (word: string): Promise<string | null> => {
  // We use Pollinations.ai for reliable, storage-friendly (URL only), and lightweight image generation.
  // Gemini base64 images often exceed LocalStorage quotas on mobile devices, causing data loss.
  await delay(200); 
  
  try {
    const seed = Math.floor(Math.random() * 10000);
    const safeWord = encodeURIComponent(word);
    return `https://image.pollinations.ai/prompt/minimalist%20vector%20illustration%20of%20${safeWord}%20icon%20simple%20clean%20white%20background?nologo=true&seed=${seed}&width=300&height=300`;
  } catch (e) {
    console.warn("Image URL generation failed", e);
    return null;
  }
};

// Use Gemini 2.5 Flash Image (Banana) for Game Sprites
export const generateGameAsset = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        // Updated prompt: Request transparent background for sprites
        parts: [{ text: prompt + ", pixel art style, transparent background, isolated, single character, high contrast, video game asset sprite, full body, no background" }]
      },
      // Configs like aspectRatio are optional, 1:1 is default which is good for sprites
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Game asset generation failed", e);
    return null;
  }
};

// ==========================================
// DATA FETCHING
// ==========================================

export const fetchMediaForWord = async (word: WordData): Promise<WordData> => {
  const updatedWord = { ...word };
  let hasChanges = false;

  if (!updatedWord.imageUrl) {
      const imageUrl = await generateWordImage(updatedWord.word);
      if (imageUrl) {
          updatedWord.imageUrl = imageUrl;
          hasChanges = true;
      }
  }

  return hasChanges ? updatedWord : word;
};

// ==========================================
// STREAMING VOCABULARY
// ==========================================

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
      "definition": "string (Precise and comprehensive Simplified Chinese definition. If the word has multiple distinct meanings or parts of speech, separate them with '; '. Example: 'n. 银行; v. 堆积'. Avoid ambiguous single characters.)",
      "partOfSpeech": "string (e.g. noun, verb)",
      "exampleSentence": "string (English sentence with the word replaced by '_______'. The sentence must clearly demonstrate the word's meaning context.)",
      "quote": {
        "english": "string (A short, witty joke OR a common proverb/idiom that uses this word. Must be under 25 words.)",
        "chinese": "string (Translation of the quote in Chinese)"
      }
    }

    INSTRUCTIONS FOR 'definition':
    - Be specific. Instead of "跑" for "Run", use "v. 奔跑；经营；运行".
    - Avoid machine-translation style. Use natural language suitable for a learner.

    INSTRUCTIONS FOR 'quote':
    - It must be fun or insightful.
    - If the word is common, use a famous proverb.
    - If the word is obscure, use a short, clean joke.
    - The word itself MUST appear in the English quote.
  `;

  try {
    const ai = getAi();
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

  } catch (error: any) {
    console.error("Gemini Streaming Error:", error);
    if (error.message && (error.message.includes('API Key') || error.message.includes('API key'))) {
        throw error;
    }
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
        let quoteObj = undefined;
        if (item.quote) {
          if (typeof item.quote === 'string') {
             quoteObj = { english: item.quote, chinese: '' };
          } else {
             quoteObj = item.quote;
          }
        }

        const wordData: WordData = {
          id: crypto.randomUUID(),
          word: item.word.toLowerCase().trim(),
          definition: item.definition,
          exampleSentence: item.exampleSentence || "No example available.",
          partOfSpeech: item.partOfSpeech || "",
          quote: quoteObj, 
          
          correctCount: 0,
          imageUrl: undefined,
        };
        callback(wordData);
    }
  } catch (e) {
    // Ignore invalid lines
  }
};