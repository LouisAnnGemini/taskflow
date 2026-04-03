import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { format, startOfWeek, addDays, subWeeks, addWeeks, parseISO, setHours, setMinutes, differenceInMinutes, isSameDay, addMinutes, isBefore } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Search, RefreshCw, X } from 'lucide-react';
import { Task } from '../types/task';

const HOUR_HEIGHT = 60; // pixels per hour
const MIN_DURATION = 5; // minutes
const SNAP_MINUTES = 5; // snap to 5 minutes

export function WeeklyPlanView() {
  const { tasks, addTask, updateTask, openTaskModal, currentUser } = useTaskStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: 'move' | 'resize-top' | 'resize-bottom';
    initialX: number;
    initialY: number;
    currentX: number;
    currentY: number;
    initialStart: Date;
    initialEnd: Date;
    hasMoved: boolean;
  } | null>(null);

  const [selectedPlanTaskId, setSelectedPlanTaskId] = useState<string | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);

  // Scroll to 9:00 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 9 * HOUR_HEIGHT;
    }
  }, []);

  // Clear selection when exiting manage mode
  useEffect(() => {
    if (!isManageMode) {
      setSelectedPlanTaskId(null);
    }
  }, [isManageMode]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const plannedTasks = useMemo(() => {
    return tasks.filter(t => t.plannedStartTime && t.plannedEndTime);
  }, [tasks]);

  const handleGridClick = (date: Date, hour: number) => {
    if (isDragging || dragState || isManageMode) return;
    
    const start = setHours(setMinutes(date, 0), hour);
    const end = addMinutes(start, 60);
    
    addTask({
      title: '新计划任务',
      state: 'todo',
      creatorId: currentUser.id,
      assigneeIds: [currentUser.id],
      plannedStartTime: start.toISOString(),
      plannedEndTime: end.toISOString(),
    });
  };

  const handleTaskMouseDown = (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-top' | 'resize-bottom') => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();
    
    if (isManageMode) {
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.plannedStartTime || !task.plannedEndTime) return;
    
    setIsDragging(true);
    
    const initialX = e.clientX;
    const initialY = e.clientY;
    const initialStart = parseISO(task.plannedStartTime);
    const initialEnd = parseISO(task.plannedEndTime);
    let hasMoved = false;

    setDragState({
      taskId,
      type,
      initialX,
      initialY,
      currentX: initialX,
      currentY: initialY,
      initialStart,
      initialEnd,
      hasMoved: false
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      hasMoved = hasMoved || Math.abs(moveEvent.clientX - initialX) > 3 || Math.abs(moveEvent.clientY - initialY) > 3;
      setDragState(prev => prev ? { ...prev, currentX: moveEvent.clientX, currentY: moveEvent.clientY, hasMoved } : null);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      if (hasMoved) {
        const deltaY = upEvent.clientY - initialY;
        const deltaMinutes = Math.round((deltaY / HOUR_HEIGHT) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
        
        let dayShift = 0;
        if (type === 'move' && gridRef.current) {
          const gridRect = gridRef.current.getBoundingClientRect();
          const colWidth = gridRect.width / 7;
          const startX = Math.max(0, Math.min(initialX - gridRect.left, gridRect.width - 1));
          const endX = Math.max(0, Math.min(upEvent.clientX - gridRect.left, gridRect.width - 1));
          const initialCol = Math.floor(startX / colWidth);
          const currentCol = Math.floor(endX / colWidth);
          dayShift = currentCol - initialCol;
        }
        
        let newStart = parseISO(task.plannedStartTime!);
        let newEnd = parseISO(task.plannedEndTime!);

        if (type === 'move') {
          newStart = addDays(addMinutes(initialStart, deltaMinutes), dayShift);
          newEnd = addDays(addMinutes(initialEnd, deltaMinutes), dayShift);
        } else if (type === 'resize-top') {
          newStart = addMinutes(initialStart, deltaMinutes);
          if (differenceInMinutes(newEnd, newStart) < MIN_DURATION) {
            newStart = addMinutes(newEnd, -MIN_DURATION);
          }
        } else if (type === 'resize-bottom') {
          newEnd = addMinutes(initialEnd, deltaMinutes);
          if (differenceInMinutes(newEnd, newStart) < MIN_DURATION) {
            newEnd = addMinutes(newStart, MIN_DURATION);
          }
        }

        updateTask(taskId, {
          plannedStartTime: newStart.toISOString(),
          plannedEndTime: newEnd.toISOString()
        });
      } else {
        setSelectedPlanTaskId(taskId);
      }

      setDragState(null);
      setTimeout(() => setIsDragging(false), 0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleReplaceTask = (newTaskId: string) => {
    const originalTask = tasks.find(t => t.id === selectedPlanTaskId);
    if (originalTask && originalTask.plannedStartTime && originalTask.plannedEndTime) {
      const start = originalTask.plannedStartTime;
      const end = originalTask.plannedEndTime;
      
      // Clear original task's planned time
      updateTask(originalTask.id, {
        plannedStartTime: undefined,
        plannedEndTime: undefined
      });
      
      // Inherit time to the new task
      updateTask(newTaskId, {
        plannedStartTime: start,
        plannedEndTime: end
      });
    }
    setShowReplaceModal(false);
    setSelectedPlanTaskId(null);
    setSearchQuery('');
  };

  const renderDayTasks = (date: Date, dayIndex: number) => {
    const dayTasks = plannedTasks.filter(t => {
      // If dragging, use the temporary dragged day
      if (dragState && dragState.taskId === t.id && dragState.type === 'move' && gridRef.current) {
        const gridRect = gridRef.current.getBoundingClientRect();
        const colWidth = gridRect.width / 7;
        const initialX = Math.max(0, Math.min(dragState.initialX - gridRect.left, gridRect.width - 1));
        const currentX = Math.max(0, Math.min(dragState.currentX - gridRect.left, gridRect.width - 1));
        const initialCol = Math.floor(initialX / colWidth);
        const currentCol = Math.floor(currentX / colWidth);
        const dayShift = currentCol - initialCol;
        const originalStart = parseISO(t.plannedStartTime!);
        const tempStart = addDays(originalStart, dayShift);
        return isSameDay(tempStart, date);
      }
      return isSameDay(parseISO(t.plannedStartTime!), date);
    }).sort((a, b) => parseISO(a.plannedStartTime!).getTime() - parseISO(b.plannedStartTime!).getTime());

    const columns: Task[][] = [[], [], []];
    const overflowTasks: Task[] = [];

    dayTasks.forEach(task => {
      let placed = false;
      for (let i = 0; i < 3; i++) {
        const lastTaskInCol = columns[i][columns[i].length - 1];
        if (!lastTaskInCol) {
          columns[i].push(task);
          placed = true;
          break;
        } else {
          // Calculate end time of last task in column (including drag state if applicable)
          let lastEnd = parseISO(lastTaskInCol.plannedEndTime!);
          if (dragState && dragState.taskId === lastTaskInCol.id) {
            const deltaMinutes = Math.round(((dragState.currentY - dragState.initialY) / HOUR_HEIGHT) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
            if (dragState.type === 'move' || dragState.type === 'resize-bottom') {
              lastEnd = addMinutes(dragState.initialEnd, deltaMinutes);
            }
          }
          
          let currentStart = parseISO(task.plannedStartTime!);
          if (dragState && dragState.taskId === task.id) {
            const deltaMinutes = Math.round(((dragState.currentY - dragState.initialY) / HOUR_HEIGHT) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
            if (dragState.type === 'move' || dragState.type === 'resize-top') {
              currentStart = addMinutes(dragState.initialStart, deltaMinutes);
            }
          }

          if (isBefore(lastEnd, currentStart) || lastEnd.getTime() === currentStart.getTime()) {
            columns[i].push(task);
            placed = true;
            break;
          }
        }
      }
      if (!placed) {
        overflowTasks.push(task);
      }
    });

    const allRenderedTasks = [...columns[0], ...columns[1], ...columns[2]];

    return (
      <div className="absolute inset-0 pointer-events-none">
        {allRenderedTasks.map(task => {
          const colIndex = columns.findIndex(col => col.some(t => t.id === task.id));
          const totalCols = columns.filter(col => col.length > 0).length;
          
          let start = parseISO(task.plannedStartTime!);
          let end = parseISO(task.plannedEndTime!);
          
          if (dragState && dragState.taskId === task.id) {
            const deltaMinutes = Math.round(((dragState.currentY - dragState.initialY) / HOUR_HEIGHT) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
            if (dragState.type === 'move') {
              start = addMinutes(dragState.initialStart, deltaMinutes);
              end = addMinutes(dragState.initialEnd, deltaMinutes);
            } else if (dragState.type === 'resize-top') {
              start = addMinutes(dragState.initialStart, deltaMinutes);
              if (differenceInMinutes(end, start) < MIN_DURATION) start = addMinutes(end, -MIN_DURATION);
            } else if (dragState.type === 'resize-bottom') {
              end = addMinutes(dragState.initialEnd, deltaMinutes);
              if (differenceInMinutes(end, start) < MIN_DURATION) end = addMinutes(start, MIN_DURATION);
            }
          }

          const startMinutes = start.getHours() * 60 + start.getMinutes();
          const durationMinutes = differenceInMinutes(end, start);
          
          const top = (startMinutes / 60) * HOUR_HEIGHT;
          const height = (durationMinutes / 60) * HOUR_HEIGHT;
          
          const width = `calc(${100 / Math.max(1, totalCols)}% - 4px)`;
          const left = `calc(${(colIndex / Math.max(1, totalCols)) * 100}% + 2px)`;

          const isSelected = selectedPlanTaskId === task.id;

          return (
            <div
              key={task.id}
              className={`absolute rounded-md shadow-sm overflow-hidden pointer-events-auto group transition-colors ${
                task.state === 'done' ? 'bg-emerald-100 border border-emerald-300 text-emerald-900' : 'bg-indigo-100 border border-indigo-300 text-indigo-900'
              } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 z-40' : ''}`}
              style={{ top, height, left, width, zIndex: dragState?.taskId === task.id ? 50 : (isSelected ? 40 : 10) }}
              onClick={(e) => {
                e.stopPropagation();
                if (isManageMode) {
                  setSelectedPlanTaskId(task.id);
                }
              }}
              onDoubleClick={(e) => { e.stopPropagation(); openTaskModal(task.id); }}
            >
              {!isManageMode && (
                <div 
                  className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 z-20"
                  onMouseDown={(e) => handleTaskMouseDown(e, task.id, 'resize-top')}
                />
              )}
              <div 
                className={`absolute inset-x-0 top-2 bottom-2 p-1 text-xs overflow-hidden ${isManageMode ? 'cursor-pointer' : 'cursor-pointer'}`}
                onMouseDown={(e) => handleTaskMouseDown(e, task.id, 'move')}
              >
                <div className="font-semibold truncate leading-tight pr-4">{task.title}</div>
                <div className="text-[10px] opacity-75 truncate mt-0.5">
                  {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                </div>
              </div>
              {!isManageMode && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 z-20"
                  onMouseDown={(e) => handleTaskMouseDown(e, task.id, 'resize-bottom')}
                />
              )}
              {isSelected && isManageMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReplaceModal(true);
                  }}
                  className="absolute top-1 right-1 p-1 bg-white hover:bg-slate-100 rounded text-indigo-600 shadow-sm z-30 transition-colors"
                  title="替换任务"
                >
                  <RefreshCw size={12} />
                </button>
              )}
            </div>
          );
        })}
        
        {overflowTasks.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-slate-800 text-white text-xs px-2 py-1 rounded-full shadow-md pointer-events-auto z-40">
            +{overflowTasks.length} 更多
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white" onClick={() => setSelectedPlanTaskId(null)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-800">
          {format(weekStart, 'yyyy年 M月 d日', { locale: zhCN })} - {format(addDays(weekStart, 6), 'M月 d日', { locale: zhCN })}
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsManageMode(!isManageMode)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isManageMode ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isManageMode ? '退出管理' : '任务管理'}
          </button>
          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm p-1">
            <button onClick={prevWeek} className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
              本周
            </button>
            <button onClick={nextWeek} className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 bg-slate-50" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 shrink-0 border-r border-slate-200"></div>
        <div className="flex-1 grid grid-cols-7">
          {days.map((day, i) => (
            <div key={i} className="py-2 text-center border-r border-slate-200 last:border-r-0">
              <div className="text-xs text-slate-500">{format(day, 'EEE', { locale: zhCN })}</div>
              <div className={`text-lg font-semibold ${isSameDay(day, new Date()) ? 'text-indigo-600' : 'text-slate-800'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="w-12 shrink-0 border-l border-slate-200"></div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative select-none">
        <div className="flex" style={{ height: 24 * HOUR_HEIGHT }}>
          <div className="w-12 shrink-0 border-r border-slate-200 relative bg-slate-50" onClick={(e) => e.stopPropagation()}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="absolute w-full text-right pr-2 text-xs text-slate-400" style={{ top: i * HOUR_HEIGHT - 8 }}>
                {i}:00
              </div>
            ))}
          </div>

          <div ref={gridRef} className="flex-1 grid grid-cols-7 relative">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="absolute w-full border-t border-slate-100 pointer-events-none" style={{ top: i * HOUR_HEIGHT }}></div>
            ))}

            {days.map((day, i) => (
              <div key={i} className="relative border-r border-slate-200 last:border-r-0">
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div 
                    key={hour} 
                    className="absolute w-full hover:bg-indigo-50/50 cursor-pointer"
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => handleGridClick(day, hour)}
                  />
                ))}
                {renderDayTasks(day, i)}
              </div>
            ))}
          </div>

          <div className="w-12 shrink-0 border-l border-slate-200 relative bg-slate-50" onClick={(e) => e.stopPropagation()}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="absolute w-full text-left pl-2 text-xs text-slate-400" style={{ top: i * HOUR_HEIGHT - 8 }}>
                {i}:00
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Replace Task Modal */}
      {showReplaceModal && selectedPlanTaskId && (
        <div className="fixed inset-0 bg-slate-900/20 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">替换任务</h3>
              <button onClick={() => setShowReplaceModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="搜索未完成的任务..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {tasks
                .filter(t => t.state !== 'done' && t.id !== selectedPlanTaskId && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleReplaceTask(t.id)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0 group"
                  >
                    <div className="font-medium text-slate-800 group-hover:text-indigo-600 transition-colors">{t.title}</div>
                    {t.description && <div className="text-xs text-slate-500 truncate mt-1">{t.description}</div>}
                  </button>
                ))}
              {tasks.filter(t => t.state !== 'done' && t.id !== selectedPlanTaskId && t.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  没有找到匹配的任务
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
