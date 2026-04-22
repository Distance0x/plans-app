import { create } from 'zustand';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  parentId?: string;
  orderIndex: number;
  estimatedPomodoros: number;
  actualPomodoros: number;
}

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;

  // 操作
  fetchTasks: (filters?: any) => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  searchTasks: (query: string) => Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

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
      const task = await window.electron.task.create(data);
      set((state) => ({
        tasks: [...state.tasks, task],
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateTask: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      if (!window.electron) {
        throw new Error('Electron API not available');
      }
      const updated = await window.electron.task.update(id, updates);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
        loading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
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
