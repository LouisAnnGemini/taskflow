import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { Task, TaskState, ActivityLog, User, PriorityOption, MediumOption, Recurrence, Column, Notification, CustomFieldDefinition, FieldConfig, Memo, EntityOption, PositionOption } from '../types/task';
import { format } from 'date-fns';
import { getSupabaseClient } from '../lib/supabase';

const SYNC_USER_ID = 'default_user'; // For a single-user app or shared state, we use a default ID. In a real app, this would be the authenticated user's ID.

const getSupabaseFromState = (stateStr: string | null) => {
  if (!stateStr) return getSupabaseClient();
  try {
    const parsed = JSON.parse(stateStr);
    const config = parsed?.state?.supabaseConfig;
    if (config && config.url && config.anonKey) {
      return getSupabaseClient(config.url, config.anonKey);
    }
  } catch (e) {}
  
  // Only fallback to env vars if they are actually set (not empty strings)
  const envUrl = process.env.TASKFLOW_SUPABASE_URL;
  const envKey = process.env.TASKFLOW_SUPABASE_ANON_KEY;
  if (envUrl && envKey) {
    return getSupabaseClient();
  }
  
  return null;
};

const customStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value);
    localStorage.setItem(`${name}-updated-at`, new Date().toISOString());
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

const defaultColumns: Column[] = [
  { id: 'todo', title: '待办', color: 'bg-slate-100', icon: '📝' },
  { id: 'in_progress', title: '进行中', color: 'bg-blue-50', icon: '🚀' },
  { id: 'in_review', title: '审核中', color: 'bg-purple-50', icon: '👀' },
  { id: 'done', title: '已完成', color: 'bg-emerald-50', icon: '✅' },
  { id: 'snoozed', title: '延期', color: 'bg-amber-50', icon: '⏸️' },
];

const defaultPriorities: PriorityOption[] = [
  { id: 'low', label: '低', color: 'bg-slate-100 text-slate-700', icon: '🔽' },
  { id: 'medium', label: '中', color: 'bg-blue-100 text-blue-700', icon: '⏺️' },
  { id: 'high', label: '高', color: 'bg-orange-100 text-orange-700', icon: '🔼' },
  { id: 'urgent', label: '极高', color: 'bg-red-100 text-red-700', icon: '🔥' },
];

const defaultMediums: MediumOption[] = [
  { id: 'wechat', label: '微信', icon: '💬' },
  { id: 'email', label: '邮件', icon: '📧' },
  { id: 'oa', label: 'OA', icon: '💼' },
  { id: 'errand', label: '外勤', icon: '📍' },
  { id: 'other', label: '其他', icon: '📌' },
];

const defaultEntities: EntityOption[] = [];
const defaultPositions: PositionOption[] = [];

const defaultFieldOrder: FieldConfig[] = [
  { id: 'title', name: '标题', isCustom: false, isVisible: true },
  { id: 'description', name: '描述', isCustom: false, isVisible: true },
  { id: 'state', name: '状态', isCustom: false, isVisible: true },
  { id: 'priority', name: '优先级', isCustom: false, isVisible: true },
  { id: 'assigneeIds', name: '负责人', isCustom: false, isVisible: true },
  { id: 'isDelegated', name: '委派状态', isCustom: false, isVisible: true },
  { id: 'reporterIds', name: '审核人', isCustom: false, isVisible: true },
  { id: 'startDate', name: '开始日期', isCustom: false, isVisible: true },
  { id: 'dueDate', name: '截止日期', isCustom: false, isVisible: true },
  { id: 'progress', name: '进度', isCustom: false, isVisible: true },
  { id: 'recurrence', name: '重复', isCustom: false, isVisible: true },
  { id: 'mediumTags', name: '媒介标签', isCustom: false, isVisible: true },
];

