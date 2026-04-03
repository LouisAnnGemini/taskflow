import React from 'react';
import { Task } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { format, parseISO, differenceInDays, addDays, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface GanttChartProps {
  tasks: Task[];
}

export function GanttChart({ tasks }: GanttChartProps) {
  const { openTaskModal } = useTaskStore();

  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
        没有找到匹配的任务。
      </div>
    );
  }

  // Find min and max dates
  let minDate = new Date();
  let maxDate = new Date();

  tasks.forEach(t => {
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
    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm mt-6">
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
          {tasks.map(task => {
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
                onClick={() => openTaskModal(task.id)}
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
  );
}
