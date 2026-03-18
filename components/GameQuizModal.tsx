import React, { useState, useEffect, useRef } from 'react';
import { WordData } from '../types';
import { speakText, playSuccessSound, playErrorSound } from '../services/audioService';

interface GameQuizModalProps {
  word: WordData;
  allWords: WordData[];
  onResult: (correct: boolean) => void;
}

type QuizMode = 'WORD_FROM_DEF' | 'WORD_FROM_AUDIO' | 'DEF_FROM_WORD' | 'CLOZE_SENTENCE' | 'MISSING_LETTERS' | 'TYPING_INPUT';

export const GameQuizModal: React.FC<GameQuizModalProps> = ({ word, allWords, onResult }) => {
  const [mode, setMode] = useState<QuizMode>('WORD_FROM_DEF');
  const [choices, setChoices] = useState<WordData[]>([]);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [focusedChoiceIndex, setFocusedChoiceIndex] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typingTargetWord, setTypingTargetWord] = useState('');
  
  const nextButtonRef = useRef<HTMLButtonElement>(null);
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
    const modes: QuizMode[] = ['WORD_FROM_DEF', 'WORD_FROM_AUDIO', 'DEF_FROM_WORD', 'MISSING_LETTERS', 'TYPING_INPUT'];
    if (word.exampleSentence && word.exampleSentence.trim().length > 0) {
        modes.push('CLOZE_SENTENCE');
    }
    const selectedMode = modes[Math.floor(Math.random() * modes.length)];
    setMode(selectedMode);

    if (selectedMode === 'TYPING_INPUT') {
        // If it's a phrase or sentence, pick a random word to type
        if (word.partOfSpeech === 'phrase' || word.partOfSpeech === 'sentence') {
            const words = word.word.split(/[\s,!?.]+/).filter(w => w.length > 0);
            const target = words[Math.floor(Math.random() * words.length)];
            setTypingTargetWord(target);
        } else {
            setTypingTargetWord(word.word);
        }

        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    }

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

            if (mode !== 'TYPING_INPUT') {
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
            } else {
                if (e.key === 'Enter') {
                    checkTypingAnswer();
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
            if (status === 'idle' && mode !== 'TYPING_INPUT') {
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

  const checkTypingAnswer = () => {
      const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,!?'" ]/g, '');
      if (normalize(typedAnswer) === normalize(typingTargetWord)) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300 p-4">
      <div className={`bg-slate-900 rounded-3xl p-8 sm:p-10 w-full max-w-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border-2 transform transition-all duration-300 relative overflow-hidden
        ${status === 'correct' ? 'border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.3)] scale-105' : 
          status === 'incorrect' ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-shake' : 
          'border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.2)]'}`}>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="text-center mb-8 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase tracking-widest mb-2 drop-shadow-sm">
              LEVEL UP CHALLENGE
          </h2>
          <div className="text-slate-400 text-sm font-medium tracking-wide uppercase">Answer correctly to gain powerful upgrades!</div>
        </div>

        {/* Content */}
        <div className="mb-10 min-h-[160px] flex flex-col justify-center items-center relative z-10 bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
          {mode === 'WORD_FROM_DEF' && (
             <>
               <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-6 shadow-inner">Definition Match</span>
               <p className="text-2xl sm:text-3xl font-bold text-white text-center leading-relaxed drop-shadow-md">{word.definition}</p>
             </>
          )}
          
          {mode === 'WORD_FROM_AUDIO' && (
            <>
              <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-6 shadow-inner">Listening Test</span>
              <button 
                onClick={() => speakText(word.word)}
                className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95 transition-all group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="transform group-hover:scale-110 transition-transform"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
              </button>
            </>
          )}

          {mode === 'DEF_FROM_WORD' && (
             <>
               <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-6 shadow-inner">Word Meaning</span>
               <h1 className="text-5xl sm:text-7xl font-black text-white mb-2 drop-shadow-lg tracking-tight">{word.word}</h1>
             </>
          )}

          {mode === 'CLOZE_SENTENCE' && (
             <>
               <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-6 shadow-inner">Fill in the Blank</span>
               <p className="text-2xl sm:text-3xl font-bold text-white text-center leading-relaxed drop-shadow-md">
                   {word.exampleSentence.replace(new RegExp(word.word, 'gi'), '_____')}
               </p>
               <p className="text-sm text-slate-400 mt-4 font-medium bg-slate-900/50 px-4 py-2 rounded-lg">Hint: {word.definition}</p>
             </>
          )}

          {mode === 'MISSING_LETTERS' && (
             <>
               <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-6 shadow-inner">Missing Letters</span>
               <h1 className="text-5xl sm:text-7xl font-black text-white mb-4 tracking-[0.2em] drop-shadow-lg">
                   {word.word.split('').map((char, i) => (i % 2 === 1 ? '_' : char)).join('')}
               </h1>
               <p className="text-lg text-slate-300 font-medium bg-slate-900/50 px-4 py-2 rounded-lg">{word.definition}</p>
             </>
          )}

          {mode === 'TYPING_INPUT' && (
             <>
               <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-6 shadow-inner">Type the Word</span>
               <p className="text-2xl sm:text-3xl font-bold text-white text-center leading-relaxed drop-shadow-md mb-4">{word.definition}</p>
               
               {(word.partOfSpeech === 'phrase' || word.partOfSpeech === 'sentence') && (
                   <p className="text-xl sm:text-2xl font-bold text-slate-300 text-center leading-relaxed drop-shadow-md mb-4">
                       {word.word.replace(new RegExp(`\\b${typingTargetWord}\\b`, 'i'), '_____')}
                   </p>
               )}

               <button 
                 onClick={() => speakText(word.word)}
                 className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-white hover:bg-slate-600 transition-colors"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
               </button>
             </>
          )}
        </div>

        {/* Inputs */}
        <div className="w-full relative z-10">
            {mode === 'TYPING_INPUT' ? (
                <div className="flex flex-col gap-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && status === 'idle') {
                                checkTypingAnswer();
                            }
                        }}
                        disabled={status !== 'idle'}
                        placeholder="Type here..."
                        className={`w-full p-6 rounded-2xl font-bold text-2xl text-center transition-all border-2 bg-slate-800/80 text-white outline-none
                            ${status === 'correct' ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 
                              status === 'incorrect' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 
                              'border-indigo-500 focus:border-indigo-400 focus:shadow-[0_0_20px_rgba(99,102,241,0.4)]'}`}
                    />
                    {status === 'idle' && (
                        <button
                            onClick={checkTypingAnswer}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 text-lg tracking-widest uppercase"
                        >
                            SUBMIT
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className={`p-5 rounded-2xl font-bold text-lg text-left transition-all relative overflow-hidden border-2
                        ${inputMethod === 'GAMEPAD' ? 'pointer-events-none' : ''} 
                        ${status === 'correct' && choice.id === word.id ? 'bg-green-500/20 text-green-300 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 
                          status === 'incorrect' && choice.id === word.id ? 'bg-green-500/20 text-green-300 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 
                          status === 'incorrect' && choice.id !== word.id ? 'bg-red-500/10 text-red-400 border-red-500/30 opacity-50' :
                          focusedChoiceIndex === index ? 'bg-indigo-600/20 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-[1.02] z-10' :
                          'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500'}`}
                    >
                      <span className="relative z-10">{mode === 'DEF_FROM_WORD' ? choice.definition : choice.word}</span>
                      
                      {/* Subtle highlight for focused item */}
                      {focusedChoiceIndex === index && status === 'idle' && (
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none"></div>
                      )}
                      
                      {focusedChoiceIndex === index && status === 'idle' && (
                          <div className="absolute top-1/2 -translate-y-1/2 right-4 text-indigo-400 text-xs font-black tracking-widest bg-indigo-950/50 px-2 py-1 rounded">
                              {inputMethod === 'GAMEPAD' ? '[A]' : 'SELECT'}
                          </div>
                      )}
                    </button>
                  ))}
                </div>
            )}
        </div>
        
        {/* Next Button / Continue Hint */}
        {status === 'correct' && (
            <div className="mt-8 flex justify-center animate-in slide-in-from-bottom-4 fade-in duration-300 relative z-10">
                <button 
                    ref={nextButtonRef}
                    onClick={() => onResult(true)}
                    className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all active:scale-95 flex items-center gap-3 text-lg tracking-widest uppercase border border-green-400/50"
                >
                    CONTINUE 
                    <span className="bg-black/20 px-2 py-1 rounded text-sm ml-2 animate-pulse border border-black/10">[ A ]</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
