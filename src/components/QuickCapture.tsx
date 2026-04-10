import React, { useState, useRef, useEffect } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { Send, CheckCircle2, UserPlus, Search, Check, Plus, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { Avatar } from './Avatar';
import { getUserDisplayName } from '../utils/user';

export function QuickCapture({ onCapture }: { onCapture?: () => void }) {
  const [title, setTitle] = useState('');
  const [reporterIds, setReporterIds] = useState<string[]>([]);
  const [isReporterOpen, setIsReporterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { addTask, instantDone, currentUser, users, entities, addUser, addEntity } = useTaskStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsReporterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddUserWithEntity = (query: string, currentSelectedIds: string[], updateField: (ids: string[]) => void) => {
    let userName = query;
    let entityName = '';
    
    if (query.includes('-')) {
      const parts = query.split('-');
      userName = parts[0].trim();
      entityName = parts.slice(1).join('-').trim();
    }

    const newUserId = nanoid();
    let entityIds: string[] = [];

    if (entityName) {
      const existingEntity = entities.find(e => e.name.toLowerCase() === entityName.toLowerCase());
      if (existingEntity) {
        entityIds = [existingEntity.id];
      } else {
        const newEntityId = nanoid();
        addEntity({ id: newEntityId, name: entityName });
        entityIds = [newEntityId];
      }
    }

    addUser({ id: newUserId, name: userName, entityIds: entityIds.length > 0 ? entityIds : undefined });
    updateField([...currentSelectedIds, newUserId]);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ title: title.trim(), reporterIds });
    setTitle('');
    setReporterIds([]);
    setIsReporterOpen(false);
    if (onCapture) onCapture();
  };

  const handleInstantDone = () => {
    if (!title.trim()) return;
    instantDone(title.trim(), currentUser.id);
    setTitle('');
    setReporterIds([]);
    setIsReporterOpen(false);
    if (onCapture) onCapture();
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
        
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsReporterOpen(!isReporterOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors border ${
              reporterIds.length > 0 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="添加汇报人/审核人"
          >
            <UserPlus size={16} />
            <span className="hidden sm:inline text-sm">
              {reporterIds.length > 0 ? `已选 ${reporterIds.length} 人` : '汇报人'}
            </span>
          </button>

          {isReporterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2">
              {reporterIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-slate-100">
                  {reporterIds.map(id => {
                    const u = users.find(user => user.id === id);
                    if (!u) return null;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setReporterIds(reporterIds.filter(sid => sid !== u.id))}
                        className="px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
                      >
                        <Avatar name={u.name} className="w-4 h-4 text-[8px]" />
                        {getUserDisplayName(u, entities)}
                        <X size={10} />
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="搜索成员... (如: 张三-集团总部)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery) {
                      e.preventDefault();
                      const matchedUser = users.find(u => u.name.toLowerCase() === searchQuery.toLowerCase()) || users.find(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
                      if (matchedUser) {
                        const isSelected = reporterIds.includes(matchedUser.id);
                        const newReporters = isSelected
                          ? reporterIds.filter(id => id !== matchedUser.id)
                          : [...reporterIds, matchedUser.id];
                        setReporterIds(newReporters);
                      } else {
                        handleAddUserWithEntity(searchQuery, reporterIds, setReporterIds);
                      }
                      setSearchQuery('');
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                
                {searchQuery && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50 border-t-0">
                    {users
                      .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(u => {
                        const isSelected = reporterIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              const newReporters = isSelected
                                ? reporterIds.filter(id => id !== u.id)
                                : [...reporterIds, u.id];
                              setReporterIds(newReporters);
                              setSearchQuery('');
                            }}
                            className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between font-medium ${
                              isSelected ? 'bg-slate-50 text-slate-900' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar name={u.name} className="w-5 h-5 text-[10px]" />
                              {getUserDisplayName(u, entities)}
                            </div>
                            {isSelected && <Check size={14} />}
                          </button>
                        );
                      })}
                    {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          handleAddUserWithEntity(searchQuery, reporterIds, setReporterIds);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2.5 text-xs text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-2 border-t border-slate-100"
                      >
                        <Plus size={14} /> 快速新建: {searchQuery}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
