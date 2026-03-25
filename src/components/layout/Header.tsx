import React, { useState } from 'react';
import { useFilterStore } from '../../stores/filterStore';
import { useAuthStore } from '../../stores/authStore';

interface HeaderProps {
  stats: { fait: number; en_cours: number; a_faire: number; pct: number };
  onExport: () => void;
  onAddTask: () => void;
  onSignOut: () => void;
}

export function Header({ stats, onExport, onAddTask, onSignOut }: HeaderProps) {
  const { view, darkMode, toggleDarkMode, showHistory, setShowHistory } = useFilterStore();
  const [logoError, setLogoError] = useState(false);

  return (
    <div
      style={{
        background: darkMode
          ? 'linear-gradient(90deg, #2a2a5e, #1a1a3e)'
          : 'linear-gradient(90deg, #4361ee, #3a0ca3)',
        color: 'white',
        padding: '0 16px',
        height: 46,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {!logoError ? (
          <img
            src="/logo-cemedis.png"
            alt="CEMEDIS"
            style={{ height: 24 }}
            onError={() => setLogoError(true)}
          />
        ) : null}
        <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: 1 }}>
          {logoError && '🦷 '}CEMEDIS
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {view === 'tasks' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.1)',
              padding: '4px 12px',
              borderRadius: 12,
              fontSize: '0.72rem',
            }}
          >
            <span style={{ color: '#2ec4b6', fontWeight: 700 }}>✅ {stats.fait}</span>
            <span style={{ color: '#f4a261' }}>🟡 {stats.en_cours}</span>
            <span style={{ color: '#e63946' }}>🔴 {stats.a_faire}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{stats.pct}%</span>
          </div>
        )}
        <button
          onClick={onExport}
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          Export
        </button>
        <button
          onClick={onAddTask}
          style={{
            background: '#2ec4b6',
            color: 'white',
            border: 'none',
            padding: '5px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          +
        </button>
        <button
          onClick={toggleDarkMode}
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          {darkMode ? '☀' : '🌙'}
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          📜
        </button>
        <button
          onClick={onSignOut}
          style={{
            background: 'rgba(255,255,255,0.12)',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          🚪
        </button>
      </div>
    </div>
  );
}
