import React, { useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskCard } from '../components/TaskCard';
import { isToday, isPast, parseISO } from 'date-fns';

export function DashboardView() {
  const { tasks, currentUser } = useTaskStore();

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
