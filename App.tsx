import React, { useState, useEffect } from 'react';
import { GameArena } from './components/GameArena';
import { WordData, AppState } from './types';
import { Toaster } from 'react-hot-toast';

// PRESET VOCABULARY LIST
const PRESET_WORDS: WordData[] = [
  { id: '1', word: 'feeling', definition: '感觉', exampleSentence: 'Toby\'s feelings', partOfSpeech: 'n', correctCount: 0 },
  { id: '2', word: 'tired', definition: '疲惫的', exampleSentence: 'He is tired.', partOfSpeech: 'adj', correctCount: 0 },
  { id: '3', word: 'sad', definition: '难过的', exampleSentence: 'She is sad.', partOfSpeech: 'adj', correctCount: 0 },
  { id: '4', word: 'angry', definition: '生气的', exampleSentence: 'He is angry.', partOfSpeech: 'adj', correctCount: 0 },
  { id: '5', word: 'scared', definition: '害怕的', exampleSentence: 'Ann is scared.', partOfSpeech: 'adj', correctCount: 0 },
  { id: '6', word: 'cry', definition: '哭', exampleSentence: 'Don\'t cry.', partOfSpeech: 'v', correctCount: 0 },
  { id: '7', word: 'laugh', definition: '笑', exampleSentence: 'They laugh.', partOfSpeech: 'v', correctCount: 0 },
  { id: '8', word: 'stamp', definition: '跺（脚）', exampleSentence: 'Stamp your feet.', partOfSpeech: 'v', correctCount: 0 },
  { id: '9', word: 'sleep', definition: '睡觉', exampleSentence: 'Go to sleep.', partOfSpeech: 'v', correctCount: 0 },
  { id: '10', word: 'new', definition: '新的', exampleSentence: 'I don\'t like your new game.', partOfSpeech: 'adj', correctCount: 0 },
  { id: '11', word: 'game', definition: '游戏', exampleSentence: 'Let\'s play the game.', partOfSpeech: 'n', correctCount: 0 },
  { id: '12', word: 'excited', definition: '兴奋的', exampleSentence: 'Tutu is excited.', partOfSpeech: 'adj', correctCount: 0 },
  { id: '13', word: 'sorry', definition: '对不起', exampleSentence: 'I\'m sorry.', partOfSpeech: 'adj', correctCount: 0 },
  { id: '14', word: 'like', definition: '喜欢；像', exampleSentence: 'Do you like the game?', partOfSpeech: 'v/prep', correctCount: 0 },
  { id: '15', word: 'but', definition: '但是', exampleSentence: 'But I am happy.', partOfSpeech: 'conj', correctCount: 0 },
  { id: '16', word: 'unhappy', definition: '不开心的', exampleSentence: 'He is unhappy.', partOfSpeech: 'adj', correctCount: 0 },
  { id: '17', word: 'worried', definition: '担心的', exampleSentence: 'She is worried.', partOfSpeech: 'adj', correctCount: 0 },
  { id: '18', word: 'not', definition: '不，不是', exampleSentence: 'I am not sad.', partOfSpeech: 'adv', correctCount: 0 },
  { id: '19', word: 'lose', definition: '丢失', exampleSentence: 'Li Ling loses her favourite doll.', partOfSpeech: 'v', correctCount: 0 },
  { id: '20', word: 'doll', definition: '玩偶', exampleSentence: 'This is a doll.', partOfSpeech: 'n', correctCount: 0 },
  { id: '21', word: 'football', definition: '足球', exampleSentence: 'Du Peng plays football all day.', partOfSpeech: 'n', correctCount: 0 },
  { id: '22', word: 'candy', definition: '糖果', exampleSentence: 'A bird takes John\'s candy away.', partOfSpeech: 'n', correctCount: 0 },
  { id: '23', word: 'away', definition: '移走', exampleSentence: 'Take it away.', partOfSpeech: 'adv', correctCount: 0 },
  { id: '24', word: 'big', definition: '大的', exampleSentence: 'A big mouse jumps out!', partOfSpeech: 'adj', correctCount: 0 },
  { id: '25', word: 'mouse', definition: '老鼠', exampleSentence: 'A big mouse jumps out!', partOfSpeech: 'n', correctCount: 0 },
  { id: '26', word: 'talk about', definition: '讨论，谈论', exampleSentence: 'Let\'s talk about it.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '27', word: 'go to sleep', definition: '去睡觉', exampleSentence: 'It\'s time to go to sleep.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '28', word: 'happy birthday!', definition: '生日快乐！', exampleSentence: 'Happy birthday to you!', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '29', word: 'thank you.', definition: '谢谢。', exampleSentence: 'Thank you very much.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '30', word: 'have/has got', definition: '有，拥有', exampleSentence: 'I\'ve got a game.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '31', word: 'play the game', definition: '玩游戏', exampleSentence: 'Let\'s play the game.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '32', word: 'play football', definition: '踢足球', exampleSentence: 'Du Peng plays football all day.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '33', word: 'all day', definition: '整天', exampleSentence: 'He plays all day.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '34', word: 'take sb/sth away', definition: '带走······', exampleSentence: 'A bird takes John\'s candy away.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '35', word: 'jump out', definition: '跳出来', exampleSentence: 'A big mouse jumps out!', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '36', word: 'a big box of', definition: '一大盒的······', exampleSentence: 'A big box of candy.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '37', word: 'find food', definition: '寻找食物', exampleSentence: 'They find food.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '38', word: 'such as', definition: '例如', exampleSentence: 'Fruits such as apples.', partOfSpeech: 'phrase', correctCount: 0 },
  { id: '39', word: 'Toby\'s feelings', definition: '托比的感受', exampleSentence: 'Toby\'s feelings', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '40', word: 'Tutu is excited.', definition: '图图很兴奋。', exampleSentence: 'Tutu is excited.', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '41', word: 'I\'ve got a game. Let\'s play!', definition: '我有个游戏。我们来玩吧！', exampleSentence: 'I\'ve got a game. Let\'s play!', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '42', word: 'I don\'t like your new game.', definition: '我不喜欢你的新游戏。', exampleSentence: 'I don\'t like your new game.', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '43', word: 'Do you like the game? Yes, it\'s great!', definition: '你喜欢这个游戏吗？是的，太棒了！', exampleSentence: 'Do you like the game? Yes, it\'s great!', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '44', word: 'Let\'s play the game. OK! It\'s fun!', definition: '我们来玩游戏吧。好的！这很有趣！', exampleSentence: 'Let\'s play the game. OK! It\'s fun!', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '45', word: 'I\'m sorry. Dad. That\'s OK, Tutu.', definition: '我很抱歉。爸爸。没关系，图图。', exampleSentence: 'I\'m sorry. Dad. That\'s OK, Tutu.', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '46', word: 'How is he/she feeling?', definition: '他/她感觉怎么样？', exampleSentence: 'How is he/she feeling?', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '47', word: 'He is angry/tired.', definition: '他很生气/累。', exampleSentence: 'He is angry/tired.', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '48', word: 'How are you feeling today?', definition: '你今天感觉怎么样？', exampleSentence: 'How are you feeling today?', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '49', word: 'I\'m happy.', definition: '我很高兴。', exampleSentence: 'I\'m happy.', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '50', word: 'Li Ling loses her favourite doll. She is sad.', definition: '李玲失去了她最喜欢的玩偶。她很伤心。', exampleSentence: 'Li Ling loses her favourite doll. She is sad.', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '51', word: 'Du Peng plays football all day. He is tired.', definition: '杜鹏整天踢足球。他累了。', exampleSentence: 'Du Peng plays football all day. He is tired.', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '52', word: 'A bird takes John\'s candy away. He is angry.', definition: '一只鸟拿走了约翰的糖果。他很生气。', exampleSentence: 'A bird takes John\'s candy away. He is angry.', partOfSpeech: 'sentence', correctCount: 0 },
  { id: '53', word: 'A big mouse jumps out! Ann is scared.', definition: '一只大老鼠跳了出来！安很害怕。', exampleSentence: 'A big mouse jumps out! Ann is scared.', partOfSpeech: 'sentence', correctCount: 0 }
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
                 <div className="bg-white rounded-2xl p-12 shadow-2xl text-center animate-fade-in-up border-4 border-indigo-600">
                     <h1 className="text-6xl sm:text-8xl font-black text-slate-800 mb-12 tracking-tighter uppercase drop-shadow-sm transform -rotate-2">
                       英语<br/><span className="text-indigo-600">幸存者</span>
                     </h1>
                     
                     <div className="flex flex-col items-center gap-6">
                         <button 
                            onClick={() => setAppState(AppState.GAME)}
                            className="py-6 px-16 bg-red-600 text-white font-black rounded-2xl text-3xl shadow-[0_8px_0_rgb(185,28,28)] hover:bg-red-500 hover:shadow-[0_6px_0_rgb(185,28,28)] hover:translate-y-1 active:translate-y-2 active:shadow-none transition-all uppercase tracking-widest"
                         >
                             开始生存挑战
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