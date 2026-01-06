import React from 'react';
import { WordData } from '../types';

interface DashboardProps {
  words: WordData[];
  onStartQuiz: () => void;
  onNewWeek: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ words, onStartQuiz, onNewWeek }) => {
  const totalCorrect = words.reduce((acc, curr) => acc + curr.correctCount, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-5 sm:p-8 border border-white/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">本周词库</h1>
            <p className="text-slate-500 mt-1">共 {words.length} 个单词需要掌握</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={onNewWeek}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              重置本周
            </button>
            <button
              onClick={onStartQuiz}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              开始练习
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {words.map((word) => (
            <div key={word.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors group flex gap-3">
              {word.imageUrl && (
                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <img src={word.imageUrl} alt={word.word} className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-slate-800 capitalize group-hover:text-indigo-600 transition-colors truncate">
                    {word.word}
                  </h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">
                  {word.definition}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-xs text-slate-400">熟练度</span>
                  <div className="flex items-center gap-1">
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 rounded-full ${i < Math.min(word.correctCount, 3) ? 'bg-green-400' : 'bg-slate-200'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-sm text-slate-500 font-medium bg-white/50 inline-block px-4 py-1 rounded-full backdrop-blur-sm">
          累计正确次数: {totalCorrect}
        </p>
      </div>
    </div>
  );
};