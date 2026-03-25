import React from 'react';

interface AvatarProps {
  name: string;
  initials: string;
  color: string;
  size?: number;
  validated?: boolean;
  onClick?: () => void;
}

export function Avatar({ name, initials, color, size = 28, validated, onClick }: AvatarProps) {
  return (
    <div
      title={name}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: validated ? '#2ec4b6' : color,
        opacity: validated === false ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'opacity 0.2s, background 0.2s',
        border: validated ? '2px solid #2ec4b6' : '2px solid transparent',
      }}
    >
      {initials}
    </div>
  );
}
