import { StateCreator } from 'zustand';
import { TaskStore } from '../types';
import { Project, ProjectUpdate } from '../../types/task';
import { nanoid } from 'nanoid';

export const createProjectSlice: StateCreator<
  TaskStore,
  [['zustand/persist', unknown]],
  [],
  Pick<TaskStore, 'projects' | 'addProject' | 'updateProject' | 'deleteProject' | 'reorderProjects'>
> = (set, get) => ({
  projects: [],
  
  addProject: (project) => {
    const newProject: Project = {
      ...project,
      id: nanoid(),
      status: 'active',
      progress: 0,
      order: get().projects.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ projects: [...state.projects, newProject] }));
    return newProject.id;
  },
  
  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)
  })),
  
  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter(p => p.id !== id),
    // Also remove tasks from this project
    tasks: state.tasks.map(t => t.projectId === id ? { ...t, projectId: undefined, projectNodeType: undefined, dependencies: [] } : t)
  })),
  
  reorderProjects: (startIndex, endIndex, isArchived) => set((state) => {
    const filteredProjects = state.projects
      .filter(p => !!p.isArchived === isArchived)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const otherProjects = state.projects.filter(p => !!p.isArchived !== isArchived);
    
    const result = Array.from(filteredProjects);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    const updatedProjects = result.map((p, index) => ({ ...p, order: index }));
    
    return { projects: [...otherProjects, ...updatedProjects] };
  }),
});
