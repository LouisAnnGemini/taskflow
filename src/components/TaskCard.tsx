import React from 'react';
import { Task, TaskState } from '../types/task';
import { useTaskStore } from '../store/useTaskStore';
import { getUserDisplayName } from '../utils/user';
import { 
  Pin, 
  Clock, 
  MessageCircle, 
  Mail, 
  Briefcase, 
  MapPin, 
  MoreHorizontal,
  CheckCircle2,
  Circle,
  PlayCircle,
  Eye,
  PauseCircle,
  UserPlus,
  Link,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import { Avatar } from './Avatar';

const stateIcons: Record<TaskState, React.ReactNode> = {
  todo: <Circle size={14} className="text-slate-400" />,
  in_progress: <PlayCircle size={14} className="text-blue-500" />,
  in_review: <Eye size={14} className="text-purple-500" />,
  done: <CheckCircle2 size={14} className="text-emerald-500" />,
  snoozed: <PauseCircle size={14} className="text-amber-500" />,
};

const mediumIcons: Record<string, React.ReactNode> = {
  wechat: <MessageCircle size={12} />,
  email: <Mail size={12} />,
  oa: <Briefcase size={12} />,
  errand: <MapPin size={12} />,
  other: <MoreHorizontal size={12} />,
};

interface TaskCardProps {
  key?: React.Key;
  task: Task;
  onClick?: () => void;
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function TaskCard({ task, onClick, selectable, isSelected, onSelect }: TaskCardProps) {
  const { users, columns, priorities, mediums, entities, setSelectedTaskId, changeTaskState, currentUser, updateTask } = useTaskStore();
  const assignees = users.filter(u => task.assigneeIds.includes(u.id));
  const reporters = users.filter(u => task.reporterIds?.includes(u.id));
  const column = columns.find(c => c.id === task.state);
  
  const priority = priorities.find(p => p.id === task.priority);

  const handleClick = () => {
    if (onClick) onClick();
    else setSelectedTaskId(task.id);
  };

  const handleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation();
    changeTaskState(task.id, 'snoozed', currentUser.id);
  };

  const handleMarkDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    changeTaskState(task.id, 'done', currentUser.id);
  };

  const handleDelegate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const firstAssignee = task.assigneeIds[0];
    const currentIndex = users.findIndex(u => u.id === firstAssignee);
    const nextUser = users[(currentIndex + 1) % users.length];
    updateTask(task.id, { 
      isDelegated: true, 
      delegatedToIds: [nextUser.id],
      state: task.state === 'todo' ? 'in_progress' : task.state
    });
  };

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative flex flex-col h-full",
        task.isPinned ? "border-amber-200 bg-amber-50/30" : task.isDelegated ? "border-indigo-100 bg-indigo-50/20" : "border-slate-200",
        isSelected && "ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-100",
        task.state === 'done' && "opacity-75 grayscale-[0.2]"
      )}
    >
      {selectable && (
        <div 
          className="absolute top-3 right-3 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(!isSelected);
          }}
        >
          <div className={cn(
            "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
            isSelected ? "bg-indigo-600 border-indigo-600 scale-110" : "bg-white border-slate-300 hover:border-indigo-400"
          )}>
            {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-wrap max-w-[80%]">
          <div className={cn(
            "flex items-center justify-center w-6 h-6 rounded-lg",
            column?.color || 'bg-slate-100'
          )}>
            {column?.icon ? (
              <span className="text-xs">{column.icon}</span>
            ) : (
              stateIcons[task.state]
            )}
          </div>
          
          {priority && (
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1",
              priority.color
            )}>
              {priority.label}
            </span>
          )}
          
          {task.isPinned && (
            <div className="bg-amber-100 text-amber-600 p-1 rounded">
              <Pin size={10} className="fill-current" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quick Actions (visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 bg-white border border-slate-100 shadow-sm rounded-lg p-0.5">
            {task.state !== 'done' && (
              <button 
                onClick={handleMarkDone}
                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                title="完成"
              >
                <Check size={14} />
              </button>
            )}
            {task.state !== 'snoozed' && (
              <button 
                onClick={handleSnooze}
                className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                title="延期"
              >
                <PauseCircle size={14} />
              </button>
            )}
          </div>

          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded",
              new Date(task.dueDate) < new Date() && task.state !== 'done' 
                ? "bg-red-50 text-red-600" 
                : "text-slate-500"
            )}>
              <Clock size={10} />
              <span>{format(new Date(task.dueDate), 'MM/dd')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <h3 className={cn(
          "font-semibold text-slate-800 mb-2 leading-tight text-sm",
          task.state === 'done' && "line-through text-slate-400"
        )}>
          {task.title}
        </h3>
        
        {task.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
            {task.description}
          </p>
        )}

        {task.progress > 0 && task.progress < 100 && (
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>进度</span>
              <span>{task.progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
        <div className="flex flex-wrap gap-1 max-w-[60%]">
          {task.mediumTags.map(tagId => {
            const medium = mediums.find(m => m.id === tagId);
            return (
              <span key={tagId} className="flex items-center gap-1 text-[9px] font-bold uppercase bg-slate-50 text-slate-500 border border-slate-100 px-1.5 py-0.5 rounded">
                {medium?.icon && <span className="text-[10px]">{medium.icon}</span>}
                <span>{medium?.label || tagId}</span>
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {(task.relatedTaskIds?.length || 0) > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded" title="关联任务">
              <Link size={10} /> {task.relatedTaskIds?.length}
            </div>
          )}
          {task.isDelegated && (
            <div className="bg-indigo-50 text-indigo-600 p-1 rounded" title="已委派">
              <UserPlus size={12} />
            </div>
          )}
          <div className="flex -space-x-1.5">
            {assignees.map(assignee => (
              <Avatar 
                key={assignee.id}
                name={assignee.name} 
                title={`负责人: ${getUserDisplayName(assignee, entities)}`}
                className="w-6 h-6 border-2 border-white text-[9px] shadow-sm"
              />
            ))}
            {reporters.filter(r => !task.assigneeIds.includes(r.id)).map(reporter => (
              <Avatar 
                key={`reporter-${reporter.id}`}
                name={reporter.name} 
                title={`汇报人: ${getUserDisplayName(reporter, entities)}`}
                className="w-6 h-6 border-2 border-white opacity-60 text-[9px] shadow-sm grayscale-[0.5]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
