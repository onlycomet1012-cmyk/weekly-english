import React, { useRef, useEffect, useState } from 'react';
import { WordData, Entity, PlayerStats, UpgradeOption } from '../types';
import { loadBasicAssets, generateProceduralSpriteSheet, getRandomSprite } from '../services/gameAssetService';
import { GameQuizModal } from './GameQuizModal';
import { 
  playShootSound, 
  playHitSound, 
  playVictorySound, 
  startBGM, 
  stopBGM,
  playFireHitSound,
  playIceHitSound,
  playLightningHitSound,
  playWindHitSound,
  playErrorSound,
  playHealSound,
  playFireShootSound,
  playIceShootSound,
  playLightningShootSound,
  playWindShootSound,
  setBgmTheme
} from '../services/audioService';

interface GameArenaProps {
  words: WordData[];
  onExit: () => void;
}

// === CONFIGURATION ===
const SPAWN_RATE_INITIAL = 100; 
const BASE_XP_REQUIREMENT = 10;
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;

// PERFORMANCE CAPS
const MAX_ENEMIES = 400;      
const MAX_XP_GEMS = 200;      
const MAX_PROJECTILES = 150;  
const MAX_LIGHTNING_CHAINS = 10; 
const MAX_STORM_EFFECTS = 5;     

// SPATIAL GRID CONFIG
const GRID_CELL_SIZE = 150; 
const GRID_COLS = Math.ceil(GAME_WIDTH / GRID_CELL_SIZE);
const GRID_ROWS = Math.ceil(GAME_HEIGHT / GRID_CELL_SIZE);

// New Lightning Structures
interface LightningSegment {
    x1: number; y1: number;
    x2: number; y2: number;
}

interface LightningChain {
    segments: LightningSegment[];
    life: number;
    maxLife: number;
    colorOuter: string;
    colorInner: string;
}

interface StormEffect {
    x: number; y: number; life: number; maxLife: number; angle: number; radius: number;
}

interface Particle {
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number;
    size: number; color: string;
}

