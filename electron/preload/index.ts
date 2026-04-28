import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

console.log('[Preload] Script loaded successfully!');

const listenerMap = new Map<string, Map<(...args: any[]) => void, (...args: any[]) => void>>();

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

  list: {
    list: () => ipcRenderer.invoke('list:list'),
    create: (data: any) => ipcRenderer.invoke('list:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('list:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('list:delete', id),
  },

  tag: {
    list: () => ipcRenderer.invoke('tag:list'),
    create: (data: any) => ipcRenderer.invoke('tag:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('tag:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('tag:delete', id),
    setTaskTags: (taskId: string, tagIds: string[]) =>
      ipcRenderer.invoke('tag:set-task-tags', taskId, tagIds),
  },

  savedFilter: {
    list: () => ipcRenderer.invoke('saved-filter:list'),
    create: (data: any) => ipcRenderer.invoke('saved-filter:create', data),
    update: (id: string, updates: any) =>
      ipcRenderer.invoke('saved-filter:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('saved-filter:delete', id),
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

  // 提醒相关 API
  reminder: {
    create: (taskId: string, triggerAt: string, type?: string, channel?: string) =>
      ipcRenderer.invoke('reminder:create', taskId, triggerAt, type, channel),
    cancel: (reminderId: string) =>
      ipcRenderer.invoke('reminder:cancel', reminderId),
    cancelTask: (taskId: string) =>
      ipcRenderer.invoke('reminder:cancel-task', taskId),
    listTask: (taskId: string) =>
      ipcRenderer.invoke('reminder:list-task', taskId),
  },

  // 备份和附件 API
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import'),
  },

  // 窗口控制 API
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  floating: {
    open: (mode: 'day' | 'week' | 'pomodoro') => ipcRenderer.invoke('floating:open', mode),
    close: () => ipcRenderer.invoke('floating:close'),
    showMain: () => ipcRenderer.invoke('floating:show-main'),
    setAlwaysOnTop: (enabled: boolean) =>
      ipcRenderer.invoke('floating:set-always-on-top', enabled),
  },

  file: {
    selectAttachments: () => ipcRenderer.invoke('file:select-attachments'),
    openAttachment: (filePath: string) => ipcRenderer.invoke('file:open-attachment', filePath),
  },

  ai: {
    chat: (userText: string, threadId?: string) => ipcRenderer.invoke('ai:chat', userText, threadId),
    saveConfig: (baseURL: string, apiKey: string, model: string) => ipcRenderer.invoke('ai:saveConfig', baseURL, apiKey, model),
    loadConfig: () => ipcRenderer.invoke('ai:loadConfig'),
    deleteConfig: () => ipcRenderer.invoke('ai:deleteConfig'),
    getHealth: () => ipcRenderer.invoke('ai:getHealth'),
  },

  snapshot: {
    create: (source: string) => ipcRenderer.invoke('snapshot:create', source),
    restore: (snapshotId: string) => ipcRenderer.invoke('snapshot:restore', snapshotId),
    list: () => ipcRenderer.invoke('snapshot:list'),
  },

  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    const wrapped = (_: IpcRendererEvent, ...args: any[]) => callback(...args);
    if (!listenerMap.has(channel)) listenerMap.set(channel, new Map());
    listenerMap.get(channel)!.set(callback, wrapped);
    ipcRenderer.on(channel, wrapped);
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    const wrapped = listenerMap.get(channel)?.get(callback);
    if (!wrapped) return;

    ipcRenderer.removeListener(channel, wrapped);
    listenerMap.get(channel)?.delete(callback);
  },
});
