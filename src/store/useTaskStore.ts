import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { Task, TaskState, ActivityLog, User, PriorityOption, MediumOption, Recurrence, Column, Notification } from '../types/task';

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

interface TaskStore {
  tasks: Task[];
  users: User[];
  columns: Column[];
  priorities: PriorityOption[];
  mediums: MediumOption[];
  currentUser: User;
  activityLogs: ActivityLog[];
  notifications: Notification[];
  selectedTaskId: string | null;
  
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  changeTaskState: (id: string, newState: TaskState, userId: string) => void;
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  setSelectedTaskId: (id: string | null) => void;
  
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
  
  // Quick Actions
  instantDone: (title: string, userId: string) => void;
  
  // Getters
  getSubtasks: (parentId: string) => Task[];
  getTask: (id: string) => Task | undefined;

  // Data Management
  setAllData: (data: Partial<TaskStore>) => void;
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
      currentUser: defaultUsers[0],
      activityLogs: [],
      notifications: [
        {
          id: 'n1',
          userId: 'u1',
          title: '欢迎！',
          message: '欢迎使用您的任务管理系统。您有 4 个任务待处理。',
          timestamp: new Date().toISOString(),
          isRead: false
        }
      ],
      selectedTaskId: null,

      setSelectedTaskId: (id) => set({ selectedTaskId: id }),

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

        // Notify if assignees changed
        if (updates.assigneeIds && JSON.stringify(updates.assigneeIds) !== JSON.stringify(task.assigneeIds)) {
          get().addNotification({
            userId: get().currentUser.id,
            title: '负责人已更新',
            message: `任务 "${task.title}" 的负责人已更新。`,
            taskId: id
          });
        }
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id && task.parentId !== id), // Also delete subtasks
        }));
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

        const column = get().columns.find(c => c.id === newState);
        get().addNotification({
          userId: get().currentUser.id,
          title: '状态已更新',
          message: `任务 "${task.title}" 现在处于 ${column?.title || newState}`,
          taskId: id
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

      getSubtasks: (parentId) => {
        return get().tasks.filter((t) => t.parentId === parentId);
      },
      
      getTask: (id) => {
        return get().tasks.find((t) => t.id === id);
      },

      setAllData: (data) => set(data),
    }),
    {
      name: 'taskflow-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
