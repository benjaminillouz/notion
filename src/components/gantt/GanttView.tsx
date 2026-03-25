import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useFilterStore } from '../../stores/filterStore';
import { useTasks } from '../../hooks/useTasks';
import { STATUS_COLORS, formatDateFr } from '../../lib/utils';

const DAY_W = 32;
const LEFT_W = 220;
const ROW_H = 32;

export function GanttView() {
  const { tasks, categories, workspaces, taskAssignees, users } = useWorkspaceStore();
  const { darkMode, personFilter } = useFilterStore();
  const { updateTaskDates } = useTasks();
  const dark = darkMode;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [zoom, setZoom] = useState(1);
  const [viewStart, setViewStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 3);
    return d;
  });
  const [tip, setTip] = useState<{ task: any; x: number; y: number } | null>(null);
  const [popover, setPopover] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dayW = DAY_W * zoom;
  const viewDays = Math.round(90 / zoom);

  const card = dark ? '#16213e' : 'white';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';

  const shiftDays = (n: number) => setViewStart((p) => { const d = new Date(p); d.setDate(d.getDate() + n); return d; });
  const goToday = () => { const d = new Date(today); d.setDate(d.getDate() - 3); setViewStart(d); };

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => Math.max(0.4, Math.min(3, +(z + (e.deltaY < 0 ? 0.15 : -0.15)).toFixed(2))));
  }, []);

  const days = useMemo(() =>
    Array.from({ length: viewDays }, (_, i) => {
      const d = new Date(viewStart);
      d.setDate(d.getDate() + i);
      return d;
    }), [viewStart, viewDays]);

  const offIso = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - viewStart.getTime()) / 86400000);
  };

  const todayOff = Math.round((today.getTime() - viewStart.getTime()) / 86400000);

  // Build hierarchy: workspace > category > tasks with dates
  const rows = useMemo(() => {
    const result: { label: string; task: any; type: 'workspace' | 'category' | 'task' }[] = [];

    workspaces.forEach((ws) => {
      const wsCats = categories.filter((c) => c.workspace_id === ws.id);
      let hasAny = false;

      wsCats.forEach((cat) => {
        const catTasks = tasks.filter((t) =>
          t.category_id === cat.id && !t.parent_task_id && (t.deadline || t.date_start)
        ).filter((t) => {
          if (!personFilter) return true;
          const pu = users.find((u) => u.name === personFilter);
          if (!pu) return true;
          const assigned = taskAssignees.filter((a) => a.task_id === t.id);
          if (assigned.length === 0) return true;
          return assigned.some((a) => a.user_id === pu.id);
        });

        if (catTasks.length > 0) {
          if (!hasAny) {
            result.push({ label: ws.name, task: null, type: 'workspace' });
            hasAny = true;
          }
          result.push({ label: cat.name, task: null, type: 'category' });
          catTasks.forEach((t) => {
            result.push({
              label: t.label,
              task: {
                ...t,
                dateStart: t.date_start || t.deadline,
                dateEnd: t.deadline || t.date_start,
                wsName: ws.name,
                catName: cat.name,
              },
              type: 'task',
            });
          });
        }
      });
    });

    return result;
  }, [workspaces, categories, tasks, personFilter, taskAssignees, users]);

  // Month groups for header
  const monthGroups = useMemo(() => {
    const g: { label: string; start: number; span: number }[] = [];
    let cur = '';
    days.forEach((d, i) => {
      const m = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      if (m !== cur) {
        if (g.length) g[g.length - 1].span = i - g[g.length - 1].start;
        g.push({ label: m, start: i, span: 1 });
        cur = m;
      }
    });
    if (g.length) g[g.length - 1].span = days.length - g[g.length - 1].start;
    return g;
  }, [days]);

  const [popStart, setPopStart] = useState('');
  const [popEnd, setPopEnd] = useState('');

  const handleDoubleClick = (task: any) => {
    setPopover(task);
    setPopStart(task.dateStart || '');
    setPopEnd(task.dateEnd || '');
  };

  const applyPopover = () => {
    if (popover && popStart && popEnd) {
      const s = popStart <= popEnd ? popStart : popEnd;
      const e = popStart <= popEnd ? popEnd : popStart;
      updateTaskDates(popover.id, s, e);
      setPopover(null);
    }
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => shiftDays(-Math.round(viewDays / 2))} style={{ padding: '5px 10px', border: '1px solid ' + bdr, borderRadius: 8, background: 'transparent', color: txt, cursor: 'pointer', fontSize: '0.8rem' }}>{'<<'}</button>
        <button onClick={() => shiftDays(-7)} style={{ padding: '5px 10px', border: '1px solid ' + bdr, borderRadius: 8, background: 'transparent', color: txt, cursor: 'pointer', fontSize: '0.8rem' }}>{'<'}</button>
        <button onClick={goToday} style={{ padding: '5px 12px', border: 'none', borderRadius: 8, background: '#4361ee', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Aujourd'hui</button>
        <button onClick={() => shiftDays(7)} style={{ padding: '5px 10px', border: '1px solid ' + bdr, borderRadius: 8, background: 'transparent', color: txt, cursor: 'pointer', fontSize: '0.8rem' }}>{'>'}</button>
        <button onClick={() => shiftDays(Math.round(viewDays / 2))} style={{ padding: '5px 10px', border: '1px solid ' + bdr, borderRadius: 8, background: 'transparent', color: txt, cursor: 'pointer', fontSize: '0.8rem' }}>{'>>'}</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))} style={{ padding: '4px 8px', border: '1px solid ' + bdr, borderRadius: 6, background: 'transparent', color: txt, cursor: 'pointer' }}>-</button>
          <span style={{ fontSize: '0.75rem', color: muted, minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} style={{ padding: '4px 8px', border: '1px solid ' + bdr, borderRadius: 6, background: 'transparent', color: txt, cursor: 'pointer' }}>+</button>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, fontSize: '0.68rem' }}>
          {[{ label: 'Fait', color: '#2ec4b6' }, { label: 'A faire', color: '#4361ee' }, { label: 'Urgent', color: '#f4a261' }, { label: 'Retard', color: '#e63946' }].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
              <span style={{ color: muted }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div
        ref={scrollRef}
        onWheel={onWheel}
        style={{ background: card, borderRadius: 14, border: '1px solid ' + bdr, overflow: 'auto', position: 'relative' }}
      >
        <div style={{ display: 'flex', minWidth: LEFT_W + viewDays * dayW }}>
          {/* Left column - labels */}
          <div style={{ width: LEFT_W, flexShrink: 0, borderRight: '1px solid ' + bdr, position: 'sticky', left: 0, zIndex: 10, background: card }}>
            {/* Header spacer */}
            <div style={{ height: 50, borderBottom: '1px solid ' + bdr }} />
            {rows.map((row, i) => (
              <div
                key={i}
                style={{
                  height: ROW_H,
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid ' + bdr,
                  fontSize: row.type === 'workspace' ? '0.78rem' : row.type === 'category' ? '0.72rem' : '0.72rem',
                  fontWeight: row.type !== 'task' ? 700 : 400,
                  color: row.type === 'workspace' ? '#4361ee' : row.type === 'category' ? muted : txt,
                  background: row.type === 'workspace' ? (dark ? '#1a1a3e' : '#f0f2ff') : 'transparent',
                  paddingLeft: row.type === 'task' ? 20 : row.type === 'category' ? 14 : 10,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {row.type === 'task' && row.task && (
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: STATUS_COLORS[row.task.status as keyof typeof STATUS_COLORS]?.border || '#aaa',
                    marginRight: 6, flexShrink: 0,
                  }} />
                )}
                {row.label}
              </div>
            ))}
          </div>

          {/* Right area - timeline */}
          <div style={{ flex: 1, position: 'relative' }}>
            {/* Month + day headers */}
            <div style={{ position: 'sticky', top: 0, zIndex: 5, background: card }}>
              <div style={{ display: 'flex', height: 24, borderBottom: '1px solid ' + bdr }}>
                {monthGroups.map((mg) => (
                  <div key={mg.start} style={{ width: mg.span * dayW, fontSize: '0.7rem', fontWeight: 600, color: '#4361ee', textTransform: 'capitalize', padding: '4px 8px', borderRight: '1px solid ' + bdr, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {mg.label}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', height: 26, borderBottom: '1px solid ' + bdr }}>
                {days.map((d, i) => {
                  const isT = i === todayOff;
                  const isWE = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div key={i} style={{
                      width: dayW, fontSize: '0.6rem', textAlign: 'center', padding: '3px 0',
                      background: isT ? 'rgba(67,97,238,0.15)' : isWE ? (dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)') : 'transparent',
                      color: isT ? '#4361ee' : muted, fontWeight: isT ? 700 : 400,
                      borderRight: '1px solid ' + bdr,
                    }}>
                      {d.getDate()}
                      {zoom >= 1 && <div style={{ fontSize: '0.5rem' }}>{['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'][d.getDay()]}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task bars */}
            {rows.map((row, i) => {
              if (row.type !== 'task' || !row.task) {
                return (
                  <div key={i} style={{
                    height: ROW_H, borderBottom: '1px solid ' + bdr,
                    background: row.type === 'workspace' ? (dark ? '#1a1a3e' : '#f0f2ff') : 'transparent',
                  }} />
                );
              }

              const t = row.task;
              const startOff = offIso(t.dateStart);
              const endOff = offIso(t.dateEnd);
              const barLeft = startOff * dayW;
              const barWidth = Math.max((endOff - startOff + 1) * dayW, dayW);

              const statusColor = t.status === 'fait' ? '#2ec4b6' : t.status === 'en_cours' ? '#f4a261' : '#4361ee';
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const isOverdue = t.dateEnd && new Date(t.dateEnd + 'T00:00:00') < now && t.status !== 'fait';
              const barColor = isOverdue ? '#e63946' : statusColor;

              return (
                <div key={i} style={{ height: ROW_H, position: 'relative', borderBottom: '1px solid ' + bdr }}>
                  {/* Weekend backgrounds */}
                  {days.map((d, di) => {
                    if (d.getDay() === 0 || d.getDay() === 6) {
                      return <div key={di} style={{ position: 'absolute', left: di * dayW, top: 0, width: dayW, height: ROW_H, background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }} />;
                    }
                    return null;
                  })}

                  <div
                    style={{
                      position: 'absolute',
                      left: barLeft,
                      top: 6,
                      width: barWidth,
                      height: 20,
                      borderRadius: 5,
                      background: barColor,
                      boxShadow: `0 2px 6px ${barColor}55`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                    onDoubleClick={() => handleDoubleClick(t)}
                    onMouseEnter={(e) => setTip({ task: t, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTip(null)}
                  >
                    {zoom >= 0.9 && barWidth > 50 && (
                      <span style={{ fontSize: '0.58rem', color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>
                        {t.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Today line */}
            {todayOff >= 0 && todayOff < viewDays && (
              <div style={{
                position: 'absolute', left: todayOff * dayW + dayW / 2, top: 50, bottom: 0,
                width: 2, background: '#4361ee44', zIndex: 4, pointerEvents: 'none',
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tip && (
        <div style={{
          position: 'fixed', zIndex: 5000,
          top: tip.y + 12, left: tip.x + 12,
          background: card, border: '1px solid ' + bdr, borderRadius: 10,
          padding: '10px 14px', boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
          maxWidth: 280, pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: txt, marginBottom: 4 }}>{tip.task.label}</div>
          <div style={{ fontSize: '0.68rem', color: muted, marginBottom: 4 }}>{tip.task.wsName} - {tip.task.catName}</div>
          <div style={{ fontSize: '0.72rem', color: txt }}>
            {formatDateFr(tip.task.dateStart)} → {formatDateFr(tip.task.dateEnd)}
          </div>
        </div>
      )}

      {/* Date edit popover */}
      {popover && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }} onClick={() => setPopover(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: card, borderRadius: 14, padding: '20px 22px', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', minWidth: 300, maxWidth: 340 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#4361ee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{popover.label}</span>
              <button onClick={() => setPopover(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, fontSize: '1.2rem' }}>×</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: muted, marginBottom: 6 }}>Duree rapide</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[[1, '1 j'], [3, '3 j'], [5, '1 sem'], [10, '2 sem'], [20, '1 mois']].map(([d, l]) => (
                  <button key={d as number} onClick={() => {
                    const s = popStart || new Date().toISOString().slice(0, 10);
                    setPopStart(s);
                    const end = new Date(s + 'T00:00:00');
                    end.setDate(end.getDate() + (d as number) - 1);
                    setPopEnd(end.toISOString().slice(0, 10));
                  }} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid ' + bdr, background: 'transparent', color: txt, cursor: 'pointer', fontSize: '0.74rem' }}>
                    {l as string}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 3 }}>Debut</label>
                <input type="date" value={popStart} onChange={(e) => { setPopStart(e.target.value); if (e.target.value > popEnd) setPopEnd(e.target.value); }} style={{ width: '100%', padding: '7px 9px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.8rem', background: dark ? '#1e2a4a' : 'white', color: txt, boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 3 }}>Fin</label>
                <input type="date" value={popEnd} onChange={(e) => { setPopEnd(e.target.value); if (e.target.value < popStart) setPopStart(e.target.value); }} style={{ width: '100%', padding: '7px 9px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.8rem', background: dark ? '#1e2a4a' : 'white', color: txt, boxSizing: 'border-box', outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={applyPopover} style={{ flex: 1, padding: '9px 0', background: '#4361ee', color: 'white', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem' }}>Appliquer</button>
              <button onClick={() => setPopover(null)} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid ' + bdr, borderRadius: 9, cursor: 'pointer', color: muted, fontSize: '0.84rem' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
