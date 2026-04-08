import React, { useState, useRef, useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { CheckCircle2, Circle, Plus, Calendar as CalendarIcon, Flame, Settings2, X, Trash2, BarChart2, Tag, Edit2, Check, ChevronLeft, ChevronRight, CalendarDays, AlertCircle, ArrowRight } from 'lucide-react';
import { format, isSameDay, subDays, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isBefore, startOfDay, isSameMonth, subMonths, addMonths } from 'date-fns';
import { nanoid } from 'nanoid';
import { HabitStatsModal } from '../components/HabitStatsModal';
import { Habit } from '../types/task';

export function LifeWorkspace() {
  const { tasks, habits, lifeCategories, addTask, updateTask, deleteTask, addHabit, deleteHabit, addLifeCategory, deleteLifeCategory, updateLifeCategory, toggleSystemMode } = useTaskStore();
  const [activeTab, setActiveTab] = useState<'habits' | 'tasks' | 'calendar' | 'categories'>('tasks');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isManagingHabits, setIsManagingHabits] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('emerald');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('emerald');
  const [selectedHabitForStats, setSelectedHabitForStats] = useState<Habit | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));

  const COLORS = ['emerald', 'blue', 'orange', 'rose', 'purple', 'amber'];
  const COLOR_CLASSES: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    rose: 'bg-rose-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  };

  const { lifeTasks, todos, overdueTodos, calendarDays, today } = useMemo(() => {
    const lifeTasks = tasks.filter(t => t.category === 'life');
    const today = new Date();
    
    const todos = lifeTasks.filter(t => {
      if (t.habitId) return false;
      const taskDate = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
      return isSameDay(taskDate, selectedDate);
    });
    
    const overdueTodos = lifeTasks.filter(t => {
      if (t.habitId) return false;
      if (t.state === 'done') return false;
      const taskDate = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
      return isBefore(startOfDay(taskDate), startOfDay(today));
    });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return { lifeTasks, todos, overdueTodos, calendarDays, today };
  }, [tasks, selectedDate, currentMonth]);

  const isViewingToday = useMemo(() => isSameDay(selectedDate, new Date()), [selectedDate]);

  const getHabitTaskForDate = (habitId: string, date: Date) => {
    return lifeTasks.find(t => 
      t.habitId === habitId && 
      isSameDay(new Date(t.createdAt), date)
    );
  };

  const getHabitHistory = (habitId: string) => {
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(selectedDate, i);
      const task = getHabitTaskForDate(habitId, date);
      history.push({
        date,
        isDone: task?.state === 'done'
      });
    }
    return history;
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask({
      title: newTaskTitle.trim(),
      category: 'life',
      state: 'todo',
      lifeCategoryId: selectedCategoryId || undefined,
      startDate: selectedDate.toISOString()
    });
    setNewTaskTitle('');
    setSelectedCategoryId('');
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    addHabit({
      id: nanoid(),
      name: newHabitName.trim(),
      icon: '🌟',
      color: 'emerald',
      createdAt: new Date().toISOString()
    });
    setNewHabitName('');
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    addLifeCategory({
      id: nanoid(),
      name: newCategoryName.trim(),
      color: newCategoryColor,
      icon: '🏷️'
    });
    setNewCategoryName('');
    setNewCategoryColor('emerald');
  };

  const handleEditCategory = (cat: any) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategoryColor(cat.color || 'emerald');
  };

  const saveEditCategory = (id: string) => {
    updateLifeCategory(id, { name: editCategoryName, color: editCategoryColor });
    setEditingCategoryId(null);
    setEditCategoryName('');
    setEditCategoryColor('emerald');
  };

  const toggleHabit = (habitId: string, habitName: string, targetDate: Date = selectedDate) => {
    const targetTask = getHabitTaskForDate(habitId, targetDate);
    if (targetTask) {
      updateTask(targetTask.id, { state: targetTask.state === 'done' ? 'todo' : 'done' });
    } else {
      addTask({
        title: habitName,
        category: 'life',
        state: 'done',
        habitId: habitId,
        createdAt: targetDate.toISOString(),
        startDate: targetDate.toISOString()
      });
    }
  };

  const toggleTaskState = (taskId: string, currentState: string) => {
    updateTask(taskId, { state: currentState === 'done' ? 'todo' : 'done' });
  };

  return (
    <div className="min-h-screen bg-orange-50/50 flex flex-col font-sans text-slate-800 transition-colors duration-500">
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 transition-transform"
              onDoubleClick={toggleSystemMode}
              title="双击切换回工作模式"
            >
              <span className="text-white font-handwriting italic font-bold text-2xl leading-none">L</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-emerald-900 font-handwriting italic">LifeFlow</span>
          </div>
          
          <div className="flex bg-orange-100/50 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'tasks' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              清单
            </button>
            <button
              onClick={() => setActiveTab('habits')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'habits' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              习惯
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'calendar' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              日历
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'categories' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              分类
            </button>
          </div>

          <div className="flex items-center bg-emerald-50 rounded-full p-1">
            <button 
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors"
              title="前一天"
            >
              <ChevronLeft size={18} />
            </button>
            <div 
              className="relative flex items-center px-2 cursor-pointer"
              onClick={() => {
                try {
                  if (dateInputRef.current && 'showPicker' in dateInputRef.current) {
                    dateInputRef.current.showPicker();
                  }
                } catch (e) {
                  // Fallback for browsers that don't support showPicker
                }
              }}
            >
              <span className="text-sm font-medium text-emerald-600 min-w-[110px] text-center pointer-events-none relative z-10">
                {isSameDay(selectedDate, new Date()) ? '今天' : format(selectedDate, 'yyyy年MM月dd日')}
              </span>
              <input 
                ref={dateInputRef}
                type="date" 
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, day));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
            </div>
            <button 
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors"
              title="后一天"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'habits' ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Flame className="text-orange-500" size={24} />
                <h2 className="text-2xl font-bold text-slate-800">今日习惯</h2>
              </div>
              <button 
                onClick={() => setIsManagingHabits(!isManagingHabits)}
                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="管理习惯"
              >
                <Settings2 size={20} />
              </button>
            </div>

            {isManagingHabits && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-200 mb-6 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700">管理习惯模板</h3>
                  <button onClick={() => setIsManagingHabits(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={handleAddHabit} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="输入新习惯名称..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button 
                    type="submit"
                    disabled={!newHabitName.trim()}
                    className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50"
                  >
                    添加
                  </button>
                </form>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {habits.map(habit => (
                    <div key={habit.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group">
                      <span className="font-medium text-slate-700">{habit.name}</span>
                      <button 
                        onClick={() => deleteHabit(habit.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {habits.length === 0 && (
                    <div className="text-center text-slate-400 py-4 text-sm">还没有习惯模板</div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {habits.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-3xl border border-orange-100 border-dashed">
                  <Flame className="mx-auto text-orange-200 mb-3" size={48} />
                  <p>还没有养成习惯，点击右上角设置添加一个吧</p>
                </div>
              ) : (
                habits.map(habit => {
                  const todayTask = getHabitTaskForDate(habit.id, selectedDate);
                  const isDoneToday = todayTask?.state === 'done';
                  const history = getHabitHistory(habit.id);

                  return (
                    <div key={habit.id} className="bg-white p-5 rounded-3xl shadow-sm border border-orange-100 flex flex-col gap-4 group hover:shadow-md transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleHabit(habit.id, habit.name, selectedDate)}
                            className={`transition-colors ${isDoneToday ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}
                          >
                            {isDoneToday ? <CheckCircle2 size={32} /> : <Circle size={32} />}
                          </button>
                          <span className={`font-bold text-lg ${isDoneToday ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {habit.name}
                          </span>
                        </div>
                        <button 
                          onClick={() => setSelectedHabitForStats(habit)}
                          className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="查看数据报表"
                        >
                          <BarChart2 size={20} />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
                        <span className="text-xs font-medium text-slate-400 ml-1">近7天</span>
                        <div className="flex gap-1.5">
                          {history.map((day, i) => (
                            <button 
                              key={i}
                              onClick={() => toggleHabit(habit.id, habit.name, day.date)}
                              title={`${format(day.date, 'MM月dd日')} - ${day.isDone ? '已打卡 (点击取消)' : '未打卡 (点击补卡)'}`}
                              className={`w-5 h-5 rounded-md transition-all hover:scale-110 hover:ring-2 hover:ring-emerald-200 focus:outline-none ${day.isDone ? 'bg-emerald-400 shadow-sm' : 'bg-slate-200 hover:bg-slate-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : activeTab === 'tasks' ? (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <CalendarIcon className="text-emerald-500" size={24} />
              <h2 className="text-2xl font-bold text-slate-800">生活清单</h2>
            </div>
            
            <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 overflow-hidden">
              <div className="p-4 border-b border-emerald-50 bg-emerald-50/30">
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <select 
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="bg-white border border-emerald-200 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-600"
                  >
                    <option value="">无分类</option>
                    {lifeCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="记录生活琐事..."
                    className="flex-1 bg-white border border-emerald-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="bg-emerald-500 text-white px-4 py-3 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <Plus size={20} />
                    <span className="hidden sm:inline">添加</span>
                  </button>
                </form>
              </div>

              <div className="divide-y divide-emerald-50">
                {isViewingToday && overdueTodos.length > 0 && (
                  <div className="p-4 border-b-2 border-orange-100 bg-orange-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-orange-600 font-medium">
                        <AlertCircle size={18} />
                        <span>过去未完成 ({overdueTodos.length})</span>
                      </div>
                      <button 
                        onClick={() => {
                          overdueTodos.forEach(t => updateTask(t.id, { startDate: today.toISOString() }));
                        }}
                        className="text-xs text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                      >
                        全部顺延到今天 <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {overdueTodos.map(todo => {
                        const category = lifeCategories.find(c => c.id === todo.lifeCategoryId);
                        return (
                          <div key={todo.id} className="flex items-center gap-3 group bg-white p-2 rounded-xl border border-orange-100/50 shadow-sm">
                            <button 
                              onClick={() => toggleTaskState(todo.id, todo.state)}
                              className="text-slate-300 hover:text-emerald-400 transition-colors"
                            >
                              <Circle size={20} />
                            </button>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-slate-600 text-sm">
                                {todo.title}
                              </span>
                              <span className="text-[10px] text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded font-medium">
                                {format(todo.startDate ? new Date(todo.startDate) : new Date(todo.createdAt), 'MM-dd')}
                              </span>
                              {category && (
                                <span className={`text-[10px] ${category.color === 'orange' ? 'bg-orange-100 text-orange-700' : category.color === 'blue' ? 'bg-blue-100 text-blue-700' : category.color === 'rose' ? 'bg-rose-100 text-rose-700' : category.color === 'purple' ? 'bg-purple-100 text-purple-700' : category.color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} px-1.5 py-0.5 rounded-full`}>
                                  {category.name}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => updateTask(todo.id, { startDate: today.toISOString() })}
                              className="text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-xs flex items-center gap-1 bg-emerald-50 rounded-lg px-2"
                              title="顺延到今天"
                            >
                              顺延 <ArrowRight size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {todos.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    生活井井有条，没有待办事项
                  </div>
                ) : (
                  todos.map(todo => {
                    const category = lifeCategories.find(c => c.id === todo.lifeCategoryId);
                    return (
                      <div key={todo.id} className="p-4 flex items-center gap-3 hover:bg-emerald-50/30 transition-colors group">
                        <button 
                          onClick={() => toggleTaskState(todo.id, todo.state)}
                          className={`transition-colors ${todo.state === 'done' ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}
                        >
                          {todo.state === 'done' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        <div className="flex-1 flex items-center gap-2">
                          <span className={`font-medium ${todo.state === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {todo.title}
                          </span>
                          {category && (
                            <span className={`text-xs ${category.color === 'orange' ? 'bg-orange-100 text-orange-700' : category.color === 'blue' ? 'bg-blue-100 text-blue-700' : category.color === 'rose' ? 'bg-rose-100 text-rose-700' : category.color === 'purple' ? 'bg-purple-100 text-purple-700' : category.color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} px-2 py-0.5 rounded-full`}>
                              {category.name}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteTask(todo.id)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        ) : activeTab === 'calendar' ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <CalendarDays className="text-emerald-500" size={24} />
                <h2 className="text-2xl font-bold text-slate-800">日历回顾</h2>
              </div>
              <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-emerald-100">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-slate-400 hover:text-emerald-600">
                  <ChevronLeft size={20} />
                </button>
                <span className="font-medium text-slate-700 min-w-[100px] text-center">
                  {format(currentMonth, 'yyyy年 MM月')}
                </span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-slate-400 hover:text-emerald-600">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-emerald-100">
              <div className="grid grid-cols-7 border-b border-emerald-50 bg-emerald-50/30 rounded-t-3xl">
                {['一', '二', '三', '四', '五', '六', '日'].map(day => (
                  <div key={day} className="py-3 text-center text-sm font-medium text-emerald-700">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr">
                {calendarDays.map((day, i) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  
                  // Get tasks for this day
                  const dayTasks = lifeTasks.filter(t => {
                    if (t.habitId) return false;
                    const taskDate = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
                    return isSameDay(taskDate, day);
                  });
                  
                  const completedTasks = dayTasks.filter(t => t.state === 'done');
                  const pendingTasks = dayTasks.filter(t => t.state !== 'done');
                  
                  // Get habits for this day
                  const dayHabits = habits.map(h => {
                    const task = getHabitTaskForDate(h.id, day);
                    return { habit: h, isDone: task?.state === 'done' };
                  });
                  const completedHabitsCount = dayHabits.filter(h => h.isDone).length;

                  const isLastRow = i >= calendarDays.length - 7;
                  const isBottomLeft = i === calendarDays.length - 7;
                  const isBottomRight = i === calendarDays.length - 1;

                  return (
                    <div 
                      key={day.toISOString()} 
                      onClick={() => {
                        setSelectedDate(day);
                        setActiveTab('tasks');
                      }}
                      className={`min-h-[100px] p-2 border-b border-r border-emerald-50 cursor-pointer transition-colors hover:bg-emerald-50/50 group relative hover:z-50 ${!isCurrentMonth ? 'bg-slate-50/50' : ''} ${i % 7 === 6 ? 'border-r-0' : ''} ${isLastRow ? 'border-b-0' : ''} ${isBottomLeft ? 'rounded-bl-3xl' : ''} ${isBottomRight ? 'rounded-br-3xl' : ''}`}
                    >
                      <div className={`text-right text-sm mb-2 ${isToday ? 'font-bold text-emerald-600' : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                        {isToday ? <span className="bg-emerald-100 px-2 py-0.5 rounded-full">今天</span> : format(day, 'd')}
                      </div>
                      
                      <div className="space-y-1">
                        {pendingTasks.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <span>{pendingTasks.length} 待办</span>
                          </div>
                        )}
                        {completedTasks.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <Check size={10} />
                            <span>{completedTasks.length} 完成</span>
                          </div>
                        )}
                        {completedHabitsCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            <Flame size={10} />
                            <span>{completedHabitsCount} 习惯</span>
                          </div>
                        )}
                      </div>

                      {/* Hover Preview */}
                      {(dayTasks.length > 0 || completedHabitsCount > 0) && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-slate-800 text-white text-xs rounded-xl p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 hidden sm:block">
                          <div className="font-medium mb-2 text-slate-300 border-b border-slate-700 pb-1">{format(day, 'MM月dd日')}</div>
                          {pendingTasks.length > 0 && (
                            <div className="mb-1.5">
                              {pendingTasks.map(t => (
                                <div key={t.id} className="text-orange-300 truncate">• {t.title}</div>
                              ))}
                            </div>
                          )}
                          {completedTasks.length > 0 && (
                            <div className="mb-1.5">
                              {completedTasks.map(t => (
                                <div key={t.id} className="text-emerald-400 line-through truncate opacity-80">• {t.title}</div>
                              ))}
                            </div>
                          )}
                          {completedHabitsCount > 0 && (
                            <div className="text-blue-300 truncate">
                              • 完成 {completedHabitsCount} 个习惯
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Tag className="text-emerald-500" size={24} />
              <h2 className="text-2xl font-bold text-slate-800">管理分类</h2>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100">
              <form onSubmit={handleAddCategory} className="flex flex-col gap-4 mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="输入新分类名称..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button 
                    type="submit"
                    disabled={!newCategoryName.trim()}
                    className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50"
                  >
                    添加
                  </button>
                </div>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCategoryColor(c)}
                      className={`w-8 h-8 rounded-full ${COLOR_CLASSES[c]} ${newCategoryColor === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`}
                    />
                  ))}
                </div>
              </form>
              <div className="space-y-3">
                {lifeCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group">
                    {editingCategoryId === cat.id ? (
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <button onClick={() => saveEditCategory(cat.id)} className="text-emerald-600 hover:text-emerald-700">
                            <Check size={20} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          {COLORS.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditCategoryColor(c)}
                              className={`w-6 h-6 rounded-full ${COLOR_CLASSES[c]} ${editCategoryColor === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${COLOR_CLASSES[cat.color]}`} />
                          <span className="font-medium text-slate-700">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditCategory(cat)} className="text-slate-400 hover:text-emerald-600">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => deleteLifeCategory(cat.id)} className="text-slate-400 hover:text-red-500">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {lifeCategories.length === 0 && (
                  <div className="text-center text-slate-400 py-8">还没有创建分类</div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {selectedHabitForStats && (
        <HabitStatsModal 
          habit={selectedHabitForStats} 
          tasks={tasks} 
          onClose={() => setSelectedHabitForStats(null)} 
        />
      )}
    </div>
  );
}
