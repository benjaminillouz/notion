import React, { useState } from 'react';
import { useFilterStore } from '../../stores/filterStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { ProgressBar } from '../ui/ProgressBar';
import { Avatar } from '../ui/Avatar';
import type { ViewType, TaskStatus } from '../../lib/types';

const VIEWS: { id: ViewType; icon: string; label: string; adminOnly?: boolean }[] = [
  { id: 'tasks', icon: '📋', label: 'Tâches' },
  { id: 'calendar', icon: '📅', label: 'Calendrier' },
  { id: 'gantt', icon: '📊', label: 'Gantt' },
  { id: 'transversal', icon: '🔀', label: 'Vue globale' },
  { id: 'admin', icon: '⚙️', label: 'Admin', adminOnly: true },
];

const STATUS_CHIPS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'a_faire', label: 'A faire', color: '#e63946' },
  { status: 'en_cours', label: 'En cours', color: '#f4a261' },
  { status: 'fait', label: 'Fait', color: '#2ec4b6' },
];

interface SidebarProps {
  workspaceStats: Record<string, { fait: number; total: number; pct: number }>;
  onAddWorkspace: () => void;
  onDuplicateWorkspace: (id: string) => void;
  onRenameWorkspace: (id: string) => void;
  onDeleteWorkspace: (id: string) => void;
}

