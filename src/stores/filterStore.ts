import { create } from 'zustand';
import type { ViewType, TaskStatus } from '../lib/types';

interface FilterState {
  view: ViewType;
  personFilter: string | null;
  statusFilter: TaskStatus | null;
  search: string;
  sidebarCollapsed: boolean;
  darkMode: boolean;
  showHistory: boolean;

  setView: (view: ViewType) => void;
  setPersonFilter: (person: string | null) => void;
  setStatusFilter: (status: TaskStatus | null) => void;
  setSearch: (search: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleDarkMode: () => void;
  setShowHistory: (show: boolean) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  view: 'tasks',
  personFilter: null,
  statusFilter: null,
  search: '',
  sidebarCollapsed: false,
  darkMode: (() => {
    try {
      return localStorage.getItem('cemedis-dark-mode') === 'true';
    } catch {
      return false;
    }
  })(),
  showHistory: false,

  setView: (view) => set({ view }),
  setPersonFilter: (person) => set({ personFilter: person }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setSearch: (search) => set({ search }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleDarkMode: () => set((state) => {
    const next = !state.darkMode;
    try { localStorage.setItem('cemedis-dark-mode', String(next)); } catch {}
    return { darkMode: next };
  }),
  setShowHistory: (show) => set({ showHistory: show }),
}));
