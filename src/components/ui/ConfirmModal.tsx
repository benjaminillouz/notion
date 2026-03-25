import React from 'react';

interface ConfirmModalProps {
  title?: string;
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
  dark?: boolean;
}

export function ConfirmModal({ title = 'Supprimer cette tâche ?', label, onConfirm, onCancel, dark }: ConfirmModalProps) {
  const card = dark ? '#16213e' : 'white';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: card,
          borderRadius: 14,
          padding: '24px 28px',
          maxWidth: 380,
          width: '90%',
          boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        }}
      >
        <div style={{ fontSize: '1.5rem', marginBottom: 10, textAlign: 'center' }}>🗑️</div>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: txt, marginBottom: 6, textAlign: 'center' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.82rem', color: muted, marginBottom: 20, textAlign: 'center', wordBreak: 'break-word' }}>
          "{label}"
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 0',
              background: '#e63946',
              color: 'white',
              border: 'none',
              borderRadius: 9,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Supprimer
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'transparent',
              border: '1px solid ' + bdr,
              borderRadius: 9,
              cursor: 'pointer',
              color: muted,
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
