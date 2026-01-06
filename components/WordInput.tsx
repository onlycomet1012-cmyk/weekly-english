import React, { useState } from 'react';

interface WordInputProps {
  onSubmit: (words: string[]) => void;
  isLoading: boolean;
  hasExistingData: boolean;
  onCancel?: () => void;
}

export const WordInput: React.FC<WordInputProps> = ({ onSubmit, isLoading, hasExistingData, onCancel }) => {
  const [inputText, setInputText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const words = inputText
      .split(/[\n,，]+/) // Split by newline, comma (eng), or comma (cn)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    if (words.length > 0) {
      onSubmit(words);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-6 sm:p-8 border border-white/50 animate-fade-in-up">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">开启新的一周</h1>
        <p className="text-sm sm:text-base text-slate-500">
          请在下方粘贴本周的生词表。我们将自动搜索图片并匹配音乐。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="words" className="block text-sm font-medium text-slate-700 mb-2">
            词汇列表 (请用逗号或换行分隔)
          </label>
          <textarea
            id="words"
            rows={8}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700 placeholder-slate-400 bg-white"
            placeholder="例如: ephemeral, serendipity, resilient..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {hasExistingData && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors order-2 sm:order-1"
              disabled={isLoading}
            >
              取消
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className={`w-full sm:flex-1 px-6 py-3 rounded-xl text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95 order-1 sm:order-2
              ${isLoading || !inputText.trim() 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5'}`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在匹配资源...
              </span>
            ) : '开始学习'}
          </button>
        </div>
      </form>
    </div>
  );
};