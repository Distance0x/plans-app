import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ReminderChannel = 'notification' | 'sound' | 'both';

interface SettingsState {
  theme: ThemeMode;
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  pomodorosUntilLongBreak: number;
  defaultReminderOffsets: number[];
  defaultReminderChannel: ReminderChannel;
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
  defaultReminderOffsets: [15],
  defaultReminderChannel: 'notification',
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
      defaultReminderOffsets: Array.isArray(settings.defaultReminderOffsets)
        ? settings.defaultReminderOffsets.map(Number).filter((value: number) => Number.isFinite(value))
        : get().defaultReminderOffsets,
      defaultReminderChannel: ['notification', 'sound', 'both'].includes(settings.defaultReminderChannel)
        ? settings.defaultReminderChannel
        : get().defaultReminderChannel,
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
      defaultReminderOffsets: Array.isArray(next.defaultReminderOffsets)
        ? next.defaultReminderOffsets.map(Number).filter((value: number) => Number.isFinite(value))
        : get().defaultReminderOffsets,
      defaultReminderChannel: ['notification', 'sound', 'both'].includes(next.defaultReminderChannel)
        ? next.defaultReminderChannel
        : get().defaultReminderChannel,
    });
  },
}));
