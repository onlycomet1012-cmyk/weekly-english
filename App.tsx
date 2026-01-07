
import React, { useState, useEffect } from 'react';
import { GameArena } from './components/GameArena';
import { WordData, AppState } from './types';
import { Toaster } from 'react-hot-toast';

// PRESET VOCABULARY LIST
const PRESET_WORDS: WordData[] = [
  { id: '1', word: 'birthday', definition: 'n. 生日', exampleSentence: 'Today is my birthday.', partOfSpeech: 'n', correctCount: 0, quote: { english: 'The more you praise and celebrate your life, the more there is in life to celebrate.', chinese: '你越赞美和庆祝你的生活，生活中就越值得庆祝。' } },
  { id: '2', word: 'sausage', definition: 'n. 香肠', exampleSentence: 'We had sausage for breakfast.', partOfSpeech: 'n', correctCount: 0, quote: { english: 'Laws are like sausages, it is better not to see them being made.', chinese: '法律就像香肠，最好不要看到它们的制作过程。' } },
  { id: '3', word: 'understand', definition: 'v. 理解', exampleSentence: 'Do you understand what I mean?', partOfSpeech: 'v', correctCount: 0, quote: { english: 'Everything that irritates us about others can lead us to an understanding of ourselves.', chinese: '别人让我们恼火的一切都能引导我们了解自己。' } },
  { id: '4', word: 'moment', definition: 'n. 片刻; 瞬间', exampleSentence: 'Wait a moment please.', partOfSpeech: 'n', correctCount: 0, quote: { english: 'Life is not measured by the number of breaths we take, but by the moments that take our breath away.', chinese: '生命的衡量标准不是我们呼吸的次数，而是那些让我们屏住呼吸的时刻。' } },
  { id: '5', word: 'cake', definition: 'n. 蛋糕', exampleSentence: 'I want a piece of cake.', partOfSpeech: 'n', correctCount: 0, quote: { english: 'Let them eat cake.', chinese: '让他们吃蛋糕吧。' } },
  { id: '6', word: 'party', definition: 'n. 聚会', exampleSentence: 'Are you coming to the party?', partOfSpeech: 'n', correctCount: 0, quote: { english: 'A little party never killed nobody.', chinese: '小聚一下死不了人。' } },
  { id: '7', word: 'fries', definition: 'n. 薯条', exampleSentence: 'I love french fries.', partOfSpeech: 'n', correctCount: 0, quote: { english: 'Keep your friends close and your fries closer.', chinese: '亲近你的朋友，更亲近你的薯条。' } },
  { id: '8', word: 'lemonade', definition: 'n. 柠檬水', exampleSentence: 'She drank a glass of lemonade.', partOfSpeech: 'n', correctCount: 0, quote: { english: 'When life gives you lemons, make lemonade.', chinese: '当生活给你柠檬时，就把它做成柠檬水。' } },
  { id: '9', word: 'burger', definition: 'n. 汉堡', exampleSentence: 'He ordered a cheese burger.', partOfSpeech: 'n', correctCount: 0, quote: { english: 'Life is like a burger, the more you add to it, the better it becomes.', chinese: '生活就像汉堡，加的料越多越好。' } },
  { id: '10', word: 'bug', definition: 'n. 虫子; 故障', exampleSentence: 'There is a bug in the code.', partOfSpeech: 'n', correctCount: 0, quote: { english: 'It is not a bug, it is a feature.', chinese: '那不是Bug，那是特性。' } },
  { id: '11', word: 'watermelon', definition: 'n. 西瓜', exampleSentence: 'Watermelon is sweet and juicy.', partOfSpeech: 'n', correctCount: 0, quote: { english: 'Watermelon – it’s a good fruit. You eat, you drink, you wash your face.', chinese: '西瓜是个好水果。又吃又喝还能洗脸。' } },
  { id: '12', word: 'him', definition: 'pron. 他 (宾格)', exampleSentence: 'Give it to him.', partOfSpeech: 'pron', correctCount: 0, quote: { english: 'To know him is to love him.', chinese: '了解他就会爱上他。' } },
  { id: '13', word: 'orange', definition: 'n. 橙子; 橙色', exampleSentence: 'Would you like an orange?', partOfSpeech: 'n', correctCount: 0, quote: { english: 'Orange is the new black.', chinese: '女子监狱 (美剧名，直译橙色是新的黑色)。' } },
  { id: '14', word: 'menu', definition: 'n. 菜单', exampleSentence: 'Can I see the menu?', partOfSpeech: 'n', correctCount: 0, quote: { english: 'Life is like a menu, you have to wait your turn.', chinese: '生活就像菜单，你得等轮到你。' } }
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.INPUT); 
  const [words, setWords] = useState<WordData[]>([]);
  
  // Initial Load - Force hardcoded words
  useEffect(() => {
    setWords(PRESET_WORDS);
    // State is already INPUT, which renders the lobby below
  }, []);

  // Gamepad Polling for Start Screen
  useEffect(() => {
    if (appState !== AppState.INPUT) return;

    let rafId: number;
    let lastButtonState = false;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      
      if (gp) {
        // Button 0 is usually A (Xbox) / X (PS) / B (Nintendo) - the primary bottom button
        if (gp.buttons[0]?.pressed && !lastButtonState) {
          setAppState(AppState.GAME);
          return; 
        }
        lastButtonState = gp.buttons[0]?.pressed;
      }
      rafId = requestAnimationFrame(pollGamepad);
    };

    rafId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(rafId);
  }, [appState]);

  return (
    <div className="w-full h-screen bg-slate-900 overflow-hidden relative">
      
      {appState === AppState.INPUT && (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-pattern">
             <div className="absolute inset-0 bg-slate-900 opacity-90 z-0"></div>
             <div className="relative z-10 w-full max-w-4xl">
                 <div className="bg-white rounded-2xl p-8 shadow-2xl text-center animate-fade-in-up">
                     <h1 className="text-4xl font-black text-slate-800 mb-2">LexiSurvivor</h1>
                     <p className="text-slate-500 mb-8">本周挑战词库已加载 {words.length} 个单词。</p>
                     
                     <div className="flex flex-col items-center gap-3">
                         <button 
                            onClick={() => setAppState(AppState.GAME)}
                            className="py-4 px-12 bg-indigo-600 text-white font-bold rounded-xl text-xl shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all"
                         >
                             ⚔️ 开始生存挑战
                         </button>
                         <div className="text-slate-400 text-sm font-bold animate-pulse tracking-widest border border-slate-600 rounded px-3 py-1 bg-slate-800">
                            [ A ] START GAME
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
        />
      )}
      
      <Toaster position="top-center" />
    </div>
  );
};

export default App;
