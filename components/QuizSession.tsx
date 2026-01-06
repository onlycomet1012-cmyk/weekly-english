import React, { useState, useEffect, useRef } from 'react';
import { WordData, QuizResult } from '../types';
import { playSuccessSound, playErrorSound, playVictorySound, speakText, resumeAudioContext } from '../services/audioService';

interface QuizSessionProps {
  words: WordData[];
  onComplete: (results: QuizResult[]) => void;
  onUpdateWord: (id: string, updates: Partial<WordData>) => void;
  onExit: () => void;
}

type QuizMode = 'SPELL_FROM_DEF' | 'SPELL_FROM_AUDIO' | 'MEANING_FROM_WORD';

export const QuizSession: React.FC<QuizSessionProps> = ({ words, onComplete, onUpdateWord, onExit }) => {
  const [queue, setQueue] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [showHint, setShowHint] = useState(false);
  
  // New States for Mixed Mode
  const [quizMode, setQuizMode] = useState<QuizMode>('SPELL_FROM_DEF');
  const [choices, setChoices] = useState<WordData[]>([]);
  
  const [isFinished, setIsFinished] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const hasInitialized = useRef(false);

  // Cleanup
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (isFinished) {
      playVictorySound();
    }
  }, [isFinished]);

  useEffect(() => {
    if (!hasInitialized.current && words.length > 0) {
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      hasInitialized.current = true;
      setupNewRound(shuffled[0], shuffled);
    }
  }, [words]);

  // SMART PRE-LOADING (OPTIMIZED)
  // Preload images for the next 3 words.
  // We strictly look up from 'words' prop to get the latest URLs (as they might load in background).
  useEffect(() => {
    if (queue.length === 0) return;
    
    const PRELOAD_COUNT = 3;
    // Get the IDs of the next few words in the queue
    const nextIds = queue.slice(currentIndex + 1, currentIndex + 1 + PRELOAD_COUNT).map(w => w.id);
    
    nextIds.forEach(id => {
      // Find the freshest data for this ID from the 'words' prop
      const freshWord = words.find(w => w.id === id);
      if (freshWord?.imageUrl) {
        const img = new Image();
        img.src = freshWord.imageUrl;
      }
    });
  }, [currentIndex, queue, words]); // Added 'words' to dependency to react to background fetches

  // Re-sync currentWord
  const currentWord = queue.length > 0 ? words.find(w => w.id === queue[currentIndex].id) || queue[currentIndex] : null;

  const setupNewRound = (word: WordData, allWords: WordData[]) => {
    const modes: QuizMode[] = ['SPELL_FROM_DEF', 'SPELL_FROM_AUDIO', 'MEANING_FROM_WORD'];
    const nextMode = modes[Math.floor(Math.random() * modes.length)];
    setQuizMode(nextMode);

    if (nextMode === 'MEANING_FROM_WORD') {
      const distractors = allWords
        .filter(w => w.id !== word.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      const options = [word, ...distractors].sort(() => 0.5 - Math.random());
      setChoices(options);
    } else if (nextMode === 'SPELL_FROM_AUDIO') {
       setTimeout(() => speakText(word.word), 500);
    }
  };

  // Focus Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isFinished) return;
      if (status === 'idle') {
        if (quizMode !== 'MEANING_FROM_WORD') {
          inputRef.current?.focus();
        }
      } else if (status === 'correct') {
        nextButtonRef.current?.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [status, currentIndex, quizMode, isFinished]);

  const handleSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || status !== 'idle') return;
    const cleanInput = input.trim().toLowerCase();
    const cleanTarget = currentWord.word.toLowerCase();
    
    // Unlock Audio for iOS
    resumeAudioContext();
    
    if (cleanInput === cleanTarget) {
      handleCorrect();
    } else {
      handleIncorrect();
    }
  };

  const handleChoiceSelect = (selectedId: string) => {
    if (!currentWord || status !== 'idle') return;
    
    // Unlock Audio for iOS
    resumeAudioContext();

    if (selectedId === currentWord.id) {
      handleCorrect();
    } else {
      handleIncorrect();
    }
  };

  const handleCorrect = async () => {
    if (!currentWord) return;
    setStatus('correct');
    
    // 1. Play success effect
    playSuccessSound();

    // 2. Speak the word first
    window.speechSynthesis.cancel();
    speakText(currentWord.word);

    // 3. Read the English quote after a short delay
    if (currentWord.quote) {
      setTimeout(() => {
        // Safe access for both legacy string and new object types
        const textToSpeak = typeof currentWord.quote === 'string' 
          ? currentWord.quote 
          : currentWord.quote?.english;
          
        if (textToSpeak) {
           speakText(textToSpeak, 0.9);
        }
      }, 1000);
    }
    
    const newCount = currentWord.correctCount + 1;
    onUpdateWord(currentWord.id, { 
      correctCount: newCount, 
      lastPracticed: new Date().toISOString() 
    });
  };

  const handleIncorrect = () => {
    setStatus('incorrect');
    playErrorSound();
    setTimeout(() => {
      setStatus('idle');
      setInput('');
      setShowHint(true);
    }, 1000);
  };

  const handleNext = () => {
    window.speechSynthesis.cancel();
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setStatus('idle');
      setInput('');
      setShowHint(false);
      setupNewRound(queue[nextIndex], queue);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col h-full justify-center items-center p-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full text-center animate-fade-in-up flex flex-col items-center">
           <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-sm animate-bounce">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
           </div>
           <h2 className="text-3xl font-bold text-slate-800 mb-2">周任务完成！</h2>
           <p className="text-slate-500 mb-8 text-lg">你已经成功掌握了所有的单词。</p>
           
           <button
             onClick={() => onComplete([])}
             className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
             回到主页
           </button>
        </div>
      </div>
    );
  }

  if (!currentWord) return <div className="p-8 text-center text-slate-500">准备中...</div>;

  const progress = ((currentIndex) / queue.length) * 100;

  const renderQuestion = () => {
    switch (quizMode) {
      case 'SPELL_FROM_DEF':
        return (
          <div className="flex flex-col items-center animate-fade-in">
             <div className="text-xs font-bold text-indigo-500 uppercase tracking-wide bg-indigo-50 inline-block px-3 py-1 rounded-full mb-4">
               根据中文拼写
            </div>
            <p className="text-slate-700 text-xl sm:text-2xl font-medium leading-relaxed px-2 mb-8">
              {currentWord.definition}
            </p>
          </div>
        );
      case 'SPELL_FROM_AUDIO':
        return (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="text-xs font-bold text-pink-500 uppercase tracking-wide bg-pink-50 inline-block px-3 py-1 rounded-full mb-6">
               听音拼写
            </div>
            <button 
              type="button"
              onClick={() => speakText(currentWord.word)}
              className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-200 transition-all active:scale-95 mb-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
            </button>
            <p className="text-slate-400 text-sm mb-2">点击图标重播读音</p>
          </div>
        );
      case 'MEANING_FROM_WORD':
        return (
          <div className="flex flex-col items-center animate-fade-in mb-8">
             <div className="text-xs font-bold text-teal-500 uppercase tracking-wide bg-teal-50 inline-block px-3 py-1 rounded-full mb-4">
               英译中
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">{currentWord.word}</h2>
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4">
      {/* Progress Bar */}
      <div className="bg-white/30 backdrop-blur-sm h-1.5 rounded-full overflow-hidden shrink-0 mx-1">
        <div 
          className="bg-indigo-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden relative flex flex-col min-h-[400px]">
        {/* Card Header */}
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
          <span className="font-semibold text-indigo-100 tracking-wider text-xs uppercase">单词 {currentIndex + 1} / {queue.length}</span>
          <button onClick={onExit} className="text-indigo-200 hover:text-white transition-colors p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-10 flex flex-col items-center text-center flex-1">
          
          {status === 'correct' ? (
            <div className="animate-fade-in flex flex-col items-center w-full gap-6">
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <div className="text-xl sm:text-2xl font-bold text-green-500 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  回答正确!
                </div>
                <div className="text-3xl sm:text-4xl text-slate-800 font-bold capitalize mb-1">{currentWord.word}</div>
                <div className="text-slate-500 text-sm mb-4">{currentWord.definition}</div>
                
                {/* PROVERB / JOKE CARD - BILINGUAL */}
                {currentWord.quote && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full max-w-sm relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Fun Fact / Quote
                    </div>
                    {/* Check if quote is object (new) or string (legacy) */}
                    {typeof currentWord.quote === 'object' ? (
                        <>
                            <p className="text-slate-800 font-medium text-lg leading-relaxed font-serif italic mb-1">
                            “{currentWord.quote.english}”
                            </p>
                            <p className="text-slate-500 text-sm font-light">
                            {currentWord.quote.chinese}
                            </p>
                        </>
                    ) : (
                        <p className="text-slate-700 font-medium text-lg leading-relaxed font-serif italic mb-2">
                            “{currentWord.quote}”
                        </p>
                    )}
                    
                    <button 
                      onClick={() => {
                          const txt = typeof currentWord.quote === 'string' ? currentWord.quote : currentWord.quote?.english;
                          if (txt) speakText(txt, 0.9);
                      }}
                      className="text-amber-500 hover:text-amber-700 transition-colors p-2 mt-1"
                      title="Read aloud"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="w-full flex items-center justify-center">
                <div className="w-full max-w-[200px] aspect-square rounded-xl overflow-hidden shadow-md border border-slate-100 bg-slate-50 flex items-center justify-center relative">
                  {currentWord.imageUrl ? (
                    <img 
                      src={currentWord.imageUrl} 
                      alt={currentWord.word} 
                      className="w-full h-full object-contain animate-fade-in bg-white" 
                    />
                  ) : (
                    <div className="text-slate-300 flex flex-col items-center p-8">
                         <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                  )}
                </div>
              </div>

              <button
                ref={nextButtonRef}
                onClick={handleNext}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-all hover:bg-indigo-700 flex items-center justify-center gap-2 mb-2"
              >
                {currentIndex < queue.length - 1 ? (
                  <>
                    下一个单词
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                  </>
                ) : (
                  <>
                    完成练习
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col w-full flex-1">
              <div className="flex-1 flex flex-col justify-center items-center mb-6 space-y-4 min-h-[120px]">
                {renderQuestion()}
              </div>

              {quizMode === 'MEANING_FROM_WORD' ? (
                <div className="w-full flex flex-col gap-3">
                  {choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleChoiceSelect(choice.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98]
                        ${status === 'incorrect' 
                          ? 'border-slate-100 bg-slate-50 text-slate-400' 
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-slate-700'
                        }`}
                    >
                       {choice.definition}
                    </button>
                  ))}
                  {status === 'incorrect' && (
                     <div className="text-center text-red-500 mt-2 font-medium animate-shake">
                       选择错误，请重试
                     </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSpellingSubmit} className="w-full relative shrink-0 mb-4">
                  <div className={`relative transition-transform duration-300 ${status === 'incorrect' ? 'animate-shake' : ''}`}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="输入单词..."
                      className={`w-full text-center text-2xl sm:text-3xl font-bold py-3 sm:py-4 bg-transparent border-b-2 sm:border-b-4 focus:outline-none transition-colors rounded-none
                        ${status === 'incorrect' ? 'border-red-500 text-red-500' : 
                        'border-slate-200 focus:border-indigo-500 text-slate-800'}`}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                  </div>
                  
                  {showHint && status === 'idle' && (
                    <div className="mt-3 text-sm text-slate-400 animate-fade-in">
                      提示: 首字母是 <span className="font-bold text-slate-600">{currentWord.word.substring(0, 1).toUpperCase()}</span>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="h-4 sm:h-0"></div>
    </div>
  );
};