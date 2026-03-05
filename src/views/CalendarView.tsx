import React, { useState, useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO, getHours, getMinutes } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Activity } from 'lucide-react';
import { nanoid } from 'nanoid';
import { ActivityLog } from '../types/task';

export function CalendarView() {
  const { tasks, activityLogs, setSelectedTaskId, addTask, currentUser } = useTaskStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  const getCompletedTaskCount = (date: Date) => {
    return tasks.filter(task => {
      if (task.state === 'done' && task.updatedAt) {
        return isSameDay(parseISO(task.updatedAt), date);
      }
      return false;
    }).length;
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-white';
    if (count <= 2) return 'bg-emerald-100';
    if (count <= 5) return 'bg-emerald-300';
    if (count <= 9) return 'bg-emerald-500';
    return 'bg-emerald-700';
  };

  const getLogsForTimeline = (date: Date) => {
    // Filter logs for the selected date
    const dayLogs = activityLogs.filter(log => {
      return isSameDay(parseISO(log.timestamp), date);
    });

    // Group logs by task
    const logsByTask: Record<string, ActivityLog[]> = {};
    dayLogs.forEach(log => {
      if (!logsByTask[log.taskId]) {
        logsByTask[log.taskId] = [];
      }
      logsByTask[log.taskId].push(log);
    });

    // Sort logs within each task by time
    Object.keys(logsByTask).forEach(taskId => {
      logsByTask[taskId].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });

    return logsByTask;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-emerald-500';
      case 'status_changed': return 'bg-blue-500';
      case 'completed': return 'bg-green-600';
      case 'deleted': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return '创建任务';
      case 'status_changed': return '状态变更';
      case 'completed': return '完成任务';
      case 'deleted': return '删除任务';
      case 'updated': return '更新信息';
      default: return '操作';
    }
  };

  const renderTimeline = () => {
    if (!selectedDate) return null;

    const logsByTask = getLogsForTimeline(selectedDate);
    const taskIds = Object.keys(logsByTask);
    const hasLogs = taskIds.length > 0;

    return (
      <div className="h-80 bg-white border-t border-slate-200 flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 relative">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800">
              {format(selectedDate, 'yyyy年M月d日', { locale: zhCN })} - 每日活动时间轴
            </h3>
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
              {Object.values(logsByTask).flat().length} 条记录
            </span>
          </div>
          <button 
            onClick={() => setSelectedDate(null)}
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {!hasLogs ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
               <Activity size={32} className="text-slate-300" />
               <p>当天无活动记录</p>
             </div>
          ) : (
            <div className="space-y-6">
              {/* Time Axis Header */}
              <div className="relative h-6 text-xs text-slate-400 border-b border-slate-100 mb-2">
                {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map(h => (
                  <div 
                    key={h} 
                    className="absolute bottom-0 transform -translate-x-1/2 flex flex-col items-center" 
                    style={{ left: `${(h/24)*100}%` }}
                  >
                    <div className="h-1.5 w-px bg-slate-300 mb-1"></div>
                    <span>{h}:00</span>
                  </div>
                ))}
              </div>

              {/* Task Rows */}
              {taskIds.map(taskId => {
                const task = tasks.find(t => t.id === taskId);
                const taskLogs = logsByTask[taskId];
                // If task is deleted, we might not find it, so use a fallback or skip
                const taskTitle = task ? task.title : '已删除的任务';

                return (
                  <div key={taskId} className="relative group">
                    <div className="flex items-center mb-2">
                      <div className="w-40 pr-4 truncate text-sm font-medium text-slate-700" title={taskTitle}>
                        {taskTitle}
                      </div>
                      <div className="flex-1 h-8 bg-slate-50 rounded-lg relative border border-slate-100 overflow-hidden">
                        {/* Hour grid lines for the row */}
                        {[0, 6, 12, 18, 24].map(h => (
                          <div 
                            key={h} 
                            className="absolute top-0 bottom-0 w-px bg-slate-100 border-r border-dashed border-slate-200" 
                            style={{ left: `${(h/24)*100}%` }}
                          />
                        ))}

                        {/* Log Markers */}
                        {taskLogs.map((log, index) => {
                          const date = parseISO(log.timestamp);
                          const minutes = getHours(date) * 60 + getMinutes(date);
                          const percent = (minutes / 1440) * 100;
                          const isStacked = index > 0 && (getMinutes(parseISO(taskLogs[index-1].timestamp)) - minutes < 10); // Simple collision detection

                          return (
                            <div
                              key={log.id}
                              className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm cursor-help z-10 hover:z-20 hover:scale-125 transition-all ${getActionColor(log.action)}`}
                              style={{ left: `${percent}%` }}
                            >
                               {/* Tooltip */}
                               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-slate-800 text-white text-xs rounded-lg p-2 opacity-0 hover:opacity-100 pointer-events-none shadow-lg transition-opacity">
                                  <div className="font-bold flex items-center gap-2 mb-1">
                                    <span className="opacity-75">{format(date, 'HH:mm')}</span>
                                    <span>{getActionLabel(log.action)}</span>
                                  </div>
                                  <div className="text-slate-300 whitespace-normal">{log.details}</div>
                                  <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
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
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-slate-200"></div> 0</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-100"></div> 1-2</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-300"></div> 3-5</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500"></div> 6-9</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-700"></div> 10+</div>
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
            const completedCount = getCompletedTaskCount(date);
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isTodayDate = isToday(date);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            
            // Only show heatmap color for current month and past/today
            const isPastOrToday = date <= new Date();
            const cellColor = isCurrentMonth && isPastOrToday ? getHeatmapColor(completedCount) : 'bg-white';
            
            // Text color based on background darkness
            const textColor = (isCurrentMonth && isPastOrToday && completedCount >= 6) ? 'text-white' : 'text-slate-700';
            
            return (
              <div 
                key={date.toISOString()} 
                onClick={() => setSelectedDate(date)}
                title={`共完成 ${completedCount} 个任务`}
                className={`min-h-[80px] border-b border-r border-slate-100 p-2 flex flex-col group transition-all cursor-pointer relative ${
                  !isCurrentMonth ? 'bg-slate-50/50' : cellColor
                } ${i % 7 === 6 ? 'border-r-0' : ''} ${
                  isSelected ? 'ring-2 ring-indigo-500 ring-inset z-10' : 'hover:brightness-95'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                    isTodayDate 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : !isCurrentMonth 
                        ? 'text-slate-400' 
                        : textColor
                  }`}>
                    {format(date, 'd')}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAdd(date);
                    }}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${
                       (isCurrentMonth && isPastOrToday && completedCount >= 6) 
                       ? 'text-emerald-100 hover:text-white hover:bg-white/20' 
                       : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                    title="添加任务"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {isCurrentMonth && completedCount > 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                       completedCount >= 6 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {completedCount} 完成
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Timeline Panel */}
      {renderTimeline()}
    </div>
  );
}
