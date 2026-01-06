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
// CONCURRENCY CONTROL & UTILS
// ==========================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class RequestQueue {
  private queue: (() => Promise<void>)[] = [];
  private working = 0;
  private limit: number;
  private timeBetweenRequests: number;

  constructor(concurrencyLimit: number, delayMs: number) {
    this.limit = concurrencyLimit;
    this.timeBetweenRequests = delayMs;
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.working >= this.limit || this.queue.length === 0) return;

    this.working++;
    const task = this.queue.shift();

    if (task) {
      await task();
      if (this.queue.length > 0) {
        await delay(this.timeBetweenRequests);
      }
    }

    this.working--;
    this.process();
  }
}

// Reduced delay to 800ms to speed up loading while staying safe
const imageGenerationQueue = new RequestQueue(1, 800);

// ==========================================
// IMAGE GENERATION
// ==========================================

const callGeminiImage = async (prompt: string, attempt = 1): Promise<string | null> => {
  try {
    const response = await getAi().models.generateContent({
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
    return null;
  } catch (error: any) {
    // If API key is missing, fail fast
    if (error.message && error.message.includes('API Key')) throw error;

    const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
    const isServerOverload = error.status === 503;

    if ((isRateLimit || isServerOverload) && attempt <= 3) {
      const waitTime = 2000 * Math.pow(2, attempt - 1);
      console.warn(`Gemini 429/503 hit. Retrying in ${waitTime}ms (Attempt ${attempt})...`);
      await delay(waitTime);
      return callGeminiImage(prompt, attempt + 1);
    }
    
    throw error;
  }
};

export const generateWordImage = async (word: string): Promise<string | null> => {
  return imageGenerationQueue.enqueue(async () => {
    try {
      const prompt = `Minimalist vector icon for "${word}", white background, flat design, single object, colorful.`;
      const image = await callGeminiImage(prompt);
      if (image) return image;
    } catch (error) {
      console.warn(`Gemini Image Generation exhausted for ${word}, switching to fallback.`);
    }

    await delay(500);
    try {
      const seed = Math.floor(Math.random() * 10000);
      const safeWord = encodeURIComponent(word);
      return `https://image.pollinations.ai/prompt/minimalist%20flat%20vector%20icon%20${safeWord}%20white%20background?nologo=true&seed=${seed}&width=512&height=512`;
    } catch (e) {
      return null;
    }
  });
};

// ==========================================
// MEDIA & DATA FETCHING
// ==========================================

export const fetchMediaForWord = async (word: WordData): Promise<WordData> => {
  const updatedWord = { ...word };
  let hasChanges = false;

  // Only generate Image now. No more music fetching.
  if (!updatedWord.imageUrl) {
      const imageUrl = await generateWordImage(updatedWord.word);
      if (imageUrl) {
          updatedWord.imageUrl = imageUrl;
          hasChanges = true;
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
      "quote": {
        "english": "string (A short, witty joke OR a common proverb/idiom that uses this word. Must be under 25 words.)",
        "chinese": "string (Translation of the quote in Chinese)"
      }
    }

    INSTRUCTIONS FOR 'quote':
    - It must be fun or insightful.
    - If the word is common, use a famous proverb.
    - If the word is obscure, use a short, clean joke.
    - The word itself MUST appear in the English quote.
  `;

  try {
    const ai = getAi(); // Use the safe getter
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
    // Propagate the specific API Key error if present
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
        // Handle legacy string format if necessary, though we prefer object now
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