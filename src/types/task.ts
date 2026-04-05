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

export type CustomFieldType = 'text' | 'number' | 'select' | 'multi-select' | 'date';

export interface CustomFieldOption {
  id: string;
  label: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  options?: CustomFieldOption[]; // For select and multi-select
  isRequired?: boolean;
}

export interface NavItemConfig {
  id: string;
  isVisible: boolean;
}

export interface FieldConfig {
  id: string;
  name: string;
  isCustom: boolean;
  isVisible: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  status?: 'active' | 'completed' | 'archived';
  progress?: number;
  order?: number;
  activeEdges?: string[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  parentId?: string; // For subtasks or branch tasks in projects
  
  // Project Management
  projectId?: string;
  projectNodeType?: 'mainline' | 'branch';
  dependencies?: string[]; // IDs of tasks that must be completed before this one (horizontal sequence)
  postDependencies?: string[]; // IDs of tasks that depend on this one (horizontal sequence)
  
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
  plannedStartTime?: string; // ISO date string for weekly plan mode
  plannedEndTime?: string; // ISO date string for weekly plan mode
  progress: number; // 0 to 100
  
  relatedTaskIds?: string[];
  
  recurrence: Recurrence;
  
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string

  // Custom field values: Record<fieldDefinitionId, value>
  customFields?: Record<string, any>;
}

export interface EntityOption {
  id: string;
  name: string;
}

export interface PositionOption {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  entityIds?: string[];
  positionIds?: string[];
  notes?: string;
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

export interface Memo {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskUpdate = Omit<Partial<Task>, 'id' | 'createdAt' | 'creatorId'>;
export type ProjectUpdate = Omit<Partial<Project>, 'id' | 'createdAt'>;

export type ModalType = 'task' | 'confirmation' | null;

export interface ConfirmationModalConfig {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ModalState {
  type: ModalType;
  taskId?: string; // For task modal
  confirmationConfig?: ConfirmationModalConfig; // For confirmation modal
}

export interface GraphNode extends Task {
  x: number;
  y: number;
  type: 'mainline' | 'branch';
}
