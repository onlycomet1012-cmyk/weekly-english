import React, { useRef, useEffect, useState } from 'react';
import { WordData, Entity, PlayerStats, UpgradeOption } from '../types';
import { AssetTypes, loadBasicAssets, SPRITESHEET_URL, getRandomSprite } from '../services/gameAssetService';
import { GameQuizModal } from './GameQuizModal';
import { playShootSound, playHitSound, playVictorySound } from '../services/audioService';

interface GameArenaProps {
  words: WordData[];
  onExit: () => void;
}

// === CONFIGURATION ===
const FPS = 60;
const SPAWN_RATE_INITIAL = 100;
const BASE_XP_REQUIREMENT = 10;

// Fixed Logical Resolution (16:9 FHD)
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;

// Upgrade Definitions
const UPGRADES: UpgradeOption[] = [
  { 
    id: 'dmg_up', name: '肌肉强化', description: '伤害 +20%', icon: '💪',
    apply: (s) => ({ ...s, damage: Math.ceil(s.damage * 1.2) }) 
  },
  { 
    id: 'spd_up', name: '疾风步', description: '移动速度 +10%', icon: '👟',
    apply: (s) => ({ ...s, speed: s.speed * 1.1 }) 
  },
  { 
    id: 'atk_spd', name: '疯狂射击', description: '攻击速度 +15%', icon: '🔫',
    apply: (s) => ({ ...s, attackSpeed: Math.max(5, Math.floor(s.attackSpeed * 0.85)) }) 
  },
  { 
    id: 'hp_up', name: '坚韧', description: '最大生命 +30 (当前+30)', icon: '❤️',
    apply: (s) => ({ ...s, maxHp: s.maxHp + 30, hp: s.hp + 30 }) 
  },
  { 
    id: 'multishot', name: '多重射击', description: '额外子弹 +1 (叠加)', icon: '✨',
    apply: (s) => ({ ...s, projectileCount: s.projectileCount + 1 }) 
  },
  { 
    id: 'range_up', name: '磁铁', description: '拾取范围 +50%', icon: '🧲',
    apply: (s) => ({ ...s, pickupRange: s.pickupRange * 1.5 }) 
  }
];

