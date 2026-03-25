import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TaskListView } from './components/tasks/TaskListView';
import { TaskModal } from './components/tasks/TaskModal';
import { CalendarView } from './components/calendar/CalendarView';
import { GanttView } from './components/gantt/GanttView';
import { TransversalView } from './components/transversal/TransversalView';
import { AdminPage } from './components/admin/AdminPage';
import { useAuth } from './hooks/useAuth';
import { useWorkspaces } from './hooks/useWorkspaces';
import { useRealtime } from './hooks/useRealtime';
import { useTasks } from './hooks/useTasks';
import { useFilterStore } from './stores/filterStore';
import { useWorkspaceStore } from './stores/workspaceStore';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, signOut } = useAuth();
  const { refetch } = useWorkspaces();
  useRealtime();
  const { stats, workspaceStats } = useTasks();
  const { view, darkMode, showHistory, setShowHistory } = useFilterStore();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId, tasks, categories, comments } = useWorkspaceStore();

  const [showAddTask, setShowAddTask] = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  const dark = darkMode;
  const bg = dark ? '#1a1a2e' : '#f0f2f8';
  const txt = dark ? '#e0e0e0' : '#212529';
  const card = dark ? '#16213e' : 'white';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const muted = dark ? '#8888aa' : '#6c757d';

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Fetch activity log when history panel opens
  useEffect(() => {
    if (showHistory) {
      supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
        .then(({ data }) => {
          if (data) setActivityLog(data);
        });
    }
  }, [showHistory]);

  const onExport = () => {
    const exportData = { workspaces, categories, tasks, comments };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cemedis-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onAddWorkspace = async () => {
    const name = prompt('Nom du nouvel onglet :');
    if (!name?.trim()) return;
    await supabase.from('workspaces').insert({
      name: name.trim(),
      sort_order: workspaces.length,
      created_by: user!.id,
    });
    refetch();
  };

  const onDuplicateWorkspace = async (id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;
    const name = prompt('Nom de la copie :', 'Copie de ' + ws.name);
    if (!name?.trim()) return;

    // Create new workspace
    const { data: newWs } = await supabase.from('workspaces').insert({
      name: name.trim(),
      sort_order: workspaces.length,
      source_template_id: id,
      created_by: user!.id,
    }).select().single();

    if (!newWs) return;

    // Copy categories and tasks
    const wsCats = categories.filter((c) => c.workspace_id === id);
    for (const cat of wsCats) {
      const { data: newCat } = await supabase.from('categories').insert({
        workspace_id: newWs.id,
        name: cat.name,
        sort_order: cat.sort_order,
      }).select().single();

      if (!newCat) continue;
      const catTasks = tasks.filter((t) => t.category_id === cat.id && !t.parent_task_id);
      for (const task of catTasks) {
        await supabase.from('tasks').insert({
          category_id: newCat.id,
          label: task.label,
          status: 'a_faire',
          note: task.note,
          recurrence: task.recurrence,
          recurrence_hint: task.recurrence_hint,
          sort_order: task.sort_order,
          depth: 0,
          created_by: user!.id,
        });
      }
    }
    refetch();
  };

  const onRenameWorkspace = async (id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;
    const name = prompt('Nouveau nom :', ws.name);
    if (!name?.trim() || name === ws.name) return;
    await supabase.from('workspaces').update({ name: name.trim() }).eq('id', id);
    refetch();
  };

  const onDeleteWorkspace = async (id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (!ws) return;
    if (!confirm(`Supprimer l'onglet "${ws.name}" ?`)) return;
    await supabase.from('workspaces').delete().eq('id', id);
    if (activeWorkspaceId === id) {
      const remaining = workspaces.filter((w) => w.id !== id);
      setActiveWorkspaceId(remaining[0]?.id || null);
    }
    refetch();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: bg, color: txt, fontFamily: "'Segoe UI', -apple-system, sans-serif", fontSize: '0.85rem', overflow: 'hidden' }}>
      <Header
        stats={stats}
        onExport={onExport}
        onAddTask={() => setShowAddTask(true)}
        onSignOut={signOut}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          workspaceStats={workspaceStats}
          onAddWorkspace={onAddWorkspace}
          onDuplicateWorkspace={onDuplicateWorkspace}
          onRenameWorkspace={onRenameWorkspace}
          onDeleteWorkspace={onDeleteWorkspace}
        />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {view === 'tasks' && <TaskListView />}
          {view === 'calendar' && <CalendarView />}
          {view === 'gantt' && <GanttView />}
          {view === 'transversal' && <TransversalView />}
          {view === 'admin' && <AdminPage />}
        </div>
      </div>

      {showAddTask && (
        <TaskModal dark={dark} onClose={() => setShowAddTask(false)} />
      )}

      {showHistory && (
        <div style={{ position: 'fixed', top: 46, right: 0, width: 300, bottom: 0, background: card, boxShadow: '-4px 0 20px rgba(0,0,0,0.12)', zIndex: 999, overflowY: 'auto', padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#4361ee' }}>Historique</span>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: muted }}>×</button>
          </div>
          {activityLog.length === 0 ? (
            <p style={{ color: muted, fontSize: '0.8rem' }}>Aucune activité.</p>
          ) : (
            activityLog.map((h, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid ' + bdr, fontSize: '0.76rem' }}>
                <div style={{ fontSize: '0.66rem', color: muted }}>{new Date(h.created_at).toLocaleString('fr-FR')}</div>
                <div style={{ marginTop: 1 }}>{h.action}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { user, loading, signIn } = useAuth();
  const { darkMode } = useFilterStore();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ color: '#4361ee', fontWeight: 600 }}>Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={signIn} />;
  }

  return <AppContent />;
}
