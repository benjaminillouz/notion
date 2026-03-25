import React, { useState, useMemo } from 'react';
import { TaskCard } from './TaskCard';
import { CommentThread } from './CommentThread';
import { TaskModal } from './TaskModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ProgressBar } from '../ui/ProgressBar';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useFilterStore } from '../../stores/filterStore';
import { useTasks } from '../../hooks/useTasks';
import type { Task, TaskStatus } from '../../lib/types';

export function TaskListView() {
  const { user } = useAuthStore();
  const { darkMode } = useFilterStore();
  const { activeCategories, filteredTasks, getSubtasks, getAssignees, getComments, updateTaskStatus, updateTaskDates, toggleValidation, createTask, deleteTask, addCommentToTask, deleteComment, updateTaskNote, stats } = useTasks();

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [addingSubtask, setAddingSubtask] = useState<string | null>(null);
  const [subtaskLabel, setSubtaskLabel] = useState('');

  const dark = darkMode;
  const card = dark ? '#16213e' : 'white';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';

  if (!user) return null;

  const toggleComments = (taskId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSubtasks = (taskId: string) => {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleAddSubtask = async (parentId: string, categoryId: string) => {
    if (!subtaskLabel.trim()) return;
    await createTask({
      category_id: categoryId,
      label: subtaskLabel.trim(),
      status: 'a_faire',
      parent_task_id: parentId,
      depth: 1,
    });
    setSubtaskLabel('');
    setAddingSubtask(null);
  };

  const taskToDelete = confirmDelete ? filteredTasks.find((t) => t.id === confirmDelete) : null;

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {activeCategories.map((cat) => {
        const catTasks = filteredTasks.filter((t) => t.category_id === cat.id);
        if (catTasks.length === 0 && filteredTasks.length > 0) return null;
        const fait = catTasks.filter((t) => t.status === 'fait').length;
        const total = catTasks.length;
        const pct = total > 0 ? Math.round((fait / total) * 100) : 0;

        return (
          <div
            key={cat.id}
            style={{
              background: card,
              borderRadius: 14,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            {/* Category header */}
            <div
              style={{
                padding: '10px 14px',
                borderLeft: '3px solid #4361ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#4361ee' }}>{cat.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.68rem', color: muted }}>{fait}/{total}</span>
                <div style={{ width: 80 }}>
                  <ProgressBar pct={pct} height={4} />
                </div>
                <span style={{ fontSize: '0.68rem', color: muted }}>{pct}%</span>
              </div>
            </div>

            {/* Tasks */}
            {catTasks.map((task) => {
              const assignees = getAssignees(task.id);
              const comments = getComments(task.id);
              const subtasks = getSubtasks(task.id);
              const subtaskDone = subtasks.filter((s) => s.status === 'fait').length;

              return (
                <div key={task.id}>
                  <TaskCard
                    task={task}
                    assignees={assignees}
                    commentCount={comments.length}
                    subtaskCount={subtasks.length}
                    subtaskDoneCount={subtaskDone}
                    currentUser={user}
                    dark={dark}
                    onStatusChange={updateTaskStatus}
                    onDateChange={(id, ds, dl) => updateTaskDates(id, ds, dl)}
                    onToggleValidation={toggleValidation}
                    onEdit={setEditingTask}
                    onDelete={(id) => setConfirmDelete(id)}
                    onToggleComments={toggleComments}
                    onToggleSubtasks={toggleSubtasks}
                  />

                  {/* Expanded subtasks */}
                  {expandedSubtasks.has(task.id) && (
                    <div>
                      {subtasks.map((sub) => {
                        const subAssignees = getAssignees(sub.id);
                        const subComments = getComments(sub.id);
                        const subSubs = getSubtasks(sub.id);
                        return (
                          <div key={sub.id}>
                            <TaskCard
                              task={sub}
                              assignees={subAssignees}
                              commentCount={subComments.length}
                              subtaskCount={subSubs.length}
                              subtaskDoneCount={subSubs.filter((s) => s.status === 'fait').length}
                              currentUser={user}
                              dark={dark}
                              depth={1}
                              showSubtaskBar={false}
                              onStatusChange={updateTaskStatus}
                              onDateChange={(id, ds, dl) => updateTaskDates(id, ds, dl)}
                              onToggleValidation={toggleValidation}
                              onEdit={setEditingTask}
                              onDelete={(id) => setConfirmDelete(id)}
                              onToggleComments={toggleComments}
                              onToggleSubtasks={toggleSubtasks}
                            />
                            {/* Level 2 subtasks */}
                            {subSubs.map((ssub) => (
                              <TaskCard
                                key={ssub.id}
                                task={ssub}
                                assignees={getAssignees(ssub.id)}
                                commentCount={getComments(ssub.id).length}
                                subtaskCount={0}
                                subtaskDoneCount={0}
                                currentUser={user}
                                dark={dark}
                                depth={2}
                                showSubtaskBar={false}
                                onStatusChange={updateTaskStatus}
                                onDateChange={(id, ds, dl) => updateTaskDates(id, ds, dl)}
                                onToggleValidation={toggleValidation}
                                onEdit={setEditingTask}
                                onDelete={(id) => setConfirmDelete(id)}
                                onToggleComments={toggleComments}
                                onToggleSubtasks={toggleSubtasks}
                              />
                            ))}
                          </div>
                        );
                      })}
                      {/* Add subtask input */}
                      {addingSubtask === task.id ? (
                        <div style={{ display: 'flex', gap: 6, padding: '6px 12px 6px 32px' }}>
                          <input
                            value={subtaskLabel}
                            onChange={(e) => setSubtaskLabel(e.target.value)}
                            placeholder="Nom de la sous-tâche..."
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(task.id, task.category_id); if (e.key === 'Escape') setAddingSubtask(null); }}
                            style={{ flex: 1, padding: '5px 8px', border: '1px solid ' + bdr, borderRadius: 6, fontSize: '0.78rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none' }}
                          />
                          <button onClick={() => handleAddSubtask(task.id, task.category_id)} style={{ padding: '5px 10px', background: '#2ec4b6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>OK</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingSubtask(task.id); setSubtaskLabel(''); }}
                          style={{ width: '100%', padding: '5px 12px 5px 32px', background: 'none', border: 'none', cursor: 'pointer', color: '#2ec4b6', fontSize: '0.7rem', textAlign: 'left' }}
                        >
                          ⊕ Ajouter une sous-tâche
                        </button>
                      )}
                    </div>
                  )}

                  {/* Expanded comments */}
                  {expandedComments.has(task.id) && (
                    <CommentThread
                      task={task}
                      comments={comments}
                      currentUser={user}
                      dark={dark}
                      onAddComment={(text) => addCommentToTask(task.id, text)}
                      onDeleteComment={deleteComment}
                      onEditNote={(note) => updateTaskNote(task.id, note)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {editingTask && (
        <TaskModal
          task={editingTask}
          dark={dark}
          onClose={() => setEditingTask(null)}
        />
      )}

      {taskToDelete && (
        <ConfirmModal
          label={taskToDelete.label}
          dark={dark}
          onConfirm={() => { deleteTask(taskToDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
