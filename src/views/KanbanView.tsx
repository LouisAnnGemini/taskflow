import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTaskStore } from '../store/useTaskStore';
import { TaskState } from '../types/task';
import { TaskCard } from '../components/TaskCard';
import { Eye, EyeOff, Settings2, Check } from 'lucide-react';

export function KanbanView() {
  const { tasks, columns, changeTaskState, currentUser, updateColumn } = useTaskStore();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskState;
    changeTaskState(draggableId, newStatus, currentUser.id);
  };

  const visibleColumns = columns.filter(col => !col.isHidden);

  return (
    <div className="space-y-4">
      <div className="flex justify-end px-2">
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Settings2 size={16} />
            显示设置
          </button>

          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-2">
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  显示/隐藏栏目
                </div>
                <div className="space-y-1">
                  {columns.map(column => (
                    <button
                      key={column.id}
                      onClick={() => updateColumn(column.id, { isHidden: !column.isHidden })}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {column.icon && <span>{column.icon}</span>}
                        <span>{column.title}</span>
                      </div>
                      {column.isHidden ? (
                        <EyeOff size={16} className="text-slate-300" />
                      ) : (
                        <Check size={16} className="text-indigo-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 snap-x snap-mandatory md:snap-none px-4 md:px-0 -mx-4 md:mx-0">
          {visibleColumns.map((column) => {
            const columnTasks = tasks.filter((t) => t.state === column.id && !t.parentId);

            return (
              <div key={column.id} className="flex flex-col w-[85vw] sm:w-80 shrink-0 snap-center md:snap-align-none">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                    {column.icon && <span>{column.icon}</span>}
                    {column.title}
                    <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full font-medium">
                      {columnTasks.length}
                    </span>
                  </h2>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-2xl p-3 min-h-[200px] transition-colors ${column.color} ${
                        snapshot.isDraggingOver ? 'ring-2 ring-indigo-300 ring-inset' : ''
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        {columnTasks.map((task, index) => (
                          // @ts-expect-error key prop is required by React but missing in types
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                }}
                              >
                                <TaskCard task={task} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
