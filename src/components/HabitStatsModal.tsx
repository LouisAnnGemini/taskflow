import React, { useMemo } from 'react';
import { X, Trophy, Flame, Calendar as CalendarIcon, Target, Activity } from 'lucide-react';
import { format, subDays, startOfDay, differenceInDays, startOfYear, endOfYear, eachDayOfInterval, getDay, isAfter } from 'date-fns';
import { Habit, Task } from '../types/task';

interface HabitStatsModalProps {
  habit: Habit;
  tasks: Task[];
  onClose: () => void;
}

export function HabitStatsModal({ habit, tasks, onClose }: HabitStatsModalProps) {
  const stats = useMemo(() => {
    const doneTasks = tasks.filter(t => t.habitId === habit.id && t.state === 'done');
    const doneDates = doneTasks
      .map(t => startOfDay(new Date(t.createdAt || t.startDate || new Date())).getTime())
      .sort((a, b) => b - a); // Descending

    // Unique dates only
    const uniqueDoneDates = Array.from(new Set(doneDates));

    const today = startOfDay(new Date()).getTime();
    const yesterday = subDays(today, 1).getTime();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate = 0;

    // Calculate streaks (needs ascending order)
    const ascDates = [...uniqueDoneDates].reverse();
    
    for (let i = 0; i < ascDates.length; i++) {
      const date = ascDates[i];
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = differenceInDays(date, previousDate);
        if (diff === 1) {
          tempStreak++;
        } else if (diff > 1) {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      previousDate = date;
    }

    // Current streak
    currentStreak = 0;
    let checkDate = today;
    if (uniqueDoneDates.includes(today)) {
      currentStreak = 1;
      checkDate = yesterday;
    } else if (uniqueDoneDates.includes(yesterday)) {
      currentStreak = 1;
      checkDate = subDays(yesterday, 1).getTime();
    }

    if (currentStreak > 0) {
      while (uniqueDoneDates.includes(checkDate)) {
        currentStreak++;
        checkDate = subDays(checkDate, 1).getTime();
      }
    }

    // Last 30 days completion rate
    const thirtyDaysAgo = subDays(today, 29).getTime();
    const doneInLast30 = uniqueDoneDates.filter(d => d >= thirtyDaysAgo).length;
    const completionRate30 = Math.round((doneInLast30 / 30) * 100);

    return {
      total: uniqueDoneDates.length,
      currentStreak,
      longestStreak,
      completionRate30,
      uniqueDoneDates
    };
  }, [tasks, habit.id]);

  // Generate heatmap data (current year)
  const heatmapData = useMemo(() => {
    const today = startOfDay(new Date());
    const start = startOfYear(today);
    const end = endOfYear(today);
    
    const daysInYear = eachDayOfInterval({ start, end });
    
    // Align to day of week so the grid looks like a real calendar
    const startDayOfWeek = getDay(start); // 0-6, 0 is Sunday
    const padding = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Make Monday 0
    
    const grid = [];
    for (let i = 0; i < padding; i++) {
      grid.push({ date: null, isDone: false, isFuture: false });
    }
    
    daysInYear.forEach(date => {
      grid.push({
        date,
        isDone: stats.uniqueDoneDates.includes(date.getTime()),
        isFuture: isAfter(date, today)
      });
    });
    
    return grid;
  }, [stats.uniqueDoneDates]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] border border-emerald-100 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="p-4 sm:p-6 border-b border-emerald-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white text-emerald-500 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-sm border border-emerald-100">
              {habit.icon || '🌟'}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{habit.name}</h2>
              <p className="text-emerald-600 font-medium text-xs sm:text-sm mt-0.5">习惯数据报表</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-colors shadow-sm border border-transparent hover:border-slate-200"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 sm:space-y-8 bg-white">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-orange-50/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-orange-100/50">
              <div className="flex items-center gap-2 text-orange-600 mb-2 sm:mb-3">
                <Flame size={18} className="sm:w-5 sm:h-5" />
                <span className="font-medium text-xs sm:text-sm">当前连击</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-slate-800">{stats.currentStreak} <span className="text-sm sm:text-base font-normal text-slate-500">天</span></div>
            </div>
            
            <div className="bg-amber-50/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-100/50">
              <div className="flex items-center gap-2 text-amber-600 mb-2 sm:mb-3">
                <Trophy size={18} className="sm:w-5 sm:h-5" />
                <span className="font-medium text-xs sm:text-sm">最长连击</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-slate-800">{stats.longestStreak} <span className="text-sm sm:text-base font-normal text-slate-500">天</span></div>
            </div>

            <div className="bg-emerald-50/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-100/50">
              <div className="flex items-center gap-2 text-emerald-600 mb-2 sm:mb-3">
                <Target size={18} className="sm:w-5 sm:h-5" />
                <span className="font-medium text-xs sm:text-sm">总计打卡</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-slate-800">{stats.total} <span className="text-sm sm:text-base font-normal text-slate-500">次</span></div>
            </div>

            <div className="bg-blue-50/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-blue-100/50">
              <div className="flex items-center gap-2 text-blue-600 mb-2 sm:mb-3">
                <CalendarIcon size={18} className="sm:w-5 sm:h-5" />
                <span className="font-medium text-xs sm:text-sm">近30天</span>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-slate-800">{stats.completionRate30}<span className="text-sm sm:text-base font-normal text-slate-500">%</span></div>
            </div>
          </div>

          {/* Heatmap */}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
              <Activity size={20} className="text-emerald-500 sm:w-[22px] sm:h-[22px]" />
              年度打卡热力图 ({new Date().getFullYear()}年)
            </h3>
            <div className="bg-slate-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 overflow-x-auto">
              <div className="min-w-[700px] sm:min-w-[800px]">
                <div className="flex gap-2 mb-2 text-[10px] sm:text-xs text-slate-400 font-medium">
                  <div className="w-6 sm:w-8 text-right pr-1 sm:pr-2 flex flex-col justify-between h-[96px] sm:h-[116px] py-1">
                    <span>一</span>
                    <span>三</span>
                    <span>五</span>
                    <span>日</span>
                  </div>
                  <div className="grid grid-rows-7 grid-flow-col gap-1 sm:gap-1.5 flex-1">
                    {heatmapData.map((day, i) => (
                      <div 
                        key={i}
                        title={day.date ? `${format(day.date, 'yyyy年MM月dd日')} ${day.isFuture ? '未到' : day.isDone ? '已打卡' : '未打卡'}` : undefined}
                        className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-sm ${
                          !day.date ? 'bg-transparent' :
                          day.isDone ? 'bg-emerald-400 shadow-sm' : 
                          day.isFuture ? 'bg-slate-100' : 'bg-slate-200/70'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs text-slate-400 mt-3 sm:mt-4 px-8 sm:px-10 font-medium">
                  <span>1月</span>
                  <span>6月</span>
                  <span>12月</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
