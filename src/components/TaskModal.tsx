import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskState, ActivityLog } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { getUserDisplayName } from '../utils/user';
import { X, Calendar, User, Tag, AlignLeft, ListTree, Activity, Clock, Trash2, Settings2, Check, RotateCcw, Edit3, Search, Plus, ArrowUpRight, Copy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { nanoid } from 'nanoid';
import { TaskCard } from './TaskCard';
import { Avatar } from './Avatar';
import { ProcessVisualizer } from './ProcessVisualizer';
import { TaskGraph } from './TaskGraph';

interface TaskModalProps {
  taskId: string;
  onClose: () => void;
}

export function TaskModal({ taskId, onClose }: TaskModalProps) {
  const { getTask, updateTask, deleteTask, users, columns, priorities, mediums, entities, currentUser, getSubtasks, activityLogs, addTask, updateActivityLog, deleteActivityLog, setActivityLogs, customFieldDefinitions, fieldOrder, addUser, changeTaskState, setSelectedTaskId, convertSubtaskToTask, relateTask, highlightedLogId, setHighlightedLogId } = useTaskStore();
  const task = getTask(taskId);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [taskId]);

  const [activeTab, setActiveTab] = useState<'details' | 'logs' | 'graph'>('details');

  // Switch to logs tab if highlightedLogId is set
  useEffect(() => {
    if (highlightedLogId) {
      setActiveTab('logs');
      // Wait for tab switch and render
      setTimeout(() => {
        const logElement = document.getElementById(`log-${highlightedLogId}`);
        if (logElement) {
          logElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          logElement.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-50');
          setTimeout(() => {
            logElement.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-50');
            setHighlightedLogId(null); // Clear highlight after animation
          }, 2000);
        }
      }, 100);
    }
  }, [highlightedLogId, setHighlightedLogId]);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [relatedTaskSearchQuery, setRelatedTaskSearchQuery] = useState('');
  const [isManagingLogs, setIsManagingLogs] = useState(false);
  const [tempLogs, setTempLogs] = useState<ActivityLog[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [fieldSearchQueries, setFieldSearchQueries] = useState<Record<string, string>>({});

  if (!task) return null;

  const subtasks = getSubtasks(task.id);
  const logs = activityLogs.filter(log => log.taskId === task.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const handleUpdate = (updates: Partial<Task>) => {
    if (updates.state && updates.state !== task.state) {
      changeTaskState(task.id, updates.state, currentUser.id);
      if (Object.keys(updates).length > 1) {
        updateTask(task.id, { ...updates, state: undefined });
      }
    } else {
      updateTask(task.id, updates);
    }
  };

  const handleCustomFieldUpdate = (fieldId: string, value: any) => {
    const currentFields = task.customFields || {};
    handleUpdate({
      customFields: {
        ...currentFields,
        [fieldId]: value
      }
    });
  };

  const renderField = (config: any) => {
    if (!config.isVisible) return null;

    if (config.isCustom) {
      const definition = customFieldDefinitions.find(d => d.id === config.id);
      if (!definition) return null;

      const value = task.customFields?.[definition.id];
      const hasManyOptions = (definition.options?.length || 0) > 10;
      const searchQuery = fieldSearchQueries[definition.id] || '';

      return (
          <div key={config.id} className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{definition.name}</label>
            {definition.type === 'text' && (
              <input 
                type="text"
                value={value || ''}
                onChange={(e) => handleCustomFieldUpdate(definition.id, e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder={`输入${definition.name}...`}
              />
            )}
            {definition.type === 'number' && (
              <input 
                type="number"
                value={value || ''}
                onChange={(e) => handleCustomFieldUpdate(definition.id, e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all data-value"
              />
            )}
            {definition.type === 'date' && (
              <input 
                type="date"
                value={value || ''}
                onChange={(e) => handleCustomFieldUpdate(definition.id, e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all data-value"
              />
            )}
          {definition.type === 'select' && (
            <div className="space-y-2">
              {hasManyOptions ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="搜索并选择..."
                      value={searchQuery}
                      onChange={(e) => setFieldSearchQueries({ ...fieldSearchQueries, [definition.id]: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  {/* Selected Value Display */}
                  {value && !searchQuery && (
                    <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                      <span className="text-sm text-indigo-700 font-medium">
                        {definition.options?.find(opt => opt.id === value)?.label || value}
                      </span>
                      <button 
                        onClick={() => handleCustomFieldUpdate(definition.id, '')}
                        className="text-indigo-400 hover:text-indigo-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Search Results */}
                  {searchQuery && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm max-h-40 overflow-y-auto divide-y divide-slate-50">
                      {definition.options
                        ?.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              handleCustomFieldUpdate(definition.id, opt.id);
                              setFieldSearchQueries({ ...fieldSearchQueries, [definition.id]: '' });
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                          >
                            {opt.label}
                          </button>
                        ))}
                      {definition.options?.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-400 italic">未找到匹配项</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={value || ''}
                  onChange={(e) => handleCustomFieldUpdate(definition.id, e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">请选择...</option>
                  {definition.options?.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          {definition.type === 'multi-select' && (
            <div className="space-y-2">
              {hasManyOptions ? (
                <div className="space-y-2">
                  {/* Selected Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(value) ? value : []).map(id => {
                      const opt = definition.options?.find(o => o.id === id);
                      if (!opt) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium border border-indigo-200">
                          {opt.label}
                          <button 
                            onClick={() => {
                              const selected = Array.isArray(value) ? value : [];
                              handleCustomFieldUpdate(definition.id, selected.filter(sid => sid !== id));
                            }}
                            className="hover:text-indigo-900"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="搜索并添加..."
                      value={searchQuery}
                      onChange={(e) => setFieldSearchQueries({ ...fieldSearchQueries, [definition.id]: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Search Results */}
                  {searchQuery && (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm max-h-40 overflow-y-auto divide-y divide-slate-50">
                      {definition.options
                        ?.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(opt => {
                          const selected = Array.isArray(value) ? value : [];
                          const isSelected = selected.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                const newSelected = isSelected 
                                  ? selected.filter(id => id !== opt.id)
                                  : [...selected, opt.id];
                                handleCustomFieldUpdate(definition.id, newSelected);
                                // Keep search query to allow adding multiple
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                              }`}
                            >
                              {opt.label}
                              {isSelected && <Check size={14} />}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {definition.options?.map(opt => {
                    const selected = Array.isArray(value) ? value : [];
                    const isSelected = selected.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          const newSelected = isSelected 
                            ? selected.filter(id => id !== opt.id)
                            : [...selected, opt.id];
                          handleCustomFieldUpdate(definition.id, newSelected);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Built-in fields
    switch (config.id) {
      case 'state':
        return (
          <div key={config.id} className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">状态</label>
            <select
              value={task.state}
              onChange={(e) => handleUpdate({ state: e.target.value as any })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              {columns.map(c => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.title}</option>
              ))}
            </select>
          </div>
        );
      case 'assigneeIds': {
        const searchQuery = fieldSearchQueries['assignees'] || '';
        const selectedIds = task.assigneeIds || [];

        return (
          <div key={config.id} className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">负责人</label>
            
            <div className="flex flex-wrap gap-1.5 mb-2">
              {/* Selected Users */}
              {selectedIds.map(id => {
                const u = users.find(user => user.id === id);
                if (!u) return null;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      handleUpdate({ assigneeIds: selectedIds.filter(sid => sid !== u.id) });
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
                  >
                    <Avatar name={u.name} className="w-4 h-4 text-[8px]" />
                    {getUserDisplayName(u, entities)}
                    <X size={10} />
                  </button>
                );
              })}
            </div>

            {/* Search for users */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="搜索成员..."
                value={searchQuery}
                onChange={(e) => setFieldSearchQueries({ ...fieldSearchQueries, assignees: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery) {
                    const matchedUser = users.find(u => u.name.toLowerCase() === searchQuery.toLowerCase()) || users.find(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (matchedUser) {
                      const isSelected = selectedIds.includes(matchedUser.id);
                      const newAssignees = isSelected
                        ? selectedIds.filter(id => id !== matchedUser.id)
                        : [...selectedIds, matchedUser.id];
                      handleUpdate({ assigneeIds: newAssignees });
                    } else {
                      const newId = nanoid();
                      addUser({ id: newId, name: searchQuery });
                      handleUpdate({ assigneeIds: [...selectedIds, newId] });
                    }
                    setFieldSearchQueries({ ...fieldSearchQueries, assignees: '' });
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              
              {searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50 border-t-0">
                  {users
                    .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(u => {
                      const isSelected = selectedIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            const newAssignees = isSelected
                              ? selectedIds.filter(id => id !== u.id)
                              : [...selectedIds, u.id];
                            handleUpdate({ assigneeIds: newAssignees });
                            setFieldSearchQueries({ ...fieldSearchQueries, assignees: '' });
                          }}
                          className={`w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between font-medium ${
                            isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
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
                      onClick={() => {
                        const newId = nanoid();
                        addUser({ id: newId, name: searchQuery });
                        handleUpdate({ assigneeIds: [...selectedIds, newId] });
                        setFieldSearchQueries({ ...fieldSearchQueries, assignees: '' });
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
        );
      }
      case 'reporterIds': {
        const searchQuery = fieldSearchQueries['reporters'] || '';
        const selectedIds = task.reporterIds || [];

        return (
          <div key={config.id} className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">汇报人 / 审核人</label>
            
            <div className="flex flex-wrap gap-1.5 mb-2">
              {/* Selected Users */}
              {selectedIds.map(id => {
                const u = users.find(user => user.id === id);
                if (!u) return null;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      handleUpdate({ reporterIds: selectedIds.filter(sid => sid !== u.id) });
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
                  >
                    <Avatar name={u.name} className="w-4 h-4 text-[8px]" />
                    {getUserDisplayName(u, entities)}
                    <X size={10} />
                  </button>
                );
              })}
            </div>

            {/* Search for users */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="搜索成员..."
                value={searchQuery}
                onChange={(e) => setFieldSearchQueries({ ...fieldSearchQueries, reporters: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery) {
                    const matchedUser = users.find(u => u.name.toLowerCase() === searchQuery.toLowerCase()) || users.find(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
                    if (matchedUser) {
                      const isSelected = selectedIds.includes(matchedUser.id);
                      const newReporters = isSelected
                        ? selectedIds.filter(id => id !== matchedUser.id)
                        : [...selectedIds, matchedUser.id];
                      handleUpdate({ reporterIds: newReporters });
                    } else {
                      const newId = nanoid();
                      addUser({ id: newId, name: searchQuery });
                      handleUpdate({ reporterIds: [...selectedIds, newId] });
                    }
                    setFieldSearchQueries({ ...fieldSearchQueries, reporters: '' });
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              
              {searchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50 border-t-0">
                  {users
                    .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(u => {
                      const isSelected = selectedIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            const newReporters = isSelected
                              ? selectedIds.filter(id => id !== u.id)
                              : [...selectedIds, u.id];
                            handleUpdate({ reporterIds: newReporters });
                            setFieldSearchQueries({ ...fieldSearchQueries, reporters: '' });
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
                      onClick={() => {
                        const newId = nanoid();
                        addUser({ id: newId, name: searchQuery });
                        handleUpdate({ reporterIds: [...selectedIds, newId] });
                        setFieldSearchQueries({ ...fieldSearchQueries, reporters: '' });
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
        );
      }
      case 'priority':
        return (
          <div key={config.id} className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">优先级</label>
            <select
              value={task.priority}
              onChange={(e) => handleUpdate({ priority: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              {priorities.map(p => (
                <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ''}{p.label}</option>
              ))}
            </select>
          </div>
        );
      case 'startDate':
      case 'dueDate':
        return (
          <div key={config.id} className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{config.name}</label>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
              {config.id === 'startDate' ? <Calendar size={16} className="text-slate-400" /> : <Clock size={16} className="text-slate-400" />}
              <input 
                type="date" 
                value={task[config.id] ? (task[config.id] as string).split('T')[0] : ''}
                onChange={(e) => handleUpdate({ [config.id]: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="flex-1 border-none p-0 text-sm focus:ring-0 text-slate-700 font-medium data-value outline-none"
              />
            </div>
          </div>
        );
      case 'progress':
        return (
          <div key={config.id} className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">进度</label>
            <div className="flex items-center gap-3">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={task.progress}
                onChange={(e) => handleUpdate({ progress: parseInt(e.target.value) })}
                className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 w-10 text-right data-value">{task.progress}%</span>
            </div>
          </div>
        );
      case 'mediumTags':
        return (
          <div key={config.id} className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">媒介标签</label>
            <div className="flex flex-wrap gap-1.5">
              {mediums.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    const newTags = task.mediumTags.includes(m.id)
                      ? task.mediumTags.filter(t => t !== m.id)
                      : [...task.mediumTags, m.id];
                    handleUpdate({ mediumTags: newTags });
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 border ${
                    task.mediumTags.includes(m.id)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {m.icon && <span>{m.icon}</span>}
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 'isDelegated': {
        const me = users.find(u => u.id === currentUser.id);
        const others = users.filter(u => u.id !== currentUser.id);
        const searchQuery = fieldSearchQueries['delegated'] || '';
        const selectedIds = task.delegatedToIds || [];

        return (
          <div key={config.id}>
            <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={task.isDelegated || false}
                onChange={(e) => handleUpdate({ isDelegated: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              委派给他人
            </label>
            {task.isDelegated && (
              <div className="space-y-3 mt-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                <div className="flex flex-wrap gap-2">
                  {/* Fixed "Me" option */}
                  {me && (
                    <button
                      onClick={() => {
                        const newDelegated = selectedIds.includes(me.id)
                          ? selectedIds.filter(id => id !== me.id)
                          : [...selectedIds, me.id];
                        handleUpdate({ delegatedToIds: newDelegated });
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        selectedIds.includes(me.id)
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {getUserDisplayName(me, entities)}
                    </button>
                  )}

                  {/* Selected Others */}
                  {selectedIds.filter(id => id !== currentUser.id).map(id => {
                    const u = users.find(user => user.id === id);
                    if (!u) return null;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          handleUpdate({ delegatedToIds: selectedIds.filter(sid => sid !== u.id) });
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white shadow-sm flex items-center gap-1"
                      >
                        {getUserDisplayName(u, entities)}
                        <X size={10} />
                      </button>
                    );
                  })}
                </div>

                {/* Search for others */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="搜索其他成员..."
                    value={searchQuery}
                    onChange={(e) => setFieldSearchQueries({ ...fieldSearchQueries, delegated: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery) {
                        const matchedUser = others.find(u => u.name.toLowerCase() === searchQuery.toLowerCase()) || others.find(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
                        if (matchedUser) {
                          const isSelected = selectedIds.includes(matchedUser.id);
                          const newDelegated = isSelected
                            ? selectedIds.filter(id => id !== matchedUser.id)
                            : [...selectedIds, matchedUser.id];
                          handleUpdate({ delegatedToIds: newDelegated });
                        } else {
                          const newId = nanoid();
                          addUser({ id: newId, name: searchQuery });
                          handleUpdate({ delegatedToIds: [...selectedIds, newId] });
                        }
                        setFieldSearchQueries({ ...fieldSearchQueries, delegated: '' });
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  
                  {searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50">
                      {others
                        .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(u => {
                          const isSelected = selectedIds.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              onClick={() => {
                                const newDelegated = isSelected
                                  ? selectedIds.filter(id => id !== u.id)
                                  : [...selectedIds, u.id];
                                handleUpdate({ delegatedToIds: newDelegated });
                                setFieldSearchQueries({ ...fieldSearchQueries, delegated: '' });
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50'
                              }`}
                            >
                              {getUserDisplayName(u, entities)}
                              {isSelected && <Check size={14} />}
                            </button>
                          );
                        })}
                      {others.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <button
                          onClick={() => {
                            const newId = nanoid();
                            addUser({ id: newId, name: searchQuery });
                            handleUpdate({ delegatedToIds: [...selectedIds, newId] });
                            setFieldSearchQueries({ ...fieldSearchQueries, delegated: '' });
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-2"
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
        );
      }
      case 'recurrence':
        return (
          <div key={config.id}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">重复</label>
            <select
              value={task.recurrence}
              onChange={(e) => handleUpdate({ recurrence: e.target.value as any })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="none">不重复</option>
              <option value="daily">每天</option>
              <option value="weekly_workdays">工作日</option>
              <option value="monthly_1st">每月1号</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    
    addTask({
      title: newSubtaskTitle.trim(),
      parentId: task.id,
      state: 'todo',
    });
    setNewSubtaskTitle('');
  };

  const handleDelete = () => {
    deleteTask(task.id);
    onClose();
  };

  const startManagingLogs = () => {
    setTempLogs([...activityLogs]);
    setIsManagingLogs(true);
  };

  const cancelLogManagement = () => {
    setIsManagingLogs(false);
    setTempLogs([]);
  };

  const saveLogManagement = () => {
    setActivityLogs(tempLogs);
    setIsManagingLogs(false);
    setTempLogs([]);
  };

  const updateTempLog = (id: string, details: string) => {
    setTempLogs(prev => prev.map(log => log.id === id ? { ...log, details } : log));
  };

  const deleteTempLog = (id: string) => {
    setTempLogs(prev => prev.filter(log => log.id !== id));
  };

  const handleQuickCopy = () => {
    const newTaskId = nanoid();
    const newTask: Task = {
      ...task,
      id: newTaskId,
      startDate: new Date().toISOString(),
      dueDate: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedTaskIds: [],
    };

    addTask(newTask);

    // Re-establish relationships
    if (task.relatedTaskIds) {
      task.relatedTaskIds.forEach(relatedId => {
        relateTask(newTaskId, relatedId);
      });
    }

    // Copy subtasks
    subtasks.forEach(subtask => {
      const newSubtaskId = nanoid();
      const newSubtask: Task = {
        ...subtask,
        id: newSubtaskId,
        parentId: newTaskId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relatedTaskIds: [],
      };
      addTask(newSubtask);

      if (subtask.relatedTaskIds) {
        subtask.relatedTaskIds.forEach(relatedId => {
          relateTask(newSubtaskId, relatedId);
        });
      }
    });

    onClose();
  };

  const displayLogs = isManagingLogs ? tempLogs.filter(log => log.taskId === task.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) : logs;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div 
        className="bg-white sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50/50 backdrop-blur-md gap-3 sm:gap-0 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <select
              value={task.state}
              onChange={(e) => handleUpdate({ state: e.target.value as TaskState })}
              className="bg-white border border-slate-200 text-xs sm:text-sm font-semibold rounded-lg px-2 sm:px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 shadow-sm shrink-0"
            >
              {columns.map(c => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.title}</option>
              ))}
            </select>
            
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-slate-600 cursor-pointer hover:text-indigo-600 transition-colors shrink-0">
              <input 
                type="checkbox" 
                checked={task.isPinned}
                onChange={(e) => handleUpdate({ isPinned: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              置顶
            </label>
            {task.state !== 'done' && (
              <button 
                onClick={() => handleUpdate({ state: 'done' })}
                className="flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shrink-0"
              >
                <Check size={14} className="sm:w-4 sm:h-4" /> 标记完成
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button 
                onClick={() => setActiveTab('details')}
                className={`px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${activeTab === 'details' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                详情
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${activeTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                日志
              </button>
              <button 
                onClick={() => setActiveTab('graph')}
                className={`px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${activeTab === 'graph' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                图谱
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 ml-2">
              <button 
                onClick={handleQuickCopy}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                title="快速复制任务"
              >
                <Copy size={18} className="sm:w-5 sm:h-5" />
              </button>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1 sm:gap-2 bg-red-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-red-100 transition-all duration-200 ease-out transform scale-100 opacity-100">
                  <span className="hidden sm:inline text-xs font-bold text-red-600 mr-1">确定删除？</span>
                  <button 
                    onClick={handleDelete}
                    className="px-2 sm:px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-md hover:bg-red-700 transition-colors uppercase tracking-wider shadow-sm"
                  >
                    确认
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 sm:px-3 py-1 bg-white text-slate-500 text-[10px] font-bold rounded-md border border-slate-200 hover:bg-slate-50 transition-colors uppercase tracking-wider"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                  title="删除任务"
                >
                  <Trash2 size={18} className="sm:w-5 sm:h-5" />
                </button>
              )}
              <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
              <button 
                onClick={onClose}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6 sm:gap-8">
          {activeTab === 'details' ? (
            <>
              {/* Main Column */}
              <div className="flex-1 space-y-8">
                {fieldOrder.find(f => f.id === 'title')?.isVisible !== false && (
                  <div>
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => handleUpdate({ title: e.target.value })}
                      className="w-full text-2xl sm:text-3xl font-bold text-slate-900 border-none px-0 py-2 focus:ring-0 placeholder-slate-300 bg-transparent transition-colors tracking-tight"
                      placeholder="任务标题"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <Activity size={14} /> 流程可视化
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <ProcessVisualizer task={task} onUpdate={handleUpdate} />
                  </div>
                </div>

                {fieldOrder.find(f => f.id === 'description')?.isVisible !== false && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <AlignLeft size={14} /> 描述
                    </div>
                    <textarea
                      value={task.description || ''}
                      onChange={(e) => handleUpdate({ description: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700 text-sm leading-relaxed shadow-sm"
                      placeholder="添加更详细的描述..."
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <ListTree size={14} /> 子任务
                  </div>
                  
                  <div className="space-y-2">
                    {subtasks.map(subtask => (
                      <div key={subtask.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 group hover:border-indigo-200 hover:bg-indigo-50/10 transition-all shadow-sm">
                        <input 
                          type="checkbox" 
                          checked={subtask.state === 'done'}
                          onChange={(e) => updateTask(subtask.id, { state: e.target.checked ? 'done' : 'todo' })}
                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {editingSubtaskId === subtask.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editSubtaskTitle}
                              onChange={(e) => setEditSubtaskTitle(e.target.value)}
                              className="flex-1 bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 transition-shadow outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateTask(subtask.id, { title: editSubtaskTitle });
                                  setEditingSubtaskId(null);
                                }
                              }}
                            />
                            <button 
                              onClick={() => {
                                updateTask(subtask.id, { title: editSubtaskTitle });
                                setEditingSubtaskId(null);
                              }}
                              className="text-emerald-600 hover:text-emerald-700 p-1.5 bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={() => setEditingSubtaskId(null)}
                              className="text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 rounded-lg transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span 
                              className={`flex-1 cursor-pointer text-sm font-medium ${subtask.state === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}
                              onClick={() => {
                                setEditingSubtaskId(subtask.id);
                                setEditSubtaskTitle(subtask.title);
                              }}
                            >
                              {subtask.title}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                              <button 
                                onClick={() => convertSubtaskToTask(subtask.id)}
                                className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="转为独立任务"
                              >
                                <ArrowUpRight size={16} />
                              </button>
                              <button 
                                onClick={() => deleteTask(subtask.id)}
                                className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                title="删除子任务"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    
                    <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-3">
                      <div className="relative flex-1">
                        <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="添加子任务..."
                          className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                        />
                      </div>
                      <button type="submit" disabled={!newSubtaskTitle.trim()} className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm">
                        添加
                      </button>
                    </form>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <ListTree size={14} /> 关联任务
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(task.relatedTaskIds || []).map(relatedId => {
                      const relatedTask = getTask(relatedId);
                      if (!relatedTask) return null;
                      return (
                        <div key={relatedId} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:border-indigo-300 hover:bg-indigo-50 transition-all group">
                          <button onClick={() => setSelectedTaskId(relatedId)} className="hover:text-indigo-600 transition-colors">
                            {relatedTask.title}
                          </button>
                          <button onClick={() => {
                            const { unrelateTask } = useTaskStore.getState();
                            unrelateTask(task.id, relatedId);
                          }} className="text-slate-400 hover:text-red-600 transition-colors p-0.5 rounded-md hover:bg-red-100">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="搜索任务以关联..."
                      value={relatedTaskSearchQuery}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
                      onChange={(e) => setRelatedTaskSearchQuery(e.target.value)}
                    />
                    {relatedTaskSearchQuery && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-50">
                        {useTaskStore.getState().tasks
                          .filter(t => t.id !== task.id && t.title.toLowerCase().includes(relatedTaskSearchQuery.toLowerCase()) && !(task.relatedTaskIds || []).includes(t.id))
                          .map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                const { relateTask } = useTaskStore.getState();
                                relateTask(task.id, t.id);
                                setRelatedTaskSearchQuery('');
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors first:rounded-t-lg last:rounded-b-lg font-medium"
                            >
                              {t.title}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="w-full lg:w-80 space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-200 h-fit shadow-sm">
                <div className="space-y-6">
                  {fieldOrder.map(config => {
                    if (config.id === 'title' || config.id === 'description') return null;
                    return renderField(config);
                  })}
                </div>
              </div>
            </>
          ) : activeTab === 'logs' ? (
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Activity size={18} /> 活动日志
                </div>
                {!isManagingLogs ? (
                  <button 
                    onClick={startManagingLogs}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <Settings2 size={14} /> 管理日志
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={saveLogManagement}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      <Check size={14} /> 完成
                    </button>
                    <button 
                      onClick={cancelLogManagement}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-600"
                    >
                      <RotateCcw size={14} /> 取消
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200">
                {(isManagingLogs ? tempLogs.filter(log => log.taskId === task.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) : logs).map(log => {
                  const user = users.find(u => u.id === log.userId);
                  return (
                    <div key={log.id} id={`log-${log.id}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-300">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-white bg-slate-100 text-slate-500 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {user ? <Avatar name={user.name} className="w-full h-full text-[10px]" /> : <User size={14} />}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="font-bold text-slate-900 text-xs">{user?.name || '未知用户'}</div>
                          <div className="flex items-center gap-3">
                            <time className="text-[10px] font-bold text-slate-400 uppercase tracking-wider data-value">{format(parseISO(log.timestamp), 'MM/dd HH:mm')}</time>
                            {isManagingLogs && (
                              <button 
                                onClick={() => deleteTempLog(log.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors"
                                title="删除日志"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        {isManagingLogs ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input 
                              type="text"
                              value={log.details}
                              onChange={(e) => updateTempLog(log.id, e.target.value)}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-slate-600 leading-relaxed">{log.details}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full">
              <TaskGraph taskId={task.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
