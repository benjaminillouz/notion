import React, { useMemo } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useFilterStore } from '../../stores/filterStore';
import { ProgressBar } from '../ui/ProgressBar';
import { Avatar } from '../ui/Avatar';
import { STATUS_COLORS, formatDateFr, isOverdue, isDueSoon } from '../../lib/utils';

export function TransversalView() {
  const { workspaces, categories, tasks, taskAssignees, users } = useWorkspaceStore();
  const { darkMode, personFilter } = useFilterStore();
  const dark = darkMode;

  const card = dark ? '#16213e' : 'white';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';

  // Stats per workspace
  const tabStats = useMemo(() => {
    return workspaces.map((ws) => {
      const wsCats = categories.filter((c) => c.workspace_id === ws.id);
      const catIds = new Set(wsCats.map((c) => c.id));
      let allTasks = tasks.filter((t) => catIds.has(t.category_id) && !t.parent_task_id);

      if (personFilter) {
        const pu = users.find((u) => u.name === personFilter);
        if (pu) {
          const assignedIds = new Set(taskAssignees.filter((a) => a.user_id === pu.id).map((a) => a.task_id));
          allTasks = allTasks.filter((t) => assignedIds.has(t.id));
        }
      }

      const fait = allTasks.filter((t) => t.status === 'fait').length;
      const en_cours = allTasks.filter((t) => t.status === 'en_cours').length;
      const a_faire = allTasks.filter((t) => t.status === 'a_faire').length;
      const total = fait + en_cours + a_faire;
      const pct = total > 0 ? Math.round((fait / total) * 100) : 0;
      return { wsId: ws.id, wsName: ws.name, fait, en_cours, a_faire, total, pct };
    });
  }, [workspaces, categories, tasks, personFilter, taskAssignees, users]);

  // Person stats matrix
  const personStats = useMemo(() => {
    return users
      .filter((u) => u.is_active)
      .map((person) => {
        const byTab: Record<string, { fait: number; total: number }> = {};
        let totalF = 0;
        let totalAll = 0;

        workspaces.forEach((ws) => {
          const wsCats = categories.filter((c) => c.workspace_id === ws.id);
          const catIds = new Set(wsCats.map((c) => c.id));
          const wsTasks = tasks.filter((t) => catIds.has(t.category_id) && !t.parent_task_id);

          let fait = 0;
          let tot = 0;
          wsTasks.forEach((t) => {
            const assigned = taskAssignees.some((a) => a.task_id === t.id && a.user_id === person.id);
            if (!assigned) return;
            tot++;
            totalAll++;
            if (t.status === 'fait') { fait++; totalF++; }
          });

          if (tot > 0) byTab[ws.id] = { fait, total: tot };
        });

        const pct = totalAll > 0 ? Math.round((totalF / totalAll) * 100) : 0;
        return { person, byTab, totalF, totalAll, pct };
      })
      .filter((p) => p.totalAll > 0);
  }, [workspaces, categories, tasks, taskAssignees, users]);

  // Urgent/overdue tasks
  const urgentTasks = useMemo(() => {
    const result: any[] = [];
    tasks.forEach((t) => {
      if (!t.deadline || t.parent_task_id) return;
      if (!isOverdue(t.deadline, t.status) && !isDueSoon(t.deadline, t.status)) return;

      if (personFilter) {
        const pu = users.find((u) => u.name === personFilter);
        if (pu) {
          const assigned = taskAssignees.some((a) => a.task_id === t.id && a.user_id === pu.id);
          if (!assigned) return;
        }
      }

      const cat = categories.find((c) => c.id === t.category_id);
      const ws = cat ? workspaces.find((w) => w.id === cat.workspace_id) : null;
      const assigns = taskAssignees.filter((a) => a.task_id === t.id).map((a) => users.find((u) => u.id === a.user_id)).filter(Boolean);

      result.push({
        ...t,
        catName: cat?.name || '',
        wsName: ws?.name || '',
        assignedUsers: assigns,
        od: isOverdue(t.deadline, t.status),
      });
    });
    result.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
    return result;
  }, [tasks, categories, workspaces, personFilter, taskAssignees, users]);

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Section 1: Progress per workspace */}
      <div style={{ background: card, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#4361ee' }}>
          Avancement par onglet{personFilter ? ' - ' + personFilter : ''}
        </h3>
        {tabStats.map((ts) => (
          <div key={ts.wsId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ width: 160, fontSize: '0.8rem', fontWeight: 500, color: txt, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ts.wsName}
            </span>
            <ProgressBar pct={ts.pct} height={10} color={ts.pct === 100 ? '#2ec4b6' : '#4361ee'} />
            <span style={{ fontSize: '0.72rem', color: muted, width: 36, textAlign: 'right', flexShrink: 0 }}>{ts.pct}%</span>
          </div>
        ))}
      </div>

      {/* Section 2: Person x workspace matrix */}
      <div style={{ background: card, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#4361ee' }}>Matrice personnes × onglets</h3>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr, width: 100 }}>Personne</th>
              {workspaces.map((ws) => (
                <th key={ws.id} style={{ textAlign: 'center', padding: '6px 8px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr, minWidth: 90 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{ws.name}</div>
                </th>
              ))}
              <th style={{ textAlign: 'center', padding: '6px 8px', color: '#4361ee', fontWeight: 700, borderBottom: '2px solid ' + bdr, minWidth: 80 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {personStats.map((ps) => (
              <tr key={ps.person.id} style={{ borderBottom: '1px solid ' + bdr }}>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar name={ps.person.name} initials={ps.person.initials} color={ps.person.color} size={24} />
                    <span style={{ fontWeight: 600, color: txt }}>{ps.person.name}</span>
                  </div>
                </td>
                {workspaces.map((ws) => {
                  const d = ps.byTab[ws.id];
                  if (!d) return <td key={ws.id} style={{ textAlign: 'center', color: muted, padding: '8px' }}>-</td>;
                  const p = Math.round((d.fait / d.total) * 100);
                  const col = p === 100 ? STATUS_COLORS.fait : p > 0 ? STATUS_COLORS.en_cours : STATUS_COLORS.a_faire;
                  return (
                    <td key={ws.id} style={{ textAlign: 'center', padding: '6px 8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: col.bg, color: col.text, fontWeight: 600 }}>
                          {d.fait}/{d.total}
                        </span>
                        <ProgressBar pct={p} height={4} color={col.border} />
                      </div>
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center', padding: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#4361ee', fontSize: '0.8rem' }}>{ps.pct}%</span>
                  <div style={{ fontSize: '0.65rem', color: muted }}>{ps.totalF}/{ps.totalAll}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section 3: Overdue & urgent */}
      <div style={{ background: card, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#e63946' }}>Retards et urgences</h3>
        {urgentTasks.length === 0 ? (
          <p style={{ color: muted, fontSize: '0.82rem', margin: 0 }}>Aucun retard détecté.</p>
        ) : (
          urgentTasks.map((t, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background: t.od ? (dark ? '#3a1520' : '#fde8ea') : (dark ? '#3a2a10' : '#fef3e6'),
                marginBottom: 6,
              }}
            >
              <span>{t.od ? '🔴' : '🟠'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: txt }}>{t.label}</div>
                <div style={{ fontSize: '0.68rem', color: muted }}>{t.wsName} - {t.catName}</div>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {t.assignedUsers.map((u: any) => (
                  <Avatar key={u.id} name={u.name} initials={u.initials} color={u.color} size={20} />
                ))}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.od ? '#e63946' : '#b97a2e', flexShrink: 0 }}>
                {formatDateFr(t.deadline)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
