/// <reference types="vite/client" />
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { TaskStore } from './types';
import { createTaskSlice } from './slices/taskSlice';
import { createProjectSlice } from './slices/projectSlice';
import { createUISlice } from './slices/uiSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createDataSlice } from './slices/dataSlice';
import { Task, User, PriorityOption, MediumOption, Column, EntityOption, PositionOption, NavItemConfig, FieldConfig } from '../types/task';

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

const defaultNavItemsConfig: NavItemConfig[] = [
  { id: 'dashboard', isVisible: true },
  { id: 'kanban', isVisible: true },
  { id: 'projects', isVisible: true },
  { id: 'calendar', isVisible: true },
  { id: 'memos', isVisible: true },
  { id: 'search', isVisible: true },
];

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
  { id: 'category', name: '任务分类', isCustom: false, isVisible: true },
  { id: 'state', name: '状态', isCustom: false, isVisible: true },
  { id: 'priority', name: '优先级', isCustom: false, isVisible: true },
  { id: 'assigneeIds', name: '负责人', isCustom: false, isVisible: true },
  { id: 'isDelegated', name: '委派状态', isCustom: false, isVisible: true },
  { id: 'reporterIds', name: '审核人', isCustom: false, isVisible: true },
  { id: 'startDate', name: '开始日期', isCustom: false, isVisible: true },
  { id: 'dueDate', name: '截止日期', isCustom: false, isVisible: true },
  { id: 'plannedStartTime', name: '计划开始时间', isCustom: false, isVisible: true },
  { id: 'plannedEndTime', name: '计划结束时间', isCustom: false, isVisible: true },
  { id: 'progress', name: '进度', isCustom: false, isVisible: true },
  { id: 'recurrence', name: '重复', isCustom: false, isVisible: true },
  { id: 'mediumTags', name: '媒介标签', isCustom: false, isVisible: true },
  { id: 'project-info', name: '项目信息', isCustom: false, isVisible: true },
];

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
    (...a) => ({
      ...createTaskSlice(...a),
      ...createProjectSlice(...a),
      ...createUISlice(...a),
      ...createSettingsSlice(...a),
      ...createDataSlice(...a),
      // Override initial state with defaults
      tasks: initialTasks,
      users: defaultUsers,
      columns: defaultColumns,
      priorities: defaultPriorities,
      mediums: defaultMediums,
      entities: defaultEntities,
      positions: defaultPositions,
      currentUser: defaultUsers[0],
      fieldOrder: defaultFieldOrder,
      navItemsConfig: defaultNavItemsConfig,
    }),
    {
      name: 'task-storage',
      storage: createJSONStorage(() => customStorage),
      version: 3,
      partialize: (state) => {
        const { modalState, ...rest } = state;
        return rest;
      },
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;
        
        if (version === 0 || version === 1 || version === 2) {
          state = {
            ...state,
            navItemsConfig: state.navItemsConfig || defaultNavItemsConfig,
            fieldOrder: state.fieldOrder || defaultFieldOrder,
            customFieldDefinitions: state.customFieldDefinitions || [],
            memos: state.memos || [],
            supabaseConfig: state.supabaseConfig || { url: '', anonKey: '' },
          };
        }
        
        // Ensure plannedStartTime and plannedEndTime exist in fieldOrder
        if (state.fieldOrder) {
          const hasPlannedStart = state.fieldOrder.some((f: any) => f.id === 'plannedStartTime');
          const hasPlannedEnd = state.fieldOrder.some((f: any) => f.id === 'plannedEndTime');
          const hasCategory = state.fieldOrder.some((f: any) => f.id === 'category');
          
          if (!hasPlannedStart || !hasPlannedEnd || !hasCategory) {
            const newFieldOrder = [...state.fieldOrder];
            if (!hasPlannedStart) {
              newFieldOrder.push({ id: 'plannedStartTime', name: '计划开始时间', isCustom: false, isVisible: true });
            }
            if (!hasPlannedEnd) {
              newFieldOrder.push({ id: 'plannedEndTime', name: '计划结束时间', isCustom: false, isVisible: true });
            }
            if (!hasCategory) {
              newFieldOrder.splice(2, 0, { id: 'category', name: '任务分类', isCustom: false, isVisible: true });
            }
            state.fieldOrder = newFieldOrder;
          }
        }
        
        return state;
      },
    }
  )
);
