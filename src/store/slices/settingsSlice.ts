import { StateCreator } from 'zustand';
import { TaskStore } from '../types';

export const createSettingsSlice: StateCreator<
  TaskStore,
  [['zustand/persist', unknown]],
  [],
  Pick<TaskStore, 'users' | 'columns' | 'priorities' | 'mediums' | 'entities' | 'positions' | 'currentUser' | 'customFieldDefinitions' | 'fieldOrder' | 'navItemsConfig' | 'addUser' | 'updateUser' | 'deleteUser' | 'addColumn' | 'updateColumn' | 'deleteColumn' | 'addPriority' | 'updatePriority' | 'deletePriority' | 'addMedium' | 'updateMedium' | 'deleteMedium' | 'setMediums' | 'addEntity' | 'updateEntity' | 'deleteEntity' | 'addPosition' | 'updatePosition' | 'deletePosition' | 'addCustomFieldDefinition' | 'updateCustomFieldDefinition' | 'deleteCustomFieldDefinition' | 'setFieldOrder' | 'setNavItemsConfig'>
> = (set) => ({
  users: [],
  columns: [],
  priorities: [],
  mediums: [],
  entities: [],
  positions: [],
  currentUser: { id: 'u1', name: '爱丽丝 (我)' }, // Will be overridden by initial state
  customFieldDefinitions: [],
  fieldOrder: [],
  navItemsConfig: [],
  
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (id, updates) => set((state) => ({
    users: state.users.map(u => u.id === id ? { ...u, ...updates } : u)
  })),
  deleteUser: (id) => set((state) => ({
    users: state.users.filter(u => u.id !== id)
  })),
  
  addColumn: (column) => set((state) => ({ columns: [...state.columns, column] })),
  updateColumn: (id, updates) => set((state) => ({
    columns: state.columns.map(c => c.id === id ? { ...c, ...updates } : c)
  })),
  deleteColumn: (id) => set((state) => ({
    columns: state.columns.filter(c => c.id !== id)
  })),
  
  addPriority: (priority) => set((state) => ({ priorities: [...state.priorities, priority] })),
  updatePriority: (id, updates) => set((state) => ({
    priorities: state.priorities.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  deletePriority: (id) => set((state) => ({
    priorities: state.priorities.filter(p => p.id !== id)
  })),
  
  addMedium: (medium) => set((state) => ({ mediums: [...state.mediums, medium] })),
  updateMedium: (id, updates) => set((state) => ({
    mediums: state.mediums.map(m => m.id === id ? { ...m, ...updates } : m)
  })),
  deleteMedium: (id) => set((state) => ({
    mediums: state.mediums.filter(m => m.id !== id)
  })),
  setMediums: (mediums) => set({ mediums }),
  
  addEntity: (entity) => set((state) => ({ entities: [...state.entities, entity] })),
  updateEntity: (id, updates) => set((state) => ({
    entities: state.entities.map(e => e.id === id ? { ...e, ...updates } : e)
  })),
  deleteEntity: (id) => set((state) => ({
    entities: state.entities.filter(e => e.id !== id)
  })),
  
  addPosition: (position) => set((state) => ({ positions: [...state.positions, position] })),
  updatePosition: (id, updates) => set((state) => ({
    positions: state.positions.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  deletePosition: (id) => set((state) => ({
    positions: state.positions.filter(p => p.id !== id)
  })),
  
  addCustomFieldDefinition: (field) => {
    set((state) => {
      const newDefinitions = [...state.customFieldDefinitions, field];
      const newFieldOrder = [...state.fieldOrder, { id: field.id, name: field.name, isCustom: true, isVisible: true }];
      return { customFieldDefinitions: newDefinitions, fieldOrder: newFieldOrder };
    });
  },
  updateCustomFieldDefinition: (id, updates) => set((state) => ({
    customFieldDefinitions: state.customFieldDefinitions.map(f => f.id === id ? { ...f, ...updates } : f),
    fieldOrder: state.fieldOrder.map(f => f.id === id ? { ...f, name: updates.name || f.name } : f)
  })),
  deleteCustomFieldDefinition: (id) => set((state) => ({
    customFieldDefinitions: state.customFieldDefinitions.filter(f => f.id !== id),
    fieldOrder: state.fieldOrder.filter(f => f.id !== id)
  })),
  setFieldOrder: (order) => set({ fieldOrder: order }),
  
  setNavItemsConfig: (config) => set({ navItemsConfig: config }),
});
