import React, { useState, useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { TaskCard } from '../components/TaskCard';
import { GanttChart } from '../components/GanttChart';
import { getUserDisplayName } from '../utils/user';
import { Search, Filter, X, CheckSquare, Square, Edit, Trash2, MoreHorizontal, Check, ChevronDown, GanttChartSquare, Briefcase } from 'lucide-react';
import { Task, TaskState } from '../types/task';
import { format } from 'date-fns';
import { MultiSelect } from '../components/MultiSelect';

export function SearchView() {
  const { tasks, users, projects, columns, priorities, mediums, entities, updateTasks, deleteTask, customFieldDefinitions, searchStateFilter, setSearchStateFilter } = useTaskStore();
  
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedReporters, setSelectedReporters] = useState<string[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedDelegationStatus, setSelectedDelegationStatus] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>(searchStateFilter ? [searchStateFilter] : []);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);
  const [selectedCustomFields, setSelectedCustomFields] = useState<Record<string, string[]>>({});
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [progressRange, setProgressRange] = useState({ min: '', max: '' });
  const [negatedFilters, setNegatedFilters] = useState<Record<string, boolean>>({
    creator: false,
    assignee: false,
    reporter: false,
    delegation: false,
    state: false,
    priority: false,
    medium: false,
    project: false,
  });
  // Initialize negated filters for custom fields
  const [negatedCustomFields, setNegatedCustomFields] = useState<Record<string, boolean>>({});

  // Clear the global filter after it's been consumed and scroll to top
  React.useEffect(() => {
    if (searchStateFilter) {
      setSearchStateFilter(null);
      // Scroll to the search container
      if (searchContainerRef.current) {
        searchContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [searchStateFilter, setSearchStateFilter]);

  // Batch selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  
  // Gantt chart state
  const [showGantt, setShowGantt] = useState(false);

  const filteredTasks = useMemo(() => {
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

      // Project filter
      if (selectedProjects.length > 0) {
        const includeNone = selectedProjects.includes('none');
        const specificProjects = selectedProjects.filter(id => id !== 'none');

        let matches = false;
        if (includeNone && !task.projectId) {
          matches = true;
        } else if (task.projectId && specificProjects.includes(task.projectId)) {
          matches = true;
        }

        if (negatedFilters.project ? matches : !matches) return false;
      }

      // Custom fields filter
      for (const [fieldId, value] of Object.entries(selectedCustomFields)) {
        const selectedValues = value as string[];
        if (selectedValues.length > 0) {
          const fieldDef = customFieldDefinitions.find(d => d.id === fieldId);
          if (!fieldDef) continue;

          const taskValue = task.customFields?.[fieldId];
          let matches = false;

          if (fieldDef.type === 'select') {
            matches = selectedValues.includes(taskValue as string);
          } else if (fieldDef.type === 'multi-select') {
            if (Array.isArray(taskValue)) {
              matches = (taskValue as string[]).some(v => selectedValues.includes(v));
            }
          }

          if (negatedCustomFields[fieldId] ? matches : !matches) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [tasks, searchQuery, selectedCreators, selectedAssignees, selectedReporters, selectedDelegationStatus, selectedStates, selectedPriorities, selectedMediums, selectedCustomFields, dateRange, progressRange, negatedFilters, negatedCustomFields, customFieldDefinitions]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCreators([]);
    setSelectedAssignees([]);
    setSelectedReporters([]);
    setSelectedDelegationStatus([]);
    setSelectedStates([]);
    setSelectedPriorities([]);
    setSelectedMediums([]);
    setSelectedProjects([]);
    setSelectedCustomFields({});
    setDateRange({ start: '', end: '' });
    setProgressRange({ min: '', max: '' });
    setNegatedFilters({
      creator: false,
      assignee: false,
      reporter: false,
      delegation: false,
      state: false,
      priority: false,
      medium: false,
      project: false,
    });
    setNegatedCustomFields({});
  };

  const activeFilterCount = [
    selectedCreators.length > 0,
    selectedAssignees.length > 0,
    selectedReporters.length > 0,
    selectedDelegationStatus.length > 0,
    selectedStates.length > 0,
    selectedPriorities.length > 0,
    selectedMediums.length > 0,
    selectedProjects.length > 0,
    Object.values(selectedCustomFields).some((v: any) => v.length > 0),
    dateRange.start !== '' || dateRange.end !== '',
    progressRange.min !== '' || progressRange.max !== '',
    (selectedCreators.length > 0 && negatedFilters.creator),
    (selectedAssignees.length > 0 && negatedFilters.assignee),
    (selectedReporters.length > 0 && negatedFilters.reporter),
    (selectedDelegationStatus.length > 0 && negatedFilters.delegation),
    (selectedStates.length > 0 && negatedFilters.state),
    (selectedPriorities.length > 0 && negatedFilters.priority),
    (selectedMediums.length > 0 && negatedFilters.medium),
    (selectedProjects.length > 0 && negatedFilters.project),
    ...Object.entries(selectedCustomFields).map(([k, v]: [string, any]) => v.length > 0 && negatedCustomFields[k]),
  ].filter(Boolean).length;

  const handleSelectAll = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    }
  };

  const handleSelectTask = (taskId: string, selected: boolean) => {
    if (selected) {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    } else {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleBatchDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmBatchDelete = () => {
    selectedTaskIds.forEach(id => deleteTask(id));
    setSelectedTaskIds([]);
    setIsDeleteModalOpen(false);
  };

  const handleBatchUpdateState = (newState: string) => {
    updateTasks(selectedTaskIds, { state: newState });
    setSelectedTaskIds([]);
  };

  const handleBatchUpdatePriority = (newPriority: string) => {
    updateTasks(selectedTaskIds, { priority: newPriority });
    setSelectedTaskIds([]);
  };

  // Prepare options for MultiSelect
  const creatorOptions = users.map(u => ({ id: u.id, name: getUserDisplayName(u, entities) }));
  
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

  const mediumOptions = [
    { id: 'none', name: '无媒介' },
    ...mediums.map(m => ({
      id: m.id,
      name: m.label,
      icon: m.icon ? <span>{m.icon}</span> : undefined
    }))
  ];

  const projectOptions = [
    { id: 'none', name: '无项目' },
    ...projects.map(p => ({
      id: p.id,
      name: p.name,
      icon: <span className={`w-2 h-2 rounded-full ${p.color}`}></span>
    }))
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative pb-20" ref={searchContainerRef}>
      {/* Search and Filter Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
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
            <Filter size={16} />
            筛选
            {activeFilterCount > 0 && (
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                {activeFilterCount}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <MultiSelect
              options={stateOptions}
              selectedIds={selectedStates}
              isExclude={negatedFilters.state}
              showExcludeOption
              onChange={(ids, isExclude) => {
                setSelectedStates(ids);
                setNegatedFilters(prev => ({ ...prev, state: isExclude || false }));
              }}
              placeholder="所有状态"
              className="w-40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <MultiSelect
              options={priorityOptions}
              selectedIds={selectedPriorities}
              isExclude={negatedFilters.priority}
              showExcludeOption
              onChange={(ids, isExclude) => {
                setSelectedPriorities(ids);
                setNegatedFilters(prev => ({ ...prev, priority: isExclude || false }));
              }}
              placeholder="所有优先级"
              className="w-40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <MultiSelect
              options={assigneeOptions}
              selectedIds={selectedAssignees}
              isExclude={negatedFilters.assignee}
              showExcludeOption
              onChange={(ids, isExclude) => {
                setSelectedAssignees(ids);
                setNegatedFilters(prev => ({ ...prev, assignee: isExclude || false }));
              }}
              placeholder="所有负责人"
              className="w-40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <MultiSelect
              options={reporterOptions}
              selectedIds={selectedReporters}
              isExclude={negatedFilters.reporter}
              showExcludeOption
              onChange={(ids, isExclude) => {
                setSelectedReporters(ids);
                setNegatedFilters(prev => ({ ...prev, reporter: isExclude || false }));
              }}
              placeholder="所有提出人"
              className="w-40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <MultiSelect
              options={delegationOptions}
              selectedIds={selectedDelegationStatus}
              isExclude={negatedFilters.delegation}
              showExcludeOption
              onChange={(ids, isExclude) => {
                setSelectedDelegationStatus(ids);
                setNegatedFilters(prev => ({ ...prev, delegation: isExclude || false }));
              }}
              placeholder="所有委派状态"
              className="w-40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <MultiSelect
              options={mediumOptions}
              selectedIds={selectedMediums}
              isExclude={negatedFilters.medium}
              showExcludeOption
              onChange={(ids, isExclude) => {
                setSelectedMediums(ids);
                setNegatedFilters(prev => ({ ...prev, medium: isExclude || false }));
              }}
              placeholder="所有媒介"
              className="w-40"
            />
          </div>

          {/* Custom Fields Filters */}
          {customFieldDefinitions.filter(field => field.type === 'select' || field.type === 'multi-select').map(field => (
            <div key={field.id} className="flex flex-col gap-1">
              <MultiSelect
                options={field.options?.map(o => ({ id: o.id, name: o.label })) || []}
                selectedIds={selectedCustomFields[field.id] || []}
                isExclude={!!negatedCustomFields[field.id]}
                showExcludeOption
                onChange={(ids, isExclude) => {
                  setSelectedCustomFields(prev => ({ ...prev, [field.id]: ids }));
                  setNegatedCustomFields(prev => ({ ...prev, [field.id]: isExclude || false }));
                }}
                placeholder={`所有${field.name}`}
                className="w-40"
              />
            </div>
          ))}

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

          <div className="flex items-center gap-2 ml-auto">
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
              >
                清除所有筛选
              </button>
            )}
            <button
              onClick={() => setShowGantt(!showGantt)}
              disabled={activeFilterCount === 0 && !searchQuery}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                (activeFilterCount > 0 || searchQuery)
                  ? showGantt 
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <GanttChartSquare size={16} />
              {showGantt ? '隐藏甘特图' : '生成甘特图'}
            </button>
          </div>
        </div>

        {/* Project Specific Filter Row */}
        <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mr-2">
            <Briefcase size={16} className="text-indigo-500" />
            项目筛选
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setSelectedProjects([]);
                setNegatedFilters(prev => ({ ...prev, project: false }));
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectedProjects.length === 0
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              全部任务
            </button>
            <button
              onClick={() => {
                setSelectedProjects(['none']);
                setNegatedFilters(prev => ({ ...prev, project: false }));
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                selectedProjects.length === 1 && selectedProjects[0] === 'none' && !negatedFilters.project
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              无项目任务
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <MultiSelect
              options={projectOptions}
              selectedIds={selectedProjects}
              isExclude={negatedFilters.project}
              showExcludeOption
              onChange={(ids, isExclude) => {
                setSelectedProjects(ids);
                setNegatedFilters(prev => ({ ...prev, project: isExclude || false }));
              }}
              placeholder="选择特定项目..."
              className="w-64"
            />
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      {showGantt && (activeFilterCount > 0 || searchQuery) && (
        <div className="mb-8">
          <GanttChart tasks={filteredTasks} />
        </div>
      )}

      {/* Results */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-800">
              搜索结果 <span className="text-slate-500 font-normal text-sm ml-2">({filteredTasks.length} 个任务)</span>
            </h2>
            {filteredTasks.length > 0 && (
              <button 
                onClick={handleSelectAll}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600 transition-colors"
              >
                {selectedTaskIds.length === filteredTasks.length ? <CheckSquare size={16} /> : <Square size={16} />}
                {selectedTaskIds.length === filteredTasks.length ? '取消全选' : '全选'}
              </button>
            )}
          </div>
        </div>

        {filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                selectable={true}
                isSelected={selectedTaskIds.includes(task.id)}
                onSelect={(selected) => handleSelectTask(task.id, selected)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Search className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">未找到匹配的任务</h3>
            <p className="text-slate-500">尝试调整搜索关键词或放宽筛选条件</p>
            {(searchQuery || activeFilterCount > 0) && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
              >
                清除所有筛选
              </button>
            )}
          </div>
        )}
      </div>

      {/* Batch Action Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-slate-200 p-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-2 px-2 border-r border-slate-200">
            <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {selectedTaskIds.length}
            </span>
            <span className="text-sm font-medium text-slate-700">已选择</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 flex items-center gap-1 text-sm font-medium">
                <CheckSquare size={16} />
                状态
              </button>
              <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 hidden group-hover:block">
                {columns.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleBatchUpdateState(c.id)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${c.color}`}></span>
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 flex items-center gap-1 text-sm font-medium">
                <Filter size={16} />
                优先级
              </button>
              <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 hidden group-hover:block">
                {priorities.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleBatchUpdatePriority(p.id)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    {p.icon && <span>{p.icon}</span>}
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => setShowBatchEditModal(true)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 flex items-center gap-1 text-sm font-medium"
            >
              <Edit size={16} />
              批量编辑
            </button>

            <div className="w-px h-6 bg-slate-200 mx-2"></div>

            <button 
              onClick={handleBatchDelete}
              className="p-2 hover:bg-red-50 rounded-lg text-red-600 flex items-center gap-1 text-sm font-medium"
            >
              <Trash2 size={16} />
              删除
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="删除任务"
        message={`确定要删除选中的 ${selectedTaskIds.length} 个任务吗？此操作不可恢复。`}
        onConfirm={confirmBatchDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* Batch Edit Modal */}
      {showBatchEditModal && (
        <BatchEditModal 
          onClose={() => setShowBatchEditModal(false)} 
          onSave={(updates) => {
            updateTasks(selectedTaskIds, updates);
            setSelectedTaskIds([]);
            setShowBatchEditModal(false);
          }}
        />
      )}
    </div>
  );
}

function BatchEditModal({ onClose, onSave }: { onClose: () => void, onSave: (updates: Partial<Task>) => void }) {
  const { users, columns, priorities, mediums, entities, customFieldDefinitions } = useTaskStore();
  
  const [updates, setUpdates] = useState<Partial<Task>>({});
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  const toggleField = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
      const newUpdates = { ...updates };
      delete newUpdates[field as keyof Task];
      if (field.startsWith('custom_')) {
        const customFieldId = field.replace('custom_', '');
        if (newUpdates.customFields) {
          delete newUpdates.customFields[customFieldId];
        }
      }
      setUpdates(newUpdates);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const handleUpdate = (field: string, value: any) => {
    if (field.startsWith('custom_')) {
      const customFieldId = field.replace('custom_', '');
      setUpdates(prev => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [customFieldId]: value
        }
      }));
    } else {
      setUpdates(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">批量编辑任务</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            {/* State */}
            <div className="flex items-start gap-4">
              <input 
                type="checkbox" 
                checked={selectedFields.has('state')} 
                onChange={() => toggleField('state')}
                className="mt-1.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">状态</label>
                <select
                  disabled={!selectedFields.has('state')}
                  value={updates.state || ''}
                  onChange={(e) => handleUpdate('state', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">选择状态</option>
                  {columns.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-start gap-4">
              <input 
                type="checkbox" 
                checked={selectedFields.has('priority')} 
                onChange={() => toggleField('priority')}
                className="mt-1.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">优先级</label>
                <select
                  disabled={!selectedFields.has('priority')}
                  value={updates.priority || ''}
                  onChange={(e) => handleUpdate('priority', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">选择优先级</option>
                  {priorities.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignee */}
            <div className="flex items-start gap-4">
              <input 
                type="checkbox" 
                checked={selectedFields.has('assigneeIds')} 
                onChange={() => toggleField('assigneeIds')}
                className="mt-1.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">负责人 (覆盖)</label>
                <select
                  disabled={!selectedFields.has('assigneeIds')}
                  value={updates.assigneeIds?.[0] || ''}
                  onChange={(e) => handleUpdate('assigneeIds', [e.target.value])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">选择负责人</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{getUserDisplayName(u, entities)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-start gap-4">
              <input 
                type="checkbox" 
                checked={selectedFields.has('dueDate')} 
                onChange={() => toggleField('dueDate')}
                className="mt-1.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">截止日期</label>
                <input
                  type="date"
                  disabled={!selectedFields.has('dueDate')}
                  value={updates.dueDate ? (updates.dueDate as string).split('T')[0] : ''}
                  onChange={(e) => handleUpdate('dueDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
            </div>

            {/* Custom Fields */}
            {customFieldDefinitions.map(field => (
              <div key={field.id} className="flex items-start gap-4">
                <input 
                  type="checkbox" 
                  checked={selectedFields.has(`custom_${field.id}`)} 
                  onChange={() => toggleField(`custom_${field.id}`)}
                  className="mt-1.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{field.name}</label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      disabled={!selectedFields.has(`custom_${field.id}`)}
                      value={updates.customFields?.[field.id] || ''}
                      onChange={(e) => handleUpdate(`custom_${field.id}`, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                    />
                  )}
                  {field.type === 'number' && (
                    <input
                      type="number"
                      disabled={!selectedFields.has(`custom_${field.id}`)}
                      value={updates.customFields?.[field.id] || ''}
                      onChange={(e) => handleUpdate(`custom_${field.id}`, parseFloat(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      disabled={!selectedFields.has(`custom_${field.id}`)}
                      value={updates.customFields?.[field.id] || ''}
                      onChange={(e) => handleUpdate(`custom_${field.id}`, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                    >
                      <option value="">请选择</option>
                      {field.options?.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  {field.type === 'multi-select' && (
                    <div className={!selectedFields.has(`custom_${field.id}`) ? 'opacity-50 pointer-events-none' : ''}>
                      <MultiSelect
                        options={field.options?.map(opt => ({ id: opt.id, name: opt.label })) || []}
                        selectedIds={updates.customFields?.[field.id] || []}
                        onChange={(ids) => handleUpdate(`custom_${field.id}`, ids)}
                        placeholder="请选择"
                        className="w-full"
                      />
                    </div>
                  )}
                  {field.type === 'date' && (
                    <input
                      type="date"
                      disabled={!selectedFields.has(`custom_${field.id}`)}
                      value={updates.customFields?.[field.id] || ''}
                      onChange={(e) => handleUpdate(`custom_${field.id}`, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button 
            onClick={() => onSave(updates)}
            disabled={selectedFields.size === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            应用修改
          </button>
        </div>
      </div>
    </div>
  );
}
