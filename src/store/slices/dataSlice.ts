import { StateCreator } from 'zustand';
import { TaskStore } from '../types';
import { ActivityLog, Notification, Memo } from '../../types/task';
import { nanoid } from 'nanoid';
import { getSupabaseClient } from '../../lib/supabase';

const SYNC_USER_ID = 'default_user';

export const createDataSlice: StateCreator<
  TaskStore,
  [['zustand/persist', unknown]],
  [],
  Pick<TaskStore, 'activityLogs' | 'notifications' | 'memos' | 'supabaseConfig' | 'lastCloudSyncTimestamp' | 'addActivityLog' | 'updateActivityLog' | 'deleteActivityLog' | 'setActivityLogs' | 'addNotification' | 'markNotificationAsRead' | 'markAllNotificationsAsRead' | 'clearNotifications' | 'addMemo' | 'updateMemo' | 'deleteMemo' | 'setSupabaseConfig' | 'saveVersionToCloud' | 'fetchVersions' | 'restoreVersion' | 'compressDatabase' | 'setAllData' | 'mergeData' | 'exportAndDeleteByDateRange'>
> = (set, get) => ({
  activityLogs: [],
  notifications: [],
  memos: [],
  supabaseConfig: { url: '', anonKey: '' },
  lastCloudSyncTimestamp: null,
  
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
  
  setSupabaseConfig: (config) => set({ supabaseConfig: config }),
  
  saveVersionToCloud: async () => {
    const state = get();
    const supabase = getSupabaseClient(state.supabaseConfig.url, state.supabaseConfig.anonKey);
    if (!supabase) return;

    // Fields to EXCLUDE from cloud sync to keep data small
    const excludedFields = [
      'modalState',
      'highlightedLogId',
      'currentView',
      'searchStateFilter',
      'lastCloudSyncTimestamp'
    ];

    // Extract only data fields, omit functions and excluded UI states
    const dataState = Object.fromEntries(
      Object.entries(state).filter(([key, value]) => 
        typeof value !== 'function' && !excludedFields.includes(key)
      )
    );

    // 1. Insert new version
    const { error: insertError } = await supabase
      .from('taskflow_app_versions')
      .insert({
        user_id: SYNC_USER_ID,
        state: dataState,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to save version:', insertError);
      if (insertError.code === 'PGRST205' || insertError.message?.includes('Could not find the table') || insertError.code === '42501') {
        throw new Error('TABLE_NOT_FOUND');
      }
      throw insertError;
    }

    set({ lastCloudSyncTimestamp: Date.now() });

    // 2. Keep only last 10 versions
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
  fetchVersions: async () => {
    const state = get();
    const supabase = getSupabaseClient(state.supabaseConfig.url, state.supabaseConfig.anonKey);
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('taskflow_app_versions')
      .select('id, created_at')
      .eq('user_id', SYNC_USER_ID)
      .order('created_at', { ascending: false });
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.code === '42501') {
        throw new Error('TABLE_NOT_FOUND');
      }
      throw error;
    }
    return data || [];
  },
  restoreVersion: async (versionId) => {
    const state = get();
    const supabase = getSupabaseClient(state.supabaseConfig.url, state.supabaseConfig.anonKey);
    if (!supabase) return;
    const { data, error } = await supabase
      .from('taskflow_app_versions')
      .select('state')
      .eq('id', versionId)
      .single();
    if (error) throw error;
    if (data && data.state) {
      set(data.state);
      localStorage.setItem('task-storage', JSON.stringify(data.state));
    }
  },
  compressDatabase: () => {
    const state = get();
    const taskIds = new Set(state.tasks.map(t => t.id));

    // 1. Prune Logs (Keep current and previous month)
    const now = new Date();
    const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const prunedLogs = state.activityLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= firstDayOfPreviousMonth;
    });

    // 2. Prune Notifications (Keep last 100)
    const prunedNotifications = [...state.notifications]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 100);

    // 3. Clean up broken task relations
    const cleanedTasks = state.tasks.map(task => ({
      ...task,
      relatedTaskIds: (task.relatedTaskIds || []).filter(id => taskIds.has(id)),
      dependencies: (task.dependencies || []).filter(id => taskIds.has(id)),
      postDependencies: (task.postDependencies || []).filter(id => taskIds.has(id))
    }));

    set({
      activityLogs: prunedLogs,
      notifications: prunedNotifications,
      tasks: cleanedTasks
    });
  },
  
  setAllData: (data) => set(data),
  
  mergeData: (data) => set((state) => {
    const mergeArray = <T extends { id: string }>(existing: T[], incoming: T[] | undefined) => {
      if (!incoming) return existing;
      const map = new Map(existing.map(item => [item.id, item]));
      incoming.forEach(item => map.set(item.id, item));
      return Array.from(map.values());
    };

    return {
      tasks: mergeArray(state.tasks, data.tasks),
      projects: mergeArray(state.projects, data.projects),
      users: mergeArray(state.users, data.users),
      columns: mergeArray(state.columns, data.columns),
      priorities: mergeArray(state.priorities, data.priorities),
      mediums: mergeArray(state.mediums, data.mediums),
      entities: mergeArray(state.entities, data.entities),
      positions: mergeArray(state.positions, data.positions),
      activityLogs: mergeArray(state.activityLogs, data.activityLogs),
      notifications: mergeArray(state.notifications, data.notifications),
      customFieldDefinitions: mergeArray(state.customFieldDefinitions, data.customFieldDefinitions),
      memos: mergeArray(state.memos, data.memos),
      fieldOrder: data.fieldOrder || state.fieldOrder,
    };
  }),
  
  exportAndDeleteByDateRange: (startDate, endDate) => {
    const state = get();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 86400000 - 1; // End of day

    const isWithinRange = (dateStr: string) => {
      if (!dateStr) return false;
      const time = new Date(dateStr).getTime();
      return time >= start && time <= end;
    };

    const exportedData: Partial<TaskStore> = {
      tasks: state.tasks.filter(t => isWithinRange(t.createdAt)),
      activityLogs: state.activityLogs.filter(l => isWithinRange(l.timestamp)),
      notifications: state.notifications.filter(n => isWithinRange(n.timestamp)),
      memos: state.memos.filter(m => isWithinRange(m.createdAt)),
      projects: state.projects.filter(p => isWithinRange(p.createdAt)),
      users: state.users,
      columns: state.columns,
      priorities: state.priorities,
      mediums: state.mediums,
      entities: state.entities,
      positions: state.positions,
      customFieldDefinitions: state.customFieldDefinitions,
      fieldOrder: state.fieldOrder,
      navItemsConfig: state.navItemsConfig,
    };

    // Delete the exported data from the current state
    set({
      tasks: state.tasks.filter(t => !isWithinRange(t.createdAt)),
      activityLogs: state.activityLogs.filter(l => !isWithinRange(l.timestamp)),
      notifications: state.notifications.filter(n => !isWithinRange(n.timestamp)),
      memos: state.memos.filter(m => !isWithinRange(m.createdAt)),
      projects: state.projects.filter(p => !isWithinRange(p.createdAt)),
    });

    return exportedData;
  }
});
