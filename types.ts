export enum AppState {
  INPUT = 'INPUT',
  DASHBOARD = 'DASHBOARD',
  QUIZ = 'QUIZ'
}

export interface SongPlayData {
  url: string;
  startTime: number;
  duration: number;
  name: string;
  artist: string;
}

export interface SongCandidate {
  songInfo: string;
  songLyric: string;
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
  
  // Current active song info
  songLyric?: string;
  songInfo?: string;
  songData?: SongPlayData | null;
  
  // List of candidates for fallback
  songCandidates?: SongCandidate[];
}

export interface QuizResult {
  wordId: string;
  correct: boolean;
}