import React, { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { StatusPill } from '../ui/StatusPill';
import { STATUS_COLORS, formatDateFr, isOverdue, isDueSoon, durationLabel, cycleStatus } from '../../lib/utils';
import type { Task, TaskStatus, User, TaskAssignee } from '../../lib/types';

interface EnrichedAssignee extends TaskAssignee {
  user: User | null;
}

interface TaskCardProps {
  task: Task;
  assignees: EnrichedAssignee[];
  commentCount: number;
  currentUser: User;
  dark: boolean;
  depth?: number;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDateChange: (taskId: string, dateStart: string | null, deadline: string | null) => void;
  onToggleValidation: (assigneeId: string, currentVal: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComments: (taskId: string) => void;
}

export function TaskCard({
  task,
  assignees,
  commentCount,
  currentUser,
  dark,
  depth = 0,
  onStatusChange,
  onDateChange,
  onToggleValidation,
  onEdit,
  onDelete,
  onToggleComments,
}: TaskCardProps) {
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';
  const isFait = task.status === 'fait';
  const overdue = isOverdue(task.deadline, task.status);
  const dueSoon = isDueSoon(task.deadline, task.status);
  const dur = durationLabel(task.date_start, task.deadline);
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  const statusColors = STATUS_COLORS[task.status];

  const handleCycleStatus = () => {
    if (assignees.length > 1) return;
    onStatusChange(task.id, cycleStatus(task.status));
  };

  return (
    <div
      style={{
        padding: '8px 12px',
        paddingLeft: 12 + depth * 20,
        borderBottom: '1px solid ' + bdr,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: depth > 0 ? '0.78rem' : '0.85rem',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(67,97,238,0.03)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Checkbox */}
      <div
        onClick={handleCycleStatus}
        style={{
          width: 15,
          height: 15,
          borderRadius: 3,
          border: `1.5px solid ${statusColors.border}`,
          background: isFait ? '#2ec4b6' : task.status === 'en_cours' ? '#fef3e6' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: assignees.length > 1 ? 'default' : 'pointer',
          flexShrink: 0,
          fontSize: '0.6rem',
          color: isFait ? 'white' : '#f4a261',
          fontWeight: 700,
        }}
      >
        {isFait ? '\u2713' : task.status === 'en_cours' ? '~' : ''}
      </div>

      {/* Label */}
      <div
        style={{
          flex: 1,
          color: isFait ? muted : txt,
          textDecoration: isFait ? 'line-through' : 'none',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {task.label}
      </div>

      {/* Assignees */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        {assignees.length === 0 && (
          <span style={{ fontSize: '0.65rem', color: muted, padding: '2px 6px', borderRadius: 8, background: dark ? '#2a2a4a' : '#f0f0f0' }}>
            Non assigne
          </span>
        )}
        {assignees.map((a) => (
          <Avatar
            key={a.id}
            name={a.user?.name || '?'}
            initials={a.user?.initials || '??'}
            color={a.user?.color || '#aaa'}
            size={22}
            validated={a.validated}
            onClick={() => {
              if (a.user_id === currentUser.id || isAdmin) {
                onToggleValidation(a.id, a.validated);
              }
            }}
          />
        ))}
        {assignees.length > 1 && (
          <span style={{ fontSize: '0.62rem', color: muted }}>
            {assignees.filter((a) => a.validated).length}/{assignees.length}
          </span>
        )}
      </div>

      {/* Dates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: '0.62rem', color: muted }}>du</span>
        <input
          type="date"
          value={task.date_start || ''}
          onChange={(e) => onDateChange(task.id, e.target.value || null, task.deadline)}
          style={{
            width: 90,
            padding: '2px 4px',
            border: '1px solid ' + bdr,
            borderRadius: 4,
            fontSize: '0.67rem',
            background: dark ? '#1e2a4a' : 'white',
            color: txt,
            outline: 'none',
          }}
        />
        <span style={{ fontSize: '0.62rem', color: muted }}>au</span>
        <input
          type="date"
          value={task.deadline || ''}
          onChange={(e) => onDateChange(task.id, task.date_start, e.target.value || null)}
          style={{
            width: 90,
            padding: '2px 4px',
            border: `1px solid ${overdue ? '#e63946' : dueSoon ? '#f4a261' : bdr}`,
            borderRadius: 4,
            fontSize: '0.67rem',
            background: overdue ? '#fde8ea' : dueSoon ? '#fef3e6' : dark ? '#1e2a4a' : 'white',
            color: txt,
            outline: 'none',
          }}
        />
        {overdue && <span>🔴</span>}
        {dueSoon && !overdue && <span>🟠</span>}
        {dur && (
          <span style={{ fontSize: '0.62rem', padding: '1px 6px', borderRadius: 6, background: '#eef1ff', color: '#4361ee', fontWeight: 600 }}>
            {dur}
          </span>
        )}
      </div>

      {/* Status Pill */}
      <StatusPill status={task.status} onChange={(s) => onStatusChange(task.id, s)} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <button onClick={() => onEdit(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '2px' }}>✏️</button>
        {isAdmin && <button onClick={() => onDelete(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '2px' }}>🗑️</button>}
        <button
          onClick={() => onToggleComments(task.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '2px', position: 'relative' }}
        >
          💬
          {commentCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: '#4361ee', color: 'white', borderRadius: '50%', width: 14, height: 14, fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {commentCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
