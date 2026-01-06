export enum AppState {
  INPUT = 'INPUT',
  DASHBOARD = 'DASHBOARD',
  QUIZ = 'QUIZ'
}

export interface QuoteData {
  english: string;
  chinese: string;
}

export interface WordData {
  id: string;
  word: string;
  definition: string;
  exampleSentence: string;
  partOfSpeech: string;
  correctCount: number;
  lastPracticed?: string;
  imageUrl?: string;
  
  // Replaced song data with a fun quote/joke/proverb object
  quote?: QuoteData; 
}

export interface QuizResult {
  wordId: string;
  correct: boolean;
}

export interface StoredData {
  cycleStart: number;
  words: WordData[];
}