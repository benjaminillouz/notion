import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from '../stores/workspaceStore';
import type { Task, TaskAssignee, Comment } from '../lib/types';

export function useRealtime() {
  const { updateTask, addTask, removeTask, setTaskAssignees, taskAssignees, addComment, removeComment } = useWorkspaceStore();

  useEffect(() => {
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newTask = payload.new as Task;
          const existingTasks = useWorkspaceStore.getState().tasks;
          if (!existingTasks.some((t) => t.id === newTask.id)) {
            addTask(newTask);
          }
        } else if (payload.eventType === 'UPDATE') {
          updateTask((payload.new as Task).id, payload.new as Partial<Task>);
        } else if (payload.eventType === 'DELETE') {
          removeTask((payload.old as { id: string }).id);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTaskAssignees([...taskAssignees, payload.new as TaskAssignee]);
        } else if (payload.eventType === 'UPDATE') {
          setTaskAssignees(
            taskAssignees.map((a) =>
              a.id === (payload.new as TaskAssignee).id ? (payload.new as TaskAssignee) : a
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setTaskAssignees(taskAssignees.filter((a) => a.id !== (payload.old as { id: string }).id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          addComment(payload.new as Comment);
        } else if (payload.eventType === 'DELETE') {
          removeComment((payload.old as { id: string }).id);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, () => {
        // Trigger a full refetch for workspace changes
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        // Trigger a full refetch for category changes
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