interface TaskStore {
  tasks: Task[];
  users: User[];
  columns: Column[];
  priorities: PriorityOption[];
  mediums: MediumOption[];
  entities: EntityOption[];
  positions: PositionOption[];
  currentUser: User;
  activityLogs: ActivityLog[];
  notifications: Notification[];
  selectedTaskId: string | null;
  highlightedLogId: string | null;
  customFieldDefinitions: CustomFieldDefinition[];
  fieldOrder: FieldConfig[];
  memos: Memo[];
  currentView: 'dashboard' | 'kanban' | 'calendar' | 'memos' | 'search' | 'settings';
  searchStateFilter: string | null;
  supabaseConfig: { url: string; anonKey: string };
  
  setCurrentView: (view: 'dashboard' | 'kanban' | 'calendar' | 'memos' | 'search' | 'settings') => void;
  setSearchStateFilter: (filter: string | null) => void;
  setSupabaseConfig: (config: { url: string; anonKey: string }) => void;
  saveVersionToCloud: () => Promise<void>;
  
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  updateTasks: (ids: string[], updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  convertSubtaskToTask: (subtaskId: string) => void;
  changeTaskState: (id: string, newState: TaskState, userId: string) => void;
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  updateActivityLog: (id: string, updates: Partial<ActivityLog>) => void;
  deleteActivityLog: (id: string) => void;
  setActivityLogs: (logs: ActivityLog[]) => void;
  setSelectedTaskId: (id: string | null) => void;
  setHighlightedLogId: (id: string | null) => void;
  
  // Notification Management
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  
  // Settings Management
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

  // Entity & Position Management
  addEntity: (entity: EntityOption) => void;
  updateEntity: (id: string, updates: Partial<EntityOption>) => void;
  deleteEntity: (id: string) => void;
  addPosition: (position: PositionOption) => void;
  updatePosition: (id: string, updates: Partial<PositionOption>) => void;
  deletePosition: (id: string) => void;

  // Custom Fields
  addCustomFieldDefinition: (field: CustomFieldDefinition) => void;
  updateCustomFieldDefinition: (id: string, updates: Partial<CustomFieldDefinition>) => void;
  deleteCustomFieldDefinition: (id: string) => void;
  setFieldOrder: (order: FieldConfig[]) => void;
  
  // Memo Management
  addMemo: (content: string) => void;
  updateMemo: (id: string, content: string) => void;
  deleteMemo: (id: string) => void;
  
  // Quick Actions
  instantDone: (title: string, userId: string) => void;
  relateTask: (taskId: string, relatedTaskId: string) => void;
  unrelateTask: (taskId: string, relatedTaskId: string) => void;
  
  // Getters
  getSubtasks: (parentId: string) => Task[];
  getTask: (id: string) => Task | undefined;

  // Data Management
  setAllData: (data: Partial<TaskStore>) => void;
  checkExpiringTasks: () => void;
  generateTestTasks: (count: number) => void;
  clearTasks: () => void;
}

const defaultUsers: User[] = [
  { id: 'u1', name: '爱丽丝 (我)' },
  { id: 'u2', name: '鲍勃' },
  { id: 'u3', name: '查理' },
];

const initialTasks: Task[] = [
  {
    id: 't1',
    title: '审查第三季度营销计划',
    state: 'todo',
    priority: 'high',
    isPinned: true,
    creatorId: 'u1',
    assigneeIds: ['u1'],
    reporterIds: ['u1'],
    mediumTags: ['oa'],
    progress: 0,
    recurrence: 'none',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  },
  {
    id: 't2',
    title: '回复客户关于定价的邮件',
    state: 'in_progress',
    priority: 'medium',
    isPinned: false,
    creatorId: 'u1',
    assigneeIds: ['u1'],
    reporterIds: ['u1'],
    mediumTags: ['email'],
    progress: 50,
    recurrence: 'none',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startDate: new Date().toISOString(),
  },
  {
    id: 't3',
    title: '每周团队同步会议',
    state: 'todo',
    priority: 'low',
    isPinned: false,
    creatorId: 'u1',
    assigneeIds: ['u1'],
    reporterIds: ['u1'],
    mediumTags: ['wechat'],
    progress: 0,
    recurrence: 'weekly_workdays',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startDate: new Date().toISOString(),
  },
  {
    id: 't4',
    title: '批准设计原型',
    state: 'in_review',
    priority: 'urgent',
    isPinned: true,
    creatorId: 'u2',
    assigneeIds: ['u1'],
    reporterIds: ['u2'],
    mediumTags: ['oa'],
    progress: 90,
    recurrence: 'none',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startDate: new Date().toISOString(),
  }
];

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: initialTasks,
      users: defaultUsers,
      columns: defaultColumns,
      priorities: defaultPriorities,
      mediums: defaultMediums,
      entities: defaultEntities,
      positions: defaultPositions,
      currentUser: defaultUsers[0],
      activityLogs: [],
      notifications: [],
      selectedTaskId: null,
      highlightedLogId: null,
      customFieldDefinitions: [],
      fieldOrder: defaultFieldOrder,
      memos: [],
      currentView: 'kanban',
      searchStateFilter: null,
      supabaseConfig: { url: '', anonKey: '' },

