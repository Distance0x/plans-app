import { create } from 'zustand';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate?: string;
  dueTime?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  parentId?: string | null;
  orderIndex: number;
  estimatedPomodoros: number;
  actualPomodoros: number;
  notes?: string | null;
  attachments?: string | null;
  recurrenceRule?: string | null;
  recurrenceParentId?: string | null;
  recurrenceCount?: number;
}

export interface TaskInput extends Omit<Partial<Task>, 'attachments'> {
  attachments?: string[] | string | null;
  reminderAt?: string;
  reminderChannel?: 'notification' | 'sound' | 'both';
}

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  focusedTaskId: string | null;

  // 操作
  setFocusedTask: (id: string | null) => void;
  fetchTasks: (filters?: any) => Promise<void>;
  createTask: (data: TaskInput) => Promise<Task | null>;
  updateTask: (id: string, updates: TaskInput) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  searchTasks: (query: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  focusedTaskId: null,

  setFocusedTask: (id) => set({ focusedTaskId: id }),

  fetchTasks: async (filters) => {
    set({ loading: true, error: null });
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const tasks = await window.electron.task.list(filters);
      set({ tasks, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createTask: async (data) => {
    set({ loading: true, error: null });
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const { reminderAt, reminderChannel, ...taskData } = data;
      const task = await window.electron.task.create(taskData);
      const effectiveReminderAt = reminderAt || getDefaultReminderAt(data);

      if (effectiveReminderAt) {
        await window.electron.reminder.create(
          task.id,
          new Date(effectiveReminderAt).toISOString(),
          reminderAt ? 'custom' : 'before_due',
          reminderChannel || 'notification'
        );
      }

      set((state) => ({
        tasks: [...state.tasks, task],
        loading: false,
      }));
      return task;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  updateTask: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const { reminderAt, reminderChannel, ...taskUpdates } = updates;
      const updated = await window.electron.task.update(id, taskUpdates);

      if ('reminderAt' in updates || 'dueDate' in updates || 'dueTime' in updates) {
        await window.electron.reminder.cancelTask(id);
        const effectiveReminderAt = reminderAt || getDefaultReminderAt({
          ...updated,
          ...updates,
        });

        if (effectiveReminderAt) {
          await window.electron.reminder.create(
            id,
            new Date(effectiveReminderAt).toISOString(),
            reminderAt ? 'custom' : 'before_due',
            reminderChannel || 'notification'
          );
        }
      }

      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        loading: false,
      }));
      return updated;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  deleteTask: async (id) => {
    set({ loading: true, error: null });
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      await window.electron.task.delete(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    const updated = await get().updateTask(id, { status: newStatus });

    if (updated?.parentId) {
      await get().fetchTasks();
    }
  },

  searchTasks: async (query) => {
    set({ loading: true, error: null });
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const tasks = await window.electron.task.search(query);
      set({ tasks, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));

function getDefaultReminderAt(data: TaskInput) {
  if (!data.dueDate || !data.dueTime) return '';

  const dueAt = new Date(`${data.dueDate}T${data.dueTime}`);
  if (Number.isNaN(dueAt.getTime())) return '';

  const triggerAt = new Date(dueAt.getTime() - 15 * 60 * 1000);
  if (triggerAt.getTime() <= Date.now()) return '';

  const offsetMs = triggerAt.getTimezoneOffset() * 60_000;
  return new Date(triggerAt.getTime() - offsetMs).toISOString().slice(0, 16);
}
