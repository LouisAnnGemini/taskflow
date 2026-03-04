import React, { useState, useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskCard } from '../components/TaskCard';
import { Search, Filter, X } from 'lucide-react';

export function SearchView() {
  const { tasks, users, columns, priorities, mediums } = useTaskStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedReporter, setSelectedReporter] = useState<string>('all');
  const [selectedDelegation, setSelectedDelegation] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedMedium, setSelectedMedium] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Keyword search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // Creator filter
      if (selectedCreator !== 'all' && task.creatorId !== selectedCreator) return false;

      // Assignee filter
      if (selectedAssignee !== 'all') {
        if (selectedAssignee === 'unassigned') {
          if (task.assigneeIds && task.assigneeIds.length > 0) return false;
        } else {
          if (!task.assigneeIds?.includes(selectedAssignee)) return false;
        }
      }

      // Reporter filter
      if (selectedReporter !== 'all') {
        if (selectedReporter === 'unassigned') {
          if (task.reporterIds && task.reporterIds.length > 0) return false;
        } else {
          if (!task.reporterIds?.includes(selectedReporter)) return false;
        }
      }

      // Delegation filter
      if (selectedDelegation !== 'all') {
        if (selectedDelegation === 'delegated' && !task.isDelegated) return false;
        if (selectedDelegation === 'not_delegated' && task.isDelegated) return false;
      }

      // State filter
      if (selectedState !== 'all' && task.state !== selectedState) return false;

      // Priority filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;

      // Medium filter
      if (selectedMedium !== 'all') {
        if (selectedMedium === 'none') {
          if (task.mediumTags && task.mediumTags.length > 0) return false;
        } else {
          if (!task.mediumTags?.includes(selectedMedium)) return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [tasks, searchQuery, selectedCreator, selectedAssignee, selectedReporter, selectedDelegation, selectedState, selectedPriority, selectedMedium]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCreator('all');
    setSelectedAssignee('all');
    setSelectedReporter('all');
    setSelectedDelegation('all');
    setSelectedState('all');
    setSelectedPriority('all');
    setSelectedMedium('all');
  };

  const activeFilterCount = [
    selectedCreator !== 'all',
    selectedAssignee !== 'all',
    selectedReporter !== 'all',
    selectedDelegation !== 'all',
    selectedState !== 'all',
    selectedPriority !== 'all',
    selectedMedium !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
          >
            <option value="all">所有状态</option>
            {columns.map(c => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.title}</option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
          >
            <option value="all">所有优先级</option>
            {priorities.map(p => (
              <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ''}{p.label}</option>
            ))}
          </select>

          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
          >
            <option value="all">所有负责人</option>
            <option value="unassigned">未指派</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <select
            value={selectedReporter}
            onChange={(e) => setSelectedReporter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
          >
            <option value="all">所有提出人</option>
            <option value="unassigned">无提出人</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <select
            value={selectedDelegation}
            onChange={(e) => setSelectedDelegation(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
          >
            <option value="all">所有委派状态</option>
            <option value="delegated">已委派</option>
            <option value="not_delegated">未委派</option>
          </select>

          <select
            value={selectedMedium}
            onChange={(e) => setSelectedMedium(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
          >
            <option value="all">所有媒介</option>
            <option value="none">无媒介</option>
            {mediums.map(m => (
              <option key={m.id} value={m.id}>{m.icon ? `${m.icon} ` : ''}{m.label}</option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 ml-2"
            >
              清除所有筛选
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            搜索结果 <span className="text-slate-500 font-normal text-sm ml-2">({filteredTasks.length} 个任务)</span>
          </h2>
        </div>

        {filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} />
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
    </div>
  );
}
