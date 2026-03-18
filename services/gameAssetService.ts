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
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="gemGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gemCore" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#bfdbfe"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="28" fill="url(#gemGlow)" />
  <path d="M 32 8 L 48 24 L 32 56 L 16 24 Z" fill="url(#gemCore)" stroke="#eff6ff" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 32 8 L 48 24 L 32 36 Z" fill="#93c5fd" opacity="0.6"/>
  <path d="M 32 8 L 16 24 L 32 36 Z" fill="#eff6ff" opacity="0.8"/>
  <polygon points="28,16 36,16 32,24" fill="#ffffff" opacity="0.9"/>
</svg>
`.trim())}`;

// --- SNACK (Burger) ---
const SNACK_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="burgerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fcd34d" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#b45309" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#burgerGlow)" />
  <!-- Bottom Bun -->
  <path d="M 12 44 Q 32 52 52 44 L 50 48 Q 32 56 14 48 Z" fill="#b45309" />
  <path d="M 12 40 Q 32 48 52 40 L 52 44 Q 32 52 12 44 Z" fill="#f59e0b" />
  <!-- Meat -->
  <rect x="10" y="32" width="44" height="8" rx="4" fill="#451a03" />
  <rect x="10" y="34" width="44" height="4" rx="2" fill="#78350f" />
  <!-- Cheese -->
  <path d="M 12 32 L 20 38 L 28 32 L 36 38 L 44 32 L 52 36 L 52 30 L 12 30 Z" fill="#fbbf24" />
  <!-- Lettuce -->
  <path d="M 8 28 Q 16 22 24 28 T 40 28 T 56 28 L 54 32 Q 40 26 24 32 T 10 32 Z" fill="#4ade80" />
  <!-- Top Bun -->
  <path d="M 10 26 Q 32 4 54 26 Q 32 32 10 26 Z" fill="#f59e0b" />
  <path d="M 14 24 Q 32 10 50 24 Q 32 28 14 24 Z" fill="#fbbf24" />
  <!-- Seeds -->
  <ellipse cx="24" cy="18" rx="2" ry="1" fill="#fef3c7" transform="rotate(-20 24 18)" />
  <ellipse cx="32" cy="14" rx="2" ry="1" fill="#fef3c7" />
  <ellipse cx="40" cy="18" rx="2" ry="1" fill="#fef3c7" transform="rotate(20 40 18)" />
  <ellipse cx="20" cy="24" rx="2" ry="1" fill="#fef3c7" transform="rotate(-40 20 24)" />
  <ellipse cx="44" cy="24" rx="2" ry="1" fill="#fef3c7" transform="rotate(40 44 24)" />
</svg>
`.trim())}`;

// --- BULLETS ---

// 1. Normal (Magic Missile)
const PROJ_NORMAL_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="normGrad" cx="60%" cy="50%" r="40%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="30%" stop-color="#fcd34d" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#d97706" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="normTail" x1="0%" y1="50%" x2="100%" y2="50%">
      <stop offset="0%" stop-color="#d97706" stop-opacity="0"/>
      <stop offset="100%" stop-color="#fcd34d" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <path d="M 4 32 Q 24 22 44 32 Q 24 42 4 32 Z" fill="url(#normTail)" />
  <circle cx="44" cy="32" r="14" fill="url(#normGrad)" />
  <circle cx="44" cy="32" r="6" fill="#ffffff" />
  <polygon points="44,22 47,29 54,32 47,35 44,42 41,35 34,32 41,29" fill="#ffffff" opacity="0.8"/>
</svg>
`.trim())}`;

// 2. Fire (Fireball)
const PROJ_FIRE_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="fireGrad" cx="60%" cy="50%" r="40%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="20%" stop-color="#fef08a"/>
      <stop offset="60%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <path d="M 8 32 Q 24 12 48 24 Q 60 32 48 40 Q 24 52 8 32 Z" fill="#ea580c" opacity="0.6" />
  <path d="M 16 32 Q 32 18 52 28 Q 58 32 52 36 Q 32 46 16 32 Z" fill="#ef4444" />
  <path d="M 24 32 Q 40 24 54 30 Q 56 32 54 34 Q 40 40 24 32 Z" fill="#fef08a" />
  <circle cx="48" cy="32" r="16" fill="url(#fireGrad)" />
</svg>
`.trim())}`;

