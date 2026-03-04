import React from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskCard } from '../components/TaskCard';
import { isToday, isPast, parseISO } from 'date-fns';

export function DashboardView() {
  const { tasks, currentUser } = useTaskStore();

  const pinnedTasks = tasks.filter(t => t.isPinned && t.state !== 'done');
  const todayTasks = tasks.filter(t => {
    if (t.state === 'done') return false;
    if (!t.dueDate) return false;
    const date = parseISO(t.dueDate);
    return isToday(date) || isPast(date);
  });
  const reviewTasks = tasks.filter(t => t.state === 'in_review' && t.reporterIds?.includes(currentUser.id));
  const delegatedTasks = tasks.filter(t => t.creatorId === currentUser.id && !t.assigneeIds.includes(currentUser.id) && t.state !== 'done');

  return (
    <div className="space-y-8">
      {pinnedTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-amber-500">📌</span> 置顶优先级
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pinnedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-blue-500">⚡️</span> 今日及逾期
        </h2>
        {todayTasks.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
            今天的工作都完成啦！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {todayTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      {reviewTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-purple-500">👀</span> 等待我审核
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reviewTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {delegatedTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-indigo-500">🤝</span> 委派给他人
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {delegatedTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
