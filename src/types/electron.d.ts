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
    openAttachment: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
  };
  ai: {
    chat: (userText: string, sessionId?: string) => Promise<{
      responseId: string;
      assistantText: string;
      draftActions: Array<{
        type: 'create_task' | 'update_task' | 'schedule_task';
        payload: unknown;
      }>;
      thinking?: string;
      toolCalls?: Array<{
        id: string;
        name: string;
        arguments: string;
        status: 'pending' | 'completed' | 'failed';
      }>;
    }>;
    testConnection: () => Promise<{ success: boolean }>;
    saveConfig: (config: { baseURL: string; apiKey: string; model: string }) => Promise<{ success: boolean }>;
    loadConfig: () => Promise<{
      config: {
        baseURL: string;
        apiKey: string;
        model: string;
      } | null;
    }>;
    deleteConfig: () => Promise<{ success: boolean }>;
    getHealth: () => Promise<{
      encryptionAvailable: boolean;
      backend: string;
    }>;
    messages: {
      save: (message: {
        id: string;
        sessionId: string;
        role: 'user' | 'assistant';
        content: string;
        thinking?: string;
        toolCalls?: any[];
        draftActions?: any[];
        timestamp: number;
      }) => Promise<{ success: boolean }>;
      load: (sessionId: string) => Promise<Array<{
        id: string;
        role: 'user' | 'assistant';
        content: string;
        thinking?: string;
        toolCalls?: any[];
        draftActions?: any[];
        timestamp: number;
      }>>;
      delete: (messageId: string) => Promise<{ success: boolean }>;
      clearSession: (sessionId: string) => Promise<{ success: boolean }>;
    };
  };
  snapshot: {
    create: (source: string) => Promise<{
      id: string;
      source: string;
      snapshotJson: string;
      createdAt: string;
    }>;
    restore: (snapshotId: string) => Promise<{
      tasks: any[];
      timestamp: string;
    }>;
    list: () => Promise<Array<{
      id: string;
      source: string;
      createdAt: string;
    }>>;
  };
  recommendation: {
    get: () => Promise<{
      success: boolean;
      recommendations?: Array<{
        type: 'schedule' | 'break' | 'priority' | 'tag' | 'focus_time';
        message: string;
        confidence: number;
        action?: {
          type: string;
          payload: unknown;
        };
      }>;
      error?: string;
    }>;
    profile: () => Promise<{
      success: boolean;
      profile?: {
        productiveHours: number[];
        avgTaskDuration: number;
        completionRate: number;
        streakDays: number;
        frequentTags: Array<{ tagId: string; count: number }>;
        priorityDistribution: Record<'high' | 'medium' | 'low', number>;
      };
      error?: string;
    }>;
  };
  userProfile: {
    getSettings: () => Promise<{
      success: boolean;
      settings?: {
        timeMap: {
          workdays: { start: string; end: string };
          weeklyExceptions: Record<string, { start: string; end: string; note?: string }>;
        };
        classificationRules: {
          workKeywords: string[];
          personalKeywords: string[];
          projectPatterns: string[];
        };
        priorityRules: {
          hasDeadline: 'high';
          dailyRoutine: 'medium' | 'low';
          urgentKeywords: string[];
        };
      } | null;
      error?: string;
    }>;
    saveSettings: (settings: {
      timeMap: {
        workdays: { start: string; end: string };
        weeklyExceptions: Record<string, { start: string; end: string; note?: string }>;
      };
      classificationRules: {
        workKeywords: string[];
        personalKeywords: string[];
        projectPatterns: string[];
      };
      priorityRules: {
        hasDeadline: 'high';
        dailyRoutine: 'medium' | 'low';
        urgentKeywords: string[];
      };
    }) => Promise<{ success: boolean; error?: string }>;
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
