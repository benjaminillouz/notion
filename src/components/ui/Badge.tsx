import React from 'react';

interface BadgeProps {
  label: string;
  bg?: string;
  color?: string;
  border?: string;
}

export function Badge({ label, bg = '#eef1ff', color = '#4361ee', border }: BadgeProps) {
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: 10,
        fontSize: '0.68rem',
        fontWeight: 600,
        background: bg,
        color: color,
        border: border ? '1px solid ' + border : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
