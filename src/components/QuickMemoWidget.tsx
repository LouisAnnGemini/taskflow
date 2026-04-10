import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, parseISO } from 'date-fns';

export function QuickMemoWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { 
    currentSessionMessages, 
    addMemoMessage, 
    updateMemoDraft, 
    openDailyQuickMemo,
    currentDraftId,
    savedDrafts
  } = useTaskStore();

  const today = new Date().toISOString().split('T')[0];
  const dailyTitle = `快捷记录 - ${today}`;
  const isDailyMemoActive = currentDraftId && savedDrafts.find(d => d.id === currentDraftId)?.title === dailyTitle;

  useEffect(() => {
    if (isOpen && isDailyMemoActive) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, currentSessionMessages.length, isDailyMemoActive]);

  const handleOpen = () => {
    openDailyQuickMemo();
    setIsOpen(true);
  };

  const handleClose = () => {
    updateMemoDraft();
    setIsOpen(false);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    addMemoMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
      setInputValue(prev => prev + '\n');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out" style={{ height: '450px' }}>
          {/* Header */}
          <div className="h-12 bg-indigo-600 text-white px-4 flex items-center justify-between shrink-0">
            <span className="font-medium text-sm flex items-center gap-2">
              <MessageCircle size={16} />
              今日快捷记录
            </span>
            <button onClick={handleClose} className="p-1 hover:bg-indigo-700 rounded-lg transition-colors">
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {(!isDailyMemoActive || currentSessionMessages.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <MessageCircle size={32} className="text-slate-300" />
                <p className="text-xs">随时记录您的灵感...</p>
              </div>
            ) : (
              currentSessionMessages.map(msg => (
                <div key={msg.id} className="flex flex-col items-end">
                  <div className="text-[10px] text-slate-400 mb-1 mr-1">
                    {format(parseISO(msg.timestamp), 'HH:mm')}
                  </div>
                  <div className="max-w-[90%] bg-white border border-slate-200 rounded-2xl rounded-tr-sm p-3 shadow-sm">
                    <div className="prose prose-sm prose-slate max-w-none markdown-body text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入记录... (Enter 发送)"
                className="flex-1 resize-none outline-none text-sm p-2 bg-slate-50 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 max-h-24 min-h-[40px]"
                rows={1}
                style={{ height: 'auto' }}
              />
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-10 w-10 flex items-center justify-center"
              >
                <Send size={16} className="-ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:-translate-y-1"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
