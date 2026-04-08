import React, { useMemo, useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskCard } from '../components/TaskCard';
import { 
  format, isToday, isPast, parseISO, 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, 
  startOfDay, endOfDay 
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export function DashboardView() {
  const { tasks: allTasks, currentUser } = useTaskStore();
  const tasks = allTasks.filter(t => t.category !== 'life');

  const [planViewMode, setPlanViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [planRefDate, setPlanRefDate] = useState(new Date());

  const handlePrevPlanDate = () => {
    if (planViewMode === 'day') setPlanRefDate(subDays(planRefDate, 1));
    else if (planViewMode === 'week') setPlanRefDate(subWeeks(planRefDate, 1));
    else setPlanRefDate(subMonths(planRefDate, 1));
  };

  const handleNextPlanDate = () => {
    if (planViewMode === 'day') setPlanRefDate(addDays(planRefDate, 1));
    else if (planViewMode === 'week') setPlanRefDate(addWeeks(planRefDate, 1));
    else setPlanRefDate(addMonths(planRefDate, 1));
  };

  const handleTodayPlanDate = () => setPlanRefDate(new Date());

  const getPlanDateDisplay = () => {
    if (planViewMode === 'day') {
      return format(planRefDate, 'yyyy年MM月dd日', { locale: zhCN });
    } else if (planViewMode === 'week') {
      const start = startOfWeek(planRefDate, { weekStartsOn: 1 });
      const end = endOfWeek(planRefDate, { weekStartsOn: 1 });
      return `${format(start, 'MM月dd日')} - ${format(end, 'MM月dd日')}`;
    } else {
      return format(planRefDate, 'yyyy年MM月', { locale: zhCN });
    }
  };

  const plannedTasks = useMemo(() => {
    let periodStart: Date;
    let periodEnd: Date;

    if (planViewMode === 'day') {
      periodStart = startOfDay(planRefDate);
      periodEnd = endOfDay(planRefDate);
    } else if (planViewMode === 'week') {
      periodStart = startOfWeek(planRefDate, { weekStartsOn: 1 });
      periodEnd = endOfWeek(planRefDate, { weekStartsOn: 1 });
    } else {
      periodStart = startOfMonth(planRefDate);
      periodEnd = endOfMonth(planRefDate);
    }

    return tasks.filter(t => {
      if (!t.plannedStartTime) return false;
      const taskStart = parseISO(t.plannedStartTime);
      const taskEnd = t.plannedEndTime ? parseISO(t.plannedEndTime) : taskStart;
      
      return taskStart <= periodEnd && taskEnd >= periodStart;
    }).sort((a, b) => parseISO(a.plannedStartTime!).getTime() - parseISO(b.plannedStartTime!).getTime());
  }, [tasks, planViewMode, planRefDate]);

  const pinnedTasks = useMemo(() => tasks
    .filter(t => t.isPinned && t.state !== 'done')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [tasks]);
  
  const todayTasks = useMemo(() => tasks
    .filter(t => {
      if (t.state === 'done') return false;
      if (!t.dueDate) return false;
      const date = parseISO(t.dueDate);
      return isToday(date) || isPast(date);
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }), [tasks]);

  const reviewTasks = useMemo(() => tasks
    .filter(t => t.state === 'in_review' && t.reporterIds?.includes(currentUser.id))
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }), [tasks, currentUser.id]);

  const delegatedTasks = useMemo(() => tasks
    .filter(t => t.creatorId === currentUser.id && !t.assigneeIds.includes(currentUser.id) && t.state !== 'done')
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }), [tasks, currentUser.id]);

  return (
    <div className="space-y-12 px-4 md:px-0">
      {pinnedTasks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="text-amber-500">📌</span> 置顶优先级
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pinnedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="text-blue-500">⚡️</span> 今日及逾期
        </h2>
        {todayTasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
            今天的工作都完成啦！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {todayTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <span className="text-emerald-500"><CalendarIcon size={24} /></span> 
            计划任务
          </h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {(['day', 'week', 'month'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setPlanViewMode(mode)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    planViewMode === mode 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'day' ? '日' : mode === 'week' ? '周' : '月'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
              <button 
                onClick={handlePrevPlanDate}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={handleTodayPlanDate}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors min-w-[120px] text-center"
              >
                {getPlanDateDisplay()}
              </button>
              <button 
                onClick={handleNextPlanDate}
                className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {plannedTasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
            该时间段内没有计划任务
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {plannedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      {reviewTasks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="text-purple-500">👀</span> 等待我审核
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {reviewTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {delegatedTasks.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="text-indigo-500">🤝</span> 委派给他人
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {delegatedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
