import React, { useState, useEffect, useRef } from 'react';
import { WordInput } from './components/WordInput';
import { QuizSession } from './components/QuizSession';
import { Dashboard } from './components/Dashboard';
import { WordData, AppState } from './types';
import { streamVocabularyEnrichment, fetchMediaForWord } from './services/geminiService';
import { Toaster, toast } from 'react-hot-toast';

const STORAGE_KEY = 'lexiweek_data_v1';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.DASHBOARD);
  const [words, setWords] = useState<WordData[]>([]);
  const [loading, setLoading] = useState(false);
  
  const hasSwitchedToDashboardRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWords(parsed);
        if (parsed.length === 0) {
          setAppState(AppState.INPUT);
        }
      } catch (e) {
        console.error("Failed to parse saved data", e);
        setAppState(AppState.INPUT);
      }
    } else {
      setAppState(AppState.INPUT);
    }
  }, []);

  useEffect(() => {
    if (words.length === 0) {
       if (appState === AppState.INPUT) { 
          localStorage.removeItem(STORAGE_KEY);
       }
       return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
         try {
            const dataToSave = words.map(w => {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { imageUrl, ...rest } = w;
              return rest;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
         } catch (retryError) { /* ignore */ }
      }
    }
  }, [words, appState]);

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

    try {
      await streamVocabularyEnrichment(rawWords, async (textWord) => {
        setWords(prev => [...prev, textWord]);

        if (!hasSwitchedToDashboardRef.current) {
          hasSwitchedToDashboardRef.current = true;
          setLoading(false);
          setAppState(AppState.DASHBOARD);
          toast.success('开始生成单词...');
        }

        // Background fetch (Images only now)
        try {
          const enrichedWord = await fetchMediaForWord(textWord);
          if (enrichedWord.imageUrl) {
            handleUpdateWord(enrichedWord.id, enrichedWord);
          }
        } catch (e) {
          console.error(`Media fetch error for ${textWord.word}`, e);
        }
      });

    } catch (error) {
      console.error(error);
      toast.error('连接超时，请检查网络。');
      setLoading(false);
    }
  };

  const handleResetWeek = () => {
    if (window.confirm("确定要重置吗？这将删除当前的进度并开始新的一周。")) {
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
            onNewWeek={handleResetWeek}
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