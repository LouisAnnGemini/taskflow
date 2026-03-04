export type TaskState = string;

export interface Column {
  id: string;
  title: string;
  color: string;
  icon?: string;
  isHidden?: boolean;
}

export interface PriorityOption {
  id: string;
  label: string;
  color: string;
  icon?: string;
}

export interface MediumOption {
  id: string;
  label: string;
  icon?: string;
}

export type Recurrence = 'none' | 'daily' | 'weekly_workdays' | 'monthly_1st';

export interface ActivityLog {
  id: string;
  taskId: string;
  userId: string; // The person who made the change
  action: string; // e.g., 'created', 'status_changed', 'delegated'
  details: string;
  timestamp: string; // ISO date string
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  parentId?: string; // For subtasks
  
  state: TaskState;
  previousState?: TaskState; // To remember state when snoozed
  priority: string;
  isPinned: boolean;
  isDelegated?: boolean;
  delegatedToIds?: string[];
  
  creatorId: string;
  assigneeIds: string[];
  reporterIds: string[];
  
  mediumTags: string[];
  
  startDate?: string; // ISO date string
  dueDate?: string; // ISO date string
  progress: number; // 0 to 100
  
  recurrence: Recurrence;
  
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface User {
  id: string;
  name: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  taskId?: string;
}
