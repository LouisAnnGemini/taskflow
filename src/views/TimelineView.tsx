import React, { useState, useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { format, parseISO, differenceInDays, addDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Search, Filter } from 'lucide-react';

export function TimelineView() {
  const { tasks, setSelectedTaskId, users, columns, priorities, mediums } = useTaskStore();
  
  const [isSearched, setIsSearched] = useState(false);
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedDelegation, setSelectedDelegation] = useState<string>('all');
  const [selectedMedium, setSelectedMedium] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [progressRange, setProgressRange] = useState({ min: '', max: '' });
  const [negatedFilters, setNegatedFilters] = useState<Record<string, boolean>>({
    state: false,
    priority: false,
    assignee: false,
    delegation: false,
    medium: false,
  });

  const filteredTasks = useMemo(() => {
    if (!isSearched) return [];
    
    return tasks.filter(task => {
      // Date range filter
      if (dateRange.start && task.startDate && task.startDate < dateRange.start) return false;
      if (dateRange.end && task.dueDate && task.dueDate > dateRange.end) return false;

      // Progress range filter
      const minProgress = progressRange.min === '' ? 0 : parseInt(progressRange.min);
      const maxProgress = progressRange.max === '' ? 100 : parseInt(progressRange.max);
      if (task.progress < minProgress || task.progress > maxProgress) return false;

      // State filter
      if (selectedState !== 'all') {
        const matches = task.state === selectedState;
        if (negatedFilters.state ? matches : !matches) return false;
      }

      // Priority filter
      if (selectedPriority !== 'all') {
        const matches = task.priority === selectedPriority;
        if (negatedFilters.priority ? matches : !matches) return false;
      }

      // Assignee filter
      if (selectedAssignee !== 'all') {
        const matches = selectedAssignee === 'unassigned' 
          ? (!task.assigneeIds || task.assigneeIds.length === 0)
          : task.assigneeIds?.includes(selectedAssignee);
        if (negatedFilters.assignee ? matches : !matches) return false;
      }

      // Delegation filter
      if (selectedDelegation !== 'all') {
        const matches = selectedDelegation === 'delegated' ? task.isDelegated : !task.isDelegated;
        if (negatedFilters.delegation ? matches : !matches) return false;
      }

      // Medium filter
      if (selectedMedium !== 'all') {
        const matches = selectedMedium === 'none'
          ? (!task.mediumTags || task.mediumTags.length === 0)
          : task.mediumTags?.includes(selectedMedium);
        if (negatedFilters.medium ? matches : !matches) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.startDate || a.dueDate || '';
      const dateB = b.startDate || b.dueDate || '';
      return dateA.localeCompare(dateB);
    });
  }, [tasks, isSearched, selectedState, selectedPriority, selectedAssignee, selectedDelegation, selectedMedium, dateRange, progressRange, negatedFilters]);

  const renderFilterUI = () => (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mr-2">
          <Filter size={16} /> 筛选
        </div>
        <div className="flex flex-col gap-1">
          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2">
            <option value="all">所有状态</option>
            {columns.map(c => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={negatedFilters.state} onChange={e => setNegatedFilters({...negatedFilters, state: e.target.checked})} />
            排除
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2">
            <option value="all">所有优先级</option>
            {priorities.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={negatedFilters.priority} onChange={e => setNegatedFilters({...negatedFilters, priority: e.target.checked})} />
            排除
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2">
            <option value="all">所有负责人</option>
            <option value="unassigned">未指派</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={negatedFilters.assignee} onChange={e => setNegatedFilters({...negatedFilters, assignee: e.target.checked})} />
            排除
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <select value={selectedDelegation} onChange={(e) => setSelectedDelegation(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2">
            <option value="all">所有委派状态</option>
            <option value="delegated">已委派</option>
            <option value="not_delegated">未委派</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={negatedFilters.delegation} onChange={e => setNegatedFilters({...negatedFilters, delegation: e.target.checked})} />
            排除
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <select value={selectedMedium} onChange={(e) => setSelectedMedium(e.target.value)} className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2">
            <option value="all">所有媒介</option>
            <option value="none">无媒介</option>
            {mediums.map(m => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={negatedFilters.medium} onChange={e => setNegatedFilters({...negatedFilters, medium: e.target.checked})} />
            排除
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          时间段: 
          <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs" />
          -
          <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          进度范围 (%): 
          <input type="number" min="0" max="100" placeholder="最小" value={progressRange.min} onChange={e => setProgressRange({...progressRange, min: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs w-16" />
          -
          <input type="number" min="0" max="100" placeholder="最大" value={progressRange.max} onChange={e => setProgressRange({...progressRange, max: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs w-16" />
        </div>
        <button 
          onClick={() => setIsSearched(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Search size={16} /> 查找
        </button>
      </div>
    </div>
  );

  if (!isSearched) {
    return (
      <div className="max-w-7xl mx-auto">
        {renderFilterUI()}
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          请选择筛选条件并点击“查找”以显示时间线。
        </div>
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        {renderFilterUI()}
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          没有找到匹配的任务。
        </div>
      </div>
    );
  }

  // Find min and max dates
  let minDate = new Date();
  let maxDate = new Date();

  filteredTasks.forEach(t => {
    if (t.startDate) {
      const d = parseISO(t.startDate);
      if (d < minDate) minDate = d;
    }
    if (t.dueDate) {
      const d = parseISO(t.dueDate);
      if (d > maxDate) maxDate = d;
    }
  });

  // Add some padding
  minDate = addDays(minDate, -2);
  maxDate = addDays(maxDate, 7);

  const totalDays = differenceInDays(maxDate, minDate) + 1;
  const days = Array.from({ length: totalDays }, (_, i) => addDays(minDate, i));

  return (
    <div className="max-w-7xl mx-auto">
      {renderFilterUI()}
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
            <div className="w-64 shrink-0 border-r border-slate-200 p-4 font-semibold text-slate-700">
              任务
            </div>
            <div className="flex-1 flex">
              {days.map((day, i) => (
                <div 
                  key={i} 
                  className={`flex-1 min-w-[40px] border-r border-slate-100 text-center py-2 text-xs text-slate-500 ${
                    isSameDay(day, new Date()) ? 'bg-indigo-50 font-bold text-indigo-600' : ''
                  }`}
                >
                  <div className="uppercase text-[10px]">{format(day, 'EEE', { locale: zhCN })}</div>
                  <div>{format(day, 'd')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {filteredTasks.map(task => {
              const start = task.startDate ? parseISO(task.startDate) : (task.dueDate ? parseISO(task.dueDate) : new Date());
              const end = task.dueDate ? parseISO(task.dueDate) : start;
              
              const startOffset = Math.max(0, differenceInDays(start, minDate));
              const duration = Math.max(1, differenceInDays(end, start) + 1);
              
              const leftPercent = (startOffset / totalDays) * 100;
              const widthPercent = (duration / totalDays) * 100;

              return (
                <div 
                  key={task.id} 
                  className="flex hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="w-64 shrink-0 border-r border-slate-200 p-4 truncate text-sm font-medium text-slate-800">
                    {task.title}
                  </div>
                  <div className="flex-1 relative py-3">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {days.map((_, i) => (
                        <div key={i} className="flex-1 border-r border-slate-100/50" />
                      ))}
                    </div>
                    
                    {/* Task Bar */}
                    <div 
                      className="absolute h-8 rounded-md bg-indigo-100 border border-indigo-200 flex items-center px-2 overflow-hidden shadow-sm group-hover:shadow-md transition-all"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        minWidth: '24px'
                      }}
                    >
                      <div 
                        className="absolute inset-y-0 left-0 bg-indigo-500/20"
                        style={{ width: `${task.progress}%` }}
                      />
                      <span className="text-xs font-medium text-indigo-800 truncate relative z-10">
                        {task.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
