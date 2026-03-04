import React, { useState } from 'react';
import { Task, TaskState, ActivityLog } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { X, Calendar, User, Tag, AlignLeft, ListTree, Activity, Clock, Trash2, Settings2, Check, RotateCcw, Edit3, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TaskCard } from './TaskCard';
import { Avatar } from './Avatar';
import { ProcessVisualizer } from './ProcessVisualizer';

interface TaskModalProps {
  taskId: string;
  onClose: () => void;
}

export function TaskModal({ taskId, onClose }: TaskModalProps) {
  const { getTask, updateTask, deleteTask, users, columns, priorities, mediums, currentUser, getSubtasks, activityLogs, addTask, updateActivityLog, deleteActivityLog, setActivityLogs, customFieldDefinitions, fieldOrder } = useTaskStore();
  const task = getTask(taskId);
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isManagingLogs, setIsManagingLogs] = useState(false);
  const [tempLogs, setTempLogs] = useState<ActivityLog[]>([]);

  const [fieldSearchQueries, setFieldSearchQueries] = useState<Record<string, string>>({});

  if (!task) return null;

  const subtasks = getSubtasks(task.id);
  const logs = activityLogs.filter(log => log.taskId === task.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const handleUpdate = (updates: Partial<Task>) => {
    updateTask(task.id, updates);
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
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">{definition.name}</label>
          {definition.type === 'text' && (
            <input 
              type="text"
              value={value || ''}
              onChange={(e) => handleCustomFieldUpdate(definition.id, e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder={`输入${definition.name}...`}
            />
          )}
          {definition.type === 'number' && (
            <input 
              type="number"
              value={value || ''}
              onChange={(e) => handleCustomFieldUpdate(definition.id, e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          )}
          {definition.type === 'date' && (
            <input 
              type="date"
              value={value || ''}
              onChange={(e) => handleCustomFieldUpdate(definition.id, e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
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
          <div key={config.id}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">状态</label>
            <select
              value={task.state}
              onChange={(e) => handleUpdate({ state: e.target.value as any })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {columns.map(c => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.title}</option>
              ))}
            </select>
          </div>
        );
      case 'assigneeIds':
        return (
          <div key={config.id}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">负责人</label>
            <div className="flex flex-wrap gap-2">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    const newAssignees = task.assigneeIds.includes(u.id)
                      ? task.assigneeIds.filter(id => id !== u.id)
                      : [...task.assigneeIds, u.id];
                    handleUpdate({ assigneeIds: newAssignees });
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    task.assigneeIds.includes(u.id)
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        );
      case 'reporterIds':
        return (
          <div key={config.id}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">汇报人 / 审核人</label>
            <div className="flex flex-wrap gap-2">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    const currentReporters = task.reporterIds || [];
                    const newReporters = currentReporters.includes(u.id)
                      ? currentReporters.filter(id => id !== u.id)
                      : [...currentReporters, u.id];
                    handleUpdate({ reporterIds: newReporters });
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    (task.reporterIds || []).includes(u.id)
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {u.name}
                </button>
              ))}
            </div>
          </div>
        );
      case 'priority':
        return (
          <div key={config.id}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">优先级</label>
            <select
              value={task.priority}
              onChange={(e) => handleUpdate({ priority: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
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
          <div key={config.id}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{config.name}</label>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
              {config.id === 'startDate' ? <Calendar size={16} className="text-slate-400" /> : <Clock size={16} className="text-slate-400" />}
              <input 
                type="date" 
                value={task[config.id] ? (task[config.id] as string).split('T')[0] : ''}
                onChange={(e) => handleUpdate({ [config.id]: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                className="flex-1 border-none p-0 text-sm focus:ring-0 text-slate-700"
              />
            </div>
          </div>
        );
      case 'progress':
        return (
          <div key={config.id}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">进度</label>
            <div className="flex items-center gap-3">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={task.progress}
                onChange={(e) => handleUpdate({ progress: parseInt(e.target.value) })}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-sm font-medium text-slate-700 w-8 text-right">{task.progress}%</span>
            </div>
          </div>
        );
      case 'mediumTags':
        return (
          <div key={config.id}>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">媒介标签</label>
            <div className="flex flex-wrap gap-2">
              {mediums.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    const newTags = task.mediumTags.includes(m.id)
                      ? task.mediumTags.filter(t => t !== m.id)
                      : [...task.mediumTags, m.id];
                    handleUpdate({ mediumTags: newTags });
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                    task.mediumTags.includes(m.id)
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {m.icon && <span>{m.icon}</span>}
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 'isDelegated':
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
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      const currentDelegated = task.delegatedToIds || [];
                      const newDelegated = currentDelegated.includes(u.id)
                        ? currentDelegated.filter(id => id !== u.id)
                        : [...currentDelegated, u.id];
                      handleUpdate({ delegatedToIds: newDelegated });
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      (task.delegatedToIds || []).includes(u.id)
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
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
    if (confirm('确定要删除这个任务吗？')) {
      deleteTask(task.id);
      onClose();
    }
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

  const displayLogs = isManagingLogs ? tempLogs.filter(log => log.taskId === task.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) : logs;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <select
              value={task.state}
              onChange={(e) => handleUpdate({ state: e.target.value as TaskState })}
              className="bg-slate-100 border-none text-sm font-medium rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
            >
              {columns.map(c => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.title}</option>
              ))}
            </select>
            
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-amber-600 transition-colors">
              <input 
                type="checkbox" 
                checked={task.isPinned}
                onChange={(e) => handleUpdate({ isPinned: e.target.checked })}
                className="rounded text-amber-500 focus:ring-amber-500"
              />
              置顶任务
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDelete}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="删除任务"
            >
              <Trash2 size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8">
          {/* Main Column */}
          <div className="flex-1 space-y-8">
            {fieldOrder.find(f => f.id === 'title')?.isVisible !== false && (
              <div>
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => handleUpdate({ title: e.target.value })}
                  className="w-full text-2xl font-bold text-slate-900 border-none px-0 py-2 focus:ring-0 placeholder-slate-300"
                  placeholder="任务标题"
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Activity size={18} /> 流程可视化
              </div>
              <ProcessVisualizer task={task} />
            </div>

            {fieldOrder.find(f => f.id === 'description')?.isVisible !== false && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <AlignLeft size={18} /> 描述
                </div>
                <textarea
                  value={task.description || ''}
                  onChange={(e) => handleUpdate({ description: e.target.value })}
                  className="w-full bg-slate-50 border-slate-200 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="添加更详细的描述..."
                />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <ListTree size={18} /> 子任务
              </div>
              
              <div className="space-y-3">
                {subtasks.map(subtask => (
                  <div key={subtask.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      checked={subtask.state === 'done'}
                      onChange={(e) => updateTask(subtask.id, { state: e.target.checked ? 'done' : 'todo' })}
                      className="w-5 h-5 rounded text-emerald-500 focus:ring-emerald-500 border-slate-300"
                    />
                    <span className={`flex-1 ${subtask.state === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
                
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="添加子任务..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="submit" disabled={!newSubtaskTitle.trim()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                    添加
                  </button>
                </form>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  <Activity size={18} /> 活动日志
                </div>
                {!isManagingLogs ? (
                  <button 
                    onClick={startManagingLogs}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
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
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {(isManagingLogs ? tempLogs.filter(log => log.taskId === task.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)) : logs).map(log => {
                  const user = users.find(u => u.id === log.userId);
                  return (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        {user ? <Avatar name={user.name} className="w-full h-full text-sm" /> : <User size={16} />}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-slate-900 text-sm">{user?.name || '未知用户'}</div>
                          <div className="flex items-center gap-3">
                            <time className="text-xs text-slate-500">{format(parseISO(log.timestamp), 'MM月dd日, HH:mm')}</time>
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
                              className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-slate-600">{log.details}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-72 space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 h-fit">
            <div className="space-y-4">
              {fieldOrder.map(config => {
                if (config.id === 'title' || config.id === 'description') return null;
                return renderField(config);
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
