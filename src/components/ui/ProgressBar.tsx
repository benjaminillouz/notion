import React from 'react';

interface ProgressBarProps {
  pct: number;
  height?: number;
  color?: string;
}

export function ProgressBar({ pct, height = 6, color = '#2ec4b6' }: ProgressBarProps) {
  return (
    <div
      style={{
        flex: 1,
        height,
        background: '#e9ecef',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: pct + '%',
          height: '100%',
          background: color,
          borderRadius: 4,
          transition: 'width 0.4s',
        }}
      />
    </div>
  );
}