export const GameArena: React.FC<GameArenaProps> = ({ words, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // -- GAME STATE REFS --
  const playerRef = useRef<Entity>({
    id: 'hero', 
    x: GAME_WIDTH / 2, 
    y: GAME_HEIGHT / 2, 
    width: 64, height: 64, 
    type: 'HERO', vx: 0, vy: 0, hp: 100, maxHp: 100, damage: 10,
    direction: 'DOWN', animFrame: 0, isMoving: false
  });
  
  const statsRef = useRef<PlayerStats>({
    hp: 100, maxHp: 100, 
    speed: 4, 
    damage: 10, attackSpeed: 30, 
    projectileSpeed: 4, 
    pickupRange: 120,
    projectileCount: 1, 
    level: 1, xp: 0, xpToNextLevel: BASE_XP_REQUIREMENT
  });
  
  const enemiesRef = useRef<Entity[]>([]);
  const projectilesRef = useRef<Entity[]>([]);
  const xpGemsRef = useRef<Entity[]>([]);
  const frameCountRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  
  const gameTimeRef = useRef(0);
  const isPausedRef = useRef(false);
  const animationFrameId = useRef<number>(0);
  
  // Asset Refs
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const spriteSheetRef = useRef<HTMLImageElement | null>(null);
  const [areResourcesLoaded, setAreResourcesLoaded] = useState(false);

  // Logic Refs
  const remainingWordsRef = useRef<WordData[]>([]);
  const bossSpawnedRef = useRef(false);
  const killCountsRef = useRef({ mobs: 0, elites: 0, bosses: 0 });

  // UI Sync Refs
  const quizWordRef = useRef<WordData | null>(null);
  const showUpgradesRef = useRef<UpgradeOption[] | null>(null);
  const isGamepadActiveRef = useRef(false);
  
  // Input Method State
  const [inputMethod, setInputMethod] = useState<'MOUSE' | 'GAMEPAD'>('GAMEPAD');
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // -- REACT STATE --
  const [uiStats, setUiStats] = useState<PlayerStats>(statsRef.current);
  const [gameResult, setGameResult] = useState<'PLAYING' | 'DEFEAT' | 'VICTORY'>('PLAYING');
  const [quizWord, setQuizWord] = useState<WordData | null>(null);
  const [showUpgrades, setShowUpgrades] = useState<UpgradeOption[] | null>(null);
  const [gameTimeDisplay, setGameTimeDisplay] = useState(0);
  const [upgradeFocusedIndex, setUpgradeFocusedIndex] = useState(0);
  const [isGamepadActive, setIsGamepadActive] = useState(false);

  // Sync Refs with State
  useEffect(() => { quizWordRef.current = quizWord; }, [quizWord]);
  useEffect(() => { showUpgradesRef.current = showUpgrades; }, [showUpgrades]);
  useEffect(() => { isGamepadActiveRef.current = isGamepadActive; }, [isGamepadActive]);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
      } else {
          document.exitFullscreen().catch(() => {});
      }
  };

  // 1. INITIALIZE GAME DATA (Run Once)
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `* { cursor: none !important; }`;
    document.head.appendChild(style);

    remainingWordsRef.current = [...words].sort(() => Math.random() - 0.5);

    // LOAD SPRITE SHEET
    const sheet = new Image();
    sheet.src = SPRITESHEET_URL;
    sheet.onload = () => {
        spriteSheetRef.current = sheet;
        setAreResourcesLoaded(true);
        animationFrameId.current = requestAnimationFrame(gameLoop);
    };
    sheet.onerror = () => {
        console.warn("Sprite sheet not found. Falling back to simple shapes.");
        // Do not fail, just mark as loaded so loop starts
        setAreResourcesLoaded(true);
        animationFrameId.current = requestAnimationFrame(gameLoop);
    };

    // LOAD BASIC ASSETS (Hero, XP)
    const handleAssetLoad = (key: string, url: string) => {
        const img = new Image();
        img.src = url;
        // Simple synchronous-like loading for data URIs
        spritesRef.current[key] = img;
    };
    loadBasicAssets(handleAssetLoad);

    // Input Tracking
    const handleMouseMove = (e: MouseEvent) => { 
        const dist = Math.abs(e.clientX - lastMousePos.current.x) + Math.abs(e.clientY - lastMousePos.current.y);
        if (dist > 5) {
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            setInputMethod('MOUSE');
        }
    };
    const handleKeyDown = () => { setInputMethod('GAMEPAD'); };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        document.head.removeChild(style);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('keydown', handleKeyDown);
        cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  // 2. INPUT HANDLERS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
        if (isPausedRef.current) return;
        keysRef.current[e.key.toLowerCase()] = true; 
        
        if (isGamepadActiveRef.current) {
            setIsGamepadActive(false); 
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
        keysRef.current[e.key.toLowerCase()] = false; 
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 3. SYSTEM GAMEPAD POLLING
  useEffect(() => {
    let rafId: number;
    let lastButtonState = false;

    const pollSystemButtons = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      
      if (gp) {
        if (gp.buttons[1]?.pressed && !lastButtonState) {
          toggleFullscreen();
        }
        lastButtonState = gp.buttons[1]?.pressed;
      }
      rafId = requestAnimationFrame(pollSystemButtons);
    };
    
    rafId = requestAnimationFrame(pollSystemButtons);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Gamepad Polling for Upgrade Menu
  useEffect(() => {
    if (!showUpgrades) return;

    let lastAxisX = 0;
    let lastButtonState = false;
    let rafId: number;

    // Keyboard Handler
    const handleMenuKey = (e: KeyboardEvent) => {
        setInputMethod('GAMEPAD');
        if (e.key === 'ArrowLeft') setUpgradeFocusedIndex(prev => Math.max(0, prev - 1));
        if (e.key === 'ArrowRight') setUpgradeFocusedIndex(prev => Math.min(2, prev + 1));
        if (e.key === 'Enter' || e.key === ' ') {
             const selected = showUpgrades[upgradeFocusedIndex];
             if (selected) applyUpgrade(selected);
        }
    };
    window.addEventListener('keydown', handleMenuKey);

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      
      if (gp) {
        const hasActivity = Math.abs(gp.axes[0]) > 0.5 || gp.buttons.some(b => b.pressed);
        if (hasActivity) {
            if (!isGamepadActive) setIsGamepadActive(true);
            if (inputMethod !== 'GAMEPAD') setInputMethod('GAMEPAD');
        }
        
        const axisX = gp.axes[0];
        const isLeft = axisX < -0.5 || gp.buttons[14]?.pressed;
        const isRight = axisX > 0.5 || gp.buttons[15]?.pressed;
        
        if (isLeft && lastAxisX >= -0.5) {
            setUpgradeFocusedIndex(prev => Math.max(0, prev - 1));
        } else if (isRight && lastAxisX <= 0.5) {
            setUpgradeFocusedIndex(prev => Math.min(2, prev + 1));
        }
        lastAxisX = axisX;

        if (gp.buttons[0]?.pressed && !lastButtonState) {
             const selected = showUpgrades[upgradeFocusedIndex];
             if (selected) applyUpgrade(selected);
        }
        lastButtonState = gp.buttons[0]?.pressed;
      }
      
      rafId = requestAnimationFrame(pollGamepad);
    };
    
    rafId = requestAnimationFrame(pollGamepad);
    return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('keydown', handleMenuKey);
    };
  }, [showUpgrades, upgradeFocusedIndex, isGamepadActive, inputMethod]);


  // === GAME LOOP ===
  const gameLoop = () => {
    if (gameResult !== 'PLAYING' || !areResourcesLoaded) return;
    if (!isPausedRef.current) update();
    draw();
    animationFrameId.current = requestAnimationFrame(gameLoop);
  };

  // === UPDATE LOGIC ===
  const update = () => {
    if (quizWordRef.current || showUpgradesRef.current) {
        if (!isPausedRef.current) isPausedRef.current = true;
        return;
    }

    const player = playerRef.current;
    const stats = statsRef.current;

    frameCountRef.current++;
    if (frameCountRef.current % 60 === 0) {
        gameTimeRef.current++;
        setGameTimeDisplay(gameTimeRef.current);
    }

    // 1. Player Movement
    let dx = 0; let dy = 0;
    if (keysRef.current['w'] || keysRef.current['arrowup']) dy -= 1;
    if (keysRef.current['s'] || keysRef.current['arrowdown']) dy += 1;
    if (keysRef.current['a'] || keysRef.current['arrowleft']) dx -= 1;
    if (keysRef.current['d'] || keysRef.current['arrowright']) dx += 1;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
        const deadzone = 0.2;
        let hasInput = false;
        
        if (Math.abs(gp.axes[0]) > deadzone) { dx += gp.axes[0]; hasInput = true; }
        if (Math.abs(gp.axes[1]) > deadzone) { dy += gp.axes[1]; hasInput = true; }
        if (gp.buttons[12]?.pressed) { dy -= 1; hasInput = true; }
        if (gp.buttons[13]?.pressed) { dy += 1; hasInput = true; }
        if (gp.buttons[14]?.pressed) { dx -= 1; hasInput = true; }
        if (gp.buttons[15]?.pressed) { dx += 1; hasInput = true; }
        
        if (hasInput && !isGamepadActiveRef.current) {
            setIsGamepadActive(true);
        }
    }

    if (dx !== 0 || dy !== 0) {
        player.isMoving = true;
        if (Math.abs(dx) > Math.abs(dy)) {
            player.direction = dx > 0 ? 'RIGHT' : 'LEFT';
        } else {
            player.direction = dy > 0 ? 'DOWN' : 'UP';
        }

        const length = Math.sqrt(dx * dx + dy * dy);
        const normalizedFactor = length > 1 ? 1 / length : 1;
        player.x += (dx * normalizedFactor) * stats.speed;
        player.y += (dy * normalizedFactor) * stats.speed;
    } else {
        player.isMoving = false;
    }

    const now = performance.now();
    if (!player.lastAnimTime || now - player.lastAnimTime > 120) {
        player.animFrame = (player.animFrame || 0) + 1;
        player.lastAnimTime = now;
    }

    const halfW = player.width / 2;
    const halfH = player.height / 2;
    player.x = Math.max(halfW, Math.min(GAME_WIDTH - halfW, player.x));
    player.y = Math.max(halfH, Math.min(GAME_HEIGHT - halfH, player.y));

    spawnEnemies();

    enemiesRef.current.forEach(enemy => {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      
      const speed = enemy.type.includes('ELITE') ? 2.0 
                  : enemy.type === 'BOSS' ? 1.2 
                  : 1.5;

      enemy.vx = Math.cos(angle) * speed;
      enemy.vy = Math.sin(angle) * speed;
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;

      if (enemy.type === 'BOSS' && frameCountRef.current % 120 === 0) spawnBossBullets(enemy);
      if (enemy.type === 'ELITE_RANGED' && frameCountRef.current % 180 === 0) spawnEnemyBullet(enemy, player);

      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < (player.width/2 + enemy.width/2)) {
         if (frameCountRef.current % 30 === 0) takeDamage(enemy.damage);
      }
    });

    if (frameCountRef.current % stats.attackSpeed === 0) fireBullet();

    projectilesRef.current = projectilesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy;
      let hit = false;
      if (p.type === 'PROJECTILE') {
          for (const enemy of enemiesRef.current) {
            if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < (enemy.width / 2 + 15)) {
              enemy.hp -= p.damage;
              hit = true;
              try { playHitSound(); } catch(e) {}
              break;
            }
          }
      } else {
           if (Math.hypot(p.x - player.x, p.y - player.y) < (player.width / 2 + 15)) {
               takeDamage(p.damage);
               hit = true;
           }
      }
      const oob = p.x < 0 || p.x > GAME_WIDTH || p.y < 0 || p.y > GAME_HEIGHT;
      return !oob && !hit;
    });

    enemiesRef.current = enemiesRef.current.filter(e => {
      if (e.hp <= 0) {
        if (e.type === 'BOSS') {
            killCountsRef.current.bosses++;
            setGameResult('VICTORY');
            playVictorySound();
            isPausedRef.current = true;
        } else if (e.type.includes('ELITE')) {
            killCountsRef.current.elites++;
        } else {
            killCountsRef.current.mobs++;
        }

        xpGemsRef.current.push({
          id: Math.random().toString(),
          x: e.x, y: e.y, width: 24, height: 24, type: 'XP',
          vx: 0, vy: 0, hp: 1, maxHp: 1, damage: 0
        });
        return false;
      }
      return true;
    });

    xpGemsRef.current = xpGemsRef.current.filter(gem => {
      const dist = Math.hypot(player.x - gem.x, player.y - gem.y);
      if (dist < stats.pickupRange) {
        gem.x += (player.x - gem.x) * 0.15;
        gem.y += (player.y - gem.y) * 0.15;
        if (dist < 30) {
          gainXp(1);
          return false;
        }
      }
      return true;
    });
    
    if (frameCountRef.current % 10 === 0) setUiStats({...statsRef.current});
  };

  const calculateScore = () => {
    return (killCountsRef.current.mobs * 1) + 
           (killCountsRef.current.elites * 10) + 
           (killCountsRef.current.bosses * 100);
  };

  const spawnEnemies = () => {
      const time = gameTimeRef.current;
      const spawnRate = Math.max(20, SPAWN_RATE_INITIAL - Math.floor(time / 2)); 
      
      if (remainingWordsRef.current.length === 0 && !bossSpawnedRef.current && !quizWord) {
          spawnEntity('BOSS');
          bossSpawnedRef.current = true;
          return;
      }

      if (frameCountRef.current % spawnRate === 0) {
          const r = Math.random();
          let type = 'MOB';
          
          const canSpawnElite = statsRef.current.level > 1;
          if (canSpawnElite && time > 30 && r > 0.9) type = 'ELITE';
          if (canSpawnElite && time > 60 && r > 0.8) type = 'ELITE';
          
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

      // Get random sprite from sheet config
      const spriteSource = getRandomSprite(category);

      let entity: Entity = {
          id: Math.random().toString(),
          x, y, vx: 0, vy: 0, 
          type: category === 'ELITE' && Math.random() > 0.5 ? 'ELITE_RANGED' : category as any,
          width: 50, height: 50, // Default size
          hp: 2, maxHp: 2, damage: 1,
          spriteSource: spriteSource
      };

      if (category === 'BOSS') {
          entity = { ...entity, width: 250, height: 250, hp: 1000, maxHp: 1000, damage: 10 };
      } else if (category === 'ELITE') {
          entity = { ...entity, hp: 40, maxHp: 40, damage: 5, width: 90, height: 90 }; 
      } else {
          // Mob HP = 2
          entity = { ...entity, hp: 2, maxHp: 2 };
      }
      enemiesRef.current.push(entity);
  };

  const fireBullet = () => {
    try { playShootSound(); } catch(e) {}
    const p = playerRef.current;
    const count = statsRef.current.projectileCount || 1;
    
    for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const offsetX = (Math.random() - 0.5) * p.width * 0.8;
            const offsetY = (Math.random() - 0.5) * p.height * 0.8;

            projectilesRef.current.push({
            id: Math.random().toString(),
            x: p.x + offsetX,
            y: p.y + offsetY,
            width: 14, height: 14, type: 'PROJECTILE',
            vx: Math.cos(angle) * statsRef.current.projectileSpeed,
            vy: Math.sin(angle) * statsRef.current.projectileSpeed,
            hp: 1, maxHp: 1, damage: statsRef.current.damage
        });
    }
  };

  const spawnEnemyBullet = (enemy: Entity, target: Entity) => {
      const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
      projectilesRef.current.push({
          id: Math.random().toString(),
          x: enemy.x, y: enemy.y, width: 20, height: 20, type: 'ENEMY_PROJECTILE',
          vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, hp: 1, maxHp: 1, damage: 5
      });
  };

  const spawnBossBullets = (boss: Entity) => {
      for (let i = 0; i < 12; i++) {
          const angle = (Math.PI * 2 / 12) * i;
          projectilesRef.current.push({
              id: Math.random().toString(),
              x: boss.x, y: boss.y, width: 24, height: 24, type: 'ENEMY_PROJECTILE',
              vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6, hp: 1, maxHp: 1, damage: 10
          });
      }
  };

  const takeDamage = (amount: number) => {
      statsRef.current.hp -= amount;
      if (statsRef.current.hp <= 0) { setGameResult('DEFEAT'); isPausedRef.current = true; }
  };

  const gainXp = (amount: number) => {
      statsRef.current.xp += amount;
      if (statsRef.current.xp >= statsRef.current.xpToNextLevel) triggerLevelUp();
  };

  const triggerLevelUp = () => {
      isPausedRef.current = true;
      keysRef.current = {}; 
      if (remainingWordsRef.current.length > 0) {
          const nextWord = remainingWordsRef.current.pop();
          if (nextWord) {
              setQuizWord(nextWord);
              return;
          }
      } 
      showUpgradeMenu();
  };

  const showUpgradeMenu = () => {
      isPausedRef.current = true; 
      const options = [...UPGRADES].sort(() => 0.5 - Math.random()).slice(0, 3);
      setShowUpgrades(options);
      setUpgradeFocusedIndex(1);
  };

  const handleQuizResult = (correct: boolean) => {
      setQuizWord(null);
      if (correct) { 
          showUpgradeMenu(); 
      } else {
          statsRef.current.xp = 0;
          statsRef.current.xpToNextLevel = statsRef.current.xpToNextLevel + 2;
          isPausedRef.current = false;
      }
  };

  const applyUpgrade = (opt: UpgradeOption) => {
      statsRef.current = opt.apply(statsRef.current);
      statsRef.current.projectileCount += 1;
      
      statsRef.current.level += 1;
      statsRef.current.xp = 0;
      statsRef.current.xpToNextLevel = statsRef.current.xpToNextLevel + 2;
      setShowUpgrades(null);
      isPausedRef.current = false;
  };

  // === DRAW ===
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a'; 
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 100;
    for (let x = 0; x < GAME_WIDTH; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < GAME_HEIGHT; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(GAME_WIDTH, y); ctx.stroke();
    }

    // DRAW ENTITY HELPER
    const drawSprite = (e: Entity, fallbackColor: string) => {
        // 1. If it has a Sprite Source (from sheet) AND Sheet is loaded
        if (e.spriteSource && spriteSheetRef.current) {
            ctx.imageSmoothingEnabled = false; // Pixel art look
            ctx.drawImage(
                spriteSheetRef.current,
                e.spriteSource.x, e.spriteSource.y, e.spriteSource.w, e.spriteSource.h, // Source
                e.x - e.width / 2, e.y - e.height / 2, e.width, e.height // Dest
            );
            return;
        }

        // 2. If it has a dedicated asset URL (Hero, XP, or legacy assets)
        let spriteKey: string = e.type;
        if (e.type === 'HERO') {
            const dir = e.direction || 'DOWN';
            if (!e.isMoving && spritesRef.current['HERO_IDLE']) {
                spriteKey = 'HERO_IDLE';
            } else if (spritesRef.current[`HERO_${dir}`]) {
                spriteKey = `HERO_${dir}`;
            }
        } else if (e.spriteUrl) {
            spriteKey = e.spriteUrl;
        }

        const sprite = spritesRef.current[spriteKey];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            const isStrip = sprite.naturalWidth > sprite.naturalHeight;
            if (isStrip && e.type === 'HERO') {
                const frameCount = Math.round(sprite.naturalWidth / sprite.naturalHeight);
                const frameIndex = (e.animFrame || 0) % frameCount;
                const fw = sprite.naturalWidth / frameCount;
                const fh = sprite.naturalHeight;
                
                ctx.drawImage(
                    sprite, 
                    frameIndex * fw, 0, fw, fh, 
                    e.x - e.width/2, e.y - e.height/2, e.width, e.height
                );
            } else {
                ctx.drawImage(sprite, e.x - e.width/2, e.y - e.height/2, e.width, e.height);
            }
        } else {
            // Fallback Circle/Rect
            ctx.fillStyle = fallbackColor;
            if (e.type === 'XP') {
                ctx.beginPath(); ctx.arc(e.x, e.y, e.width/2, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillRect(e.x - e.width/2, e.y - e.height/2, e.width, e.height);
            }
        }
    };

    xpGemsRef.current.forEach(gem => drawSprite(gem, '#fbbf24'));
    enemiesRef.current.forEach(e => {
        drawSprite(e, e.type === 'BOSS' ? '#dc2626' : '#64748b');
    });
    
    const p = playerRef.current;
    drawSprite(p, '#6366f1');

    projectilesRef.current.forEach(p => {
        ctx.fillStyle = p.type === 'PROJECTILE' ? '#fbbf24' : '#ef4444';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.width/2, 0, Math.PI*2); ctx.fill();
    });
  };

  return (
    <div 
      className={`fixed inset-0 w-full h-full bg-black flex items-center justify-center`}
      style={{ cursor: 'none' }}
    >
      <canvas 
        ref={canvasRef} 
        width={GAME_WIDTH} 
        height={GAME_HEIGHT}
        className="bg-slate-900 shadow-2xl pointer-events-none"
        style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            aspectRatio: '16/9',
            cursor: 'none' 
        }}
      />

      <button 
        onClick={toggleFullscreen}
        className="fixed top-4 right-4 z-50 bg-white/20 hover:bg-white/40 text-white p-2 rounded-lg backdrop-blur-sm transition-all pointer-events-auto"
        title="Toggle Fullscreen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>

      <div className="fixed top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
        <div className="w-64 h-6 bg-slate-700 rounded-full border-2 border-white overflow-hidden relative shadow-lg">
             <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${(uiStats.hp / uiStats.maxHp) * 100}%` }}></div>
             <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white text-shadow">
                 HP {Math.ceil(uiStats.hp)} / {uiStats.maxHp}
             </span>
        </div>
        <div className="w-64 h-4 bg-slate-700 rounded-full border border-white/50 overflow-hidden relative shadow-lg">
             <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(uiStats.xp / uiStats.xpToNextLevel) * 100}%` }}></div>
             <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white text-shadow">
                 LVL {uiStats.level} (Bullets: {uiStats.projectileCount})
             </span>
        </div>
      </div>

      <div className="fixed top-4 left-1/2 -translate-x-1/2 text-2xl font-black text-white drop-shadow-lg font-mono pointer-events-none z-10">
          {Math.floor(gameTimeDisplay / 60).toString().padStart(2, '0')}:{(gameTimeDisplay % 60).toString().padStart(2, '0')}
      </div>

      {quizWord && <GameQuizModal word={quizWord} allWords={words} onResult={handleQuizResult} />}

      {showUpgrades && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
              <div className="w-[90vw] max-w-7xl p-8">
                  <h2 className="text-5xl font-black text-yellow-400 text-center mb-4 uppercase tracking-widest drop-shadow-md">Level Up!</h2>
                  <p className="text-center text-yellow-200 text-2xl mb-12 font-bold">+1 额外子弹 (被动获取)</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {showUpgrades.map((opt, index) => (
                          <button 
                            key={opt.id}
                            onClick={() => applyUpgrade(opt)}
                            onMouseEnter={() => {
                                if (inputMethod === 'MOUSE') {
                                    setUpgradeFocusedIndex(index);
                                }
                            }}
                            className={`p-10 rounded-3xl flex flex-col items-center gap-8 transition-all group border-4 relative overflow-hidden min-h-[400px] justify-center
                                ${inputMethod === 'GAMEPAD' ? 'pointer-events-none' : ''}
                                ${upgradeFocusedIndex === index 
                                    ? 'bg-slate-700 border-yellow-400 scale-105 shadow-2xl shadow-yellow-500/30 z-10' 
                                    : 'bg-slate-800 border-slate-600 hover:border-yellow-400 hover:bg-slate-700'
                                }`}
                          >
                              <div className={`text-8xl ${upgradeFocusedIndex === index ? 'animate-bounce' : 'group-hover:animate-bounce'}`}>{opt.icon}</div>
                              <div className="text-4xl font-black text-white">{opt.name}</div>
                              <div className="text-xl text-slate-300 text-center leading-relaxed font-medium">{opt.description}</div>
                              {upgradeFocusedIndex === index && (
                                  <div className="text-yellow-400 text-xl font-bold mt-4 animate-pulse tracking-widest border-2 border-yellow-400 px-4 py-1 rounded-full">
                                      [ A ] SELECT
                                  </div>
                              )}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {gameResult !== 'PLAYING' && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md ${gameResult === 'VICTORY' ? 'bg-yellow-900/90' : 'bg-red-900/90'} pointer-events-auto`}>
              <div className="text-center p-12 bg-white rounded-3xl shadow-2xl max-w-lg w-full">
                  <h1 className={`text-5xl font-black mb-2 ${gameResult === 'VICTORY' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {gameResult === 'VICTORY' ? 'VICTORY!' : 'YOU DIED'}
                  </h1>
                  
                  <div className="text-6xl font-black text-slate-800 mb-8 drop-shadow-md">
                      {calculateScore()} <span className="text-2xl font-bold text-slate-500">PTS</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8 mt-6">
                      <div className="bg-slate-100 p-3 rounded-lg flex flex-col items-center">
                          <span className="text-2xl font-bold text-slate-700">{killCountsRef.current.mobs}</span>
                          <span className="text-xs text-slate-500 uppercase font-bold">小怪 (1pt)</span>
                      </div>
                      <div className="bg-slate-100 p-3 rounded-lg flex flex-col items-center">
                          <span className="text-2xl font-bold text-slate-700">{killCountsRef.current.elites}</span>
                          <span className="text-xs text-slate-500 uppercase font-bold">精英 (10pts)</span>
                      </div>
                      <div className="bg-slate-100 p-3 rounded-lg flex flex-col items-center border-2 border-yellow-400">
                          <span className="text-2xl font-bold text-yellow-600">{killCountsRef.current.bosses}</span>
                          <span className="text-xs text-slate-500 uppercase font-bold">BOSS (100pts)</span>
                      </div>
                  </div>

                  <p className="text-indigo-600 font-bold mb-8">最终等级: {uiStats.level}</p>
                  
                  <div className="flex gap-4 justify-center">
                    <button onClick={() => window.location.reload()} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700">重试</button>
                    <button onClick={onExit} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">退出</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};