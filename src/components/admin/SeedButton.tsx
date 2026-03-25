import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { SEED_DATA, USERS_SEED, statusToEnum, parseRecurrence } from '../../data/seed';

interface SeedButtonProps {
  dark: boolean;
}

export function SeedButton({ dark }: SeedButtonProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  const card = dark ? '#16213e' : 'white';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';

  const handleSeed = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      // Get existing users to map names to IDs
      const { data: existingUsers } = await supabase.from('users').select('id, name');
      const userMap: Record<string, string> = {};
      (existingUsers || []).forEach((u: any) => { userMap[u.name] = u.id; });

      for (let wsIdx = 0; wsIdx < SEED_DATA.length; wsIdx++) {
        const wsData = SEED_DATA[wsIdx];

        // Create workspace
        const { data: ws, error: wsErr } = await supabase.from('workspaces').insert({
          name: wsData.name,
          description: wsData.description || null,
          sort_order: wsIdx,
          is_template: wsData.isTemplate || false,
          created_by: user.id,
        }).select().single();

        if (wsErr || !ws) { setError('Erreur workspace: ' + (wsErr?.message || 'unknown')); continue; }

        for (let catIdx = 0; catIdx < wsData.categories.length; catIdx++) {
          const catData = wsData.categories[catIdx];

          // Create category
          const { data: cat, error: catErr } = await supabase.from('categories').insert({
            workspace_id: ws.id,
            name: catData.name,
            sort_order: catIdx,
          }).select().single();

          if (catErr || !cat) continue;

          for (let taskIdx = 0; taskIdx < catData.tasks.length; taskIdx++) {
            const taskData = catData.tasks[taskIdx];
            const { recurrence, hint, note } = parseRecurrence(taskData.comment);

            // Handle "Equipe" in people
            const isEquipe = taskData.people.includes('Equipe');
            const realPeople = taskData.people.filter((p) => p !== 'Equipe');
            const taskNote = isEquipe
              ? (note ? note + ' | Équipe' : 'Équipe')
              : note;

            const { data: task, error: taskErr } = await supabase.from('tasks').insert({
              category_id: cat.id,
              label: taskData.label,
              status: statusToEnum(taskData.status),
              deadline: taskData.deadline || null,
              note: taskNote,
              recurrence,
              recurrence_hint: hint,
              sort_order: taskIdx,
              depth: 0,
              created_by: user.id,
            }).select().single();

            if (taskErr || !task) continue;

            // Create assignees for real people
            const assigneeRows = realPeople
              .filter((name) => userMap[name])
              .map((name) => ({
                task_id: task.id,
                user_id: userMap[name],
              }));

            if (assigneeRows.length > 0) {
              await supabase.from('task_assignees').insert(assigneeRows);
            }
          }
        }
      }

      setDone(true);
      setConfirm(false);
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ background: card, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ color: '#2ec4b6', fontWeight: 600, fontSize: '0.9rem' }}>
          ✅ Données initiales importées avec succès. Rechargez la page pour voir les changements.
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: card, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#4361ee' }}>Importer les données initiales</h3>
      <p style={{ fontSize: '0.8rem', color: muted, margin: '0 0 16px' }}>
        Cette action crée tous les workspaces, catégories et tâches depuis le jeu de données initial.
        Les assignees seront mappés vers les utilisateurs existants par nom.
      </p>

      {error && <div style={{ color: '#e63946', fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>}

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          style={{
            padding: '10px 20px',
            background: '#4361ee',
            color: 'white',
            border: 'none',
            borderRadius: 9,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.88rem',
          }}
        >
          Importer les données initiales
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSeed}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#adb5bd' : '#e63946',
              color: 'white',
              border: 'none',
              borderRadius: 9,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            {loading ? 'Import en cours...' : 'Confirmer l\'import'}
          </button>
          <button
            onClick={() => setConfirm(false)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid ' + bdr,
              borderRadius: 9,
              cursor: 'pointer',
              color: muted,
              fontSize: '0.88rem',
            }}
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