export const GameArena: React.FC<GameArenaProps> = ({ words, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // -- GAME STATE REFS --
  const playerRef = useRef<Entity>({
    id: 'hero', x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, width: 64, height: 64, 
    type: 'HERO', vx: 0, vy: 0, hp: 100, maxHp: 100, damage: 10,
    direction: 'DOWN', animFrame: 0, isMoving: false
  });
  
  const statsRef = useRef<PlayerStats>({
    hp: 100, maxHp: 100, speed: 4, damage: 10, 
    attackSpeed: 15, 
    projectileSpeed: 3, 
    pickupRange: 120, projectileCount: 1, level: 1, xp: 0, xpToNextLevel: BASE_XP_REQUIREMENT,
    activeElement: 'NONE',
    fireLevel: 0, burnDamage: 1,
    iceLevel: 0, freezeDuration: 180, 
    lightningLevel: 0, chainCount: 3,
    windLevel: 0, windRadius: 75 
  });
  
  // ACTIVE ENTITY LISTS
  const enemiesRef = useRef<Entity[]>([]);
  const projectilesRef = useRef<Entity[]>([]);
  const xpGemsRef = useRef<Entity[]>([]);
  const lightningChainsRef = useRef<LightningChain[]>([]);
  const stormEffectsRef = useRef<StormEffect[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // AUDIO THROTTLING REFS (Time based)
  const lastSoundTimeRef = useRef<{ [key: string]: number }>({
      NORMAL: 0, FIRE: 0, ICE: 0, LIGHTNING: 0, WIND: 0, SHOOT: 0
  });

  // OBJECT POOLS
  const enemyPoolRef = useRef<Entity[]>([]);
  const projectilePoolRef = useRef<Entity[]>([]);
  const gemPoolRef = useRef<Entity[]>([]);

  // SPATIAL GRID REFS
  const spatialGridRef = useRef<number[][][]>([]);

  // VISUAL FX REFS
  const screenShakeRef = useRef(0);
  const whiteFlashRef = useRef(0);

  const frameCountRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  
  const playerInvulnTimerRef = useRef(0);
  const bossDeathTimerRef = useRef(0);
  
  const gamepadButtonRef = useRef<{ button0: boolean; button1: boolean; left: boolean; right: boolean; up: boolean; down: boolean }>({ 
      button0: false, button1: false, left: false, right: false, up: false, down: false
  });

  const joystickRef = useRef({ active: false, id: -1, originX: 0, originY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 });

  const gameTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const animationFrameId = useRef<number>(0);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const spriteSheetRef = useRef<HTMLImageElement | null>(null);
  const areResourcesLoadedRef = useRef(false);
  const [areResourcesLoaded, setAreResourcesLoaded] = useState(false);
  const remainingWordsRef = useRef<WordData[]>([]);
  const bossSpawnedRef = useRef(false);
  const killCountsRef = useRef({ mobs: 0, elites: 0, bosses: 0 });

  const quizWordRef = useRef<WordData | null>(null);
  const showUpgradesRef = useRef<UpgradeOption[] | null>(null);
  
  const [uiStats, setUiStats] = useState<PlayerStats>(statsRef.current);
  const [gameResult, setGameResult] = useState<'PLAYING' | 'DEFEAT' | 'VICTORY'>('PLAYING');
  const gameResultRef = useRef(gameResult);
  const [quizWord, setQuizWord] = useState<WordData | null>(null);
  const [showUpgrades, setShowUpgrades] = useState<UpgradeOption[] | null>(null);
  const [gameTimeDisplay, setGameTimeDisplay] = useState(0);
  const [upgradeFocusedIndex, setUpgradeFocusedIndex] = useState(1); 
  
  // Sync Refs
  useEffect(() => { quizWordRef.current = quizWord; }, [quizWord]);
  useEffect(() => { showUpgradesRef.current = showUpgrades; }, [showUpgrades]);
  useEffect(() => { gameResultRef.current = gameResult; }, [gameResult]);

  // INITIALIZE SPATIAL GRID
  useEffect(() => {
    spatialGridRef.current = Array(GRID_COLS).fill(null).map(() => 
        Array(GRID_ROWS).fill(null).map(() => [])
    );
  }, []);

  // --- POOLING HELPERS ---
  const recycleEntity = (activeList: Entity[], pool: Entity[], index: number) => {
      const ent = activeList[index];
      ent.vx = 0; ent.vy = 0;
      ent.freezeTimer = 0; ent.burnTimer = 0;
      pool.push(ent);

      const last = activeList[activeList.length - 1];
      activeList[index] = last;
      activeList.pop();
  };

  const spawnFromPool = (pool: Entity[], fallback: Entity): Entity => {
      if (pool.length > 0) {
          const ent = pool.pop()!;
          return Object.assign(ent, fallback);
      }
      return fallback;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    startBGM(); 
    remainingWordsRef.current = [...words].sort(() => Math.random() - 0.5);
    const sheetDataUrl = generateProceduralSpriteSheet();
    const sheet = new Image();
    sheet.src = sheetDataUrl;
    sheet.onload = () => { spriteSheetRef.current = sheet; areResourcesLoadedRef.current = true; setAreResourcesLoaded(true); };
    loadBasicAssets((k, u) => { const img = new Image(); img.src = u; spritesRef.current[k] = img; });
    return () => { stopBGM(); cancelAnimationFrame(animationFrameId.current); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  // VIRTUAL JOYSTICK TOUCH EVENTS
  useEffect(() => {
      const handleTouchStart = (e: TouchEvent) => {
          if (isPausedRef.current) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
              const touch = e.changedTouches[i];
              if (!joystickRef.current.active) {
                  joystickRef.current.active = true;
                  joystickRef.current.id = touch.identifier;
                  joystickRef.current.originX = touch.clientX;
                  joystickRef.current.originY = touch.clientY;
                  joystickRef.current.currentX = touch.clientX;
                  joystickRef.current.currentY = touch.clientY;
                  joystickRef.current.dx = 0;
                  joystickRef.current.dy = 0;
              }
          }
      };

      const handleTouchMove = (e: TouchEvent) => {
          if (!joystickRef.current.active) return;
          for (let i = 0; i < e.changedTouches.length; i++) {
              const touch = e.changedTouches[i];
              if (touch.identifier === joystickRef.current.id) {
                  joystickRef.current.currentX = touch.clientX;
                  joystickRef.current.currentY = touch.clientY;
                  
                  let dx = touch.clientX - joystickRef.current.originX;
                  let dy = touch.clientY - joystickRef.current.originY;
                  const dist = Math.hypot(dx, dy);
                  const maxDist = 50; 
                  
                  if (dist > maxDist) {
                      dx = (dx / dist) * maxDist;
                      dy = (dy / dist) * maxDist;
                  }
                  
                  joystickRef.current.dx = dx / maxDist;
                  joystickRef.current.dy = dy / maxDist;
              }
          }
      };

      const handleTouchEnd = (e: TouchEvent) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
              const touch = e.changedTouches[i];
              if (touch.identifier === joystickRef.current.id) {
                  joystickRef.current.active = false;
                  joystickRef.current.id = -1;
                  joystickRef.current.dx = 0;
                  joystickRef.current.dy = 0;
              }
          }
      };

      window.addEventListener('touchstart', handleTouchStart, { passive: false });
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd, { passive: false });
      window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

      return () => {
          window.removeEventListener('touchstart', handleTouchStart);
          window.removeEventListener('touchmove', handleTouchMove);
          window.removeEventListener('touchend', handleTouchEnd);
          window.removeEventListener('touchcancel', handleTouchEnd);
      };
  }, []);

  useEffect(() => {
    if (!areResourcesLoaded) return;
    const loop = () => {
        if (!areResourcesLoadedRef.current) return;
        try {
            draw();
            update();
        } catch (e) {
            console.error("Game Loop Error:", e);
        }
        animationFrameId.current = requestAnimationFrame(loop);
    };
    animationFrameId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [areResourcesLoaded, upgradeFocusedIndex]); 

  // --- LIGHTNING GENERATOR ---
  const createLightningBolt = (x1: number, y1: number, x2: number, y2: number): LightningSegment[] => {
      const segments: LightningSegment[] = [];
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(3, Math.floor(dist / 50)); 
      
      let prevX = x1;
      let prevY = y1;

      for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          let currX = x1 + (x2 - x1) * t;
          let currY = y1 + (y2 - y1) * t;

          if (i !== steps) {
              const jitter = 25; 
              currX += (Math.random() - 0.5) * jitter;
              currY += (Math.random() - 0.5) * jitter;
          }

          segments.push({
              x1: prevX, y1: prevY,
              x2: currX, y2: currY,
          });
          prevX = currX;
          prevY = currY;
      }
      return segments;
  };

  const takeDamage = (amount: number) => {
    if (playerInvulnTimerRef.current > 0) return;
    
    statsRef.current.hp -= amount;
    playerRef.current.hp = statsRef.current.hp;
    playerInvulnTimerRef.current = 30; // 0.5s invulnerability
    playErrorSound();
    
    // Minor shake on damage
    if (screenShakeRef.current < 5) screenShakeRef.current = 5;

    setUiStats({...statsRef.current});

    if (statsRef.current.hp <= 0) {
        setGameResult('DEFEAT');
        isPausedRef.current = true;
        stopBGM();
    }
  };

  const gainXp = (amount: number) => {
    const s = statsRef.current;
    s.xp += amount;
    
    if (s.xp >= s.xpToNextLevel) {
        // Level Up Trigger
        isPausedRef.current = true;
        keysRef.current = {}; // Reset keys
        
        // Pick a word for Quiz
        const word = remainingWordsRef.current.shift();
        
        // 100% chance to show quiz if word exists, else straight to upgrade
        if (word) {
            setQuizWord(word);
        } else {
            showUpgradeMenu();
        }
    } else {
        setUiStats({...s});
    }
  };

  // RESTORED DYNAMIC UPGRADE MENU
  const showUpgradeMenu = () => {
      isPausedRef.current = true;
      const s = statsRef.current;
      
      const potentialUpgrades: UpgradeOption[] = [];
      potentialUpgrades.push({ 
          id: 'dmg_up', name: '肌肉强化', description: '伤害 +20%', icon: '💪', weight: 20,
          apply: (s) => ({ ...s, damage: Math.ceil(s.damage * 1.2) }) 
      });
      potentialUpgrades.push({ 
          id: 'spd_up', name: '疾风步', description: '移动速度 +20%', icon: '👟', weight: 20,
          apply: (s) => ({ ...s, speed: s.speed * 1.2 }) 
      });
      potentialUpgrades.push({ 
          id: 'atk_spd', name: '疯狂射击', description: '攻击速度 +20%', icon: '🔫', weight: 20,
          apply: (s) => ({ ...s, attackSpeed: Math.max(5, Math.floor(s.attackSpeed * 0.8)) }) 
      });
      potentialUpgrades.push({
          id: 'pickup_range', name: '致命磁场', description: '拾取范围 +50%', icon: '🧲', weight: 20,
          apply: (s) => ({ ...s, pickupRange: Math.ceil(s.pickupRange * 1.5) })
      });
      potentialUpgrades.push({ 
          id: 'multishot', name: '多重射击', description: '额外子弹 +1', icon: '✨', weight: 10,
          apply: (s) => ({ ...s, projectileCount: s.projectileCount + 1 }) 
      });

      const isFireActive = s.activeElement === 'FIRE';
      const isIceActive = s.activeElement === 'ICE';
      const isLightningActive = s.activeElement === 'LIGHTNING';
      const isWindActive = s.activeElement === 'WIND';
      const hasAnyElement = isFireActive || isIceActive || isLightningActive || isWindActive;

      // Only show element upgrades if we have no element OR already have that specific element
      if (!hasAnyElement || isFireActive) {
          potentialUpgrades.push({ 
              id: 'fire_shot', 
              name: isFireActive ? `火焰强化 Lv.${s.fireLevel + 1}` : '火焰弹', 
              description: isFireActive ? `燃烧伤害翻倍 (${s.burnDamage} -> ${s.burnDamage*2})` : '攻击附带燃烧效果', 
              icon: '🔥', 
              weight: isFireActive ? 30 : 10,
              apply: (s) => ({ ...s, activeElement: 'FIRE', fireLevel: s.fireLevel + 1, burnDamage: s.fireLevel === 0 ? 1 : s.burnDamage * 2 }) 
          });
      }
      if (!hasAnyElement || isIceActive) {
          potentialUpgrades.push({ 
              id: 'ice_shot', 
              name: isIceActive ? `冰冻强化 Lv.${s.iceLevel + 1}` : '冰冻弹', 
              description: isIceActive ? `冻结时间 +3秒 (${Math.floor(s.freezeDuration/60)}s -> ${Math.floor((s.freezeDuration+180)/60)}s)` : '攻击减速敌人', 
              icon: '❄️', 
              weight: isIceActive ? 30 : 10,
              apply: (s) => ({ ...s, activeElement: 'ICE', iceLevel: s.iceLevel + 1, freezeDuration: s.freezeDuration + 180 }) 
          });
      }
      if (!hasAnyElement || isLightningActive) {
          potentialUpgrades.push({ 
              id: 'lightning_shot', 
              name: isLightningActive ? `闪电强化 Lv.${s.lightningLevel + 1}` : '闪电弹', 
              description: isLightningActive ? `弹射数量翻倍 (${s.chainCount} -> ${s.chainCount*2})` : '攻击弹射敌人', 
              icon: '⚡', 
              weight: isLightningActive ? 30 : 5,
              apply: (s) => ({ ...s, activeElement: 'LIGHTNING', lightningLevel: s.lightningLevel + 1, chainCount: s.lightningLevel === 0 ? 3 : s.chainCount * 2 }) 
          });
      }
      if (!hasAnyElement || isWindActive) {
          potentialUpgrades.push({ 
              id: 'wind_shot', 
              name: isWindActive ? `风暴强化 Lv.${s.windLevel + 1}` : '风暴弹', 
              description: isWindActive ? `风暴范围扩大` : '攻击聚拢敌人', 
              icon: '🌀', 
              weight: isWindActive ? 30 : 5,
              apply: (s) => ({ ...s, activeElement: 'WIND', windLevel: s.windLevel + 1, windRadius: s.windLevel === 0 ? 75 : Math.floor(s.windRadius * 1.5) }) 
          });
      }

      const selectedOpts: UpgradeOption[] = [];
      const needed = 3;

      for (let i = 0; i < needed; i++) {
          if (potentialUpgrades.length === 0) break;
          const totalWeight = potentialUpgrades.reduce((sum, item) => sum + (item.weight || 0), 0);
          let random = Math.random() * totalWeight;
          let picked = false;
          
          for (let j = 0; j < potentialUpgrades.length; j++) {
              random -= (potentialUpgrades[j].weight || 0);
              if (random <= 0) {
                  selectedOpts.push(potentialUpgrades[j]);
                  potentialUpgrades.splice(j, 1); 
                  picked = true;
                  break;
              }
          }
          
          // Safety fallback if float math failed to pick something
          if (!picked && potentialUpgrades.length > 0) {
              selectedOpts.push(potentialUpgrades[0]);
              potentialUpgrades.splice(0, 1);
          }
      }
      
      setShowUpgrades(selectedOpts); 
      // Synchronously update ref to block game loop immediately
      showUpgradesRef.current = selectedOpts;
      setUpgradeFocusedIndex(1); 
  };

  const update = () => {
    if (gameResultRef.current !== 'PLAYING') {
        if (!isPausedRef.current) isPausedRef.current = true;
        const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
        if (gp) {
            const btnA = gp.buttons[0]?.pressed; 
            if (btnA && !gamepadButtonRef.current.button0) onExit();
            gamepadButtonRef.current.button0 = btnA;
        }
        return; 
    }

    if (quizWordRef.current || showUpgradesRef.current) {
        if (!isPausedRef.current) isPausedRef.current = true;
        if (showUpgradesRef.current) handleUpgradeGamepad();
        return;
    }

    if (isPausedRef.current) isPausedRef.current = false;

    // UPDATE VFX
    if (screenShakeRef.current > 0) screenShakeRef.current *= 0.9;
    if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
    
    if (whiteFlashRef.current > 0) whiteFlashRef.current -= 0.05;
    if (whiteFlashRef.current < 0) whiteFlashRef.current = 0;

    // POOL CLEANUP
    if (frameCountRef.current % 300 === 0) {
        if (enemyPoolRef.current.length > 50) enemyPoolRef.current.length = 50;
        if (projectilePoolRef.current.length > 50) projectilePoolRef.current.length = 50;
    }

    // Keep removing gems if we are somehow still over capacity (backup safety)
    while (xpGemsRef.current.length > MAX_XP_GEMS) {
         recycleEntity(xpGemsRef.current, gemPoolRef.current, 0);
    }
    
    if (playerInvulnTimerRef.current > 0) playerInvulnTimerRef.current--;

    const player = playerRef.current;
    const stats = statsRef.current;
    frameCountRef.current++;
    if (frameCountRef.current % 60 === 0) {
        gameTimeRef.current++;
        setGameTimeDisplay(gameTimeRef.current);
    }

    // PLAYER MOVEMENT
    let dx = 0; let dy = 0;
    if (keysRef.current['w'] || keysRef.current['arrowup']) dy -= 1;
    if (keysRef.current['s'] || keysRef.current['arrowdown']) dy += 1;
    if (keysRef.current['a'] || keysRef.current['arrowleft']) dx -= 1;
    if (keysRef.current['d'] || keysRef.current['arrowright']) dx += 1;

    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (gp) {
        if (Math.abs(gp.axes[0]) > 0.2) dx += gp.axes[0];
        if (Math.abs(gp.axes[1]) > 0.2) dy += gp.axes[1];
        if (gp.buttons[1]?.pressed && !gamepadButtonRef.current.button1) toggleFullscreen();
        gamepadButtonRef.current.button1 = gp.buttons[1]?.pressed;
    }

    if (dx !== 0 || dy !== 0 || joystickRef.current.active) {
        if (joystickRef.current.active) {
            dx += joystickRef.current.dx;
            dy += joystickRef.current.dy;
        }
        player.isMoving = true;
        player.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : (dy > 0 ? 'DOWN' : 'UP');
        // Simple normalization without Sqrt for movement logic is hard, keep Sqrt for player only (1 entity)
        const length = Math.hypot(dx, dy); 
        const factor = length > 1 ? 1 / length : 1;
        player.x += dx * factor * stats.speed;
        player.y += dy * factor * stats.speed;
    } else { player.isMoving = false; }
    
    player.x = Math.max(32, Math.min(GAME_WIDTH - 32, player.x));
    player.y = Math.max(32, Math.min(GAME_HEIGHT - 32, player.y));

    // ANIMATION TICK
    const now = performance.now();
    if (!player.lastAnimTime || now - player.lastAnimTime > 200) {
        player.animFrame = (player.animFrame || 0) + 1;
        player.lastAnimTime = now;
    }

    // --- CLEAR SPATIAL GRID ---
    for (let c = 0; c < GRID_COLS; c++) {
        for (let r = 0; r < GRID_ROWS; r++) {
            spatialGridRef.current[c][r].length = 0; 
        }
    }

    spawnEnemies();

    // --- ENEMY LOOP (OPTIMIZED) ---
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const e = enemiesRef.current[i];
        
        let speed = e.type === 'BOSS' ? 1.2 : (e.type.includes('ELITE') ? 2.0 : 1.5);
        if (e.freezeTimer && e.freezeTimer > 0) { speed *= 0.5; e.freezeTimer--; }
        
        if (e.burnTimer && e.burnTimer > 0) { 
            e.burnTimer--; 
            if (frameCountRef.current % 30 === 0 && e.burnDamageRef) e.hp -= e.burnDamageRef; 
        }

        // OPTIMIZATION: Stagger AI pathfinding
        // Calculate direction (vx/vy as normalized vectors) only every 6 frames
        // This reduces Math.atan2/cos/sin calls by ~83%
        if ((frameCountRef.current + i) % 6 === 0) {
            const angle = Math.atan2(player.y - e.y, player.x - e.x);
            e.vx = Math.cos(angle);
            e.vy = Math.sin(angle);
        } else if (e.vx === 0 && e.vy === 0) {
            // Ensure newly spawned units move immediately
             const angle = Math.atan2(player.y - e.y, player.x - e.x);
             e.vx = Math.cos(angle);
             e.vy = Math.sin(angle);
        }
        
        e.x += e.vx * speed; 
        e.y += e.vy * speed;
        
        // REGISTER TO GRID (Optimization: Math.floor is faster than parseInt)
        if (!isNaN(e.x) && !isNaN(e.y)) {
            const gx = Math.floor(e.x / GRID_CELL_SIZE);
            const gy = Math.floor(e.y / GRID_CELL_SIZE);
            if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
                spatialGridRef.current[gx][gy].push(i);
            }
        }

        // PLAYER COLLISION (Squared Distance)
        if (Math.abs(player.x - e.x) < 50 && Math.abs(player.y - e.y) < 50) {
            const hitDistSq = (player.width/2 + e.width/2)**2;
            const distSq = (player.x - e.x)**2 + (player.y - e.y)**2;
            if (distSq < hitDistSq) {
                takeDamage(e.damage);
            }
        }

        if (e.hp <= 0) {
            handleEnemyDeath(e);
            recycleEntity(enemiesRef.current, enemyPoolRef.current, i);
        }
    }

    if (frameCountRef.current % stats.attackSpeed === 0) fireBullet();

    // --- PROJECTILE LOOP ---
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const p = projectilesRef.current[i];
        p.x += p.vx; 
        p.y += p.vy;
        
        let hit = false;
        
        if (p.type === 'PROJECTILE') {
            const pcx = Math.floor(p.x / GRID_CELL_SIZE);
            const pcy = Math.floor(p.y / GRID_CELL_SIZE);
            
            // Search Neighbors
            neighborLoop:
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    const cx = pcx + ox;
                    const cy = pcy + oy;
                    
                    if (cx >= 0 && cx < GRID_COLS && cy >= 0 && cy < GRID_ROWS) {
                        const cellEnemies = spatialGridRef.current[cx][cy];
                        for (let k = 0; k < cellEnemies.length; k++) {
                            const enemyIdx = cellEnemies[k];
                            const enemy = enemiesRef.current[enemyIdx];
                            
                            if (!enemy || enemy.hp <= 0) continue; 

                            const dx = p.x - enemy.x;
                            const dy = p.y - enemy.y;
                            
                            if (Math.abs(dx) < 40 && Math.abs(dy) < 40) { 
                                const hitRadiusSq = (enemy.width/2 + 10)**2;
                                if (dx*dx + dy*dy < hitRadiusSq) {
                                    // Apply Hit
                                    applyHitEffect(enemy, p);
                                    hit = true; 
                                    break neighborLoop; 
                                }
                            }
                        }
                    }
                }
            }
        }

        if (hit || p.x < 0 || p.x > GAME_WIDTH || p.y < 0 || p.y > GAME_HEIGHT) {
            recycleEntity(projectilesRef.current, projectilePoolRef.current, i);
        }
    }
    
    // --- STORM LOGIC (Update) ---
    // Moved life management here to avoid mutation in draw()
    for (let i = stormEffectsRef.current.length - 1; i >= 0; i--) {
        const storm = stormEffectsRef.current[i];
        
        // Lifecycle management
        storm.life--;
        if (storm.life <= 0) {
            const last = stormEffectsRef.current[stormEffectsRef.current.length - 1];
            stormEffectsRef.current[i] = last;
            stormEffectsRef.current.pop();
            continue;
        }

        storm.angle += 0.2;
        const stormRadSq = storm.radius**2;
        
        if (isNaN(storm.x) || isNaN(storm.y)) continue;

        const minCol = Math.max(0, Math.floor((storm.x - storm.radius) / GRID_CELL_SIZE));
        const maxCol = Math.min(GRID_COLS - 1, Math.floor((storm.x + storm.radius) / GRID_CELL_SIZE));
        const minRow = Math.max(0, Math.floor((storm.y - storm.radius) / GRID_CELL_SIZE));
        const maxRow = Math.min(GRID_ROWS - 1, Math.floor((storm.y + storm.radius) / GRID_CELL_SIZE));

        for (let c = minCol; c <= maxCol; c++) {
            for (let r = minRow; r <= maxRow; r++) {
                const cellEnemies = spatialGridRef.current[c][r];
                for (let k = 0; k < cellEnemies.length; k++) {
                    const enemyIdx = cellEnemies[k];
                    const e = enemiesRef.current[enemyIdx];
                    if (!e || e.hp <= 0) continue;

                    const dx = storm.x - e.x;
                    const dy = storm.y - e.y;
                    
                    if (Math.abs(dx) > storm.radius || Math.abs(dy) > storm.radius) continue;
                    
                    const distSq = dx*dx + dy*dy;
                    if (distSq < stormRadSq && distSq > 225) { 
                         const dist = Math.sqrt(distSq);
                         // Limit factor to prevent explosion if dist is tiny (though >225 protects it)
                         const factor = Math.min(10, 3.5 / dist); 
                         e.x += dx * factor; e.y += dy * factor;
                    }
                }
            }
        }
    }

    // --- LIGHTNING LOGIC (Update) ---
    for (let i = lightningChainsRef.current.length - 1; i >= 0; i--) {
         const c = lightningChainsRef.current[i];
         c.life--;
         if (c.life <= 0) {
             const last = lightningChainsRef.current[lightningChainsRef.current.length - 1];
             lightningChainsRef.current[i] = last;
             lightningChainsRef.current.pop();
         }
    }

    // --- PARTICLE LOGIC (Update) ---
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.vx *= 0.95; // Friction
        p.vy *= 0.95;
        if (p.life <= 0) {
            const last = particlesRef.current[particlesRef.current.length - 1];
            particlesRef.current[i] = last;
            particlesRef.current.pop();
        }
    }

    if (bossDeathTimerRef.current > 0) {
        bossDeathTimerRef.current--;
        if (bossDeathTimerRef.current <= 0) {
            setGameResult('VICTORY');
            playVictorySound();
            isPausedRef.current = true;
        }
    }

    // --- GEM LOOP ---
    for (let i = xpGemsRef.current.length - 1; i >= 0; i--) {
        const gem = xpGemsRef.current[i];
        const dx = player.x - gem.x;
        const dy = player.y - gem.y;
        
        if (Math.abs(dx) < stats.pickupRange && Math.abs(dy) < stats.pickupRange) {
             const distSq = dx*dx + dy*dy;
             if (distSq < stats.pickupRange**2) {
                 gem.x += dx * 0.15;
                 gem.y += dy * 0.15;
                 
                 if (distSq < 900) { 
                     if (gem.type === 'SNACK') healPlayer(10);
                     else gainXp(1);
                     recycleEntity(xpGemsRef.current, gemPoolRef.current, i);
                 }
             }
        }
    }
    
    // THROTTLE UI UPDATES (Optimization: Only update React state every 15 frames/250ms)
    // React reconciliation is the #1 cause of stutter in canvas games
    if (frameCountRef.current % 15 === 0) setUiStats({...statsRef.current});
  };

  const handleUpgradeGamepad = () => {
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (gp) {
        const axisX = gp.axes[0];
        const btnA = gp.buttons[0]?.pressed; 
        const btnLeft = gp.buttons[14]?.pressed || axisX < -0.5;
        const btnRight = gp.buttons[15]?.pressed || axisX > 0.5;

        if (btnLeft && !gamepadButtonRef.current.left) {
            setUpgradeFocusedIndex(prev => Math.max(0, prev - 1));
        }
        if (btnRight && !gamepadButtonRef.current.right) {
            setUpgradeFocusedIndex(prev => Math.min((showUpgradesRef.current?.length || 1) - 1, prev + 1));
        }
        if (btnA && !gamepadButtonRef.current.button0) {
                if (showUpgradesRef.current && showUpgradesRef.current[upgradeFocusedIndex]) {
                    applyUpgrade(showUpgradesRef.current[upgradeFocusedIndex]);
                }
        }
        gamepadButtonRef.current.left = btnLeft;
        gamepadButtonRef.current.right = btnRight;
        gamepadButtonRef.current.button0 = btnA;
    }
  };

  const applyHitEffect = (enemy: Entity, p: Entity) => {
      const stats = statsRef.current;
      enemy.hp -= p.damage;
      
      // Strict Time-Based Audio Throttling
      const playThrottled = (type: string, fn: () => void) => {
          const now = performance.now();
          if (now - lastSoundTimeRef.current[type] > 80) { // Min 80ms between same sounds
              fn();
              lastSoundTimeRef.current[type] = now;
          }
      };
      
      if (p.element === 'ICE') { 
          enemy.freezeTimer = stats.freezeDuration; 
          playThrottled('ICE', playIceHitSound);
      }
      else if (p.element === 'FIRE') { 
          enemy.burnTimer = 300; 
          enemy.burnDamageRef = stats.burnDamage;
          playThrottled('FIRE', playFireHitSound);
      }
      else if (p.element === 'LIGHTNING') {
          if (lightningChainsRef.current.length < MAX_LIGHTNING_CHAINS) {
              // Chain logic
              let chains = 0;
              for (let k=0; k < enemiesRef.current.length; k++) {
                  if (chains >= stats.chainCount) break;
                  const n = enemiesRef.current[k];
                  if (n !== enemy && Math.abs(n.x - enemy.x) < 400 && Math.abs(n.y - enemy.y) < 400) {
                      n.hp -= Math.ceil(p.damage/2);
                      const segments = createLightningBolt(enemy.x, enemy.y, n.x, n.y);
                      lightningChainsRef.current.push({ 
                          segments, life: 20, maxLife: 20,
                          colorOuter: 'rgba(180, 230, 255, 0.4)', colorInner: '#ffffff'
                      });
                      chains++;
                  }
              }
          }
          playThrottled('LIGHTNING', playLightningHitSound);
      } 
      else if (p.element === 'WIND') {
          if (stormEffectsRef.current.length < MAX_STORM_EFFECTS) {
              stormEffectsRef.current.push({
                  x: enemy.x, y: enemy.y, life: 180, maxLife: 180, 
                  angle: Math.random() * Math.PI * 2, radius: stats.windRadius
              });
          }
          playThrottled('WIND', playWindHitSound);
      } else { 
          playThrottled('NORMAL', playHitSound);
      }
  };

  const handleEnemyDeath = (e: Entity) => {
      if (e.type === 'BOSS') { 
          // Delay victory, start explosion sequence
          bossDeathTimerRef.current = 150; // 2.5 seconds
          
          // TRIGGER VFX
          screenShakeRef.current = 25;
          whiteFlashRef.current = 1.0;
          
          // Spawn Massive Explosion Particles
          for (let i=0; i<150; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * 12 + 4;
              particlesRef.current.push({
                  x: e.x, y: e.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 60 + Math.random() * 80,
                  maxLife: 140,
                  size: Math.random() * 6 + 2,
                  color: Math.random() > 0.4 ? '#4ade80' : (Math.random() > 0.5 ? '#facc15' : '#ffffff')
              });
          }
      }
      
      killCountsRef.current[e.type === 'BOSS' ? 'bosses' : (e.type.includes('ELITE') ? 'elites' : 'mobs')]++;
      
      const dropCount = e.type === 'BOSS' ? 50 : (e.type.includes('ELITE') ? 5 : 1);
      for (let k = 0; k < dropCount; k++) {
          if (xpGemsRef.current.length >= MAX_XP_GEMS) {
               // Recycle furthest gem to make room for new one
               let furthestIdx = 0;
               let maxDistSq = -1;
               const px = playerRef.current.x;
               const py = playerRef.current.y;
               
               for(let i=0; i<xpGemsRef.current.length; i++) {
                   const g = xpGemsRef.current[i];
                   const d = (g.x - px)**2 + (g.y - py)**2;
                   if (d > maxDistSq) {
                       maxDistSq = d;
                       furthestIdx = i;
                   }
               }
               recycleEntity(xpGemsRef.current, gemPoolRef.current, furthestIdx);
          }
          const isSnack = Math.random() < 0.05; 
          
          const drop = spawnFromPool(gemPoolRef.current, {
              id: '', 
              x: e.x + (Math.random() * 30 - 15),
              y: e.y + (Math.random() * 30 - 15),
              width: 24, height: 24,
              type: isSnack ? 'SNACK' : 'XP',
              vx:0, vy:0, hp:1, maxHp:1, damage:0
          });
          xpGemsRef.current.push(drop);
      }
  };

  const healPlayer = (amount: number) => {
      playHealSound();
      statsRef.current.hp = Math.min(statsRef.current.maxHp, statsRef.current.hp + amount);
      setUiStats({...statsRef.current}); 
  };

  const spawnEnemies = () => {
      if (enemiesRef.current.length >= MAX_ENEMIES) return;

      const time = gameTimeRef.current;
      const level = statsRef.current.level;
      let spawnRate = Math.max(3, Math.floor(SPAWN_RATE_INITIAL / Math.pow(1.5, level - 1)));
      
      if (remainingWordsRef.current.length === 0 && !bossSpawnedRef.current && !quizWord) {
          spawnEntity('BOSS'); bossSpawnedRef.current = true; return;
      }
      if (frameCountRef.current % spawnRate === 0) {
          const r = Math.random();
          let type = (statsRef.current.level > 1 && time > 30 && r > 0.9) ? 'ELITE' : 'MOB';
          spawnEntity(type as any);
      }
  };

  const spawnEntity = (category: 'MOB' | 'ELITE' | 'BOSS') => {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * GAME_WIDTH; y = -100; }
      else if (side === 1) { x = GAME_WIDTH + 100; y = Math.random() * GAME_HEIGHT; }
      else if (side === 2) { x = Math.random() * GAME_WIDTH; y = GAME_HEIGHT + 100; }
      else { x = -100; y = Math.random() * GAME_HEIGHT; }
      
      const fallback: Entity = {
          id: Math.random().toString(), x, y, vx: 0, vy: 0, 
          type: category as any, width: category === 'BOSS' ? 250 : (category === 'ELITE' ? 90 : 50),
          height: category === 'BOSS' ? 250 : (category === 'ELITE' ? 90 : 50),
          hp: category === 'BOSS' ? 1000 : (category === 'ELITE' ? 40 : 2),
          maxHp: category === 'BOSS' ? 1000 : (category === 'ELITE' ? 40 : 2),
          damage: category === 'BOSS' ? 10 : (category === 'ELITE' ? 5 : 1),
          spriteSource: getRandomSprite(category)
      };

      const ent = spawnFromPool(enemyPoolRef.current, fallback);
      // Ensure key props are reset if recycled
      ent.x = x; ent.y = y; ent.hp = ent.maxHp; 
      ent.width = fallback.width; ent.height = fallback.height;
      ent.type = category as any;
      ent.spriteSource = fallback.spriteSource; 
      ent.vx = 0; ent.vy = 0;
      
      enemiesRef.current.push(ent);
  };

  const fireBullet = () => {
    const s = statsRef.current;
    
    // SOUND THROTTLING FOR SHOOTING
    // No need to pass map here, just simple logic
    const p = playerRef.current;
    let el: any = s.activeElement; 
    if (el === 'NONE') el = 'NORMAL';
    
    // Audio Throttling (Time based)
    const now = performance.now();
    if (now - lastSoundTimeRef.current['SHOOT'] > 80) {
        if (s.activeElement === 'FIRE') playFireShootSound();
        else if (s.activeElement === 'ICE') playIceShootSound();
        else if (s.activeElement === 'LIGHTNING') playLightningShootSound();
        else if (s.activeElement === 'WIND') playWindShootSound();
        else playShootSound();
        lastSoundTimeRef.current['SHOOT'] = now;
    }

    for (let i = 0; i < s.projectileCount; i++) {
        if (projectilesRef.current.length >= MAX_PROJECTILES) break;
        const a = Math.random() * Math.PI * 2;
        
        const fallback: Entity = {
            id: Math.random().toString(), x: p.x, y: p.y, width: 24, height: 24, type: 'PROJECTILE',
            vx: Math.cos(a) * s.projectileSpeed, vy: Math.sin(a) * s.projectileSpeed,
            hp: 1, maxHp: 1, damage: s.damage, element: el
        };
        const bullet = spawnFromPool(projectilePoolRef.current, fallback);
        bullet.x = p.x; bullet.y = p.y;
        bullet.vx = Math.cos(a) * s.projectileSpeed;
        bullet.vy = Math.sin(a) * s.projectileSpeed;
        bullet.element = el;
        bullet.damage = s.damage;

        projectilesRef.current.push(bullet);
    }
  };

  const applyUpgrade = (o: UpgradeOption) => { 
      statsRef.current = o.apply(statsRef.current); 
      statsRef.current.level++; 
      statsRef.current.damage += 1; 
      statsRef.current.xp = 0; 
      // Reduced scaling from 1.6 to 1.4 for ~20% easier leveling curve
      statsRef.current.xpToNextLevel = Math.ceil(statsRef.current.xpToNextLevel * 1.4); 
      if (statsRef.current.activeElement !== 'NONE') {
         setBgmTheme(statsRef.current.activeElement);
      }
      setShowUpgrades(null); 
      // Sync Ref immediately
      showUpgradesRef.current = null;
      isPausedRef.current = false; 
  };

  const handleQuizResult = (c: boolean) => { 
      setQuizWord(null); 
      // Sync Ref immediately to ensure game loop doesn't unpause prematurely
      quizWordRef.current = null; 
      
      if (c) {
          showUpgradeMenu(); 
      } else { 
          // If incorrect, put the word back at the end of the queue
          if (quizWord) {
              remainingWordsRef.current.push(quizWord);
          }
          statsRef.current.xp = 0; 
          isPausedRef.current = false; 
      } 
  };

  const draw = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    
    // === CAMERA SHAKE APPLY ===
    const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
    const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Clear whole screen
    ctx.fillStyle = '#0f172a'; ctx.fillRect(-20, -20, GAME_WIDTH + 40, GAME_HEIGHT + 40); // Overdraw for shake
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    // Simple Grid (Optimized: less draw calls if we wanted, but this is fine)
    for (let x=0; x<GAME_WIDTH; x+=100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_HEIGHT); ctx.stroke(); }
    for (let y=0; y<GAME_HEIGHT; y+=100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_WIDTH, y); ctx.stroke(); }

    const drawEnt = (e: Entity) => {
        // OPTIMIZATION: Bounds check
        if (e.x < -100 || e.x > GAME_WIDTH + 100 || e.y < -100 || e.y > GAME_HEIGHT + 100) return;

        // OPTIMIZATION: Use Bitwise OR to force integer coordinates for faster rendering
        const drawX = (e.x - e.width/2) | 0;
        const drawY = (e.y - e.height/2) | 0;

        if (e.type === 'HERO') {
            let key = 'HERO_IDLE';
            if (e.isMoving) {
                if (e.direction === 'UP') key = 'HERO_UP';
                else if (e.direction === 'DOWN') key = 'HERO_DOWN';
                else if (e.direction === 'LEFT') key = 'HERO_LEFT';
                else if (e.direction === 'RIGHT') key = 'HERO_RIGHT';
            }
            const img = spritesRef.current[key];
            if (img && img.complete) {
                ctx.imageSmoothingEnabled = false;
                const frameIndex = (e.animFrame || 0) % 2;
                const srcX = frameIndex * 64; 
                ctx.drawImage(img, srcX, 0, 64, 64, drawX, drawY, e.width, e.height);
                return;
            }
        }
        if (e.spriteSource && spriteSheetRef.current?.complete) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(spriteSheetRef.current, e.spriteSource.x, e.spriteSource.y, e.spriteSource.w, e.spriteSource.h, drawX, drawY, e.width, e.height);
        } else {
            ctx.fillStyle = e.type === 'HERO' ? '#6366f1' : '#ef4444';
            ctx.fillRect(drawX, drawY, e.width, e.height);
        }
    };
    
    xpGemsRef.current.forEach(g => { 
        // OPTIMIZATION: Bounds check
        if (g.x < -20 || g.x > GAME_WIDTH + 20 || g.y < -20 || g.y > GAME_HEIGHT + 20) return;

        // Integer coords
        const gx = g.x | 0;
        const gy = g.y | 0;

        if (g.type === 'SNACK') {
            const img = spritesRef.current['SNACK'];
            if (img && img.complete) {
                ctx.drawImage(img, gx - 12, gy - 12, 24, 24);
            } else {
                ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI*2); ctx.fill();
            }
        } else {
            const img = spritesRef.current['XP'];
            if (img && img.complete) {
                ctx.drawImage(img, gx - 10, gy - 10, 20, 20);
            } else {
                ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI*2); ctx.fill(); 
            }
        }
    });
    
    // === OPTIMIZED STORM DRAWING ===
    for (let i = stormEffectsRef.current.length - 1; i >= 0; i--) {
        const s = stormEffectsRef.current[i];
        // Lifecycle now managed in update()

        ctx.save();
        ctx.translate(s.x | 0, s.y | 0);
        const opacity = s.life / s.maxLife;
        ctx.rotate(s.angle);
        
        ctx.strokeStyle = `rgba(200, 240, 255, ${opacity * 0.4})`;
        ctx.lineWidth = 4;
        
        ctx.beginPath(); ctx.arc(0, 0, s.radius * 0.3, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, s.radius * 0.7, 0, Math.PI * 1.5); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, s.radius, 1, Math.PI * 1.8); ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    enemiesRef.current.forEach(drawEnt);

    if (playerInvulnTimerRef.current > 0) {
        if (Math.floor(frameCountRef.current / 4) % 2 === 0) ctx.globalAlpha = 0.4;
    }
    drawEnt(playerRef.current);
    ctx.globalAlpha = 1.0; 

    projectilesRef.current.forEach(p => { 
        // OPTIMIZATION: Bounds check
        if (p.x < -50 || p.x > GAME_WIDTH + 50 || p.y < -50 || p.y > GAME_HEIGHT + 50) return;

        let spriteKey = 'PROJ_NORMAL';
        if (p.element === 'FIRE') spriteKey = 'PROJ_FIRE';
        else if (p.element === 'ICE') spriteKey = 'PROJ_ICE';
        else if (p.element === 'LIGHTNING') spriteKey = 'PROJ_LIGHTNING';
        else if (p.element === 'WIND') spriteKey = 'PROJ_WIND';

        const img = spritesRef.current[spriteKey];
        if (img && img.complete) {
             // OPTIMIZATION: Skip rotation for symmetric projectiles (Normal/Lightning)
             const isSymmetric = p.element === 'NORMAL' || p.element === 'LIGHTNING';
             
             if (isSymmetric) {
                 ctx.drawImage(img, (p.x | 0) - p.width/2, (p.y | 0) - p.height/2, p.width, p.height);
             } else {
                 ctx.save();
                 ctx.translate(p.x | 0, p.y | 0);
                 ctx.rotate(Math.atan2(p.vy, p.vx));
                 ctx.drawImage(img, -p.width/2, -p.height/2, p.width, p.height);
                 ctx.restore();
             }
        } else {
            ctx.fillStyle = p.element === 'FIRE' ? '#ef4444' : (p.element === 'ICE' ? '#fff' : (p.element === 'LIGHTNING' ? '#3b82f6' : '#94a3b8')); 
            ctx.beginPath(); ctx.arc(p.x | 0, p.y | 0, p.width/2, 0, Math.PI*2); ctx.fill(); 
        }
    });
    
    // === OPTIMIZED LIGHTNING DRAWING ===
    if (lightningChainsRef.current.length > 0) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        let hasActive = false;
        
        if (lightningChainsRef.current.length > 0) {
            ctx.beginPath();
            ctx.lineWidth = 6; 
            ctx.strokeStyle = 'rgba(180, 230, 255, 0.4)'; 
            
            for (let i = lightningChainsRef.current.length - 1; i >= 0; i--) {
                 const c = lightningChainsRef.current[i];
                 hasActive = true;
                 for(let j=0; j<c.segments.length; j++) {
                     const seg = c.segments[j];
                     ctx.moveTo(seg.x1 | 0, seg.y1 | 0);
                     ctx.lineTo(seg.x2 | 0, seg.y2 | 0);
                 }
            }
            if (hasActive) ctx.stroke();

            if (hasActive) {
                ctx.beginPath();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                for (let i = 0; i < lightningChainsRef.current.length; i++) {
                     const c = lightningChainsRef.current[i];
                     for(let j=0; j<c.segments.length; j++) {
                         const seg = c.segments[j];
                         ctx.moveTo(seg.x1 | 0, seg.y1 | 0);
                         ctx.lineTo(seg.x2 | 0, seg.y2 | 0);
                     }
                }
                ctx.stroke();
            }
        }
    }

    // --- EXPLOSION PARTICLE DRAWING (ENHANCED) ---
    // Using arc + lighter blend mode for high impact boss deaths
    ctx.globalCompositeOperation = 'lighter'; // GLOW EFFECT
    
    particlesRef.current.forEach(p => {
        if (p.life <= 0) return;
        
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        
        // Restore Circle for nicer looking explosions
        ctx.beginPath();
        ctx.arc(p.x | 0, p.y | 0, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.globalCompositeOperation = 'source-over'; // RESET BLEND MODE
    ctx.globalAlpha = 1.0;
    
    // === WHITE FLASH ===
    if (whiteFlashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${whiteFlashRef.current})`;
        ctx.fillRect(-20, -20, GAME_WIDTH + 40, GAME_HEIGHT + 40);
    }
    
    ctx.restore(); // RESET CAMERA SHAKE
  };

  const renderStats = () => {
    const mins = Math.floor(gameTimeDisplay / 60);
    const secs = (gameTimeDisplay % 60).toString().padStart(2, '0');

    return (
        <div className="w-full bg-slate-50 rounded-xl p-6 mb-6 text-slate-700 font-bold space-y-3">
            <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Time Survived</span>
                <span className="text-xl font-mono">{mins}:{secs}</span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Level Reached</span>
                <span className="text-xl font-mono">{uiStats.level}</span>
            </div>
            <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Enemies Defeated</span>
                <span className="text-xl font-mono">{killCountsRef.current.mobs}</span>
            </div>
             <div className="flex justify-between items-center border-b-2 border-slate-200 pb-2">
                <span className="text-slate-500 text-xs uppercase tracking-wider">Elites Defeated</span>
                <span className="text-xl font-mono">{killCountsRef.current.elites}</span>
            </div>
            {killCountsRef.current.bosses > 0 && (
                <div className="flex justify-between items-center pt-2 text-yellow-600">
                     <span className="text-xs uppercase tracking-wider font-black">BOSS SLAIN</span>
                     <span className="text-xl">👑</span>
                </div>
            )}
        </div>
    );
  };

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden cursor-none">
      <div className="relative w-full h-full">
          <canvas 
            ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT}
            className="bg-slate-900 shadow-2xl"
          />

          {/* HUD (Top Left) */}
          <div className="absolute top-8 left-8 flex flex-col gap-2 pointer-events-none">
            <div className="w-96 h-10 bg-slate-800 rounded-full border-4 border-slate-600 overflow-hidden relative shadow-lg">
                 <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(uiStats.hp / uiStats.maxHp) * 100}%` }}></div>
                 <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white drop-shadow-md">HP {Math.ceil(uiStats.hp)}</span>
            </div>
            <div className="w-96 h-6 bg-slate-800 rounded-full border-2 border-slate-600 overflow-hidden relative shadow-md">
                 <div className="h-full bg-blue-600" style={{ width: `${(uiStats.xp / uiStats.xpToNextLevel) * 100}%` }}></div>
                 <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">LVL {uiStats.level}</span>
            </div>
            <div className="flex gap-2">
                <div className="bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-600 text-white text-xs font-bold">⚔️ {uiStats.damage}</div>
                <div className="bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-600 text-white text-xs font-bold">✨ {uiStats.projectileCount}</div>
            </div>
          </div>

          <div className="absolute top-8 right-8 text-xl font-mono text-white pointer-events-none">
            {Math.floor(gameTimeDisplay / 60)}:{(gameTimeDisplay % 60).toString().padStart(2, '0')}
          </div>
      </div>

      {quizWord && <GameQuizModal word={quizWord} allWords={words} onResult={handleQuizResult} />}
      {showUpgrades && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="w-full max-w-4xl text-center">
                  <h2 className="text-3xl sm:text-5xl font-black text-yellow-400 mb-8">LEVEL UP!</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {showUpgrades.map((o, index) => (
                          <button 
                              key={o.id} 
                              onClick={() => applyUpgrade(o)}
                              className={`p-6 bg-slate-800 border-4 rounded-2xl flex flex-col items-center gap-2 transition-transform duration-100 hover:scale-105 active:scale-95
                                ${index === upgradeFocusedIndex ? 'border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)]' : 'border-slate-600 opacity-80'}
                              `}
                          >
                              <span className="text-4xl">{o.icon}</span>
                              <span className="font-bold text-white">{o.name}</span>
                              <span className="text-xs text-slate-400">{o.description}</span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {gameResult !== 'PLAYING' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center flex flex-col items-center">
                  <h1 className={`text-4xl font-black mb-6 ${gameResult === 'VICTORY' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {gameResult === 'VICTORY' ? 'VICTORY!' : 'GAME OVER'}
                  </h1>
                  
                  {renderStats()}
                  
                  {/* SINGLE ACTION BUTTON */}
                  <button 
                    onClick={onExit} 
                    className="w-full py-6 font-black text-2xl rounded-2xl mb-3 transition-all border-4 bg-slate-800 text-white scale-105 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:bg-slate-700 active:scale-95"
                  >
                    RETRY
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};