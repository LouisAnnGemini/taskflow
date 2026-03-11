import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { Send, CheckCircle2 } from 'lucide-react';

export function QuickCapture() {
  const [title, setTitle] = useState('');
  const { addTask, instantDone, currentUser } = useTaskStore();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ title: title.trim() });
    setTitle('');
  };

  const handleInstantDone = () => {
    if (!title.trim()) return;
    instantDone(title.trim(), currentUser.id);
    setTitle('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-6 relative z-10">
      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="需要做什么？"
          className="flex-1 bg-transparent border-none focus:ring-0 text-base py-2 px-4 outline-none placeholder:text-slate-400"
          autoFocus
        />
        <button
          type="button"
          onClick={handleInstantDone}
          disabled={!title.trim()}
          className="flex items-center gap-2 px-4 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="立即完成 (跳过所有流程)"
        >
          <CheckCircle2 size={18} />
          <span className="hidden sm:inline text-sm">立即完成</span>
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} />
          <span className="hidden sm:inline text-sm">创建任务</span>
        </button>
      </form>
    </div>
  );
}
