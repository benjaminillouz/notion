import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import type { Workspace, Category, Task, TaskAssignee, Comment, User } from '../lib/types';

export function useWorkspaces() {
  const { user } = useAuthStore();
  const store = useWorkspaceStore();

  const fetchAll = useCallback(async () => {
    if (!user) return;

    const [
      { data: workspaces },
      { data: categories },
      { data: tasks },
      { data: assignees },
      { data: comments },
      { data: users },
    ] = await Promise.all([
      supabase.from('workspaces').select('*').eq('is_archived', false).order('sort_order'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('tasks').select('*').order('sort_order'),
      supabase.from('task_assignees').select('*'),
      supabase.from('comments').select('*').order('created_at', { ascending: true }),
      supabase.from('users').select('*').eq('is_active', true),
    ]);

    if (workspaces) store.setWorkspaces(workspaces as Workspace[]);
    if (categories) store.setCategories(categories as Category[]);
    if (tasks) store.setTasks(tasks as Task[]);
    if (assignees) store.setTaskAssignees(assignees as TaskAssignee[]);
    if (comments) store.setComments(comments as Comment[]);
    if (users) store.setUsers(users as User[]);

    // Set first workspace as active if none selected
    if (!store.activeWorkspaceId && workspaces && workspaces.length > 0) {
      store.setActiveWorkspaceId(workspaces[0].id);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { refetch: fetchAll };
}
