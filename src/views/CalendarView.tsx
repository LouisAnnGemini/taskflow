import React, { useState, useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { nanoid } from 'nanoid';

export function CalendarView() {
  const { tasks, columns, setSelectedTaskId, addTask, currentUser } = useTaskStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleQuickAdd = (date: Date) => {
    const dateStr = date.toISOString();
    addTask({
      title: '新任务',
      startDate: dateStr,
      dueDate: dateStr,
      state: 'todo',
      creatorId: currentUser.id,
      assigneeIds: [currentUser.id],
    });
  };

  const getTaskDistribution = (date: Date) => {
    const dayTasks = tasks.filter(task => {
      // For non-done tasks, check if they are active on this day
      if (task.state !== 'done') {
        if (!task.startDate && !task.dueDate) return false;
        const start = task.startDate ? parseISO(task.startDate) : null;
        const due = task.dueDate ? parseISO(task.dueDate) : null;
        
        // Use isSameDay for start and due to handle timezones
        const isAfterStart = start ? (isSameDay(start, date) || date > start) : true;
        const isBeforeDue = due ? (isSameDay(due, date) || date < due) : true;
        
        return isAfterStart && isBeforeDue;
      }
      // For done tasks, check if they were completed on this day
      if (task.state === 'done') {
        return task.updatedAt && isSameDay(parseISO(task.updatedAt), date);
      }
      return false;
    });

    const distribution: Record<string, number> = {};
    dayTasks.forEach(task => {
      distribution[task.state] = (distribution[task.state] || 0) + 1;
    });
    
    return { distribution, total: dayTasks.length };
  };

  const getGradientStyle = (distribution: Record<string, number>, total: number) => {
    if (total === 0) return 'bg-white';
    
    let currentPercentage = 0;
    const stops: string[] = [];
    
    const states = [
      { state: 'todo', color: '#fee2e2' }, // red-100
      { state: 'in_progress', color: '#fef3c7' }, // amber-100
      { state: 'in_review', color: '#dbeafe' }, // blue-100
      { state: 'done', color: '#d1fae5' }, // emerald-100
    ];

    states.forEach(({ state, color }) => {
      const count = distribution[state] || 0;
      if (count > 0) {
        const percentage = (count / total) * 100;
        // Add a small transition area (e.g., 2%) between colors for a softer look
        const start = Math.max(0, currentPercentage - 2);
        const end = currentPercentage + percentage;
        stops.push(`${color} ${start}% ${end}%`);
        currentPercentage += percentage;
      }
    });

    return `linear-gradient(to right, ${stops.join(', ')})`;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">
            {format(currentDate, 'yyyy年 M月', { locale: zhCN })}
          </h2>
          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm p-1">
            <button 
              onClick={prevMonth}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              今天
            </button>
            <button 
              onClick={nextMonth}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, i) => (
            <div key={day} className={`py-3 text-center text-sm font-semibold ${i >= 5 ? 'text-slate-400' : 'text-slate-600'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
          {daysInMonth.map((date, i) => {
            const { distribution, total } = getTaskDistribution(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isTodayDate = isToday(date);
            const isPastOrToday = date <= new Date();
            const backgroundStyle = isCurrentMonth && isPastOrToday && total > 0 ? getGradientStyle(distribution, total) : 'white';

            return (
              <div 
                key={date.toISOString()} 
                style={{ background: backgroundStyle }}
                className={`min-h-[100px] border-b border-r border-slate-100 p-2 flex flex-col group transition-colors ${
                  !isCurrentMonth ? 'bg-slate-50' : ''
                } ${i % 7 === 6 ? 'border-r-0' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    isTodayDate 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : !isCurrentMonth 
                        ? 'text-slate-400' 
                        : 'text-slate-700 bg-white/50'
                  }`}>
                    {format(date, 'd')}
                  </span>
                  <button 
                    onClick={() => handleQuickAdd(date)}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white/50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="添加任务"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {isCurrentMonth && total > 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs font-medium text-slate-700 bg-white/50 px-2 py-0.5 rounded-full">
                      {total} 项
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
