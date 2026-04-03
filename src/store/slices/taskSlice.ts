import { StateCreator } from 'zustand';
import { TaskStore } from '../types';
import { Task, TaskState, PriorityOption, ActivityLog, TaskUpdate } from '../../types/task';
import { nanoid } from 'nanoid';
import { format } from 'date-fns';

export const createTaskSlice: StateCreator<
  TaskStore,
  [['zustand/persist', unknown]],
  [],
  Pick<TaskStore, 'tasks' | 'addTask' | 'updateTask' | 'updateTasks' | 'deleteTask' | 'convertSubtaskToTask' | 'changeTaskState' | 'relateTask' | 'unrelateTask' | 'getSubtasks' | 'getTask' | 'checkExpiringTasks' | 'generateTestTasks' | 'clearTasks' | 'instantDone'>
> = (set, get) => ({
  tasks: [],
  
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
      startDate: taskData.startDate || now,
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

    return newTask.id;
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
  
  generateTestTasks: (count) => {
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

      const task: Task = {
        id: nanoid(),
        title: parentId ? `测试子任务 ${index}` : `测试任务 ${Math.floor(Math.random() * 10000)}`,
        state: randomState,
        priority: randomPriority,
        isPinned: Math.random() > 0.8,
        creatorId: randomUser.id,
        assigneeIds: [randomUser.id],
        reporterIds: Math.random() > 0.5 ? [users[Math.floor(Math.random() * users.length)].id] : [],
        mediumTags: randomMediums,
        progress: randomState === 'done' ? 100 : Math.floor(Math.random() * 100),
        recurrence: 'none',
        createdAt: dateStr,
        updatedAt: updatedAt,
        startDate: dateStr,
        dueDate: Math.random() > 0.5 ? new Date(date.getTime() + 86400000 * (Math.floor(Math.random() * 10) + 1)).toISOString() : undefined,
        parentId,
      };

      newTasks.push(task);

      newLogs.push({
        id: nanoid(),
        taskId: task.id,
        userId: task.creatorId,
        action: 'created',
        details: '系统自动生成',
        timestamp: dateStr,
      });

      if (randomState === 'done') {
        newLogs.push({
          id: nanoid(),
          taskId: task.id,
          userId: task.creatorId,
          action: 'completed',
          details: '状态变更为已完成',
          timestamp: updatedAt,
        });
      }

      return task.id;
    };

    for (let i = 0; i < count; i++) {
      const parentId = createTask();
      if (Math.random() > 0.7) {
        const subtaskCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < subtaskCount; j++) {
          createTask(parentId, j + 1);
        }
      }
    }

    set((state) => ({
      tasks: [...state.tasks, ...newTasks],
      activityLogs: [...state.activityLogs, ...newLogs],
    }));
  },
  
  clearTasks: () => {
    set({ tasks: [] });
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
  }
});
