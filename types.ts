
export enum AppState {
  INPUT = 'INPUT',
  GAME = 'GAME'
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

// GAME SPECIFIC TYPES
export interface PlayerStats {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackSpeed: number; // Cooldown in frames
  projectileSpeed: number;
  pickupRange: number;
  projectileCount: number; // New: Number of bullets per shot
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface SpriteSource {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'HERO' | 'MOB' | 'ELITE' | 'ELITE_RANGED' | 'BOSS' | 'XP' | 'PROJECTILE' | 'ENEMY_PROJECTILE';
  subtype?: number; // For different mob skins
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  damage: number;
  spriteUrl?: string;
  spriteSource?: SpriteSource; // New: Coordinates on the sprite sheet
  angle?: number; // For rotation
  // Animation Fields
  direction?: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  animFrame?: number;
  lastAnimTime?: number;
  isMoving?: boolean;
}

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  apply: (stats: PlayerStats) => PlayerStats;
  icon: string;
}