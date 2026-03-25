import { useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { useFilterStore } from '../stores/filterStore';
import type { Task, TaskStatus } from '../lib/types';

export function useTasks() {
  const { tasks, categories, taskAssignees, comments, users, activeWorkspaceId, workspaces } = useWorkspaceStore();
  const { user } = useAuthStore();
  const { personFilter, statusFilter, search } = useFilterStore();

  // Get categories for active workspace
  const activeCategories = useMemo(() => {
    if (!activeWorkspaceId) return [];
    return categories.filter((c) => c.workspace_id === activeWorkspaceId);
  }, [categories, activeWorkspaceId]);

  // Get tasks for active workspace with enriched data
  const activeTasks = useMemo(() => {
    const catIds = new Set(activeCategories.map((c) => c.id));
    return tasks.filter((t) => catIds.has(t.category_id) && t.parent_task_id === null);
  }, [tasks, activeCategories]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    let filtered = activeTasks;

    if (personFilter) {
      const personUser = users.find((u) => u.name === personFilter || u.id === personFilter);
      if (personUser) {
        const assignedTaskIds = new Set(
          taskAssignees.filter((a) => a.user_id === personUser.id).map((a) => a.task_id)
        );
        filtered = filtered.filter((t) => assignedTaskIds.has(t.id));
      }
    }

    if (statusFilter) {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((t) => t.label.toLowerCase().includes(s));
    }

    return filtered;
  }, [activeTasks, personFilter, statusFilter, search, taskAssignees, users]);

  // Get subtasks for a task
  const getSubtasks = useCallback(
    (parentId: string) => tasks.filter((t) => t.parent_task_id === parentId).sort((a, b) => a.sort_order - b.sort_order),
    [tasks]
  );

  // Get assignees for a task
  const getAssignees = useCallback(
    (taskId: string) => {
      const assigns = taskAssignees.filter((a) => a.task_id === taskId);
      return assigns.map((a) => {
        const u = users.find((u) => u.id === a.user_id);
        return { ...a, user: u || null };
      });
    },
    [taskAssignees, users]
  );

  // Get comments for a task
  const getComments = useCallback(
    (taskId: string) => {
      return comments
        .filter((c) => c.task_id === taskId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    },
    [comments]
  );

  // Count stats for active workspace
  const stats = useMemo(() => {
    let fait = 0, en_cours = 0, a_faire = 0;
    activeTasks.forEach((t) => {
      if (t.status === 'fait') fait++;
      else if (t.status === 'en_cours') en_cours++;
      else a_faire++;
    });
    const total = fait + en_cours + a_faire;
    const pct = total > 0 ? Math.round((fait / total) * 100) : 0;
    return { fait, en_cours, a_faire, total, pct };
  }, [activeTasks]);

  // Stats per workspace
  const workspaceStats = useMemo(() => {
    const result: Record<string, { fait: number; total: number; pct: number }> = {};
    workspaces.forEach((ws) => {
      const wsCats = categories.filter((c) => c.workspace_id === ws.id);
      const catIds = new Set(wsCats.map((c) => c.id));
      const wsTasks = tasks.filter((t) => catIds.has(t.category_id) && !t.parent_task_id);
      const fait = wsTasks.filter((t) => t.status === 'fait').length;
      const total = wsTasks.length;
      result[ws.id] = { fait, total, pct: total > 0 ? Math.round((fait / total) * 100) : 0 };
    });
    return result;
  }, [workspaces, categories, tasks]);

  // CRUD actions
  const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus) => {
    useWorkspaceStore.getState().updateTask(taskId, { status });
    await supabase.from('tasks').update({ status }).eq('id', taskId);
  }, []);

  const updateTaskDates = useCallback(async (taskId: string, date_start: string | null, deadline: string | null) => {
    useWorkspaceStore.getState().updateTask(taskId, { date_start, deadline });
    await supabase.from('tasks').update({ date_start, deadline }).eq('id', taskId);
  }, []);

  const updateTaskNote = useCallback(async (taskId: string, note: string) => {
    useWorkspaceStore.getState().updateTask(taskId, { note });
    await supabase.from('tasks').update({ note }).eq('id', taskId);
  }, []);

  const toggleValidation = useCallback(async (assigneeId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    useWorkspaceStore.getState().updateTaskAssignee(assigneeId, {
      validated: newVal,
      validated_at: newVal ? new Date().toISOString() : null,
    });
    await supabase.from('task_assignees').update({
      validated: newVal,
      validated_at: newVal ? new Date().toISOString() : null,
    }).eq('id', assigneeId);
  }, []);

  const createTask = useCallback(async (data: {
    category_id: string;
    label: string;
    status: TaskStatus;
    date_start?: string | null;
    deadline?: string | null;
    note?: string | null;
    parent_task_id?: string | null;
    depth?: number;
    assignee_ids?: string[];
  }) => {
    const { assignee_ids, ...taskData } = data;
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        sort_order: tasks.length,
        recurrence: 'none',
        created_by: user?.id,
      })
      .select()
      .single();

    if (error || !newTask) return null;

    useWorkspaceStore.getState().addTask(newTask as Task);

    if (assignee_ids && assignee_ids.length > 0) {
      const assigneeRows = assignee_ids.map((uid) => ({
        task_id: newTask.id,
        user_id: uid,
      }));
      const { data: newAssignees } = await supabase.from('task_assignees').insert(assigneeRows).select();
      if (newAssignees) {
        const current = useWorkspaceStore.getState().taskAssignees;
        useWorkspaceStore.getState().setTaskAssignees([...current, ...newAssignees]);
      }
    }

    return newTask as Task;
  }, [tasks, user]);

  const deleteTask = useCallback(async (taskId: string) => {
    useWorkspaceStore.getState().removeTask(taskId);
    await supabase.from('tasks').delete().eq('id', taskId);
  }, []);

  const addCommentToTask = useCallback(async (taskId: string, text: string) => {
    if (!user || !text.trim()) return;
    const { data: newComment } = await supabase
      .from('comments')
      .insert({ task_id: taskId, author_id: user.id, text: text.trim() })
      .select()
      .single();
    if (newComment) {
      useWorkspaceStore.getState().addComment(newComment);
    }
  }, [user]);

  const deleteComment = useCallback(async (commentId: string) => {
    useWorkspaceStore.getState().removeComment(commentId);
    await supabase.from('comments').delete().eq('id', commentId);
  }, []);

  return {
    activeCategories,
    activeTasks,
    filteredTasks,
    stats,
    workspaceStats,
    getSubtasks,
    getAssignees,
    getComments,
    updateTaskStatus,
    updateTaskDates,
    updateTaskNote,
    toggleValidation,
    createTask,
    deleteTask,
    addCommentToTask,
    deleteComment,
  };
}
