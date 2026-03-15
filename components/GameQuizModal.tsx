import React, { useState, useEffect, useRef } from 'react';
import { WordData } from '../types';
import { speakText, playSuccessSound, playErrorSound } from '../services/audioService';

interface GameQuizModalProps {
  word: WordData;
  allWords: WordData[];
  onResult: (correct: boolean) => void;
}

type QuizMode = 'WORD_FROM_DEF' | 'WORD_FROM_AUDIO' | 'DEF_FROM_WORD' | 'CLOZE_SENTENCE' | 'MISSING_LETTERS';

export const GameQuizModal: React.FC<GameQuizModalProps> = ({ word, allWords, onResult }) => {
  const [mode, setMode] = useState<QuizMode>('WORD_FROM_DEF');
  const [choices, setChoices] = useState<WordData[]>([]);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [focusedChoiceIndex, setFocusedChoiceIndex] = useState(0);
  
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  
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
    const modes: QuizMode[] = ['WORD_FROM_DEF', 'WORD_FROM_AUDIO', 'DEF_FROM_WORD', 'MISSING_LETTERS'];
    if (word.exampleSentence && word.exampleSentence.trim().length > 0) {
        modes.push('CLOZE_SENTENCE');
    }
    const selectedMode = modes[Math.floor(Math.random() * modes.length)];
    setMode(selectedMode);

    // Harder distractors: prioritize same part of speech, same starting letter, similar length
    const distractors = allWords
      .filter(w => w.id !== word.id)
      .map(w => {
          let score = Math.random() * 2; // Base randomness
          if (w.partOfSpeech === word.partOfSpeech) score += 5;
          if (w.word[0].toLowerCase() === word.word[0].toLowerCase()) score += 3;
          if (Math.abs(w.word.length - word.word.length) <= 2) score += 2;
          return { word: w, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.word);
      
    const options = [word, ...distractors].sort(() => 0.5 - Math.random());
    setChoices(options);

    if (selectedMode === 'WORD_FROM_AUDIO') {
      setTimeout(() => speakText(word.word), 300);
    }
  }, [word, allWords]);

  // Keyboard Support for Choices
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (status === 'idle') {
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
        // Support 'Enter' for Next Button (status === 'correct')
        if (status === 'correct') {
             if (e.key === 'Enter' || e.key === ' ') {
                 onResult(true);
             }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, status, choices, focusedChoiceIndex]);

  // Gamepad Polling Logic (Fixed for all states)
  useEffect(() => {
    let lastAxisY = 0;
    let lastAxisX = 0;
    let lastButtonState = false;
    let rafId: number;

    const pollGamepad = () => {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = gamepads[0];
        if (gp) {
            const btnA = gp.buttons[0]?.pressed; // A / Cross
            
            // Check for activity to switch input method
            const hasActivity = Math.abs(gp.axes[0]) > 0.5 || Math.abs(gp.axes[1]) > 0.5 || gp.buttons.some(b => b.pressed);
            if (hasActivity) {
                 if (inputMethod !== 'GAMEPAD') setInputMethod('GAMEPAD');
            }

            // 1. Handle Navigation Logic (Idle status)
            if (status === 'idle') {
                const axisX = gp.axes[0];
                const axisY = gp.axes[1];
                
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
                
                // Select Option
                if (btnA && !lastButtonState) {
                    if (choices && choices[focusedChoiceIndex]) {
                        checkChoice(choices[focusedChoiceIndex].id);
                    }
                }
            } 
            // 2. Handle "Next" Button logic (Correct status)
            else if (status === 'correct') {
                if (btnA && !lastButtonState) {
                    // Slight delay to prevent double tapping from choice selection
                    setTimeout(() => onResult(true), 50);
                }
            }

            lastButtonState = btnA;
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
    setTimeout(() => {
        // Auto-focus next button for keyboard users
        nextButtonRef.current?.focus();
    }, 100);
  };

  const handleIncorrect = () => {
    setStatus('incorrect');
    playErrorSound();
    speakText(word.word); // Teach them
    setTimeout(() => onResult(false), 2000); // Longer delay to see answer
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
          {mode === 'WORD_FROM_DEF' && (
             <>
               <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold mb-4">看义选词</span>
               <p className="text-2xl font-bold text-slate-800 text-center">{word.definition}</p>
             </>
          )}
          
          {mode === 'WORD_FROM_AUDIO' && (
            <>
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-bold mb-4">听音选词</span>
              <button 
                onClick={() => speakText(word.word)}
                className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-indigo-600 active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              </button>
            </>
          )}

          {mode === 'DEF_FROM_WORD' && (
             <>
               <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold mb-4">看词选义</span>
               <h1 className="text-5xl font-black text-slate-800 mb-4">{word.word}</h1>
             </>
          )}

          {mode === 'CLOZE_SENTENCE' && (
             <>
               <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold mb-4">句子填空</span>
               <p className="text-2xl font-bold text-slate-800 text-center">
                   {word.exampleSentence.replace(new RegExp(word.word, 'gi'), '___')}
               </p>
               <p className="text-sm text-slate-500 mt-2">({word.definition})</p>
             </>
          )}

          {mode === 'MISSING_LETTERS' && (
             <>
               <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold mb-4">残缺拼写</span>
               <h1 className="text-5xl font-black text-slate-800 mb-4 tracking-[0.2em]">
                   {word.word.split('').map((char, i) => (i % 2 === 1 ? '_' : char)).join('')}
               </h1>
               <p className="text-lg text-slate-600 font-bold">{word.definition}</p>
             </>
          )}
        </div>

        {/* Inputs */}
        <div className="w-full">
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
                  {mode === 'DEF_FROM_WORD' ? choice.definition : choice.word}
                  {focusedChoiceIndex === index && status === 'idle' && (
                      <div className="absolute top-1 right-2 text-indigo-400 text-xs font-bold">
                          {inputMethod === 'GAMEPAD' ? '[A]' : ''}
                      </div>
                  )}
                </button>
              ))}
            </div>
        </div>
        
        {/* Next Button / Continue Hint */}
        {status === 'correct' && (
            <div className="mt-6 flex justify-center animate-fade-in-up">
                <button 
                    ref={nextButtonRef}
                    onClick={() => onResult(true)}
                    className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                    CONTINUE 
                    <span className="bg-green-700 px-2 py-0.5 rounded text-xs ml-2 animate-pulse">[ A ]</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
