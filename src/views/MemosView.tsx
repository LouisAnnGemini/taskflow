import React, { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { Plus, Trash2, Edit3, Check, X, StickyNote } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export function MemosView() {
  const { memos, addMemo, updateMemo, deleteMemo } = useTaskStore();
  const [newMemoContent, setNewMemoContent] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingMemoId, setDeletingMemoId] = useState<string | null>(null);

  const handleAddMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoContent.trim()) return;
    addMemo(newMemoContent.trim());
    setNewMemoContent('');
  };

  const startEditing = (id: string, content: string) => {
    setEditingMemoId(id);
    setEditContent(content);
  };

  const cancelEditing = () => {
    setEditingMemoId(null);
    setEditContent('');
  };

  const saveEdit = (id: string) => {
    if (!editContent.trim()) return;
    updateMemo(id, editContent.trim());
    setEditingMemoId(null);
    setEditContent('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between px-4 md:px-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <StickyNote className="text-indigo-600" />
          备忘录
        </h1>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          共 {memos.length} 条
        </span>
      </div>

      {/* Add Memo Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleAddMemo} className="space-y-4">
          <textarea
            value={newMemoContent}
            onChange={(e) => setNewMemoContent(e.target.value)}
            placeholder="写下您的想法、灵感或笔记..."
            className="w-full bg-slate-50 border-slate-200 rounded-xl p-4 min-h-[100px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newMemoContent.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Plus size={18} />
              添加备忘录
            </button>
          </div>
        </form>
      </div>

      {/* Memos List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {memos.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <StickyNote className="text-slate-300" size={32} />
            </div>
            <p className="text-slate-400 font-medium">还没有备忘录，开始记录吧！</p>
          </div>
        ) : (
          memos.map((memo) => (
            <div 
              key={memo.id} 
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col"
            >
              {editingMemoId === memo.id ? (
                <div className="space-y-3 flex-1 flex flex-col">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full flex-1 bg-slate-50 border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEditing}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                    <button
                      onClick={() => saveEdit(memo.id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 whitespace-pre-wrap text-slate-700 text-sm leading-relaxed mb-4">
                    {memo.content}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {format(parseISO(memo.updatedAt), 'yyyy年MM月dd日 HH:mm')}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deletingMemoId === memo.id ? (
                        <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-xl border border-red-100 transition-all duration-200 ease-out transform scale-100 opacity-100">
                          <span className="text-[10px] font-bold text-red-600 mr-1">确定？</span>
                          <button
                            onClick={() => {
                              deleteMemo(memo.id);
                              setDeletingMemoId(null);
                            }}
                            className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => setDeletingMemoId(null)}
                            className="px-2.5 py-1 bg-white text-slate-500 text-[10px] font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(memo.id, memo.content)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingMemoId(memo.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
