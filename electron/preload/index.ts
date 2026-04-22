import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
  // 任务相关 API
  task: {
    create: (data: any) => ipcRenderer.invoke('task:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('task:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('task:delete', id),
    list: (filters?: any) => ipcRenderer.invoke('task:list', filters),
    search: (query: string) => ipcRenderer.invoke('task:search', query),
  },

  // 番茄钟相关 API
  timer: {
    start: (taskId?: string) => ipcRenderer.invoke('timer:start', taskId),
    pause: () => ipcRenderer.invoke('timer:pause'),
    resume: () => ipcRenderer.invoke('timer:resume'),
    reset: () => ipcRenderer.invoke('timer:reset'),
    skip: () => ipcRenderer.invoke('timer:skip'),
    status: () => ipcRenderer.invoke('timer:status'),
    stats: (request: any) => ipcRenderer.invoke('timer:stats', request),
  },

  // 设置相关 API
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (updates: any) => ipcRenderer.invoke('settings:update', updates),
  },

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
});
