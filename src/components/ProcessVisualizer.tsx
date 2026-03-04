import React from 'react';
import { Task } from '../types/task';
import { Check, Snowflake } from 'lucide-react';
import { cn } from '../utils/cn';

interface ProcessVisualizerProps {
  task: Task;
  onUpdate?: (updates: Partial<Task>) => void;
}

export function ProcessVisualizer({ task, onUpdate }: ProcessVisualizerProps) {
  const isSnoozed = task.state === 'snoozed';
  // If snoozed, we use the previous state to determine where we are in the flow
  const activeState = isSnoozed ? (task.previousState || 'todo') : task.state;
  const isDelegated = task.isDelegated;

  const flowOrder = ['todo', 'in_progress', 'in_review', 'done'];
  
  // Determine the active index in the main flow
  let activeIndex = flowOrder.indexOf(activeState);

  const getStatus = (nodeState: string) => {
    const nodeIndex = flowOrder.indexOf(nodeState);

    if (nodeIndex < activeIndex) return 'completed';
    if (nodeIndex === activeIndex) return 'current';
    if (activeState === 'done') return 'completed';
    return 'pending';
  };

  const renderNode = (label: string, status: 'completed' | 'current' | 'pending', stateValue: string, isEnd: boolean = false, isDelegatedNode: boolean = false) => {
    let circleClasses = "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white";
    let innerContent = null;
    let textClasses = "mt-2 text-xs font-medium whitespace-nowrap absolute top-12";

    if (status === 'completed') {
      if (isDelegatedNode) {
        circleClasses = "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-blue-500 border-blue-500 text-white";
        innerContent = <Check size={20} />;
        textClasses += " text-blue-700";
      } else {
        circleClasses = "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-emerald-500 border-emerald-500 text-white";
        innerContent = <Check size={20} />;
        textClasses += " text-slate-700";
      }
    } else if (status === 'current') {
      if (isDelegatedNode) {
        circleClasses = "w-10 h-10 rounded-full flex items-center justify-center border-2 border-dashed transition-all duration-300 border-yellow-500 text-yellow-500 shadow-lg shadow-yellow-200 ring-4 ring-yellow-50 bg-yellow-50";
        innerContent = <div className="w-3 h-3 rounded-full bg-yellow-500" />;
        textClasses += " text-yellow-600";
      } else {
        circleClasses = "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 border-indigo-500 text-indigo-500 shadow-lg shadow-indigo-200 ring-4 ring-indigo-50";
        innerContent = <div className="w-3 h-3 rounded-full bg-indigo-500" />;
        textClasses += " text-indigo-600";
      }
    } else {
      circleClasses = "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 border-slate-200 text-slate-400 bg-white";
      if (isEnd && activeState === 'done') {
        circleClasses = "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-emerald-500 border-emerald-500 text-white";
        innerContent = <Check size={20} />;
      } else if (isEnd) {
        innerContent = <span className="text-[10px] font-bold">END</span>;
      } else {
        innerContent = <div className="w-3 h-3 rounded-full bg-slate-200" />;
      }
      textClasses += " text-slate-400";
    }

    return (
      <div 
        className={cn("flex flex-col items-center relative z-10 cursor-pointer transition-transform hover:scale-105", status !== 'current' && "hover:opacity-80")}
        onClick={() => onUpdate?.({ state: stateValue })}
        title={`点击切换至: ${label}`}
      >
        <div className={circleClasses}>
          {innerContent}
        </div>
        <span className={textClasses}>
          {label}
        </span>
      </div>
    );
  };

  const renderLine = (status: 'completed' | 'pending', isDelegatedLine: boolean = false) => {
    let lineClasses = "absolute inset-0 rounded-full transition-all duration-300 ";
    if (status === 'completed') {
      lineClasses += isDelegatedLine ? "bg-blue-500" : "bg-emerald-500";
    } else {
      lineClasses += "bg-slate-200";
    }

    return (
      <div className="flex-1 h-1 mx-2 relative top-5 z-0">
        <div className={lineClasses} />
      </div>
    );
  };

  const todoStatus = getStatus('todo');
  const inProgressStatus = getStatus('in_progress');
  const reviewStatus = getStatus('in_review');
  const doneStatus = getStatus('done');

  return (
    <div className="relative p-6 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden min-h-[140px] flex flex-col justify-center">
      {isSnoozed && (
        <div className="absolute inset-0 bg-blue-50/40 backdrop-blur-[2px] z-20 flex items-center justify-center border-2 border-blue-200/50 rounded-xl">
          <div className="bg-white/90 px-4 py-2 rounded-full shadow-sm flex items-center gap-2 text-blue-600 font-medium text-sm">
            <Snowflake size={16} className="animate-pulse" />
            <span>已暂缓 (冻结)</span>
          </div>
        </div>
      )}

      <div className={cn("flex items-start justify-between relative w-full", isSnoozed && "opacity-60 grayscale-[0.3]")}>
        {renderNode('待办', todoStatus, 'todo')}
        {renderLine(todoStatus === 'completed' ? 'completed' : 'pending')}
        
        {isDelegated ? (
          <>
            {renderNode('已委派', inProgressStatus, 'in_progress', false, true)}
            {renderLine(inProgressStatus === 'completed' ? 'completed' : 'pending', true)}
          </>
        ) : (
          <>
            {renderNode('进行中', inProgressStatus, 'in_progress')}
            {renderLine(inProgressStatus === 'completed' ? 'completed' : 'pending')}
          </>
        )}

        {renderNode('审核', reviewStatus, 'in_review')}
        {renderLine(reviewStatus === 'completed' ? 'completed' : 'pending')}
        {renderNode('完成', doneStatus, 'done', true)}
      </div>
    </div>
  );
}
