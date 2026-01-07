import React from 'react';
import { WordData } from '../types';

interface DashboardProps {
  words: WordData[];
  onStartQuiz: () => void;
  onNewWeek: () => void;
  cycleStart: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ words, onStartQuiz, onNewWeek, cycleStart }) => {
  
  const getCycleDisplay = () => {
    if (!cycleStart) return '';
    const start = new Date(cycleStart);
    const end = new Date(cycleStart);
    end.setDate(end.getDate() + 7);
    
    // Format: MM/DD
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${fmt(start)} - ${fmt(end)}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-5 sm:p-8 border border-white/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">本周词库</h1>
                <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100">
                    {getCycleDisplay()}
                </span>
            </div>
            <p className="text-slate-500">
               {words.length} 个单词 · 自动重置于周六 18:00
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
             <button
              onClick={onNewWeek}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="强制重新输入"
            >
              修改列表
            </button>
            <button
              onClick={onStartQuiz}
              className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              随机考察
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {words.map((word) => (
            <div key={word.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors group flex gap-3 items-center">
              {word.imageUrl && (
                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <img src={word.imageUrl} alt={word.word} className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                    {word.word}
                  </h3>
                  {word.correctCount > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                        已掌握 {word.correctCount}
                      </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                  {word.definition}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};