import { StateCreator } from 'zustand';
import { TaskStore } from '../types';

export const createUISlice: StateCreator<
  TaskStore,
  [['zustand/persist', unknown]],
  [],
  Pick<TaskStore, 'currentView' | 'searchStateFilter' | 'kanbanProjectFilter' | 'kanbanShowSubtasks' | 'highlightedLogId' | 'modalState' | 'setCurrentView' | 'setSearchStateFilter' | 'setKanbanProjectFilter' | 'setKanbanShowSubtasks' | 'setHighlightedLogId' | 'openTaskModal' | 'openConfirmationModal' | 'closeModal'>
> = (set) => ({
  currentView: 'kanban',
  searchStateFilter: null,
  kanbanProjectFilter: 'all',
  kanbanShowSubtasks: false,
  highlightedLogId: null,
  modalState: { type: null },
  
  setCurrentView: (view) => set({ currentView: view }),
  setSearchStateFilter: (filter) => set({ searchStateFilter: filter }),
  setKanbanProjectFilter: (filter) => set({ kanbanProjectFilter: filter }),
  setKanbanShowSubtasks: (show) => set({ kanbanShowSubtasks: show }),
  setHighlightedLogId: (id) => set({ highlightedLogId: id }),
  openTaskModal: (taskId) => set({ modalState: { type: 'task', taskId } }),
  openConfirmationModal: (config) => set({ modalState: { type: 'confirmation', confirmationConfig: config } }),
  closeModal: () => set({ modalState: { type: null } }),
});
