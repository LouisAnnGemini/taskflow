import { StateCreator } from 'zustand';
import { Task, TaskState, ActivityLog, User, PriorityOption, MediumOption, Recurrence, Column, Notification, CustomFieldDefinition, FieldConfig, Memo, EntityOption, PositionOption, Project, NavItemConfig, TaskUpdate, ProjectUpdate, ModalState, ConfirmationModalConfig, Habit, LifeCategory } from '../types/task';

export interface TaskSlice {
  tasks: Task[];
  addTask: (task: Partial<Task>) => string;
  updateTask: (id: string, updates: TaskUpdate) => void;
  updateTasks: (ids: string[], updates: TaskUpdate) => void;
  deleteTask: (id: string) => void;
  convertSubtaskToTask: (subtaskId: string) => void;
  changeTaskState: (id: string, newState: TaskState, userId: string) => void;
  relateTask: (taskId: string, relatedTaskId: string) => void;
  unrelateTask: (taskId: string, relatedTaskId: string) => void;
  getSubtasks: (parentId: string) => Task[];
  getTask: (id: string) => Task | undefined;
  checkExpiringTasks: () => void;
  generateTestTasks: (count: number) => void;
  clearTasks: () => void;
  instantDone: (title: string, userId: string) => void;
}

export interface ProjectSlice {
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateProject: (id: string, updates: ProjectUpdate) => void;
  deleteProject: (id: string) => void;
  reorderProjects: (startIndex: number, endIndex: number, isArchived: boolean) => void;
  toggleProjectEdge: (projectId: string, edgeId: string) => void;
}

export interface UISlice {
  systemMode: 'work' | 'life';
  currentView: 'dashboard' | 'kanban' | 'calendar' | 'memos' | 'search' | 'settings' | 'projects';
  searchStateFilter: string | null;
  kanbanProjectFilter: 'all' | 'none';
  kanbanShowSubtasks: boolean;
  highlightedLogId: string | null;
  modalState: ModalState;
  toggleSystemMode: () => void;
  setCurrentView: (view: 'dashboard' | 'kanban' | 'calendar' | 'memos' | 'search' | 'settings' | 'projects') => void;
  setSearchStateFilter: (filter: string | null) => void;
  setKanbanProjectFilter: (filter: 'all' | 'none') => void;
  setKanbanShowSubtasks: (show: boolean) => void;
  setHighlightedLogId: (id: string | null) => void;
  openTaskModal: (taskId?: string) => void;
  openConfirmationModal: (config: ConfirmationModalConfig) => void;
  closeModal: () => void;
}

export interface SettingsSlice {
  users: User[];
  columns: Column[];
  priorities: PriorityOption[];
  mediums: MediumOption[];
  entities: EntityOption[];
  positions: PositionOption[];
  currentUser: User;
  customFieldDefinitions: CustomFieldDefinition[];
  fieldOrder: FieldConfig[];
  navItemsConfig: NavItemConfig[];
  habits: Habit[];
  lifeCategories: LifeCategory[];
  
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addColumn: (column: Column) => void;
  updateColumn: (id: string, updates: Partial<Column>) => void;
  deleteColumn: (id: string) => void;
  addPriority: (priority: PriorityOption) => void;
  updatePriority: (id: string, updates: Partial<PriorityOption>) => void;
  deletePriority: (id: string) => void;
  addMedium: (medium: MediumOption) => void;
  updateMedium: (id: string, updates: Partial<MediumOption>) => void;
  deleteMedium: (id: string) => void;
  setMediums: (mediums: MediumOption[]) => void;
  addEntity: (entity: EntityOption) => void;
  updateEntity: (id: string, updates: Partial<EntityOption>) => void;
  deleteEntity: (id: string) => void;
  addPosition: (position: PositionOption) => void;
  updatePosition: (id: string, updates: Partial<PositionOption>) => void;
  deletePosition: (id: string) => void;
  addCustomFieldDefinition: (field: CustomFieldDefinition) => void;
  updateCustomFieldDefinition: (id: string, updates: Partial<CustomFieldDefinition>) => void;
  deleteCustomFieldDefinition: (id: string) => void;
  setFieldOrder: (order: FieldConfig[]) => void;
  setNavItemsConfig: (config: NavItemConfig[]) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  addLifeCategory: (category: LifeCategory) => void;
  updateLifeCategory: (id: string, updates: Partial<LifeCategory>) => void;
  deleteLifeCategory: (id: string) => void;
}

export interface DataSlice {
  activityLogs: ActivityLog[];
  notifications: Notification[];
  memos: Memo[];
  supabaseConfig: { url: string; anonKey: string };
  lastCloudSyncTimestamp: number | null;
  
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  updateActivityLog: (id: string, updates: Partial<ActivityLog>) => void;
  deleteActivityLog: (id: string) => void;
  setActivityLogs: (logs: ActivityLog[]) => void;
  
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  
  addMemo: (content: string) => void;
  updateMemo: (id: string, content: string) => void;
  deleteMemo: (id: string) => void;
  
  setSupabaseConfig: (config: { url: string; anonKey: string }) => void;
  saveVersionToCloud: () => Promise<void>;
  fetchVersions: () => Promise<{ id: string; created_at: string }[]>;
  restoreVersion: (versionId: string) => Promise<void>;
  compressDatabase: () => void;
  
  setAllData: (data: Partial<TaskStore>) => void;
  mergeData: (data: Partial<TaskStore>) => void;
  exportAndDeleteByDateRange: (startDate: string, endDate: string) => Partial<TaskStore>;
}

export type TaskStore = TaskSlice & ProjectSlice & UISlice & SettingsSlice & DataSlice;

export type StoreSlice<T> = StateCreator<
  TaskStore,
  [['zustand/persist', unknown]],
  [],
  T
>;
