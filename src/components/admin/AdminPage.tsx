import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useFilterStore } from '../../stores/filterStore';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { SeedButton } from './SeedButton';
import type { UserRole, User } from '../../lib/types';

const DEFAULT_COLORS = ['#4361ee', '#2ec4b6', '#f4a261', '#e63946', '#7209b7', '#06d6a0', '#118ab2', '#ff6b6b', '#845ef7', '#20c997'];

function isGoogleOrCemedisEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return domain === 'gmail.com' || domain === 'googlemail.com' || domain.endsWith('cemedis.fr');
}

function generateInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'XX';
}

interface CreateUserModalProps {
  dark: boolean;
  onClose: () => void;
  onCreated: (user: User) => void;
  existingCount: number;
}

function CreateUserModal({ dark, onClose, onCreated, existingCount }: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [color, setColor] = useState(DEFAULT_COLORS[existingCount % DEFAULT_COLORS.length]);
  const [initials, setInitials] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const card = dark ? '#16213e' : 'white';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';

  const isOAuth = isGoogleOrCemedisEmail(email);
  const computedInitials = initials || generateInitials(name);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Nom et email sont requis.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Direct insert - table has no FK to auth.users
      const { data, error: insertErr } = await supabase.from('users').insert({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        initials: computedInitials,
        color,
        role,
        is_active: true,
      }).select().single();

      if (insertErr) {
        if (insertErr.message?.includes('duplicate') || insertErr.message?.includes('unique')) {
          setError('Un utilisateur avec cet email existe déjà.');
        } else {
          setError(insertErr.message || 'Erreur lors de la création.');
        }
        setLoading(false);
        return;
      }

      if (data) {
        onCreated(data as User);
        onClose();
      }
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: card, borderRadius: 18, padding: 28, maxWidth: 460, width: '92%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <h3 style={{ margin: '0 0 16px', color: '#4361ee', fontSize: '1rem' }}>Nouvel utilisateur</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Nom complet *</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (!initials) setInitials(''); }}
              autoFocus
              placeholder="ex: Florian Dupont"
              style={{ width: '100%', padding: '9px 12px', border: '2px solid #4361ee', borderRadius: 8, fontSize: '0.85rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Email *</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="ex: florian@cemedis.fr"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.85rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none', boxSizing: 'border-box' }}
            />
            {email && (
              <div style={{ marginTop: 4, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                {isOAuth ? (
                  <>
                    <span style={{ color: '#2ec4b6' }}>●</span>
                    <span style={{ color: '#2ec4b6' }}>Connexion Google OAuth automatique</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#f4a261' }}>●</span>
                    <span style={{ color: '#f4a261' }}>Email non Google/CEMEDIS — l'utilisateur devra se connecter via un compte Google associé</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.82rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none' }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Initiales</label>
              <input
                value={initials || computedInitials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.82rem', background: dark ? '#1e2a4a' : 'white', color: txt, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: muted, display: 'block', marginBottom: 4 }}>Couleur</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 36, height: 30, border: 'none', cursor: 'pointer', background: 'transparent' }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                {DEFAULT_COLORS.map((c) => (
                  <div
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: color === c ? '2px solid white' : '2px solid transparent',
                      boxShadow: color === c ? '0 0 0 2px ' + c : 'none',
                    }}
                  />
                ))}
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <Avatar name={name || 'XX'} initials={computedInitials} color={color} size={36} />
              </div>
            </div>
          </div>
        </div>

        {error && <div style={{ color: '#e63946', fontSize: '0.78rem', marginTop: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !email.trim()}
            style={{
              flex: 1, padding: '10px 0',
              background: loading || !name.trim() || !email.trim() ? '#adb5bd' : '#4361ee',
              color: 'white', border: 'none', borderRadius: 9,
              cursor: loading || !name.trim() || !email.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '0.88rem',
            }}
          >
            {loading ? 'Création...' : 'Créer l\'utilisateur'}
          </button>
          <button
            onClick={onClose}
            style={{ padding: '10px 18px', background: 'transparent', border: '1px solid ' + bdr, borderRadius: 9, cursor: 'pointer', color: muted, fontSize: '0.88rem' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { users, setUsers } = useWorkspaceStore();
  const { user: currentUser } = useAuthStore();
  const { darkMode } = useFilterStore();
  const dark = darkMode;
  const [showCreateUser, setShowCreateUser] = useState(false);

  const card = dark ? '#16213e' : 'white';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';

  const isSuperadmin = currentUser?.role === 'superadmin';
  const isAdmin = currentUser?.role === 'admin' || isSuperadmin;

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: muted }}>
        Accès réservé aux administrateurs.
      </div>
    );
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isSuperadmin && newRole === 'admin') return;
    await supabase.from('users').update({ role: newRole }).eq('id', userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
  };

  const handleColorChange = async (userId: string, color: string) => {
    await supabase.from('users').update({ color }).eq('id', userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, color } : u)));
  };

  const handleActiveToggle = async (userId: string, isActive: boolean) => {
    await supabase.from('users').update({ is_active: isActive }).eq('id', userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u)));
  };

  const handleInitialsChange = async (userId: string, initials: string) => {
    if (!initials.trim()) return;
    await supabase.from('users').update({ initials: initials.trim().toUpperCase() }).eq('id', userId);
    setUsers(users.map((u) => (u.id === userId ? { ...u, initials: initials.trim().toUpperCase() } : u)));
  };

  const handleUserCreated = (newUser: User) => {
    setUsers([...users, newUser]);
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: card, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#4361ee' }}>Gestion des utilisateurs</h3>
          <button
            onClick={() => setShowCreateUser(true)}
            style={{
              padding: '8px 16px', background: '#2ec4b6', color: 'white', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            + Nouvel utilisateur
          </button>
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Avatar</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Nom</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Email</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Auth</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Rôle</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Couleur</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Initiales</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Actif</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSA = u.role === 'superadmin';
              const oAuth = isGoogleOrCemedisEmail(u.email);
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid ' + bdr }}>
                  <td style={{ padding: '8px 10px' }}>
                    <Avatar name={u.name} initials={u.initials} color={u.color} size={32} />
                  </td>
                  <td style={{ padding: '8px 10px', color: txt, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '8px 10px', color: muted, fontSize: '0.75rem' }}>{u.email}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={{
                      fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                      background: oAuth ? '#e6f9f7' : '#fef3e6',
                      color: oAuth ? '#0d8a7e' : '#b97a2e',
                    }}>
                      {oAuth ? 'Google' : 'Manuel'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    {isSA ? (
                      <span style={{ fontSize: '0.72rem', color: '#4361ee', fontWeight: 700 }}>superadmin</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        disabled={!isSuperadmin}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid ' + bdr, fontSize: '0.75rem', background: dark ? '#1e2a4a' : 'white', color: txt, cursor: isSuperadmin ? 'pointer' : 'default' }}
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <input
                      type="color"
                      value={u.color}
                      onChange={(e) => handleColorChange(u.id, e.target.value)}
                      disabled={isSA && !isSuperadmin}
                      style={{ width: 30, height: 24, border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <input
                      defaultValue={u.initials}
                      onBlur={(e) => handleInitialsChange(u.id, e.target.value)}
                      maxLength={4}
                      disabled={isSA && !isSuperadmin}
                      style={{ width: 40, padding: '3px 6px', borderRadius: 4, border: '1px solid ' + bdr, fontSize: '0.75rem', textAlign: 'center', background: dark ? '#1e2a4a' : 'white', color: txt }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    {isSA ? (
                      <span style={{ color: '#2ec4b6' }}>✓</span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={u.is_active}
                        onChange={(e) => handleActiveToggle(u.id, e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isSuperadmin && <SeedButton dark={dark} />}

      {showCreateUser && (
        <CreateUserModal
          dark={dark}
          onClose={() => setShowCreateUser(false)}
          onCreated={handleUserCreated}
          existingCount={users.length}
        />
      )}
    </div>
  );
}
