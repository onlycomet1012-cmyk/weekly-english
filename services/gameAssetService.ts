import { SpriteSource } from '../types';

export const AssetTypes = {
  HERO: 'HERO',
  HERO_IDLE: 'HERO_IDLE',
  HERO_DOWN: 'HERO_DOWN',
  HERO_UP: 'HERO_UP',
  HERO_LEFT: 'HERO_LEFT',
  HERO_RIGHT: 'HERO_RIGHT',
  XP: 'XP',
  SNACK: 'SNACK',
  // Bullet Types
  PROJ_NORMAL: 'PROJ_NORMAL',
  PROJ_FIRE: 'PROJ_FIRE',
  PROJ_ICE: 'PROJ_ICE',
  PROJ_LIGHTNING: 'PROJ_LIGHTNING',
  PROJ_WIND: 'PROJ_WIND',
};

// --- HERO ASSET GENERATION (WIZARD STYLE) ---

const WIZARD_ROBE_COLOR = '#4c1d95'; // Deep Violet
const WIZARD_TRIM_COLOR = '#fbbf24'; // Gold
const WIZARD_HAT_COLOR = '#4c1d95';
const SKIN_COLOR = '#fca5a5';

const createHeroSvg = (direction: 'FRONT' | 'BACK' | 'SIDE_LEFT' | 'SIDE_RIGHT'): string => {
  const drawFrame = (offsetX: number, frameIndex: number) => {
    let svg = '';
    const bob = frameIndex === 1 ? 2 : 0; // Bobbing effect
    
    // Coordinates adjusted for 64x64 frame (drawing on roughly 16x16 grid scaled x4)
    // Center X approx 32.
    
    // --- SHADOW ---
    svg += `<ellipse cx="${32 + offsetX}" cy="${56}" rx="14" ry="4" fill="rgba(0,0,0,0.3)" />`;

    // --- STAFF (Behind or Front depending on hand) ---
    // Draw staff first if it's behind (usually side views or idle)
    const drawStaff = (x: number, y: number) => `
        <rect x="${x}" y="${y}" width="4" height="36" fill="#78350f" rx="1"/>
        <circle cx="${x+2}" cy="${y}" r="4" fill="#ef4444" /> 
        <circle cx="${x+2}" cy="${y}" r="2" fill="#fca5a5" />
    `;
    
    if (direction === 'SIDE_RIGHT') {
         svg += drawStaff(40 + offsetX, 16 + bob);
    }

    // --- ROBE BODY ---
    if (direction === 'FRONT' || direction === 'BACK') {
        // Main Robe
        svg += `<path d="M${20+offsetX} ${30+bob} L${16+offsetX} ${52+bob} Q${32+offsetX} ${56+bob} ${48+offsetX} ${52+bob} L${44+offsetX} ${30+bob} Z" fill="${WIZARD_ROBE_COLOR}" />`;
        // Gold Trim center
        if (direction === 'FRONT') {
             svg += `<rect x="${30+offsetX}" y="${30+bob}" width="4" height="24" fill="${WIZARD_TRIM_COLOR}" />`;
        }
    } else {
        // Side Robe
        svg += `<path d="M${24+offsetX} ${30+bob} L${20+offsetX} ${52+bob} L${44+offsetX} ${52+bob} L${40+offsetX} ${30+bob} Z" fill="${WIZARD_ROBE_COLOR}" />`;
    }

    // --- HEAD / FACE ---
    if (direction !== 'BACK') {
        // Face
        svg += `<rect x="${24+offsetX}" y="${18+bob}" width="16" height="14" rx="4" fill="${SKIN_COLOR}" />`;
        
        if (direction === 'FRONT') {
            // Eyes
            svg += `<rect x="${27+offsetX}" y="${22+bob}" width="2" height="4" fill="#000" />`;
            svg += `<rect x="${35+offsetX}" y="${22+bob}" width="2" height="4" fill="#000" />`;
            // Beard/Goatee
            svg += `<path d="M${28+offsetX} ${30+bob} L${32+offsetX} ${34+bob} L${36+offsetX} ${30+bob} Z" fill="#fff" />`;
        } else {
             // Side Eye
             const eyeX = direction === 'SIDE_LEFT' ? 24 : 36;
             svg += `<rect x="${eyeX+offsetX}" y="${22+bob}" width="2" height="4" fill="#000" />`;
             // Side Beard
             const beardX = direction === 'SIDE_LEFT' ? 24 : 36;
             svg += `<rect x="${beardX+offsetX}" y="${30+bob}" width="4" height="4" fill="#fff" />`;
        }
    } else {
        // Back of head (hair/hood base)
        svg += `<rect x="${24+offsetX}" y="${18+bob}" width="16" height="14" rx="4" fill="${WIZARD_ROBE_COLOR}" />`;
    }

    // --- HAT ---
    // Brim
    svg += `<ellipse cx="${32+offsetX}" cy="${18+bob}" rx="16" ry="4" fill="${WIZARD_HAT_COLOR}" stroke="${WIZARD_TRIM_COLOR}" stroke-width="2"/>`;
    // Cone
    const tipX = direction === 'SIDE_LEFT' ? 24 : (direction === 'SIDE_RIGHT' ? 40 : 32);
    svg += `<path d="M${22+offsetX} ${18+bob} L${42+offsetX} ${18+bob} L${tipX+offsetX} ${2+bob} Z" fill="${WIZARD_HAT_COLOR}" />`;

    // --- STAFF (Front) ---
    if (direction === 'FRONT') {
         svg += drawStaff(46 + offsetX, 20 + bob);
    }
    if (direction === 'SIDE_LEFT') {
         svg += drawStaff(20 + offsetX, 16 + bob);
    }

    // --- HANDS ---
    if (direction === 'FRONT') {
        svg += `<circle cx="${20+offsetX}" cy="${36+bob}" r="4" fill="${SKIN_COLOR}" />`; // Right hand (our left)
        svg += `<circle cx="${48+offsetX}" cy="${36+bob}" r="4" fill="${SKIN_COLOR}" />`; // Staff hand
    }

    return svg;
  };

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="64" viewBox="0 0 128 64">
      ${drawFrame(0, 0)}
      ${drawFrame(64, 1)}
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent.trim())}`;
};

const HERO_SVG_IDLE = createHeroSvg('FRONT');
const HERO_SVG_DOWN = createHeroSvg('FRONT');
const HERO_SVG_UP = createHeroSvg('BACK');
const HERO_SVG_LEFT = createHeroSvg('SIDE_LEFT');
const HERO_SVG_RIGHT = createHeroSvg('SIDE_RIGHT');

// --- SAPPHIRE XP GEM ---
const XP_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e3a8a;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Shadow -->
  <ellipse cx="12" cy="22" rx="6" ry="2" fill="rgba(0,0,0,0.3)" />
  <!-- Gem Shape (Octagon-ish) -->
  <path d="M8 2 L16 2 L22 8 L22 16 L16 22 L8 22 L2 16 L2 8 Z" fill="url(#gemGrad)" stroke="#93c5fd" stroke-width="1" />
  <!-- Inner Facet -->
  <path d="M8 8 L16 8 L16 16 L8 16 Z" fill="rgba(255,255,255,0.2)" />
  <!-- Shine -->
  <path d="M8 2 L4 6" stroke="white" stroke-width="2" opacity="0.6" />
</svg>
`.trim())}`;

// --- SNACK (Burger) ---
const SNACK_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect x="4" y="20" width="24" height="6" rx="2" fill="#d97706"/>
  <rect x="2" y="14" width="28" height="6" rx="2" fill="#78350f"/>
  <path d="M4 14 Q16 2 28 14" fill="#fbbf24"/>
  <circle cx="10" cy="8" r="1" fill="#fde68a"/>
  <circle cx="16" cy="6" r="1" fill="#fde68a"/>
  <circle cx="22" cy="8" r="1" fill="#fde68a"/>
</svg>
`.trim())}`;

// --- BULLETS ---

// 1. Normal (Magic Missile)
const PROJ_NORMAL_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:0" />
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="12" fill="url(#grad1)" />
  <circle cx="16" cy="16" r="6" fill="#fbbf24" />
</svg>
`.trim())}`;

// 2. Fire (Fireball)
const PROJ_FIRE_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Flame Shape, rotated to point right by default -->
  <path d="M4 16 Q16 0 28 16 Q16 32 4 16 Z" fill="#ef4444" />
  <path d="M8 16 Q16 6 24 16 Q16 26 8 16 Z" fill="#fca5a5" />
</svg>
`.trim())}`;

// 3. Ice (Shard)
const PROJ_ICE_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Diamond Shard -->
  <path d="M2 16 L16 2 L30 16 L16 30 Z" fill="#0ea5e9" stroke="#e0f2fe" stroke-width="2"/>
  <path d="M16 8 L24 16 L16 24 L8 16 Z" fill="#bae6fd" />
</svg>
`.trim())}`;

// 4. Lightning (Ball/Spark)
const PROJ_LIGHTNING_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
   <circle cx="16" cy="16" r="14" fill="rgba(59, 130, 246, 0.3)" />
   <path d="M18 2 L10 16 L16 16 L14 30 L22 16 L16 16 Z" fill="#facc15" stroke="white" stroke-width="1"/>
</svg>
`.trim())}`;

// 5. Wind (Swirl)
const PROJ_WIND_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path d="M16 16 m -10, 0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0" fill="none" stroke="#a7f3d0" stroke-width="3" stroke-dasharray="10 5" opacity="0.8">
    <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="0.5s" repeatCount="indefinite"/>
  </path>
  <circle cx="16" cy="16" r="6" fill="#d1fae5" />
</svg>
`.trim())}`;

const BasicPrompts: Record<string, string> = {
  [AssetTypes.HERO_IDLE]: HERO_SVG_IDLE,
  [AssetTypes.HERO_DOWN]: HERO_SVG_DOWN,
  [AssetTypes.HERO_UP]: HERO_SVG_UP,
  [AssetTypes.HERO_LEFT]: HERO_SVG_LEFT,
  [AssetTypes.HERO_RIGHT]: HERO_SVG_RIGHT,
  [AssetTypes.XP]: XP_SVG, 
  [AssetTypes.SNACK]: SNACK_SVG,
  
  [AssetTypes.PROJ_NORMAL]: PROJ_NORMAL_SVG,
  [AssetTypes.PROJ_FIRE]: PROJ_FIRE_SVG,
  [AssetTypes.PROJ_ICE]: PROJ_ICE_SVG,
  [AssetTypes.PROJ_LIGHTNING]: PROJ_LIGHTNING_SVG,
  [AssetTypes.PROJ_WIND]: PROJ_WIND_SVG,
};

// Synchronous loader for data URIs
const processAssets = (prompts: Record<string, string>, onAssetLoaded: (key: string, url: string) => void) => {
  const keys = Object.keys(prompts);
  
  for (const key of keys) {
    const prompt = prompts[key];
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
// SPRITE SHEET LOGIC (PROCEDURAL GENERATION)
// ==========================================

const TILE_SIZE = 16; 

// Format: { row: number, cols: number[] }
const MOB_ROWS = [
    { row: 0, cols: [0, 1, 2, 3] }, // Green Goblins (Basic)
    { row: 2, cols: [0, 1] }, // Blue Slimes (Round)
    { row: 3, cols: [0, 1, 2] }, // Grey Skeletons (Tall)
    { row: 6, cols: [0, 1, 2, 3] }, // Purple Insects (Winged)
    { row: 7, cols: [0, 1, 2] }, // Brown Beasts (Wide)
];

const ELITE_ROWS = [
    { row: 1, cols: [0, 1] }, // Red Ogres (Big)
    { row: 5, cols: [0, 1] }, // Teal Wraiths (Ghostly)
];

const BOSS_ROWS = [
    { row: 9, cols: [0] }, // Big Slime
];

// Dynamically generate a pixel art sprite sheet so the user doesn't need to upload one
export const generateProceduralSpriteSheet = (): string => {
  const canvas = document.createElement('canvas');
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  type ShapeType = 'BASIC' | 'SLIME' | 'SKELETON' | 'BAT' | 'GHOST' | 'BEAST' | 'OGRE';

  // Helper to draw a pixel mob with different shapes
  const drawMob = (row: number, col: number, color: string, eyes: string = 'white', shape: ShapeType = 'BASIC') => {
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      
      ctx.fillStyle = color;

      if (shape === 'SLIME') {
        // Round bottom, smaller top
        ctx.fillRect(x + 3, y + 4, 10, 10);
        ctx.fillRect(x + 2, y + 8, 12, 6);
      } 
      else if (shape === 'SKELETON') {
        // Tall and thin, ribbed
        ctx.fillRect(x + 5, y + 2, 6, 13); // Spine
        ctx.fillRect(x + 4, y + 4, 8, 2); // Ribs
        ctx.fillRect(x + 4, y + 7, 8, 2);
        ctx.fillRect(x + 5, y + 2, 6, 4); // Skull
      }
      else if (shape === 'BAT') {
        // Wings
        ctx.fillRect(x + 6, y + 5, 4, 8); // Body
        ctx.fillStyle = color; // Wings same color or darker
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 7); ctx.lineTo(x + 1, y + 4); ctx.lineTo(x + 6, y + 10);
        ctx.moveTo(x + 10, y + 7); ctx.lineTo(x + 15, y + 4); ctx.lineTo(x + 10, y + 10);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
      else if (shape === 'GHOST') {
        // Round top, jagged bottom
        ctx.fillRect(x + 3, y + 2, 10, 10);
        ctx.fillRect(x + 3, y + 12, 2, 3);
        ctx.fillRect(x + 7, y + 12, 2, 3);
        ctx.fillRect(x + 11, y + 12, 2, 3);
      }
      else if (shape === 'OGRE') {
         // Big and bulky
         ctx.fillRect(x + 2, y + 2, 12, 13);
         ctx.fillRect(x + 1, y + 4, 14, 6); // Shoulders
      }
      else if (shape === 'BEAST') {
         // Wide, quadraped
         ctx.fillRect(x + 2, y + 6, 12, 8);
         ctx.fillRect(x + 1, y + 5, 4, 4); // Head
         ctx.fillRect(x + 2, y + 14, 2, 2); // Legs
         ctx.fillRect(x + 12, y + 14, 2, 2);
      }
      else {
        // BASIC box
        ctx.fillRect(x + 2, y + 2, 12, 12);
        // Detail/Shading
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 2, y + 10, 12, 4);
      }

      // Eyes
      ctx.fillStyle = eyes;
      if (shape === 'SLIME') {
        ctx.fillRect(x + 5, y + 6, 2, 2);
        ctx.fillRect(x + 9, y + 6, 2, 2);
      } else if (shape === 'SKELETON') {
        ctx.fillRect(x + 6, y + 3, 1, 1);
        ctx.fillRect(x + 9, y + 3, 1, 1);
      } else {
        ctx.fillRect(x + 4, y + 5, 2, 2);
        ctx.fillRect(x + 9, y + 5, 2, 2);
        // Pupils
        ctx.fillStyle = 'black';
        ctx.fillRect(x + 5, y + 5, 1, 1);
        ctx.fillRect(x + 10, y + 5, 1, 1);
      }
  };

  // 1. Goblins (Row 0) - Green - BASIC
  [0,1,2,3].forEach(c => drawMob(0, c, '#4ade80', 'white', 'BASIC'));

  // 2. Ogres (Row 1) - Red/Elite - OGRE
  [0,1].forEach(c => drawMob(1, c, '#f87171', '#fecaca', 'OGRE'));

  // 3. Slimes (Row 2) - Blue - SLIME
  [0,1].forEach(c => drawMob(2, c, '#60a5fa', 'white', 'SLIME'));

  // 4. Skeletons (Row 3) - Gray - SKELETON
  [0,1,2].forEach(c => drawMob(3, c, '#cbd5e1', '#0f172a', 'SKELETON'));

  // 5. Wraiths (Row 5) - Teal/Elite - GHOST
  [0,1].forEach(c => drawMob(5, c, '#2dd4bf', '#ccfbf1', 'GHOST'));

  // 6. Insects (Row 6) - Purple - BAT/WINGED
  [0,1,2,3].forEach(c => drawMob(6, c, '#a78bfa', 'red', 'BAT'));
  
  // 7. Beasts (Row 7) - Orange/Brown - BEAST
  [0,1,2].forEach(c => drawMob(7, c, '#fb923c', 'yellow', 'BEAST'));

  // 8. BOSS (Row 9) - Big Green Slime (King Slime)
  const drawBoss = () => {
      const x = 0; 
      const y = 9 * TILE_SIZE;
      
      // Slime Body (Green)
      ctx.fillStyle = '#22c55e'; // Green 500
      ctx.beginPath();
      // Draw a blob shape
      ctx.moveTo(x + 4, y + 28);
      ctx.bezierCurveTo(x + 4, y + 4, x + 28, y + 4, x + 28, y + 28);
      ctx.lineTo(x + 4, y + 28);
      ctx.fill();

      // Highlight
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 12, 3, 2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(x + 10, y + 18, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 22, y + 18, 3, 0, Math.PI*2); ctx.fill();
      
      ctx.fillStyle = 'black';
      ctx.beginPath(); ctx.arc(x + 10, y + 18, 1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 22, y + 18, 1, 0, Math.PI*2); ctx.fill();

      // Crown
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 6);
      ctx.lineTo(x + 14, y + 9);
      ctx.lineTo(x + 16, y + 5);
      ctx.lineTo(x + 18, y + 9);
      ctx.lineTo(x + 20, y + 6);
      ctx.lineTo(x + 20, y + 10);
      ctx.lineTo(x + 12, y + 10);
      ctx.fill();
  }
  drawBoss();

  return canvas.toDataURL();
};

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
    return { x: 0, y: 9 * TILE_SIZE, w: 32, h: 32 };
  } else if (type === 'ELITE') {
    return getRandomFromConfig(ELITE_ROWS);
  } else {
    return getRandomFromConfig(MOB_ROWS);
  }
};