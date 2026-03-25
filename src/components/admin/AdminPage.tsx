import React, { useState } from 'react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { useFilterStore } from '../../stores/filterStore';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../ui/Avatar';
import { SeedButton } from './SeedButton';
import type { UserRole } from '../../lib/types';

export function AdminPage() {
  const { users, setUsers } = useWorkspaceStore();
  const { user: currentUser } = useAuthStore();
  const { darkMode } = useFilterStore();
  const dark = darkMode;

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

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: card, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#4361ee' }}>Gestion des utilisateurs</h3>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Avatar</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Nom</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Email</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Rôle</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Couleur</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Initiales</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', color: muted, fontWeight: 600, borderBottom: '2px solid ' + bdr }}>Actif</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const isSA = u.role === 'superadmin';
              const canEdit = !isSA || isSuperadmin;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid ' + bdr }}>
                  <td style={{ padding: '8px 10px' }}>
                    <Avatar name={u.name} initials={u.initials} color={u.color} size={32} />
                  </td>
                  <td style={{ padding: '8px 10px', color: txt, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: '8px 10px', color: muted, fontSize: '0.75rem' }}>{u.email}</td>
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
    </div>
  );
}
