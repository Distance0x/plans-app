export interface ElectronAPI {
  task: {
    create: (data: any) => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
    list: (filters?: any) => Promise<any[]>;
    search: (query: string) => Promise<any[]>;
  };
  timer: {
    start: (taskId?: string) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    reset: () => Promise<void>;
    skip: () => Promise<void>;
    status: () => Promise<any>;
    stats: (request: any) => Promise<any>;
  };
  settings: {
    get: () => Promise<any>;
    update: (updates: any) => Promise<any>;
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
