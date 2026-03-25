import React, { useState, useMemo } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useFilterStore } from '../../stores/filterStore';
import { STATUS_COLORS, formatDateFr } from '../../lib/utils';
import type { TaskStatus } from '../../lib/types';

export function CalendarView() {
  const { tasks, categories, workspaces, taskAssignees, users } = useWorkspaceStore();
  const { darkMode, personFilter, statusFilter } = useFilterStore();
  const dark = darkMode;

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [tip, setTip] = useState<{ tasks: typeof allTasks; iso: string; rect: DOMRect } | null>(null);

  const card = dark ? '#16213e' : 'white';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';

  // Get all tasks with deadlines
  const allTasks = useMemo(() => {
    let filtered = tasks.filter((t) => t.deadline && !t.parent_task_id);

    if (personFilter) {
      const personUser = users.find((u) => u.name === personFilter);
      if (personUser) {
        const assignedIds = new Set(taskAssignees.filter((a) => a.user_id === personUser.id).map((a) => a.task_id));
        filtered = filtered.filter((t) => assignedIds.has(t.id));
      }
    }

    if (statusFilter) {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    return filtered.map((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      const ws = cat ? workspaces.find((w) => w.id === cat.workspace_id) : null;
      return { ...t, catName: cat?.name || '', wsName: ws?.name || '' };
    });
  }, [tasks, categories, workspaces, personFilter, statusFilter, taskAssignees, users]);

  const byDay = useMemo(() => {
    const m: Record<string, typeof allTasks> = {};
    allTasks.forEach((t) => {
      if (!t.deadline) return;
      if (!m[t.deadline]) m[t.deadline] = [];
      m[t.deadline].push(t);
    });
    return m;
  }, [allTasks]);

  const dim = new Date(calYear, calMonth + 1, 0).getDate();
  const fd = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;
  const isToday = (d: number) => d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();

  const prevM = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); };
  const nextM = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); };

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={prevM} style={{ background: 'none', border: '1px solid ' + bdr, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: txt }}>{'<'}</button>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, textTransform: 'capitalize', color: '#4361ee' }}>
          {new Date(calYear, calMonth, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={nextM} style={{ background: 'none', border: '1px solid ' + bdr, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: txt }}>{'>'}</button>
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: muted }}>{allTasks.length} tâches avec échéance</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}>
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: muted, padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {Array.from({ length: fd }).map((_, i) => <div key={'e' + i} />)}
        {Array.from({ length: dim }).map((_, i) => {
          const day = i + 1;
          const iso = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          const dayTasks = byDay[iso] || [];
          const isWE = ((fd + i) % 7) >= 5;

          return (
            <div
              key={day}
              onMouseEnter={dayTasks.length ? (e) => setTip({ tasks: dayTasks, iso, rect: e.currentTarget.getBoundingClientRect() }) : undefined}
              onMouseLeave={() => setTip(null)}
              style={{
                minHeight: 72,
                padding: '5px 6px',
                background: isToday(day) ? '#4361ee' : dayTasks.length ? (dark ? '#1e2a4a' : '#eef1ff') : card,
                borderRadius: 8,
                border: '1px solid ' + (isToday(day) ? '#4361ee' : bdr),
                cursor: dayTasks.length ? 'pointer' : 'default',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: isToday(day) ? 700 : 500, color: isToday(day) ? 'white' : isWE ? muted : txt, marginBottom: 3 }}>{day}</div>
              {dayTasks.slice(0, 3).map((t, ti) => {
                const col = STATUS_COLORS[t.status];
                return (
                  <div key={ti} style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: 4, background: col.bg, color: col.text, marginBottom: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {t.label}
                  </div>
                );
              })}
              {dayTasks.length > 3 && <div style={{ fontSize: '0.58rem', color: muted }}>+{dayTasks.length - 3}</div>}
            </div>
          );
        })}
      </div>

      {tip && (
        <div
          style={{
            position: 'fixed',
            zIndex: 3000,
            top: Math.min(tip.rect.bottom + 6, window.innerHeight - 220),
            left: Math.max(4, Math.min(tip.rect.left, window.innerWidth - 300)),
            background: card,
            border: '1px solid ' + bdr,
            borderRadius: 12,
            padding: '12px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            minWidth: 260,
            maxWidth: 300,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: 8, color: '#4361ee' }}>{formatDateFr(tip.iso)}</div>
          {tip.tasks.map((t, i) => {
            const col = STATUS_COLORS[t.status];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '5px 0', borderBottom: '1px solid ' + bdr }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.border, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 500, color: txt }}>{t.label}</div>
                  <div style={{ fontSize: '0.66rem', color: muted }}>{(t as any).wsName}</div>
                </div>
                <span style={{ fontSize: '0.62rem', padding: '2px 7px', borderRadius: 10, background: col.bg, color: col.text, fontWeight: 600, flexShrink: 0 }}>
                  {t.status === 'fait' ? 'Fait' : t.status === 'en_cours' ? 'En cours' : 'A faire'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