// 3. Ice (Shard)
const PROJ_ICE_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <path d="M 8 32 L 32 12 L 60 32 L 32 52 Z" fill="#bae6fd" opacity="0.3" />
  <path d="M 12 32 L 36 16 L 56 32 L 36 48 Z" fill="url(#iceGrad)" stroke="#e0f2fe" stroke-width="1.5"/>
  <path d="M 20 32 L 36 22 L 50 32 L 36 42 Z" fill="#e0f2fe" opacity="0.8"/>
  <path d="M 36 22 L 50 32 L 36 42 Z" fill="#ffffff" opacity="0.9"/>
  <polygon points="8,24 16,20 20,24 16,28" fill="#7dd3fc" opacity="0.7"/>
  <polygon points="12,42 20,38 24,42 20,46" fill="#7dd3fc" opacity="0.7"/>
</svg>
`.trim())}`;

// 4. Lightning (Ball/Spark)
const PROJ_LIGHTNING_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="elecGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="40%" stop-color="#60a5fa" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="28" fill="url(#elecGrad)" />
  <path d="M 12 32 L 24 16 L 32 28 L 48 12 L 40 32 L 56 40 L 36 36 L 24 52 Z" fill="none" stroke="#bfdbfe" stroke-width="2" opacity="0.8"/>
  <path d="M 16 32 L 28 20 L 36 32 L 52 16 L 44 36 L 60 44 L 40 40 L 28 56 Z" fill="none" stroke="#60a5fa" stroke-width="1" opacity="0.5"/>
  <path d="M 8 32 L 28 24 L 32 32 L 56 24 L 36 40 L 32 32 Z" fill="#ffffff" />
</svg>
`.trim())}`;

// 5. Wind (Swirl)
const PROJ_WIND_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="windGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#6ee7b7" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#059669" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="24" fill="url(#windGrad)" />
  <path d="M 16 32 C 16 16, 48 16, 48 32 C 48 48, 16 48, 16 32" fill="none" stroke="#a7f3d0" stroke-width="4" stroke-linecap="round" stroke-dasharray="20 10" opacity="0.9" />
  <path d="M 24 32 C 24 24, 40 24, 40 32 C 40 40, 24 40, 24 32" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-dasharray="10 5" />
  <path d="M 4 24 Q 16 24 24 32" fill="none" stroke="#6ee7b7" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
  <path d="M 4 40 Q 16 40 24 32" fill="none" stroke="#6ee7b7" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
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

const TILE_SIZE = 64; 

