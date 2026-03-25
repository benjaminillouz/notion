import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useFilterStore } from '../../stores/filterStore';
import { useTasks } from '../../hooks/useTasks';
import { supabase } from '../../lib/supabase';
import type { Task, TaskStatus } from '../../lib/types';

interface TaskModalProps {
  task?: Task | null;
  dark: boolean;
  onClose: () => void;
  categoryId?: string;
}

export function TaskModal({ task, dark, onClose, categoryId }: TaskModalProps) {
  const { activeCategories, createTask } = useTasks();
  const { users, taskAssignees } = useWorkspaceStore();

  const existingAssigneeIds = task
    ? taskAssignees.filter((a) => a.task_id === task.id).map((a) => a.user_id)
    : [];

  const [label, setLabel] = useState(task?.label || '');
  const [catId, setCatId] = useState(task?.category_id || categoryId || activeCategories[0]?.id || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'a_faire');
  const [dateStart, setDateStart] = useState(task?.date_start || '');
  const [deadline, setDeadline] = useState(task?.deadline || '');
  const [note, setNote] = useState(task?.note || '');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(existingAssigneeIds);

  const card = dark ? '#16213e' : 'white';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';

  const isEdit = !!task;

  const handleSubmit = async () => {
    if (!label.trim()) return;
    if (isEdit && task) {
      // Update existing task
      await supabase.from('tasks').update({
        label: label.trim(),
        category_id: catId,
        status,
        date_start: dateStart || null,
        deadline: deadline || null,
        note: note || null,
      }).eq('id', task.id);

      // Update assignees
      await supabase.from('task_assignees').delete().eq('task_id', task.id);
      if (selectedUsers.length > 0) {
        await supabase.from('task_assignees').insert(
          selectedUsers.map((uid) => ({ task_id: task.id, user_id: uid }))
        );
      }

      useWorkspaceStore.getState().updateTask(task.id, {
        label: label.trim(),
        category_id: catId,
        status,
        date_start: dateStart || null,
        deadline: deadline || null,
        note: note || null,
      });
    } else {
      await createTask({
        category_id: catId,
        label: label.trim(),
        status,
        date_start: dateStart || null,
        deadline: deadline || null,
        note: note || null,
        assignee_ids: selectedUsers,
      });
    }
    onClose();
  };

  const toggleUser = (uid: string) => {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const dur = dateStart && deadline && dateStart <= deadline
    ? Math.round((new Date(deadline + 'T00:00:00').getTime() - new Date(dateStart + 'T00:00:00').getTime()) / 86400000) + 1
    : null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: card, borderRadius: 18, padding: 28, maxWidth: 460, width: '92%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
      >
        <h3 style={{ margin: '0 0 16px', color: '#4361ee', fontSize: '1rem' }}>
          {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Intitulé</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus style={{ width: '100%', padding: '9px 12px', border: '2px solid #4361ee', borderRadius: 8, fontSize: '0.85rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Catégorie</label>
            <select value={catId} onChange={(e) => setCatId(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.82rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none' }}>
              {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Responsables</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {users.filter((u) => u.is_active).map((u) => (
                <span
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    border: selectedUsers.includes(u.id) ? '2px solid ' + u.color : '1px solid ' + bdr,
                    background: selectedUsers.includes(u.id) ? u.color + '22' : 'transparent',
                    color: selectedUsers.includes(u.id) ? u.color : muted,
                    fontWeight: selectedUsers.includes(u.id) ? 600 : 400,
                  }}
                >
                  {u.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.82rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none' }}>
              <option value="a_faire">A faire</option>
              <option value="en_cours">En cours</option>
              <option value="fait">Fait</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Date début</label>
              <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.82rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Date fin</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.82rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          {dur !== null && (
            <div style={{ fontSize: '0.72rem', color: '#4361ee', textAlign: 'center', fontWeight: 600 }}>
              {dur} jour{dur > 1 ? 's' : ''}
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.82rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={handleSubmit} style={{ flex: 1, padding: '10px 0', background: '#4361ee', color: 'white', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem' }}>
            {isEdit ? 'Enregistrer' : 'Ajouter'}
          </button>
          <button onClick={onClose} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid ' + bdr, borderRadius: 9, cursor: 'pointer', color: muted, fontSize: '0.88rem' }}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
