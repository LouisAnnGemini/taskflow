import React, { useState, useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { format, parseISO, differenceInDays, addDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Search, Filter, X } from 'lucide-react';
import { MultiSelect } from '../components/MultiSelect';
import { getUserDisplayName } from '../utils/user';

export function TimelineView() {
  const { tasks, setSelectedTaskId, users, columns, priorities, mediums, entities } = useTaskStore();
  
  const [isSearched, setIsSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedReporters, setSelectedReporters] = useState<string[]>([]);
  const [selectedDelegationStatus, setSelectedDelegationStatus] = useState<string[]>([]);
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [progressRange, setProgressRange] = useState({ min: '', max: '' });
  const [negatedFilters, setNegatedFilters] = useState<Record<string, boolean>>({
    creator: false,
    state: false,
    priority: false,
    assignee: false,
    reporter: false,
    delegation: false,
    medium: false,
  });

  const filteredTasks = useMemo(() => {
    if (!isSearched) return [];
    
    return tasks.filter(task => {
      // Keyword search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Date range filter
      if (dateRange.start && task.startDate && task.startDate < dateRange.start) return false;
      if (dateRange.end && task.dueDate && task.dueDate > dateRange.end) return false;

      // Progress range filter
      const minProgress = progressRange.min === '' ? 0 : parseInt(progressRange.min);
      const maxProgress = progressRange.max === '' ? 100 : parseInt(progressRange.max);
      if (task.progress < minProgress || task.progress > maxProgress) return false;

      // Creator filter
      if (selectedCreators.length > 0) {
        const matches = selectedCreators.includes(task.creatorId);
        if (negatedFilters.creator ? matches : !matches) return false;
      }

      // State filter
      if (selectedStates.length > 0) {
        const matches = selectedStates.includes(task.state);
        if (negatedFilters.state ? matches : !matches) return false;
      }

      // Priority filter
      if (selectedPriorities.length > 0) {
        const matches = selectedPriorities.includes(task.priority);
        if (negatedFilters.priority ? matches : !matches) return false;
      }

      // Assignee filter
      if (selectedAssignees.length > 0) {
        const includeUnassigned = selectedAssignees.includes('unassigned');
        const specificAssignees = selectedAssignees.filter(id => id !== 'unassigned');
        
        let matches = false;
        if (includeUnassigned && (!task.assigneeIds || task.assigneeIds.length === 0)) {
          matches = true;
        } else if (task.assigneeIds?.some(id => specificAssignees.includes(id))) {
          matches = true;
        }
        
        if (negatedFilters.assignee ? matches : !matches) return false;
      }

      // Reporter filter
      if (selectedReporters.length > 0) {
        const includeUnassigned = selectedReporters.includes('unassigned');
        const specificReporters = selectedReporters.filter(id => id !== 'unassigned');

        let matches = false;
        if (includeUnassigned && (!task.reporterIds || task.reporterIds.length === 0)) {
          matches = true;
        } else if (task.reporterIds?.some(id => specificReporters.includes(id))) {
          matches = true;
        }

        if (negatedFilters.reporter ? matches : !matches) return false;
      }

      // Delegation filter
      if (selectedDelegationStatus.length > 0) {
        let matches = false;
        if (selectedDelegationStatus.includes('delegated') && task.isDelegated) matches = true;
        if (selectedDelegationStatus.includes('not_delegated') && !task.isDelegated) matches = true;
        
        if (negatedFilters.delegation ? matches : !matches) return false;
      }

      // Medium filter
      if (selectedMediums.length > 0) {
        const includeNone = selectedMediums.includes('none');
        const specificMediums = selectedMediums.filter(id => id !== 'none');

        let matches = false;
        if (includeNone && (!task.mediumTags || task.mediumTags.length === 0)) {
          matches = true;
        } else if (task.mediumTags?.some(id => specificMediums.includes(id))) {
          matches = true;
        }

        if (negatedFilters.medium ? matches : !matches) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.startDate || a.dueDate || '';
      const dateB = b.startDate || b.dueDate || '';
      return dateA.localeCompare(dateB);
    });
  }, [tasks, isSearched, selectedCreators, selectedStates, selectedPriorities, selectedAssignees, selectedReporters, selectedDelegationStatus, selectedMediums, dateRange, progressRange, negatedFilters]);

  // Prepare options for MultiSelect
  const creatorOptions = users.map(u => ({ id: u.id, name: getUserDisplayName(u, entities) }));

  const stateOptions = columns.map(c => ({ 
    id: c.id, 
    name: c.title,
    icon: c.icon ? <span>{c.icon}</span> : undefined
  }));

  const priorityOptions = priorities.map(p => ({
    id: p.id,
    name: p.label,
    icon: p.icon ? <span>{p.icon}</span> : undefined
  }));

  const assigneeOptions = [
    { id: 'unassigned', name: '未指派' },
    ...users.map(u => ({ id: u.id, name: getUserDisplayName(u, entities) }))
  ];

  const reporterOptions = [
    { id: 'unassigned', name: '无提出人' },
    ...users.map(u => ({ id: u.id, name: getUserDisplayName(u, entities) }))
  ];

  const delegationOptions = [
    { id: 'delegated', name: '已委派' },
    { id: 'not_delegated', name: '未委派' }
  ];

  const mediumOptions = [
    { id: 'none', name: '无媒介' },
    ...mediums.map(m => ({
      id: m.id,
      name: m.label,
      icon: m.icon ? <span>{m.icon}</span> : undefined
    }))
  ];

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCreators([]);
    setSelectedStates([]);
    setSelectedPriorities([]);
    setSelectedAssignees([]);
    setSelectedReporters([]);
    setSelectedDelegationStatus([]);
    setSelectedMediums([]);
    setDateRange({ start: '', end: '' });
    setProgressRange({ min: '', max: '' });
    setNegatedFilters({
      creator: false,
      state: false,
      priority: false,
      assignee: false,
      reporter: false,
      delegation: false,
      medium: false,
    });
  };

  const activeFilterCount = [
    selectedCreators.length > 0,
    selectedStates.length > 0,
    selectedPriorities.length > 0,
    selectedAssignees.length > 0,
    selectedReporters.length > 0,
    selectedDelegationStatus.length > 0,
    selectedMediums.length > 0,
    dateRange.start !== '' || dateRange.end !== '',
    progressRange.min !== '' || progressRange.max !== '',
    (selectedCreators.length > 0 && negatedFilters.creator),
    (selectedStates.length > 0 && negatedFilters.state),
    (selectedPriorities.length > 0 && negatedFilters.priority),
    (selectedAssignees.length > 0 && negatedFilters.assignee),
    (selectedReporters.length > 0 && negatedFilters.reporter),
    (selectedDelegationStatus.length > 0 && negatedFilters.delegation),
    (selectedMediums.length > 0 && negatedFilters.medium),
  ].filter(Boolean).length;

  const renderFilterUI = () => (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="搜索任务标题或描述..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mr-2">
          <Filter size={16} /> 筛选
          {activeFilterCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <MultiSelect
            options={creatorOptions}
            selectedIds={selectedCreators}
            onChange={setSelectedCreators}
            placeholder="所有创建人"
            className="w-40"
          />
          <label className="flex items-center gap-1 text-xs text-slate-500 px-1">
            <input type="checkbox" checked={negatedFilters.creator} onChange={e => setNegatedFilters({...negatedFilters, creator: e.target.checked})} />
            排除
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <MultiSelect
            options={stateOptions}
            selectedIds={selectedStates}
            onChange={setSelectedStates}
            placeholder="所有状态"
            className="w-40"
          />
          <label className="flex items-center gap-1 text-xs text-slate-500 px-1">
            <input type="checkbox" checked={negatedFilters.state} onChange={e => setNegatedFilters({...negatedFilters, state: e.target.checked})} />
            排除
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <MultiSelect
            options={priorityOptions}
            selectedIds={selectedPriorities}
            onChange={setSelectedPriorities}
            placeholder="所有优先级"
            className="w-40"
          />
          <label className="flex items-center gap-1 text-xs text-slate-500 px-1">
            <input type="checkbox" checked={negatedFilters.priority} onChange={e => setNegatedFilters({...negatedFilters, priority: e.target.checked})} />
            排除
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <MultiSelect
            options={assigneeOptions}
            selectedIds={selectedAssignees}
            onChange={setSelectedAssignees}
            placeholder="所有负责人"
            className="w-40"
          />
          <label className="flex items-center gap-1 text-xs text-slate-500 px-1">
            <input type="checkbox" checked={negatedFilters.assignee} onChange={e => setNegatedFilters({...negatedFilters, assignee: e.target.checked})} />
            排除
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <MultiSelect
            options={reporterOptions}
            selectedIds={selectedReporters}
            onChange={setSelectedReporters}
            placeholder="所有提出人"
            className="w-40"
          />
          <label className="flex items-center gap-1 text-xs text-slate-500 px-1">
            <input type="checkbox" checked={negatedFilters.reporter} onChange={e => setNegatedFilters({...negatedFilters, reporter: e.target.checked})} />
            排除
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <MultiSelect
            options={delegationOptions}
            selectedIds={selectedDelegationStatus}
            onChange={setSelectedDelegationStatus}
            placeholder="所有委派状态"
            className="w-40"
          />
          <label className="flex items-center gap-1 text-xs text-slate-500 px-1">
            <input type="checkbox" checked={negatedFilters.delegation} onChange={e => setNegatedFilters({...negatedFilters, delegation: e.target.checked})} />
            排除
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <MultiSelect
            options={mediumOptions}
            selectedIds={selectedMediums}
            onChange={setSelectedMediums}
            placeholder="所有媒介"
            className="w-40"
          />
          <label className="flex items-center gap-1 text-xs text-slate-500 px-1">
            <input type="checkbox" checked={negatedFilters.medium} onChange={e => setNegatedFilters({...negatedFilters, medium: e.target.checked})} />
            排除
          </label>
        </div>

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
        
        <div className="ml-auto flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 mr-2"
            >
              清除所有筛选
            </button>
          )}
          <button 
            onClick={() => setIsSearched(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Search size={16} /> 查找
          </button>
        </div>
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
