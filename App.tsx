import React, { useState, useEffect } from 'react';
import { GameArena } from './components/GameArena';
import { WordData, AppState } from './types';
import { Toaster, toast } from 'react-hot-toast';
import { UNIT_DATA } from './units';
import { HERO_SPRITE } from './assets/hero';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT); 
  const [words, setWords] = useState<WordData[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number>(1);
  const [aiSpriteUrl, setAiSpriteUrl] = useState<string | null>(HERO_SPRITE);
  
  // Initial Load - default to Unit 1
  useEffect(() => {
    setWords(UNIT_DATA[1]);
  }, []);

  // Gamepad Polling for Start Screen
  useEffect(() => {
    if (appState !== AppState.INPUT && appState !== AppState.LEVEL_SELECT) return;

    let rafId: number;
    let lastButtonState = false;
    let lastAxisX = 0;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      
      if (gp) {
        if (appState === AppState.LEVEL_SELECT) {
          // Navigation
          const axisX = gp.axes[0];
          if (axisX < -0.5 && lastAxisX >= -0.5) {
              setSelectedUnit(prev => Math.max(1, prev - 1));
          }
          if (axisX > 0.5 && lastAxisX <= 0.5) {
              setSelectedUnit(prev => Math.min(6, prev + 1));
          }
          lastAxisX = axisX;
        }

        // Button 0 is usually A (Xbox) / X (PS) / B (Nintendo) - the primary bottom button
        if (gp.buttons[0]?.pressed && !lastButtonState) {
          if (appState === AppState.INPUT) {
             setAppState(AppState.LEVEL_SELECT);
          } else if (appState === AppState.LEVEL_SELECT) {
             startGame(selectedUnit);
          }
          return; 
        }
        lastButtonState = gp.buttons[0]?.pressed;
      }
      rafId = requestAnimationFrame(pollGamepad);
    };

    rafId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(rafId);
  }, [appState, selectedUnit, aiSpriteUrl]);

  const startGame = (unit: number) => {
      setWords(UNIT_DATA[unit] || UNIT_DATA[1]);
      setAppState(AppState.GAME);
  };

  return (
    <div className="w-full h-screen bg-slate-950 overflow-hidden relative font-sans text-slate-100">
      
      {/* Global Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 z-0 mix-blend-overlay pointer-events-none"></div>

      {appState === AppState.INPUT && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative z-10">
             <div className="relative w-full max-w-4xl">
                 {/* Glowing Orbs */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[80px] -z-10 pointer-events-none"></div>

                 <div className="text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                     <h1 className="text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 mb-4 tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                       ENGLISH<br/>
                       <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]">SURVIVOR</span>
                     </h1>
                     <p className="text-slate-400 text-xl font-medium tracking-widest uppercase mb-16">Learn to Survive. Survive to Learn.</p>
                     
                     <div className="flex flex-col items-center gap-8">
                         <button 
                            onClick={() => setAppState(AppState.LEVEL_SELECT)}
                            className="group relative py-6 px-16 w-full max-w-md bg-slate-900/80 backdrop-blur-md text-white font-black rounded-3xl text-2xl border-2 border-indigo-500/50 shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:border-indigo-400 hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] hover:-translate-y-1 active:translate-y-2 active:shadow-none transition-all uppercase tracking-widest overflow-hidden"
                         >
                             <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                             <span className="relative z-10 drop-shadow-md">START GAME</span>
                         </button>
                         <div className="text-indigo-300/70 text-sm font-bold animate-pulse tracking-[0.3em] uppercase">
                            Press Any Button To Start
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      )}

      {appState === AppState.LEVEL_SELECT && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 relative z-10">
             <div className="relative w-full max-w-5xl">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

                 <div className="bg-slate-900/60 backdrop-blur-xl rounded-[3rem] p-8 md:p-16 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center animate-in fade-in zoom-in-95 duration-500 border border-slate-700/50">
                     <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 mb-12 tracking-widest uppercase drop-shadow-sm">
                         SELECT MISSION
                     </h2>
                     
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
                         {[1, 2, 3, 4, 5, 6].map(unit => (
                             <button
                                 key={unit}
                                 onClick={() => {
                                     setSelectedUnit(unit);
                                     startGame(unit);
                                 }}
                                 onMouseEnter={() => setSelectedUnit(unit)}
                                 className={`group relative p-8 rounded-3xl font-black text-3xl transition-all transform active:scale-95 border-2 overflow-hidden
                                     ${selectedUnit === unit 
                                         ? 'bg-indigo-600/20 text-white border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)] scale-105' 
                                         : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:border-slate-500 hover:text-slate-200'
                                     }
                                 `}
                             >
                                 <div className={`absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-0 transition-opacity duration-300 ${selectedUnit === unit ? 'opacity-100' : 'group-hover:opacity-50'}`}></div>
                                 <span className="relative z-10 drop-shadow-md">UNIT {unit}</span>
                             </button>
                         ))}
                     </div>

                     <div className="flex flex-col items-center gap-4">
                         <div className="text-slate-500 text-sm font-bold animate-pulse tracking-[0.2em] uppercase">
                            [A] CONFIRM / [ARROWS] NAVIGATE
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      )}

      {appState === AppState.GAME && (
        <GameArena 
          words={words} 
          onExit={() => setAppState(AppState.INPUT)}
          aiSpriteUrl={aiSpriteUrl}
        />
      )}
      
      <Toaster position="top-center" toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            borderRadius: '1rem',
            fontWeight: 'bold',
          }
      }} />
    </div>
  );
};

export default App;