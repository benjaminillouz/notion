import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { TaskStatus } from './types';

export const STATUS_COLORS = {
  fait: { bg: '#e6f9f7', text: '#0d8a7e', border: '#2ec4b6' },
  en_cours: { bg: '#fef3e6', text: '#b97a2e', border: '#f4a261' },
  a_faire: { bg: '#fde8ea', text: '#e63946', border: '#e63946' },
} as const;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  fait: 'Fait',
  en_cours: 'En cours',
  a_faire: 'A faire',
};

export function statusFromLabel(label: string): TaskStatus {
  const l = label.toLowerCase().trim();
  if (l === 'fait') return 'fait';
  if (l === 'en cours') return 'en_cours';
  return 'a_faire';
}

export function formatDateFr(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return '';
    return format(d, 'dd MMM', { locale: fr });
  } catch {
    return '';
  }
}

export function formatDateFullFr(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return '';
    return format(d, 'dd/MM/yyyy', { locale: fr });
  } catch {
    return '';
  }
}

export function isOverdue(deadline: string | null, status: TaskStatus): boolean {
  if (!deadline || status === 'fait') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseISO(deadline);
  return d < today;
}

export function isDueSoon(deadline: string | null, status: TaskStatus): boolean {
  if (!deadline || status === 'fait') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = parseISO(deadline);
  const diff = differenceInDays(d, today);
  return diff >= 0 && diff <= 3;
}

export function durationLabel(start: string | null, end: string | null): string | null {
  if (!start || !end || start > end) return null;
  const days = differenceInDays(parseISO(end), parseISO(start)) + 1;
  return days + 'j';
}

export function cycleStatus(current: TaskStatus): TaskStatus {
  if (current === 'a_faire') return 'en_cours';
  if (current === 'en_cours') return 'fait';
  return 'a_faire';
}

export function nowStr(): string {
  const d = new Date();
  return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return format(d, 'yyyy-MM-dd');
}