export function Sidebar({ workspaceStats, onAddWorkspace, onDuplicateWorkspace, onRenameWorkspace, onDeleteWorkspace }: SidebarProps) {
  const { view, setView, personFilter, setPersonFilter, statusFilter, setStatusFilter, search, setSearch, sidebarCollapsed, toggleSidebar, darkMode } = useFilterStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, users } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [hoveredWs, setHoveredWs] = useState<string | null>(null);

  const bg = darkMode ? '#12122a' : '#1e2a5a';
  const muted = 'rgba(255,255,255,0.55)';
  const collapsed = sidebarCollapsed;

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div
      style={{
        width: collapsed ? 52 : 240,
        background: bg,
        borderRight: '1px solid #2a3f8f',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: collapsed ? '10px 8px' : '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {!collapsed && user && (
          <>
            <Avatar name={user.name} initials={user.initials} color={user.color} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ color: muted, fontSize: '0.62rem' }}>{user.role}</div>
            </div>
          </>
        )}
        <button
          onClick={toggleSidebar}
          style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.8rem', padding: '4px', marginLeft: collapsed ? 'auto' : 0, marginRight: collapsed ? 'auto' : 0 }}
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>

      {/* Views */}
      <div style={{ padding: collapsed ? '8px 4px' : '8px 10px' }}>
        {!collapsed && <div style={{ fontSize: '0.62rem', color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, padding: '0 4px' }}>Vues</div>}
        {VIEWS.filter((v) => !v.adminOnly || isAdmin).map((v) => {
          const active = view === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: collapsed ? '8px 0' : '7px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                borderLeft: active ? '3px solid #2ec4b6' : '3px solid transparent',
                border: 'none',
                borderRadius: 0,
                color: active ? 'white' : muted,
                fontWeight: active ? 600 : 400,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'white'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = muted; }}
            >
              <span>{v.icon}</span>
              {!collapsed && <span>{v.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Workspaces (only in tasks view) */}
      {view === 'tasks' && (
        <div style={{ padding: collapsed ? '8px 4px' : '8px 10px', flex: 1, overflowY: 'auto' }}>
          {!collapsed && <div style={{ fontSize: '0.62rem', color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, padding: '0 4px' }}>Onglets</div>}
          {workspaces.map((ws) => {
            const active = ws.id === activeWorkspaceId;
            const stat = workspaceStats[ws.id] || { fait: 0, total: 0, pct: 0 };
            const hovered = hoveredWs === ws.id;

            if (collapsed) {
              const dotColor = stat.pct === 100 ? '#2ec4b6' : stat.pct > 0 ? '#f4a261' : '#e63946';
              return (
                <div
                  key={ws.id}
                  onClick={() => setActiveWorkspaceId(ws.id)}
                  title={ws.name}
                  style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', cursor: 'pointer', borderLeft: active ? '3px solid #4361ee' : '3px solid transparent' }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
                </div>
              );
            }

            return (
              <div
                key={ws.id}
                onClick={() => setActiveWorkspaceId(ws.id)}
                onMouseEnter={() => setHoveredWs(ws.id)}
                onMouseLeave={() => setHoveredWs(null)}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  borderLeft: active ? '3px solid #4361ee' : '3px solid transparent',
                  background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                  borderRadius: '0 6px 6px 0',
                  marginBottom: 2,
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: active ? 'white' : muted, fontWeight: active ? 600 : 400, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: hovered ? 60 : 0 }}>
                  {ws.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ProgressBar pct={stat.pct} height={3} color="#2ec4b6" />
                  <span style={{ fontSize: '0.6rem', color: muted, flexShrink: 0 }}>{stat.pct}%</span>
                </div>
                {hovered && (
                  <div style={{ position: 'absolute', right: 6, top: 6, display: 'flex', gap: 2 }}>
                    <button onClick={(e) => { e.stopPropagation(); onDuplicateWorkspace(ws.id); }} title="Dupliquer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2ec4b6', fontSize: '0.7rem', padding: '2px' }}>⧉</button>
                    <button onClick={(e) => { e.stopPropagation(); onRenameWorkspace(ws.id); }} title="Renommer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f4a261', fontSize: '0.7rem', padding: '2px' }}>✎</button>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteWorkspace(ws.id); }} title="Supprimer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e63946', fontSize: '0.7rem', padding: '2px' }}>×</button>
                  </div>
                )}
              </div>
            );
          })}
          {!collapsed && (
            <button
              onClick={onAddWorkspace}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 10px', background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.75rem' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = muted; }}
            >
              + Nouvel onglet
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      {!collapsed && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '0.62rem', color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, padding: '0 4px' }}>Filtres</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '0.75rem',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 8,
            }}
          />
          {/* Person filter */}
          <div style={{ fontSize: '0.62rem', color: muted, marginBottom: 4, padding: '0 4px' }}>Personne</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 0 8px' }}>
            <span
              onClick={() => setPersonFilter(null)}
              style={{
                padding: '3px 9px',
                borderRadius: 12,
                fontSize: '0.68rem',
                cursor: 'pointer',
                border: !personFilter ? '1px solid #2ec4b6' : '1px solid rgba(255,255,255,0.2)',
                background: !personFilter ? '#2ec4b6' : 'rgba(255,255,255,0.08)',
                color: !personFilter ? 'white' : muted,
                userSelect: 'none',
              }}
            >
              Tous
            </span>
            {users.map((u) => (
              <span
                key={u.id}
                onClick={() => setPersonFilter(personFilter === u.name ? null : u.name)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 12,
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  border: personFilter === u.name ? '1px solid #2ec4b6' : '1px solid rgba(255,255,255,0.2)',
                  background: personFilter === u.name ? '#2ec4b6' : 'rgba(255,255,255,0.08)',
                  color: personFilter === u.name ? 'white' : muted,
                  userSelect: 'none',
                }}
              >
                {u.initials}
              </span>
            ))}
          </div>
          {/* Status filter */}
          <div style={{ fontSize: '0.62rem', color: muted, marginBottom: 4, padding: '0 4px' }}>Statut</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 0 4px' }}>
            {STATUS_CHIPS.map((sc) => {
              const active = statusFilter === sc.status;
              return (
                <span
                  key={sc.status}
                  onClick={() => setStatusFilter(active ? null : sc.status)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 12,
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                    border: active ? `1px solid ${sc.color}` : '1px solid rgba(255,255,255,0.2)',
                    background: active ? sc.color : 'rgba(255,255,255,0.08)',
                    color: active ? 'white' : muted,
                    userSelect: 'none',
                  }}
                >
                  {sc.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