// Format: { row: number, cols: number[] }
const MOB_ROWS = [
    { row: 0, cols: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { row: 1, cols: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { row: 2, cols: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
];

const ELITE_ROWS = [
    { row: 3, cols: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
];

// Dynamically generate a high-quality vector-style sprite sheet
export const generateProceduralSpriteSheet = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512; 
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const drawShape = (x: number, y: number, size: number, shapeIdx: number, color1: string, color2: string, isElite: boolean) => {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    
    if (isElite) ctx.scale(1.2, 1.2);
    
    const s = size * 0.35; 
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, s * 1.1, s * 0.8, s * 0.2, 0, 0, Math.PI*2); ctx.fill();

    // Gradient
    const grad = ctx.createRadialGradient(0, -s*0.2, 0, 0, 0, s);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.strokeStyle = color2;
    ctx.lineWidth = 2;

    ctx.beginPath();
    switch(shapeIdx) {
      case 0: // Slime
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s, -s, s*1.2, s*0.8, s, s);
        ctx.bezierCurveTo(s*0.5, s*1.1, -s*0.5, s*1.1, -s, s);
        ctx.bezierCurveTo(-s*1.2, s*0.8, -s, -s, 0, -s);
        break;
      case 1: // Bat
        ctx.ellipse(0, 0, s*0.6, s*0.8, 0, 0, Math.PI*2);
        ctx.fill(); ctx.beginPath();
        ctx.moveTo(-s*0.5, 0); ctx.quadraticCurveTo(-s*1.5, -s, -s*2, -s*0.5); ctx.quadraticCurveTo(-s*1.5, s, -s*0.5, s*0.5);
        ctx.moveTo(s*0.5, 0); ctx.quadraticCurveTo(s*1.5, -s, s*2, -s*0.5); ctx.quadraticCurveTo(s*1.5, s, s*0.5, s*0.5);
        break;
      case 2: // Ghost
        ctx.arc(0, -s*0.2, s*0.8, Math.PI, 0);
        ctx.lineTo(s*0.8, s); ctx.lineTo(s*0.4, s*0.6); ctx.lineTo(0, s); ctx.lineTo(-s*0.4, s*0.6); ctx.lineTo(-s*0.8, s);
        break;
      case 3: // Skull
        ctx.arc(0, -s*0.2, s*0.8, 0, Math.PI*2);
        ctx.fill(); ctx.beginPath();
        ctx.rect(-s*0.4, s*0.4, s*0.8, s*0.4);
        break;
      case 4: // Beast
        ctx.ellipse(0, s*0.2, s, s*0.6, 0, 0, Math.PI*2);
        ctx.fill(); ctx.beginPath();
        ctx.ellipse(-s*0.6, -s*0.4, s*0.4, s*0.4, 0, 0, Math.PI*2); 
        ctx.fill(); ctx.beginPath();
        ctx.moveTo(-s*0.8, -s*0.8); ctx.lineTo(-s*0.4, -s*0.6); ctx.lineTo(-s*0.6, -s*0.2); 
        break;
      case 5: // Eye
        ctx.arc(0, 0, s*0.9, 0, Math.PI*2);
        break;
      case 6: // Plant
        ctx.moveTo(0, s); ctx.quadraticCurveTo(-s, 0, 0, -s); ctx.quadraticCurveTo(s, 0, 0, s);
        ctx.fill(); ctx.beginPath();
        ctx.moveTo(0, s); ctx.quadraticCurveTo(-s*1.5, s*0.5, -s*0.5, -s*0.5);
        ctx.moveTo(0, s); ctx.quadraticCurveTo(s*1.5, s*0.5, s*0.5, -s*0.5);
        break;
      case 7: // Golem
        ctx.rect(-s*0.8, -s*0.8, s*1.6, s*1.6);
        ctx.fill(); ctx.beginPath();
        ctx.rect(-s*1.2, -s*0.4, s*0.4, s*1.2); 
        ctx.rect(s*0.8, -s*0.4, s*0.4, s*1.2); 
        break;
      case 8: // Spider
        ctx.ellipse(0, s*0.2, s*0.6, s*0.8, 0, 0, Math.PI*2);
        ctx.fill(); ctx.beginPath();
        for(let i=0; i<4; i++) {
            const legY = -s*0.2 + i*s*0.3;
            ctx.moveTo(-s*0.4, legY); ctx.lineTo(-s*1.2, legY - s*0.4); ctx.lineTo(-s*1.5, legY + s*0.2);
            ctx.moveTo(s*0.4, legY); ctx.lineTo(s*1.2, legY - s*0.4); ctx.lineTo(s*1.5, legY + s*0.2);
        }
        ctx.stroke(); ctx.beginPath();
        break;
      case 9: // Wisp
        ctx.arc(0, 0, s*0.6, 0, Math.PI*2);
        ctx.fill(); ctx.beginPath();
        ctx.moveTo(0, -s*0.6); ctx.quadraticCurveTo(-s, -s*1.5, 0, -s*2); ctx.quadraticCurveTo(s, -s*1.5, 0, -s*0.6);
        break;
    }
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle = isElite ? '#ef4444' : '#ffffff';
    if (shapeIdx === 5) { // Eye
        ctx.beginPath(); ctx.arc(0, 0, s*0.4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, s*0.2, 0, Math.PI*2); ctx.fill();
    } else if (shapeIdx === 3) { // Skull
        ctx.fillStyle = isElite ? '#ef4444' : '#000000';
        ctx.beginPath(); ctx.arc(-s*0.3, -s*0.2, s*0.2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(s*0.3, -s*0.2, s*0.2, 0, Math.PI*2); ctx.fill();
    } else if (shapeIdx !== 6 && shapeIdx !== 9) {
        const eyeY = shapeIdx === 4 ? -s*0.4 : -s*0.1;
        const eyeX = shapeIdx === 4 ? -s*0.6 : 0;
        ctx.beginPath(); ctx.arc(eyeX - s*0.3, eyeY, s*0.15, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeX + s*0.3, eyeY, s*0.15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(eyeX - s*0.3, eyeY, s*0.05, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeX + s*0.3, eyeY, s*0.05, 0, Math.PI*2); ctx.fill();
    }

    // Elite decorations
    if (isElite) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-s*0.4, -s*1.2); ctx.lineTo(-s*0.2, -s*0.8); ctx.lineTo(0, -s*1.4); ctx.lineTo(s*0.2, -s*0.8); ctx.lineTo(s*0.4, -s*1.2);
        ctx.stroke();
    }

    ctx.restore();
  };

  const palettes = [
      ['#a3e635', '#4d7c0f'], // Green (Row 0)
      ['#38bdf8', '#0369a1'], // Blue (Row 1)
      ['#f87171', '#b91c1c'], // Red (Row 2)
      ['#c084fc', '#6b21a8'], // Purple (Elites, Row 3)
  ];

  // Draw Mobs (30)
  for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 10; col++) {
          drawShape(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, col, palettes[row][0], palettes[row][1], false);
      }
  }

  // Draw Elites (10)
  for (let col = 0; col < 10; col++) {
      drawShape(col * TILE_SIZE, 3 * TILE_SIZE, TILE_SIZE, col, palettes[3][0], palettes[3][1], true);
  }

  // Draw Bosses (3) - 256x256
  const drawBoss = (x: number, y: number, type: number) => {
      ctx.save();
      ctx.translate(x + 128, y + 128);
      ctx.scale(2, 2); // Scale up the drawing commands by 2x
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, 50, 40, 15, 0, 0, Math.PI*2); ctx.fill();

      if (type === 0) { // King Slime
          const grad = ctx.createRadialGradient(0, -20, 0, 0, 0, 60);
          grad.addColorStop(0, '#86efac'); grad.addColorStop(1, '#15803d');
          ctx.fillStyle = grad; ctx.strokeStyle = '#14532d'; ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, -50);
          ctx.bezierCurveTo(60, -50, 70, 30, 50, 50);
          ctx.bezierCurveTo(20, 60, -20, 60, -50, 50);
          ctx.bezierCurveTo(-70, 30, -60, -50, 0, -50);
          ctx.fill(); ctx.stroke();
          // Crown
          ctx.fillStyle = '#fbbf24'; ctx.strokeStyle = '#b45309';
          ctx.beginPath(); ctx.moveTo(-20, -40); ctx.lineTo(-30, -70); ctx.lineTo(-10, -50); ctx.lineTo(0, -80); ctx.lineTo(10, -50); ctx.lineTo(30, -70); ctx.lineTo(20, -40); ctx.fill(); ctx.stroke();
          // Eyes
          ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(-20, 0, 8, 0, Math.PI*2); ctx.arc(20, 0, 8, 0, Math.PI*2); ctx.fill();
      } else if (type === 1) { // Demon
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
          grad.addColorStop(0, '#fca5a5'); grad.addColorStop(1, '#7f1d1d');
          ctx.fillStyle = grad; ctx.strokeStyle = '#450a0a'; ctx.lineWidth = 4;
          // Wings
          ctx.beginPath(); ctx.moveTo(-20, -10); ctx.quadraticCurveTo(-80, -60, -100, -20); ctx.quadraticCurveTo(-60, 20, -20, 20); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(20, -10); ctx.quadraticCurveTo(80, -60, 100, -20); ctx.quadraticCurveTo(60, 20, 20, 20); ctx.fill(); ctx.stroke();
          // Body
          ctx.beginPath(); ctx.ellipse(0, 10, 30, 40, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          // Head
          ctx.beginPath(); ctx.arc(0, -30, 25, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          // Horns
          ctx.fillStyle = '#1c1917'; ctx.beginPath(); ctx.moveTo(-15, -50); ctx.quadraticCurveTo(-30, -80, -50, -70); ctx.quadraticCurveTo(-30, -50, -25, -40); ctx.fill();
          ctx.beginPath(); ctx.moveTo(15, -50); ctx.quadraticCurveTo(30, -80, 50, -70); ctx.quadraticCurveTo(30, -50, 25, -40); ctx.fill();
          // Eyes
          ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(-10, -35, 6, 0, Math.PI*2); ctx.arc(10, -35, 6, 0, Math.PI*2); ctx.fill();
      } else if (type === 2) { // Beholder
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 50);
          grad.addColorStop(0, '#c4b5fd'); grad.addColorStop(1, '#4c1d95');
          ctx.fillStyle = grad; ctx.strokeStyle = '#2e1065'; ctx.lineWidth = 4;
          // Tentacles
          for(let i=0; i<6; i++) {
              const angle = (i/6) * Math.PI * 2;
              const tx = Math.cos(angle) * 60; const ty = Math.sin(angle) * 60;
              ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(tx*1.2, ty*0.5, tx, ty); ctx.stroke();
              ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(tx, ty, 8, 0, Math.PI*2); ctx.fill();
          }
          // Body
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(0, 0, 45, 0, Math.PI*2); ctx.fill(); ctx.stroke();
          // Big Eye
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
  };

  drawBoss(0, 256, 0);
  drawBoss(256, 256, 1);
  drawBoss(512, 256, 2);

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
    const col = Math.floor(Math.random() * 3);
    return { x: col * 256, y: 256, w: 256, h: 256 };
  } else if (type === 'ELITE') {
    return getRandomFromConfig(ELITE_ROWS);
  } else {
    return getRandomFromConfig(MOB_ROWS);
  }
};