      setCurrentView: (view) => set({ currentView: view }),
      setSearchStateFilter: (filter) => set({ searchStateFilter: filter }),
      setSupabaseConfig: (config) => set({ supabaseConfig: config }),

      saveVersionToCloud: async () => {
        const state = get();
        const supabase = getSupabaseFromState(null);
        if (!supabase) return;

        // 1. Insert new version
        const { error: insertError } = await supabase
          .from('taskflow_app_versions')
          .insert({
            user_id: SYNC_USER_ID,
            state: state,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Failed to save version:', insertError);
          return;
        }

        // 2. Keep only last 20 versions
        const { data: versions, error: fetchError } = await supabase
          .from('taskflow_app_versions')
          .select('id')
          .eq('user_id', SYNC_USER_ID)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Failed to fetch versions:', fetchError);
          return;
        }

        if (versions && versions.length > 10) {
          const idsToDelete = versions.slice(10).map(v => v.id);
          await supabase
            .from('taskflow_app_versions')
            .delete()
            .in('id', idsToDelete);
        }
      },

      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setHighlightedLogId: (id) => set({ highlightedLogId: id }),

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: nanoid(),
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        set((state) => ({ notifications: [newNotification, ...state.notifications] }));
      },

      markNotificationAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
      })),

      markAllNotificationsAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true }))
      })),

      clearNotifications: () => set({ notifications: [] }),

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
      
      addMemo: (content) => {
        const newMemo: Memo = {
          id: nanoid(),
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ memos: [newMemo, ...state.memos] }));
      },

      updateMemo: (id, content) => set((state) => ({
        memos: state.memos.map(m => m.id === id ? { ...m, content, updatedAt: new Date().toISOString() } : m)
      })),

      deleteMemo: (id) => set((state) => ({
        memos: state.memos.filter(m => m.id !== id)
      })),

      addTask: (taskData) => {
        const now = new Date().toISOString();
        
        let initialProgress = taskData.progress || 0;
        if (taskData.progress === undefined) {
          if (taskData.state === 'done') {
            initialProgress = 100;
          } else if (taskData.state === 'in_progress') {
            initialProgress = 50;
          } else if (taskData.state === 'in_review') {
            initialProgress = 90;
          }
        }

        const newTask: Task = {
          id: nanoid(),
          title: taskData.title || '未命名任务',
          state: taskData.state || 'todo',
          priority: taskData.priority || 'medium',
          isPinned: taskData.isPinned || false,
          creatorId: taskData.creatorId || get().currentUser.id,
          assigneeIds: taskData.assigneeIds || [get().currentUser.id],
          reporterIds: taskData.reporterIds || [],
          mediumTags: taskData.mediumTags || [],
          recurrence: taskData.recurrence || 'none',
          createdAt: now,
          updatedAt: now,
          startDate: taskData.startDate || now, // Default to current date
          customFields: taskData.customFields || {},
          ...taskData,
          progress: taskData.progress !== undefined ? taskData.progress : initialProgress,
        };

        set((state) => ({ tasks: [...state.tasks, newTask] }));
        
        get().addActivityLog({
          taskId: newTask.id,
          userId: newTask.creatorId,
          action: 'created',
          details: `创建了任务 "${newTask.title}"`,
        });
      },

      updateTask: (id, updates) => {
        const task = get().tasks.find(t => t.id === id);
        if (!task) return;

        const finalUpdates = { ...updates };
        
        if (updates.state && updates.state !== task.state) {
          if (updates.state === 'done') {
            finalUpdates.progress = 100;
            finalUpdates.isPinned = false;
          } else if (updates.progress === undefined) {
            if (updates.state === 'in_progress' && (task.progress === 0 || task.progress === 50)) {
              finalUpdates.progress = 50;
            } else if (updates.state === 'in_review' && (task.progress === 0 || task.progress === 50)) {
              finalUpdates.progress = 90;
            }
          }
        }

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...finalUpdates, updatedAt: new Date().toISOString() } : t
          ),
        }));

        // Log if dates changed
        if (updates.startDate || updates.dueDate) {
          get().addActivityLog({
            taskId: id,
            userId: get().currentUser.id,
            action: 'date_changed',
            details: `更新了任务时间: ${updates.startDate ? `开始日期: ${format(new Date(updates.startDate), 'yyyy-MM-dd')}` : ''} ${updates.dueDate ? `截止日期: ${format(new Date(updates.dueDate), 'yyyy-MM-dd')}` : ''}`,
          });
        }
      },

      updateTasks: (ids, updates) => {
        const currentTasks = get().tasks.filter(t => ids.includes(t.id));
        
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (ids.includes(t.id)) {
              const finalUpdates = { ...updates };
              if (updates.state && updates.state !== t.state) {
                if (updates.state === 'done') {
                  finalUpdates.progress = 100;
                  finalUpdates.isPinned = false;
                } else if (updates.progress === undefined) {
                  if (updates.state === 'in_progress' && (t.progress === 0 || t.progress === 50)) {
                    finalUpdates.progress = 50;
                  } else if (updates.state === 'in_review' && (t.progress === 0 || t.progress === 50)) {
                    finalUpdates.progress = 90;
                  }
                }
              }
              return { ...t, ...finalUpdates, updatedAt: new Date().toISOString() };
            }
            return t;
          }),
        }));

        if (updates.state) {
          const userId = get().currentUser.id;
          currentTasks.forEach(task => {
            if (task.state !== updates.state) {
              get().addActivityLog({
                taskId: task.id,
                userId,
                action: updates.state === 'done' ? 'completed' : 'status_changed',
                details: `状态从 ${task.state} 变更为 ${updates.state}`,
              });
            }
          });
        }
      },

      deleteTask: (id) => {
        const tasksToDelete = get().tasks.filter(t => t.id === id || t.parentId === id);
        const userId = get().currentUser.id;
        
        tasksToDelete.forEach(task => {
          get().addActivityLog({
            taskId: task.id,
            userId,
            action: 'deleted',
            details: `删除了任务 "${task.title}"`,
          });
        });
        
        set((state) => {
          const deletedIds = new Set(tasksToDelete.map(t => t.id));
          return {
            tasks: state.tasks
              .filter((task) => !deletedIds.has(task.id))
              .map(task => {
                if (task.relatedTaskIds && task.relatedTaskIds.some(rid => deletedIds.has(rid))) {
                  return {
                    ...task,
                    relatedTaskIds: task.relatedTaskIds.filter(rid => !deletedIds.has(rid))
                  };
                }
                return task;
              })
          };
        });
      },

      convertSubtaskToTask: (subtaskId) => {
        const subtask = get().tasks.find(t => t.id === subtaskId);
        if (!subtask || !subtask.parentId) return;

        const parentId = subtask.parentId;
        const parentTask = get().tasks.find(t => t.id === parentId);
        if (!parentTask) return;

        const subtaskRelated = [...new Set([...(subtask.relatedTaskIds || []), parentId])];
        const parentRelated = [...new Set([...(parentTask.relatedTaskIds || []), subtaskId])];

        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === subtaskId) {
              return { ...t, parentId: undefined, relatedTaskIds: subtaskRelated, updatedAt: new Date().toISOString() };
            }
            if (t.id === parentId) {
              return { ...t, relatedTaskIds: parentRelated, updatedAt: new Date().toISOString() };
            }
            return t;
          }),
        }));

        get().addActivityLog({
          taskId: subtaskId,
          userId: get().currentUser.id,
          action: 'updated',
          details: `已转换为独立任务并关联到原父任务 "${parentTask.title}"`,
        });

        get().addActivityLog({
          taskId: parentId,
          userId: get().currentUser.id,
          action: 'updated',
          details: `子任务 "${subtask.title}" 已转换为独立任务并关联`,
        });
      },

      changeTaskState: (id, newState, userId) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        const oldState = task.state;
        if (oldState === newState) return;

        const updates: Partial<Task> = { state: newState };
        if (newState === 'snoozed') {
          updates.previousState = oldState;
        }

        get().updateTask(id, updates);
        
        get().addActivityLog({
          taskId: id,
          userId,
          action: newState === 'done' ? 'completed' : 'status_changed',
          details: `状态从 ${oldState} 变更为 ${newState}`,
        });
      },

      addActivityLog: (log) => {
        const newLog: ActivityLog = {
          ...log,
          id: nanoid(),
          timestamp: new Date().toISOString(),
        };
        set((state) => ({ activityLogs: [...state.activityLogs, newLog] }));
      },

      updateActivityLog: (id, updates) => set((state) => ({
        activityLogs: state.activityLogs.map(log => log.id === id ? { ...log, ...updates } : log)
      })),

      deleteActivityLog: (id) => set((state) => ({
        activityLogs: state.activityLogs.filter(log => log.id !== id)
      })),

      setActivityLogs: (logs) => set({ activityLogs: logs }),

      instantDone: (title, userId) => {
        const now = new Date().toISOString();
        const newTask: Task = {
          id: nanoid(),
          title,
          state: 'done',
          priority: 'low',
          isPinned: false,
          creatorId: userId,
          assigneeIds: [userId],
          reporterIds: [],
          mediumTags: [],
          progress: 100,
          recurrence: 'none',
          createdAt: now,
          updatedAt: now,
          startDate: now,
        };
        
        set((state) => ({ tasks: [...state.tasks, newTask] }));
        
        get().addActivityLog({
          taskId: newTask.id,
          userId,
          action: 'created_and_completed',
          details: `立即完成了任务 "${title}"`,
        });
      },

      relateTask: (taskId, relatedTaskId) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId) {
              const related = t.relatedTaskIds || [];
              if (!related.includes(relatedTaskId)) {
                return { ...t, relatedTaskIds: [...related, relatedTaskId] };
              }
            }
            if (t.id === relatedTaskId) {
              const related = t.relatedTaskIds || [];
              if (!related.includes(taskId)) {
                return { ...t, relatedTaskIds: [...related, taskId] };
              }
            }
            return t;
          }),
        }));
      },

      unrelateTask: (taskId, relatedTaskId) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId) {
              return { ...t, relatedTaskIds: (t.relatedTaskIds || []).filter(id => id !== relatedTaskId) };
            }
            if (t.id === relatedTaskId) {
              return { ...t, relatedTaskIds: (t.relatedTaskIds || []).filter(id => id !== taskId) };
            }
            return t;
          }),
        }));
      },

      getSubtasks: (parentId) => {
        return get().tasks.filter((t) => t.parentId === parentId);
      },
      
      getTask: (id) => {
        return get().tasks.find((t) => t.id === id);
      },

      setAllData: (data) => set(data),

      checkExpiringTasks: () => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        get().tasks.forEach(task => {
          if (task.dueDate && task.state !== 'done') {
            const dueDate = new Date(task.dueDate);
            if (dueDate > now && dueDate <= tomorrow) {
              // Check if notification already exists to avoid duplicates
              const exists = get().notifications.some(n => n.taskId === task.id && n.title === '任务即将到期');
              if (!exists) {
                get().addNotification({
                  userId: get().currentUser.id,
                  title: '任务即将到期',
                  message: `任务 "${task.title}" 将在 24 小时内到期。`,
                  taskId: task.id
                });
              }
            }
          }
        });
      },

      generateTestTasks: (count: number) => {
        const newTasks: Task[] = [];
        const newLogs: ActivityLog[] = [];
        const now = new Date();
        const states: TaskState[] = ['todo', 'in_progress', 'in_review', 'done', 'snoozed'];
        const priorities: PriorityOption['id'][] = ['low', 'medium', 'high', 'urgent'];
        const users = get().users;
        const mediums = get().mediums;

        const createTask = (parentId?: string, index?: number) => {
          const randomState = states[Math.floor(Math.random() * states.length)];
          const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
          const randomUser = users[Math.floor(Math.random() * users.length)];
          const randomMediums = mediums.length > 0 ? [mediums[Math.floor(Math.random() * mediums.length)].id] : [];
          
          const randomDayOffset = Math.floor(Math.random() * 60) - 30;
          const date = new Date(now);
          date.setDate(date.getDate() + randomDayOffset);
          const dateStr = date.toISOString();

          let updatedAt = dateStr;
          if (randomState === 'done') {
             const completeOffset = Math.floor(Math.random() * 5);
             const completeDate = new Date(date);
             completeDate.setDate(completeDate.getDate() + completeOffset);
             updatedAt = completeDate.toISOString();
          }

          const taskId = nanoid();
          const task: Task = {
            id: taskId,
            title: parentId ? `子任务 - ${nanoid(6)}` : `测试任务 #${(index || 0) + 1} - ${nanoid(6)}`,
            parentId,
            state: randomState,
            priority: randomPriority,
            isPinned: Math.random() > 0.9,
            creatorId: randomUser.id,
            assigneeIds: [randomUser.id],
            reporterIds: [randomUser.id],
            mediumTags: randomMediums,
            progress: randomState === 'done' ? 100 : Math.floor(Math.random() * 100),
            recurrence: 'none',
            createdAt: dateStr,
            updatedAt: updatedAt,
            startDate: dateStr,
            dueDate: new Date(new Date(dateStr).getTime() + 86400000 * 2).toISOString(),
            relatedTaskIds: []
          };

          // Generate 1-3 activity logs for this task
          const logCount = Math.floor(Math.random() * 3) + 1;
          const actions = ['created', 'status_changed', 'commented', 'assigned'];
          for (let j = 0; j < logCount; j++) {
            newLogs.push({
              id: nanoid(),
              taskId: taskId,
              userId: randomUser.id,
              action: actions[Math.floor(Math.random() * actions.length)],
              details: `自动生成的测试日志内容 ${nanoid(4)}`,
              timestamp: new Date(new Date(dateStr).getTime() + j * 3600000).toISOString()
            });
          }

          return task;
        };

        for (let i = 0; i < count; i++) {
          const mainTask = createTask(undefined, i);
          newTasks.push(mainTask);

          // 30% chance to have 1-2 subtasks
          if (Math.random() < 0.3) {
            const subtaskCount = Math.floor(Math.random() * 2) + 1;
            for (let k = 0; k < subtaskCount; k++) {
              newTasks.push(createTask(mainTask.id));
            }
          }
        }

        // Randomly relate some tasks
        for (let i = 0; i < newTasks.length; i++) {
          if (Math.random() < 0.2 && newTasks.length > 1) {
            const otherIndex = Math.floor(Math.random() * newTasks.length);
            if (otherIndex !== i) {
              const taskA = newTasks[i];
              const taskB = newTasks[otherIndex];
              taskA.relatedTaskIds = [...(taskA.relatedTaskIds || []), taskB.id];
              taskB.relatedTaskIds = [...(taskB.relatedTaskIds || []), taskA.id];
            }
          }
        }

        set((state) => ({ 
          tasks: [...state.tasks, ...newTasks],
          activityLogs: [...state.activityLogs, ...newLogs]
        }));
      },

      clearTasks: () => {
        set({ tasks: [], activityLogs: [], notifications: [] });
      },
    }),
    {
      name: 'taskflow-storage',
      storage: createJSONStorage(() => customStorage),
    }
  )
);
