import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { Task, TaskState, ActivityLog, User, PriorityOption, MediumOption, Recurrence, Column, Notification, CustomFieldDefinition, FieldConfig, Memo, EntityOption, PositionOption } from '../types/task';
import { format } from 'date-fns';

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
        const newTask: Task = {
          id: nanoid(),
          title: taskData.title || '未命名任务',
          state: taskData.state || 'todo',
          priority: taskData.priority || 'medium',
          isPinned: taskData.isPinned || false,
          creatorId: taskData.creatorId || get().currentUser.id,
          assigneeIds: taskData.assigneeIds || [get().currentUser.id],
          reporterIds: taskData.reporterIds || [get().currentUser.id],
          mediumTags: taskData.mediumTags || [],
          progress: taskData.progress || 0,
          recurrence: taskData.recurrence || 'none',
          createdAt: now,
          updatedAt: now,
          startDate: taskData.startDate || now, // Default to current date
          customFields: taskData.customFields || {},
          ...taskData,
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

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
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
        set((state) => ({
          tasks: state.tasks.map((t) =>
            ids.includes(t.id) ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id && task.parentId !== id), // Also delete subtasks
        }));
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
          action: 'status_changed',
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
          reporterIds: [userId],
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
        const now = new Date();
        const states: TaskState[] = ['todo', 'in_progress', 'in_review', 'done', 'snoozed'];
        const priorities: PriorityOption['id'][] = ['low', 'medium', 'high', 'urgent'];
        const users = get().users;

        for (let i = 0; i < count; i++) {
          const randomState = states[Math.floor(Math.random() * states.length)];
          const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
          const randomUser = users[Math.floor(Math.random() * users.length)];
          
          // Random date within +/- 30 days
          const randomDayOffset = Math.floor(Math.random() * 60) - 30;
          const date = new Date(now);
          date.setDate(date.getDate() + randomDayOffset);
          const dateStr = date.toISOString();

          // Random completion date for done tasks
          let updatedAt = dateStr;
          if (randomState === 'done') {
             const completeOffset = Math.floor(Math.random() * 5); // 0-5 days after start
             const completeDate = new Date(date);
             completeDate.setDate(completeDate.getDate() + completeOffset);
             updatedAt = completeDate.toISOString();
          }

          newTasks.push({
            id: nanoid(),
            title: `测试任务 #${i + 1} - ${nanoid(6)}`,
            state: randomState,
            priority: randomPriority,
            isPinned: Math.random() > 0.9,
            creatorId: randomUser.id,
            assigneeIds: [randomUser.id],
            reporterIds: [randomUser.id],
            mediumTags: [],
            progress: randomState === 'done' ? 100 : Math.floor(Math.random() * 100),
            recurrence: 'none',
            createdAt: dateStr,
            updatedAt: updatedAt,
            startDate: dateStr,
            dueDate: new Date(new Date(dateStr).getTime() + 86400000 * 2).toISOString(),
          });
        }

        set((state) => ({ tasks: [...state.tasks, ...newTasks] }));
      },

      clearTasks: () => {
        set({ tasks: [], activityLogs: [], notifications: [] });
      },
    }),
    {
      name: 'taskflow-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
