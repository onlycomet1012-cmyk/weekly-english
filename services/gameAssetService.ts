import { SpriteSource } from '../types';

export const AssetTypes = {
  HERO: 'HERO',
  HERO_IDLE: 'HERO_IDLE',
  HERO_DOWN: 'HERO_DOWN',
  HERO_UP: 'HERO_UP',
  HERO_LEFT: 'HERO_LEFT',
  HERO_RIGHT: 'HERO_RIGHT',
  XP: 'XP'
};

export const SPRITESHEET_URL = '/spritesheet.png';

// SVG Data URIs for Hero (2 Frames, 128x64)
const HERO_SVG_IDLE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iNjQiPjxyZWN0IHg9IjE2IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjNjM2NmYxIi8+PGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMyIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjQwIiBjeT0iMjQiIHI9IjMiIGZpbGw9IiNmZmYiLz48cmVjdCB4PSI4MCIgeT0iMTIiIHdpZHRoPSIzMiIgaGVpZ2h0PSI0NCIgcng9IjgiIGZpbGw9IiM2MzY2ZjEiLz48Y2lyY2xlIGN4PSI4OCIgY3k9IjI4IiByPSIzIiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iMTA0IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiNmZmYiLz48L3N2Zz4=";
const HERO_SVG_DOWN = HERO_SVG_IDLE; 
const HERO_SVG_UP = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iNjQiPjxyZWN0IHg9IjE2IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjNDMzOGNhIi8+PHJlY3QgeD0iODAiIHk9IjEyIiB3aWR0aD0iMzIiIGhlaWdodD0iNDQiIHJ4PSI4IiBmaWxsPSIjNDMzOGNhIi8+PC9zdmc+";
const HERO_SVG_LEFT = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iNjQiPjxyZWN0IHg9IjE2IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjNjM2NmYxIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIyNCIgcj0iMyIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjgwIiB5PSIxMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjQ0IiByeD0iOCIgZmlsbD0iIzYzNjZmMSIvPjxjaXJjbGUgY3g9Ijg0IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiNmZmYiLz48L3N2Zz4=";
const HERO_SVG_RIGHT = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgiIGhlaWdodD0iNjQiPjxyZWN0IHg9IjE2IiB5PSI4IiB3aWR0aD0iMzIiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjNjM2NmYxIi8+PGNpcmNsZSBjeD0iNDQiIGN5PSIyNCIgcj0iMyIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjgwIiB5PSIxMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjQ0IiByeD0iOCIgZmlsbD0iIzYzNjZmMSIvPjxjaXJjbGUgY3g9IjEwOCIgY3k9IjI4IiByPSIzIiBmaWxsPSIjZmZmIi8+PC9zdmc+";

// Simple Golden Orb SVG for XP
const XP_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjZmJiZjI0IiBzdHJva2U9IiNmNTllMGIiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==";

const BasicPrompts: Record<string, string> = {
  [AssetTypes.HERO_IDLE]: HERO_SVG_IDLE,
  [AssetTypes.HERO_DOWN]: HERO_SVG_DOWN,
  [AssetTypes.HERO_UP]: HERO_SVG_UP,
  [AssetTypes.HERO_LEFT]: HERO_SVG_LEFT,
  [AssetTypes.HERO_RIGHT]: HERO_SVG_RIGHT,
  [AssetTypes.XP]: XP_SVG, 
};

// Synchronous loader for data URIs
const processAssets = (prompts: Record<string, string>, onAssetLoaded: (key: string, url: string) => void) => {
  const keys = Object.keys(prompts);
  
  for (const key of keys) {
    const prompt = prompts[key];
    // Always load immediately as we now only use data URIs for basic assets
    onAssetLoaded(key, prompt);
  }
};

export const loadBasicAssets = (onAssetLoaded: (key: string, url: string) => void) => {
  processAssets(BasicPrompts, onAssetLoaded);
};

export const loadAdvancedAssets = (onAssetLoaded: (key: string, url: string) => void) => {
  // Deprecated, no-op
};

// ==========================================
// SPRITE SHEET LOGIC
// ==========================================

const TILE_SIZE = 16; 

// Format: { row: number, cols: number[] }
const MOB_ROWS = [
    { row: 0, cols: [0, 1, 2, 3] }, // Goblins
    { row: 2, cols: [0, 1] }, // Slimes
    { row: 3, cols: [0, 1, 2] }, // Skeletons
    { row: 6, cols: [0, 1, 2, 3] }, // Insects
    { row: 7, cols: [0, 1, 2] }, // Wolf/Rat
];

const ELITE_ROWS = [
    { row: 1, cols: [0, 1] }, // Ogres/Trolls
    { row: 5, cols: [0, 1] }, // Wraiths
    { row: 8, cols: [0, 1] }, // Centaur/Minotaur
];

const BOSS_ROWS = [
    { row: 9, cols: [0, 1] }, // Dragons
    { row: 10, cols: [0] }, // Demons
    { row: 11, cols: [0, 1] }, // Tentacles/Eyes
];

const getRandomFromConfig = (config: { row: number, cols: number[] }[]): SpriteSource => {
    const group = config[Math.floor(Math.random() * config.length)];
    const col = group.cols[Math.floor(Math.random() * group.cols.length)];
    
    return {
        x: col * TILE_SIZE,
        y: group.row * TILE_SIZE,
        w: TILE_SIZE,
        h: TILE_SIZE
    };
};

export const getRandomSprite = (type: 'MOB' | 'ELITE' | 'BOSS'): SpriteSource => {
  if (type === 'BOSS') {
    return getRandomFromConfig(BOSS_ROWS);
  } else if (type === 'ELITE') {
    return getRandomFromConfig(ELITE_ROWS);
  } else {
    return getRandomFromConfig(MOB_ROWS);
  }
};