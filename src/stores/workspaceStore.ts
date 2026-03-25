import { create } from 'zustand';
import type { Workspace, Category, Task, TaskAssignee, Comment, User } from '../lib/types';

interface WorkspaceState {
  workspaces: Workspace[];
  categories: Category[];
  tasks: Task[];
  taskAssignees: TaskAssignee[];
  comments: Comment[];
  users: User[];
  activeWorkspaceId: string | null;

  setWorkspaces: (workspaces: Workspace[]) => void;
  setCategories: (categories: Category[]) => void;
  setTasks: (tasks: Task[]) => void;
  setTaskAssignees: (assignees: TaskAssignee[]) => void;
  setComments: (comments: Comment[]) => void;
  setUsers: (users: User[]) => void;
  setActiveWorkspaceId: (id: string | null) => void;

  updateTask: (id: string, updates: Partial<Task>) => void;
  addTask: (task: Task) => void;
  removeTask: (id: string) => void;
  updateTaskAssignee: (id: string, updates: Partial<TaskAssignee>) => void;
  addComment: (comment: Comment) => void;
  removeComment: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  categories: [],
  tasks: [],
  taskAssignees: [],
  comments: [],
  users: [],
  activeWorkspaceId: null,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setCategories: (categories) => set({ categories }),
  setTasks: (tasks) => set({ tasks }),
  setTaskAssignees: (assignees) => set({ taskAssignees: assignees }),
  setComments: (comments) => set({ comments }),
  setUsers: (users) => set({ users }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),
  updateTaskAssignee: (id, updates) => set((state) => ({
    taskAssignees: state.taskAssignees.map((a) => (a.id === id ? { ...a, ...updates } : a)),
  })),
  addComment: (comment) => set((state) => ({
    comments: [...state.comments, comment],
  })),
  removeComment: (id) => set((state) => ({
    comments: state.comments.filter((c) => c.id !== id),
  })),
}));
