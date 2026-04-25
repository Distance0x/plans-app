export interface ElectronAPI {
  task: {
    create: (data: any) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
    list: (filters?: any) => Promise<any[]>;
    search: (query: string) => Promise<any[]>;
  };
  list: {
    list: () => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };
  tag: {
    list: () => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
    setTaskTags: (taskId: string, tagIds: string[]) => Promise<string[]>;
  };
  savedFilter: {
    list: () => Promise<any[]>;
    create: (data: any) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };
  timer: {
    start: (taskId?: string) => Promise<any>;
    pause: () => Promise<any>;
    resume: () => Promise<any>;
    reset: () => Promise<any>;
    skip: () => Promise<any>;
    status: () => Promise<any>;
    stats: (request: any) => Promise<any>;
  };
  settings: {
    get: () => Promise<any>;
    update: (updates: any) => Promise<any>;
  };
  reminder: {
    create: (
      taskId: string,
      triggerAt: string,
      type?: 'due' | 'before_due' | 'custom',
      channel?: 'notification' | 'sound' | 'both'
    ) => Promise<string>;
    cancel: (reminderId: string) => Promise<void>;
    cancelTask: (taskId: string) => Promise<void>;
    listTask: (taskId: string) => Promise<any[]>;
  };
  backup: {
    export: () => Promise<{ cancelled: boolean; filePath?: string }>;
    import: () => Promise<{ cancelled: boolean; filePath?: string }>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  floating: {
    open: (mode: 'day' | 'week' | 'pomodoro') => Promise<void>;
    close: () => Promise<void>;
    showMain: () => Promise<void>;
    setAlwaysOnTop: (enabled: boolean) => Promise<void>;
  };
  file: {
    selectAttachments: () => Promise<Array<{
      originalName: string;
      storedPath: string;
      sourcePath: string;
      size: number;
    }>>;
  };
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
