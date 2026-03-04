import React, { useState } from 'react';
import { Task, TaskState } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { X, Calendar, User, Tag, AlignLeft, ListTree, Activity, Clock, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TaskCard } from './TaskCard';
import { Avatar } from './Avatar';
import { ProcessVisualizer } from './ProcessVisualizer';

interface TaskModalProps {
  taskId: string;
  onClose: () => void;
}

export function TaskModal({ taskId, onClose }: TaskModalProps) {
  const { getTask, updateTask, deleteTask, users, columns, priorities, mediums, currentUser, getSubtasks, activityLogs, addTask } = useTaskStore();
  const task = getTask(taskId);
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  if (!task) return null;

  const subtasks = getSubtasks(task.id);
  const logs = activityLogs.filter(log => log.taskId === task.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const handleUpdate = (updates: Partial<Task>) => {
    updateTask(task.id, updates);
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
            <div>
              <input
                type="text"
                value={task.title}
                onChange={(e) => handleUpdate({ title: e.target.value })}
                className="w-full text-2xl font-bold text-slate-900 border-none px-0 py-2 focus:ring-0 placeholder-slate-300"
                placeholder="任务标题"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Activity size={18} /> 流程可视化
              </div>
              <ProcessVisualizer task={task} />
            </div>

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
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Activity size={18} /> 活动日志
              </div>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {logs.map(log => {
                  const user = users.find(u => u.id === log.userId);
                  return (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        {user ? <Avatar name={user.name} className="w-full h-full text-sm" /> : <User size={16} />}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-slate-900 text-sm">{user?.name || '未知用户'}</div>
                          <time className="text-xs text-slate-500">{format(parseISO(log.timestamp), 'MM月dd日, HH:mm')}</time>
                        </div>
                        <div className="text-sm text-slate-600">{log.details}</div>
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
              <div>
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

              <div>
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

              <div>
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

              <div>
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

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">日期</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <Calendar size={16} className="text-slate-400" />
                    <input 
                      type="date" 
                      value={task.startDate ? task.startDate.split('T')[0] : ''}
                      onChange={(e) => handleUpdate({ startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="flex-1 border-none p-0 text-sm focus:ring-0 text-slate-700"
                      title="开始日期"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <Clock size={16} className="text-slate-400" />
                    <input 
                      type="date" 
                      value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                      onChange={(e) => handleUpdate({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                      className="flex-1 border-none p-0 text-sm focus:ring-0 text-slate-700"
                      title="截止日期"
                    />
                  </div>
                </div>
              </div>

              <div>
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

              <div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
