import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: ThemeMode;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  pomodorosUntilLongBreak: number;
  loading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Omit<SettingsState, 'loading' | 'loadSettings' | 'updateSettings'>>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'light',
  workDuration: 1500,
  shortBreakDuration: 300,
  longBreakDuration: 1800,
  pomodorosUntilLongBreak: 4,
  loading: false,

  loadSettings: async () => {
    if (!window.electron) return;

    set({ loading: true });
    const settings = await window.electron.settings.get();
    set({
      theme: settings.theme || 'light',
      workDuration: Number(settings.workDuration) || get().workDuration,
      shortBreakDuration: Number(settings.shortBreakDuration) || get().shortBreakDuration,
      longBreakDuration: Number(settings.longBreakDuration) || get().longBreakDuration,
      pomodorosUntilLongBreak: Number(settings.pomodorosUntilLongBreak) || get().pomodorosUntilLongBreak,
      loading: false,
    });
  },

  updateSettings: async (updates) => {
    if (!window.electron) return;

    const next = await window.electron.settings.update(updates);
    set({
      theme: next.theme || get().theme,
      workDuration: Number(next.workDuration) || get().workDuration,
      shortBreakDuration: Number(next.shortBreakDuration) || get().shortBreakDuration,
      longBreakDuration: Number(next.longBreakDuration) || get().longBreakDuration,
      pomodorosUntilLongBreak: Number(next.pomodorosUntilLongBreak) || get().pomodorosUntilLongBreak,
    });
  },
}));
