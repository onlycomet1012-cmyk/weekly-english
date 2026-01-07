import React, { useState, useEffect, useRef } from 'react';
import { WordData } from '../types';
import { speakText, playSuccessSound, playErrorSound } from '../services/audioService';

interface GameQuizModalProps {
  word: WordData;
  allWords: WordData[];
  onResult: (correct: boolean) => void;
}

type QuizMode = 'SPELL_FROM_DEF' | 'SPELL_FROM_AUDIO' | 'MEANING_FROM_WORD';

export const GameQuizModal: React.FC<GameQuizModalProps> = ({ word, allWords, onResult }) => {
  const [mode, setMode] = useState<QuizMode>('SPELL_FROM_DEF');
  const [input, setInput] = useState('');
  const [choices, setChoices] = useState<WordData[]>([]);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [focusedChoiceIndex, setFocusedChoiceIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Track input method State to drive UI pointer-events
  const [inputMethod, setInputMethod] = useState<'MOUSE' | 'GAMEPAD'>('GAMEPAD');
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Input Method Tracking
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => { 
          // Filter out jitter/phantom moves
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
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, []);

  // Setup
  useEffect(() => {
    const modes: QuizMode[] = ['SPELL_FROM_DEF', 'SPELL_FROM_AUDIO', 'MEANING_FROM_WORD'];
    const selectedMode = modes[Math.floor(Math.random() * modes.length)];
    setMode(selectedMode);

    if (selectedMode === 'MEANING_FROM_WORD') {
      const distractors = allWords
        .filter(w => w.id !== word.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      const options = [word, ...distractors].sort(() => 0.5 - Math.random());
      setChoices(options);
    } else if (selectedMode === 'SPELL_FROM_AUDIO') {
      setTimeout(() => speakText(word.word), 300);
    }
    
    // Auto focus
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [word, allWords]);

  // Keyboard Support for Choices
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (mode === 'MEANING_FROM_WORD' && status === 'idle') {
            if (['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
                setInputMethod('GAMEPAD');
            }

            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                 setFocusedChoiceIndex(prev => Math.max(0, prev - 1));
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                 setFocusedChoiceIndex(prev => Math.min(choices.length - 1, prev + 1));
            }
            if (e.key === 'Enter' || e.key === ' ') {
                if (choices[focusedChoiceIndex]) {
                    checkChoice(choices[focusedChoiceIndex].id);
                }
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, status, choices, focusedChoiceIndex]);

  // Gamepad Polling for Multiple Choice
  useEffect(() => {
    if (mode !== 'MEANING_FROM_WORD' || status !== 'idle') return;

    let lastAxisY = 0;
    let lastAxisX = 0;
    let lastButtonState = false;
    let rafId: number;

    const pollGamepad = () => {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0];
        if (gp) {
            // Check for activity to switch input method
            const hasActivity = Math.abs(gp.axes[0]) > 0.5 || Math.abs(gp.axes[1]) > 0.5 || gp.buttons.some(b => b.pressed);
            if (hasActivity) {
                 if (inputMethod !== 'GAMEPAD') setInputMethod('GAMEPAD');
            }

            const axisX = gp.axes[0];
            const axisY = gp.axes[1];
            
            // Grid is 2x2. 0,1 top row. 2,3 bottom row.
            
            // Left/Right
            if ((axisX < -0.5 || gp.buttons[14]?.pressed) && lastAxisX >= -0.5) { // Left
                setFocusedChoiceIndex(prev => (prev % 2 === 1) ? prev - 1 : prev); 
            }
            if ((axisX > 0.5 || gp.buttons[15]?.pressed) && lastAxisX <= 0.5) { // Right
                setFocusedChoiceIndex(prev => (prev % 2 === 0) ? Math.min(3, prev + 1) : prev);
            }

            // Up/Down
            if ((axisY < -0.5 || gp.buttons[12]?.pressed) && lastAxisY >= -0.5) { // Up
                setFocusedChoiceIndex(prev => (prev >= 2) ? prev - 2 : prev);
            }
            if ((axisY > 0.5 || gp.buttons[13]?.pressed) && lastAxisY <= 0.5) { // Down
                setFocusedChoiceIndex(prev => (prev < 2) ? prev + 2 : prev);
            }

            lastAxisX = axisX;
            lastAxisY = axisY;

            // Select (Button 0 = A / Cross)
            if (gp.buttons[0]?.pressed && !lastButtonState) {
                // Ensure choices exists and index is valid
                if (choices && choices[focusedChoiceIndex]) {
                    checkChoice(choices[focusedChoiceIndex].id);
                }
            }
            lastButtonState = gp.buttons[0]?.pressed;
        }
        
        rafId = requestAnimationFrame(pollGamepad);
    };
    
    rafId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(rafId);
  }, [mode, status, focusedChoiceIndex, choices, inputMethod]);


  const handleCorrect = () => {
    setStatus('correct');
    playSuccessSound();
    speakText(word.word);
    setTimeout(() => onResult(true), 1200);
  };

  const handleIncorrect = () => {
    setStatus('incorrect');
    playErrorSound();
    speakText(word.word); // Teach them
    setTimeout(() => onResult(false), 2000); // Longer delay to see answer
  };

  const checkSpelling = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().toLowerCase() === word.word.toLowerCase()) {
      handleCorrect();
    } else {
      handleIncorrect();
    }
  };

  const checkChoice = (selectedId: string) => {
    if (selectedId === word.id) {
      handleCorrect();
    } else {
      handleIncorrect();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className={`bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl border-4 transform transition-all ${status === 'correct' ? 'border-green-500 scale-105' : status === 'incorrect' ? 'border-red-500 animate-shake' : 'border-indigo-500'}`}>
        
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-1">升级挑战</h2>
          <div className="text-slate-500 text-sm">回答正确获得强力属性提升！</div>
        </div>

        {/* Content */}
        <div className="mb-8 min-h-[150px] flex flex-col justify-center items-center">
          {mode === 'SPELL_FROM_DEF' && (
             <>
               <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold mb-4">看义拼词</span>
               <p className="text-2xl font-bold text-slate-800 text-center">{word.definition}</p>
             </>
          )}
          
          {mode === 'SPELL_FROM_AUDIO' && (
            <>
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-bold mb-4">听音拼词</span>
              <button 
                onClick={() => speakText(word.word)}
                className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-indigo-600 active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              </button>
            </>
          )}

          {mode === 'MEANING_FROM_WORD' && (
             <h1 className="text-5xl font-black text-slate-800 mb-4">{word.word}</h1>
          )}
        </div>

        {/* Inputs */}
        <div className="w-full">
          {mode === 'MEANING_FROM_WORD' ? (
            <div className="grid grid-cols-2 gap-4">
              {choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => checkChoice(choice.id)}
                  onMouseEnter={() => {
                      if (inputMethod === 'MOUSE') {
                          setFocusedChoiceIndex(index);
                      }
                  }}
                  disabled={status !== 'idle'}
                  className={`p-4 rounded-xl font-bold text-lg text-left transition-all border-b-4 active:border-b-0 active:translate-y-1 relative
                    ${inputMethod === 'GAMEPAD' ? 'pointer-events-none' : ''} 
                    ${status === 'correct' && choice.id === word.id ? 'bg-green-500 text-white border-green-700' : 
                      status === 'incorrect' && choice.id === word.id ? 'bg-green-500 text-white border-green-700' : 
                      status === 'incorrect' && choice.id !== word.id ? 'bg-red-100 text-red-400 border-red-200' :
                      focusedChoiceIndex === index ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300 text-indigo-700 scale-105 z-10' :
                      'bg-slate-100 border-slate-300 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700'}`}
                >
                  {choice.definition}
                  {focusedChoiceIndex === index && status === 'idle' && (
                      <div className="absolute top-1 right-2 text-indigo-400 text-xs font-bold">
                          {inputMethod === 'GAMEPAD' ? '[A]' : ''}
                      </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={checkSpelling}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()} // Stop W/A/S/D from moving character
                onKeyUp={(e) => e.stopPropagation()}
                disabled={status !== 'idle'}
                placeholder="输入单词..."
                className={`w-full text-center text-4xl font-mono font-bold py-4 border-b-4 bg-transparent outline-none transition-colors
                  ${status === 'correct' ? 'border-green-500 text-green-600' : 
                    status === 'incorrect' ? 'border-red-500 text-red-500' : 'border-slate-300 focus:border-indigo-500 text-slate-800'}`}
                autoComplete="off"
              />
              {status === 'incorrect' && (
                <div className="text-center mt-2 text-red-500 font-bold animate-fade-in">
                  正确答案: {word.word}
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};