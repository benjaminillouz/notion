import React from 'react';
import { STATUS_COLORS, STATUS_LABELS } from '../../lib/utils';
import type { TaskStatus } from '../../lib/types';

interface StatusPillProps {
  status: TaskStatus;
  onChange?: (status: TaskStatus) => void;
  readOnly?: boolean;
}

export function StatusPill({ status, onChange, readOnly }: StatusPillProps) {
  const col = STATUS_COLORS[status];

  if (readOnly || !onChange) {
    return (
      <span
        style={{
          padding: '2px 10px',
          borderRadius: 12,
          border: '1px solid ' + col.border,
          fontSize: '0.7rem',
          fontWeight: 600,
          background: col.bg,
          color: col.text,
          whiteSpace: 'nowrap',
        }}
      >
        {STATUS_LABELS[status]}
      </span>
    );
  }

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      style={{
        padding: '2px 7px',
        borderRadius: 12,
        border: '1px solid ' + col.border,
        fontSize: '0.7rem',
        fontWeight: 600,
        cursor: 'pointer',
        background: col.bg,
        color: col.text,
        appearance: 'none',
        WebkitAppearance: 'none',
        textAlign: 'center',
        minWidth: 72,
        outline: 'none',
      }}
    >
      <option value="a_faire">A faire</option>
      <option value="en_cours">En cours</option>
      <option value="fait">Fait</option>
    </select>
  );
}
