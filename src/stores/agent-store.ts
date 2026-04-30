import { create } from 'zustand';

interface DraftAction {
  type: 'create_task' | 'update_task' | 'schedule_task';
  payload: unknown;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: string;
  status: 'pending' | 'completed' | 'failed';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  draftActions?: DraftAction[];
  timestamp: number;
}

interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface AgentState {
  currentSessionId: string;
  sessions: Session[];
  messages: Message[];
  isLoading: boolean;
  streamingThinking: string;
  pendingToolCalls: ToolCall[];
  draftActions: DraftAction[];
  showThinking: boolean;

  addMessage: (message: Message) => void;
  loadMessages: (messages: Message[]) => void;
  deleteMessage: (messageId: string) => void;
  setLoading: (loading: boolean) => void;
  setStreamingThinking: (thinking: string) => void;
  setPendingToolCalls: (toolCalls: ToolCall[]) => void;
  setDraftActions: (actions: DraftAction[]) => void;
  clearDraft: () => void;
  setShowThinking: (show: boolean) => void;

  createSession: (title?: string) => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  clearCurrentSession: () => void;
  reset: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  currentSessionId: 'default',
  sessions: [{ id: 'default', title: '默认会话', createdAt: Date.now(), updatedAt: Date.now() }],
  messages: [],
  isLoading: false,
  streamingThinking: '',
  pendingToolCalls: [],
  draftActions: [],
  showThinking: (() => {
    try {
      const saved = localStorage.getItem('ai-show-thinking');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  })(),

  addMessage: (message) =>
    set((state) => {
      // 保存消息到数据库
      window.electron.ai.messages.save({
        id: message.id,
        sessionId: state.currentSessionId,
        role: message.role,
        content: message.content,
        thinking: message.thinking,
        toolCalls: message.toolCalls,
        draftActions: message.draftActions,
        timestamp: message.timestamp,
      }).catch(err => console.error('Failed to save message:', err));

      return {
        messages: [...state.messages, message],
        sessions: state.sessions.map(s =>
          s.id === state.currentSessionId
            ? { ...s, updatedAt: Date.now(), title: s.title || message.content.slice(0, 30) }
            : s
        ),
      };
    }),

  loadMessages: (messages) =>
    set({ messages }),

  deleteMessage: (messageId) =>
    set((state) => {
      // 从数据库删除消息
      window.electron.ai.messages.delete(messageId)
        .catch(err => console.error('Failed to delete message:', err));

      return {
        messages: state.messages.filter(m => m.id !== messageId),
      };
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setStreamingThinking: (thinking) => set({ streamingThinking: thinking }),

  setPendingToolCalls: (toolCalls) => set({ pendingToolCalls: toolCalls }),

  setDraftActions: (actions) => set({ draftActions: actions }),

  clearDraft: () => set({ draftActions: [] }),

  setShowThinking: (show) => {
    localStorage.setItem('ai-show-thinking', JSON.stringify(show));
    set({ showThinking: show });
  },

  createSession: (title) => {
    const id = `session_${Date.now()}`;
    const session: Session = {
      id,
      title: title || '新会话',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      sessions: [...state.sessions, session],
      currentSessionId: id,
      messages: [],
      draftActions: [],
      streamingThinking: '',
      pendingToolCalls: [],
    }));
    return id;
  },

  switchSession: (sessionId) =>
    set(() => {
      // 从数据库加载会话消息
      window.electron.ai.messages.load(sessionId)
        .then(loadedMessages => {
          set({ messages: loadedMessages });
        })
        .catch(err => console.error('Failed to load messages:', err));

      return {
        currentSessionId: sessionId,
        messages: [],
        draftActions: [],
        streamingThinking: '',
        pendingToolCalls: [],
      };
    }),

  deleteSession: (sessionId) =>
    set((state) => {
      const newSessions = state.sessions.filter(s => s.id !== sessionId);
      const newCurrentId = state.currentSessionId === sessionId
        ? (newSessions[0]?.id || 'default')
        : state.currentSessionId;
      return {
        sessions: newSessions.length > 0 ? newSessions : [{ id: 'default', title: '默认会话', createdAt: Date.now(), updatedAt: Date.now() }],
        currentSessionId: newCurrentId,
        messages: newCurrentId !== state.currentSessionId ? [] : state.messages,
      };
    }),

  clearCurrentSession: () =>
    set((state) => {
      // 从数据库清除当前会话的所有消息
      window.electron.ai.messages.clearSession(state.currentSessionId)
        .catch(err => console.error('Failed to clear session:', err));

      return {
        messages: [],
        draftActions: [],
        streamingThinking: '',
        pendingToolCalls: [],
      };
    }),

  reset: () => set({
    currentSessionId: 'default',
    sessions: [{ id: 'default', title: '默认会话', createdAt: Date.now(), updatedAt: Date.now() }],
    messages: [],
    isLoading: false,
    streamingThinking: '',
    pendingToolCalls: [],
    draftActions: [],
  }),
}));
