import React, { useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import type { Task, Comment, User } from '../../lib/types';

interface CommentThreadProps {
  task: Task;
  comments: Comment[];
  currentUser: User;
  dark: boolean;
  onAddComment: (text: string) => void;
  onDeleteComment: (id: string) => void;
  onEditNote: (note: string) => void;
}

export function CommentThread({ task, comments, currentUser, dark, onAddComment, onDeleteComment, onEditNote }: CommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(task.note || '');
  const { users } = useWorkspaceStore();

  const bg = dark ? '#1e2a4a' : '#f8f9fa';
  const txt = dark ? '#e0e0e0' : '#212529';
  const muted = dark ? '#8888aa' : '#6c757d';
  const bdr = dark ? '#3a3a5e' : '#dee2e6';

  const getUser = (id: string) => users.find((u) => u.id === id);

  return (
    <div style={{ background: bg, borderTop: '1px solid ' + bdr, padding: '10px 14px' }}>
      {/* Note */}
      <div style={{ marginBottom: 8 }}>
        {editingNote ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') { onEditNote(noteText); setEditingNote(false); } if (e.key === 'Escape') setEditingNote(false); }}
              style={{ flex: 1, padding: '5px 8px', border: '1px solid ' + bdr, borderRadius: 6, fontSize: '0.78rem', background: dark ? '#16213e' : 'white', color: txt, outline: 'none' }}
            />
            <button onClick={() => { onEditNote(noteText); setEditingNote(false); }} style={{ padding: '4px 10px', background: '#4361ee', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.72rem' }}>OK</button>
          </div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: muted, cursor: 'pointer' }} onClick={() => setEditingNote(true)}>
            <strong>Note :</strong> {task.note || <em>Cliquer pour ajouter</em>}
          </div>
        )}
      </div>

      {/* Comments */}
      {comments.map((c) => {
        const author = getUser(c.author_id);
        return (
          <div key={c.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid ' + bdr }}>
            <Avatar name={author?.name || '?'} initials={author?.initials || '??'} color={author?.color || '#aaa'} size={20} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: txt }}>{author?.name || 'Inconnu'}</span>
                <span style={{ fontSize: '0.62rem', color: muted }}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</span>
                {c.is_edited && <span style={{ fontSize: '0.58rem', color: muted }}>(modifié)</span>}
              </div>
              <div style={{ fontSize: '0.78rem', color: txt, marginTop: 2 }}>{c.text}</div>
            </div>
            {(c.author_id === currentUser.id || currentUser.role !== 'member') && (
              <button onClick={() => onDeleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e63946', fontSize: '0.7rem', alignSelf: 'flex-start' }}>×</button>
            )}
          </div>
        );
      })}

      {/* Add comment */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Ajouter un commentaire..."
          onKeyDown={(e) => { if (e.key === 'Enter' && newComment.trim()) { onAddComment(newComment); setNewComment(''); } }}
          style={{ flex: 1, padding: '6px 10px', border: '1px solid ' + bdr, borderRadius: 8, fontSize: '0.78rem', background: dark ? '#16213e' : 'white', color: txt, outline: 'none' }}
        />
        <button
          onClick={() => { if (newComment.trim()) { onAddComment(newComment); setNewComment(''); } }}
          style={{ padding: '6px 14px', background: '#4361ee', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
