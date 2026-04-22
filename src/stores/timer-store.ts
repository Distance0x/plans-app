import { create } from 'zustand';

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  sessionType: 'work' | 'short_break' | 'long_break';
  remainingTime: number;
  totalTime: number;
  currentTaskId: string | null;
  completedPomodoros: number;
}

interface TimerStore extends TimerState {
  start: (taskId?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reset: () => Promise<void>;
  skip: () => Promise<void>;
  fetchStatus: () => Promise<void>;
}

export const useTimerStore = create<TimerStore>((set) => ({
  isRunning: false,
  isPaused: false,
  sessionType: 'work',
  remainingTime: 1500,
  totalTime: 1500,
  currentTaskId: null,
  completedPomodoros: 0,

  start: async (taskId) => {
    if (!window.electron) return;
    const state = await window.electron.timer.start(taskId);
    set(state as Partial<TimerStore>);
  },

  pause: async () => {
    if (!window.electron) return;
    const state = await window.electron.timer.pause();
    set(state as Partial<TimerStore>);
  },

  resume: async () => {
    if (!window.electron) return;
    const state = await window.electron.timer.resume();
    set(state as Partial<TimerStore>);
  },

  reset: async () => {
    if (!window.electron) return;
    const state = await window.electron.timer.reset();
    set(state as Partial<TimerStore>);
  },

  skip: async () => {
    if (!window.electron) return;
    const state = await window.electron.timer.skip();
    set(state as Partial<TimerStore>);
  },

  fetchStatus: async () => {
    if (!window.electron) return;
    const state = await window.electron.timer.status();
    set(state as Partial<TimerStore>);
  },
}));

// 监听计时器更新
if (window.electron) {
  window.electron.on('timer:tick', (state: TimerState) => {
    useTimerStore.setState(state);
  });

  window.electron.on('timer:complete', (state: TimerState) => {
    useTimerStore.setState(state);
    // 可以在这里添加通知
  });
}
