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
    <div className="w-full h-screen bg-slate-900 overflow-hidden relative">
      
      {appState === AppState.INPUT && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-pattern">
             <div className="absolute inset-0 bg-slate-900 opacity-90 z-0"></div>
             <div className="relative z-10 w-full max-w-4xl">
                 <div className="bg-white rounded-2xl p-12 shadow-2xl text-center animate-fade-in-up border-4 border-indigo-600">
                     <h1 className="text-6xl sm:text-8xl font-black text-slate-800 mb-12 tracking-tighter uppercase drop-shadow-sm transform -rotate-2">
                       英语<br/><span className="text-indigo-600">幸存者</span>
                     </h1>
                     
                     <div className="flex flex-col items-center gap-6">
                         <button 
                            onClick={() => setAppState(AppState.LEVEL_SELECT)}
                            className="py-6 px-16 w-full max-w-md bg-red-600 text-white font-black rounded-2xl text-3xl shadow-[0_8px_0_rgb(185,28,28)] hover:bg-red-500 hover:shadow-[0_6px_0_rgb(185,28,28)] hover:translate-y-1 active:translate-y-2 active:shadow-none transition-all uppercase tracking-widest"
                         >
                             开始生存挑战
                         </button>
                         <div className="text-slate-400 text-sm font-bold animate-pulse tracking-widest border border-slate-600 rounded px-3 py-1 bg-slate-800">
                            TAP TO START
                         </div>
                     </div>
                 </div>
             </div>
        </div>
      )}

      {appState === AppState.LEVEL_SELECT && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-pattern">
             <div className="absolute inset-0 bg-slate-900 opacity-90 z-0"></div>
             <div className="relative z-10 w-full max-w-5xl">
                 <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl text-center animate-fade-in-up border-4 border-indigo-600">
                     <h1 className="text-5xl sm:text-7xl font-black text-slate-800 mb-8 tracking-tighter uppercase drop-shadow-sm transform -rotate-1">
                       英语<span className="text-indigo-600">幸存者</span>
                     </h1>
                     
                     <div className="mb-8">
                         <h2 className="text-2xl font-bold text-slate-600 mb-6">选择关卡 (Select Level)</h2>
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                             {[1, 2, 3, 4, 5, 6].map(unit => (
                                 <button
                                     key={unit}
                                     onClick={() => {
                                         setSelectedUnit(unit);
                                         startGame(unit);
                                     }}
                                     onMouseEnter={() => setSelectedUnit(unit)}
                                     className={`p-6 rounded-2xl font-black text-2xl transition-all transform active:scale-95 border-4
                                         ${selectedUnit === unit 
                                             ? 'bg-indigo-600 text-white border-indigo-800 scale-105 shadow-xl' 
                                             : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-indigo-100 hover:border-indigo-400'
                                         }
                                     `}
                                 >
                                     UNIT {unit}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div className="flex flex-col items-center gap-4">
                         <div className="text-slate-400 text-sm font-bold animate-pulse tracking-widest border border-slate-600 rounded px-3 py-1 bg-slate-800">
                            SELECT UNIT TO START
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
      
      <Toaster position="top-center" />
    </div>
  );
};

export default App;