export type UserRole = 'superadmin' | 'admin' | 'member';
export type TaskStatus = 'a_faire' | 'en_cours' | 'fait';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  color: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_template: boolean;
  source_template_id: string | null;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  workspace_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  category_id: string;
  parent_task_id: string | null;
  label: string;
  status: TaskStatus;
  date_start: string | null;
  deadline: string | null;
  note: string | null;
  recurrence: TaskRecurrence;
  recurrence_hint: string | null;
  sort_order: number;
  depth: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  validated: boolean;
  validated_at: string | null;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  text: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  workspace_id: string | null;
  task_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface TaskWithProgress extends Task {
  workspace_id: string;
  category_name: string;
  workspace_name: string;
  assignees: {
    user_id: string;
    name: string;
    initials: string;
    color: string;
    validated: boolean;
  }[];
  assignee_count: number;
  validated_count: number;
  comment_count: number;
  subtask_count: number;
  subtask_done_count: number;
}

export type ViewType = 'tasks' | 'calendar' | 'gantt' | 'transversal' | 'admin';
