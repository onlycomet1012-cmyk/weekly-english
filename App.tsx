import React, { useState, useEffect, useRef } from 'react';
import { WordInput } from './components/WordInput';
import { QuizSession } from './components/QuizSession';
import { Dashboard } from './components/Dashboard';
import { WordData, AppState, StoredData } from './types';
import { streamVocabularyEnrichment, fetchMediaForWord } from './services/geminiService';
import { Toaster, toast } from 'react-hot-toast';

const STORAGE_KEY = 'lexiweek_data_v2'; // Bumped version for new schema

// Helper: Calculate the timestamp of the most recent Saturday 18:00
const getCurrentCycleStart = (): number => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 6 = Sat
  const hour = now.getHours();
  
  const cycleStart = new Date(now);
  cycleStart.setHours(18, 0, 0, 0);
  
  // If it is Saturday and past 18:00, the cycle started today.
  if (day === 6 && hour >= 18) {
    return cycleStart.getTime();
  }
  
  // Otherwise, go back to the previous Saturday
  // Sun(0) -> -1, Mon(1) -> -2 ... Fri(5) -> -6, Sat(6)before18h -> -7
  const daysToSubtract = (day === 6) ? 7 : (day + 1);
  cycleStart.setDate(cycleStart.getDate() - daysToSubtract);
  return cycleStart.getTime();
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT); // Default to Input first, will check storage
  const [words, setWords] = useState<WordData[]>([]);
  const [loading, setLoading] = useState(false);
  const [cycleStart, setCycleStart] = useState<number>(0);
  
  const hasSwitchedToDashboardRef = useRef(false);

  // 1. Initial Load & Cycle Check
  useEffect(() => {
    const currentStart = getCurrentCycleStart();
    setCycleStart(currentStart);
    
    const saved = localStorage.getItem(STORAGE_KEY);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Handle migration from old array format to new object format
        if (Array.isArray(parsed)) {
          // Old format detected, force new input for the new system
          localStorage.removeItem(STORAGE_KEY);
          setAppState(AppState.INPUT);
          return;
        }

        const storedData = parsed as StoredData;

        // Check if data belongs to the current week cycle
        if (storedData.cycleStart === currentStart && storedData.words.length > 0) {
          setWords(storedData.words);
          setAppState(AppState.DASHBOARD);
          // toast.success('已加载本周词库', { duration: 2000, icon: '📂' });
        } else {
          // Data is stale (from last week), clear it
          if (storedData.words.length > 0) {
             toast('新的一周开始了 (周六 18:00 重置)', { icon: '📅', duration: 5000 });
          }
          setWords([]);
          setAppState(AppState.INPUT);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error("Failed to parse saved data", e);
        setAppState(AppState.INPUT);
      }
    } else {
      setAppState(AppState.INPUT);
    }
  }, []);

  // 2. Persist Data (Auto-save)
  useEffect(() => {
    if (loading) return; // Don't save empty state while loading
    
    // Only save if we have words OR if we are deliberately in INPUT mode (which usually means empty)
    // But we strictly want to save valid words associated with current cycle.
    if (words.length > 0 && cycleStart > 0) {
       try {
        // Create storage object
        const dataToSave: StoredData = {
          cycleStart: cycleStart,
          words: words.map(w => {
            // Optimization: Maybe don't save huge base64 images if quota is tight,
            // but for now we try to save them to ensure offline availability.
            // If quota fails, we strip images.
            return w;
          })
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        // Quota exceeded fallback: strip images
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
           try {
              const dataToSave: StoredData = {
                cycleStart: cycleStart,
                words: words.map(w => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { imageUrl, ...rest } = w;
                  return rest;
                })
              };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
           } catch (retryError) { /* ignore */ }
        }
      }
    }
  }, [words, cycleStart, loading]);

  const handleUpdateWord = (wordId: string, updates: Partial<WordData>) => {
    setWords(prev => prev.map(w => {
      if (w.id !== wordId) return w;
      return { ...w, ...updates };
    }));
  };
  
  const handleWordsSubmit = async (rawWords: string[]) => {
    setLoading(true);
    hasSwitchedToDashboardRef.current = false;
    setWords([]);
    
    // Ensure we are using the fresh cycle timestamp
    const nowStart = getCurrentCycleStart();
    setCycleStart(nowStart);

    try {
      await streamVocabularyEnrichment(rawWords, async (textWord) => {
        setWords(prev => [...prev, textWord]);

        if (!hasSwitchedToDashboardRef.current) {
          hasSwitchedToDashboardRef.current = true;
          setLoading(false);
          setAppState(AppState.DASHBOARD);
          toast.success('词库生成中...');
        }

        // Background fetch (Images)
        try {
          const enrichedWord = await fetchMediaForWord(textWord);
          if (enrichedWord.imageUrl) {
            handleUpdateWord(enrichedWord.id, enrichedWord);
          }
        } catch (e) {
          console.error(`Media fetch error for ${textWord.word}`, e);
        }
      });

    } catch (error: any) {
      console.error(error);
      if (error.message && (error.message.includes('API Key') || error.message.includes('API_KEY'))) {
        toast.error(error.message, { duration: 6000 });
      } else {
        toast.error('连接超时或服务不可用，请稍后重试。');
      }
      setLoading(false);
    }
  };

  const handleManualReset = () => {
    if (window.confirm("确定要重新输入吗？通常每周只需输入一次 (周六 18:00 自动更新)。")) {
      setWords([]);
      setAppState(AppState.INPUT);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 relative">
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 opacity-80 pointer-events-none"></div>
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-50"></div>
      
      <main className="relative z-10 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-screen justify-center">
        {appState === AppState.INPUT && (
          <WordInput 
            onSubmit={handleWordsSubmit} 
            isLoading={loading} 
            hasExistingData={words.length > 0}
            onCancel={words.length > 0 ? () => setAppState(AppState.DASHBOARD) : undefined}
          />
        )}

        {appState === AppState.DASHBOARD && (
          <Dashboard 
            words={words} 
            onStartQuiz={() => setAppState(AppState.QUIZ)}
            onNewWeek={handleManualReset}
            cycleStart={cycleStart}
          />
        )}

        {appState === AppState.QUIZ && (
          <QuizSession 
            words={words}
            onComplete={() => setAppState(AppState.DASHBOARD)}
            onUpdateWord={handleUpdateWord}
            onExit={() => setAppState(AppState.DASHBOARD)}
          />
        )}
      </main>
      
      <Toaster position="bottom-center" />
    </div>
  );
};

export default App;