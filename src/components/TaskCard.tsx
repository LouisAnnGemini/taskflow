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
  GitBranch
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
  const { users, columns, priorities, mediums, entities, tasks, setSelectedTaskId, changeTaskState, currentUser, updateTask } = useTaskStore();
  const assignees = users.filter(u => task.assigneeIds.includes(u.id));
  const reporters = users.filter(u => task.reporterIds?.includes(u.id));
  const column = columns.find(c => c.id === task.state);
  const parentTask = task.parentId ? tasks.find(t => t.id === task.parentId) : null;
  
  const priority = priorities.find(p => p.id === task.priority);

  const handleClick = () => {
    if (onClick) onClick();
    else setSelectedTaskId(task.id);
  };

  const handleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation();
    changeTaskState(task.id, 'snoozed', currentUser.id);
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
        "bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group relative",
        task.isPinned && "border-indigo-200 bg-indigo-50/30",
        isSelected && "ring-2 ring-indigo-600 border-indigo-600"
      )}
    >
      {selectable && (
        <div 
          className="absolute top-4 right-4 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(!isSelected);
          }}
        >
          <div className={cn(
            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
            isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300 hover:border-slate-400"
          )}>
            {isSelected && <CheckCircle2 size={14} className="text-white" />}
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          {column?.icon ? (
            <span className="text-sm">{column.icon}</span>
          ) : (
            stateIcons[task.state] || (
              <div className={`w-3 h-3 rounded-full ${column?.color || 'bg-slate-200'}`} title={column?.title || task.state} />
            )
          )}
          {priority && (
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-md tracking-tight flex items-center gap-1",
              priority.color
            )}>
              {priority.icon && <span>{priority.icon}</span>}
              {priority.label}
            </span>
          )}
          {task.isPinned && <Pin size={14} className="text-indigo-500 fill-indigo-500" />}
        </div>
        
        <div className={cn("flex items-center gap-2", selectable && "pr-8")}>
          {/* Quick Actions (visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-1 shadow-sm border border-slate-100">
            <button 
              onClick={handleSnooze}
              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="延期"
            >
              <PauseCircle size={14} />
            </button>
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Clock size={12} />
              <span className="data-value">{format(new Date(task.dueDate), 'MM/dd')}</span>
            </div>
          )}
        </div>
      </div>

      {parentTask && (
        <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium mb-2 bg-indigo-50 w-fit px-2 py-0.5 rounded-md">
          <GitBranch size={12} />
          <span className="truncate max-w-[150px]">{parentTask.title}</span>
        </div>
      )}

      <h3 className={cn(
        "font-semibold text-slate-900 mb-2 leading-tight text-[15px]",
        task.state === 'done' && "line-through text-slate-400"
      )}>
        {task.title}
      </h3>

      {task.progress > 0 && task.progress < 100 && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4">
          <div 
            className="bg-indigo-600 h-1.5 rounded-full transition-all" 
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
        <div className="flex gap-1.5">
          {task.mediumTags.map(tagId => {
            const medium = mediums.find(m => m.id === tagId);
            return (
              <span key={tagId} className="flex items-center gap-1 text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                {medium?.icon ? (
                  <span className="text-[10px]">{medium.icon}</span>
                ) : (
                  mediumIcons[tagId] || <MoreHorizontal size={12} />
                )}
                <span>{medium?.label || tagId}</span>
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {(task.relatedTaskIds?.length || 0) > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Link size={12} /> {task.relatedTaskIds?.length}
            </div>
          )}
          {task.isDelegated && <UserPlus size={16} className="text-indigo-500" title="已委派" />}
          <div className="flex -space-x-2">
            {assignees.map(assignee => (
              <Avatar 
                key={assignee.id}
                name={assignee.name} 
                title={`负责人: ${getUserDisplayName(assignee, entities)}`}
                className="w-6 h-6 border-2 border-white text-[10px] shadow-sm"
              />
            ))}
            {reporters.filter(r => !task.assigneeIds.includes(r.id)).map(reporter => (
              <Avatar 
                key={`reporter-${reporter.id}`}
                name={reporter.name} 
                title={`汇报人: ${getUserDisplayName(reporter, entities)}`}
                className="w-6 h-6 border-2 border-white opacity-80 text-[10px] shadow-sm"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
