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
  listId?: string | null;
  orderIndex: number;
  estimatedPomodoros: number;
  actualPomodoros: number;
  notes?: string | null;
  attachments?: string | null;
  recurrenceRule?: string | null;
  recurrenceParentId?: string | null;
  recurrenceCount?: number;
  tags?: Tag[];
}

export interface TaskInput extends Omit<Partial<Task>, 'attachments'> {
  attachments?: string[] | string | null;
  reminderAt?: string;
  reminderOffsets?: number[];
  reminderChannel?: 'notification' | 'sound' | 'both';
  tagIds?: string[];
}

export interface TaskList {
  id: string;
  name: string;
  color?: string | null;
  orderIndex?: number;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string | null;
  createdAt: string;
}

interface TaskStore {
  tasks: Task[];
  lists: TaskList[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
  focusedTaskId: string | null;

  // 操作
  setFocusedTask: (id: string | null) => void;
  fetchTasks: (filters?: any) => Promise<void>;
  fetchLists: () => Promise<void>;
  createList: (data: Partial<TaskList>) => Promise<TaskList | null>;
  deleteList: (id: string) => Promise<boolean>;
  fetchTags: () => Promise<void>;
  createTag: (data: Partial<Tag>) => Promise<Tag | null>;
  setTaskTags: (taskId: string, tagIds: string[]) => Promise<void>;
  createTask: (data: TaskInput) => Promise<Task | null>;
  updateTask: (id: string, updates: TaskInput) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  searchTasks: (query: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  lists: [],
  tags: [],
  loading: false,
  error: null,
  focusedTaskId: null,

  setFocusedTask: (id) => set({ focusedTaskId: id }),

  fetchLists: async () => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const lists = await window.electron.list.list();
      set({ lists });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  createList: async (data) => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const list = await window.electron.list.create(data);
      set((state) => ({ lists: [...state.lists, list] }));
      return list;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  deleteList: async (id) => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      await window.electron.list.delete(id);
      set((state) => ({
        lists: state.lists.filter((list) => list.id !== id),
        tasks: state.tasks.map((task) =>
          (task.listId || 'inbox') === id ? { ...task, listId: 'inbox' } : task
        ),
      }));
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    }
  },

  fetchTags: async () => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const tags = await window.electron.tag.list();
      set({ tags });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  createTag: async (data) => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const tag = await window.electron.tag.create(data);
      set((state) => ({
        tags: state.tags.some((item) => item.id === tag.id) ? state.tags : [...state.tags, tag],
      }));
      return tag;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  setTaskTags: async (taskId, tagIds) => {
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      await window.electron.tag.setTaskTags(taskId, tagIds);
      await get().fetchTasks();
    } catch (error: any) {
      set({ error: error.message });
    }
  },

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
      const { reminderAt, reminderOffsets, reminderChannel, ...taskData } = data;
      const task = await window.electron.task.create(taskData);

      for (const reminder of getReminderRequests({ ...data, reminderAt, reminderOffsets })) {
        await window.electron.reminder.create(
          task.id,
          reminder.triggerAt,
          reminder.type,
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
      const { reminderAt, reminderOffsets, reminderChannel, ...taskUpdates } = updates;
      const updated = await window.electron.task.update(id, taskUpdates);

      if (
        'reminderAt' in updates ||
        'reminderOffsets' in updates ||
        'dueDate' in updates ||
        'dueTime' in updates
      ) {
        await window.electron.reminder.cancelTask(id);

        for (const reminder of getReminderRequests({
          ...updated,
          ...updates,
          reminderAt,
          reminderOffsets,
        })) {
          await window.electron.reminder.create(
            id,
            reminder.triggerAt,
            reminder.type,
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
    await get().updateTask(id, { status: newStatus });
    await get().fetchTasks();
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

if (window.electron) {
  window.electron.on('tasks:changed', () => {
    void useTaskStore.getState().fetchTasks();
  });

  window.electron.on('lists:changed', () => {
    void useTaskStore.getState().fetchLists();
  });

  window.electron.on('tags:changed', () => {
    void useTaskStore.getState().fetchTags();
  });
}

function getReminderRequests(data: TaskInput) {
  const requests: Array<{ triggerAt: string; type: 'due' | 'before_due' | 'custom' }> = [];
  const seen = new Set<string>();

  if (data.dueDate && data.dueTime) {
    const dueAt = new Date(`${data.dueDate}T${data.dueTime}`);
    if (!Number.isNaN(dueAt.getTime())) {
      const offsets = data.reminderOffsets ?? [15];
      for (const offsetMinutes of offsets) {
        const triggerAt = new Date(dueAt.getTime() - offsetMinutes * 60_000);
        if (triggerAt.getTime() <= Date.now()) continue;

        const iso = triggerAt.toISOString();
        if (seen.has(iso)) continue;

        seen.add(iso);
        requests.push({
          triggerAt: iso,
          type: offsetMinutes === 0 ? 'due' : 'before_due',
        });
      }
    }
  }

  if (data.reminderAt) {
    const customAt = new Date(data.reminderAt);
    if (!Number.isNaN(customAt.getTime()) && customAt.getTime() > Date.now()) {
      const iso = customAt.toISOString();
      if (!seen.has(iso)) {
        requests.push({
          triggerAt: iso,
          type: 'custom',
        });
      }
    }
  }

  return requests;
}
