import { create } from 'zustand';

interface DraftAction {
  type: 'create_task' | 'update_task' | 'schedule_task';
  payload: unknown;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  draftActions?: DraftAction[];
}

interface AgentState {
  messages: Message[];
  isLoading: boolean;
  draftActions: DraftAction[];
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;
  setDraftActions: (actions: DraftAction[]) => void;
  clearDraft: () => void;
  reset: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  messages: [],
  isLoading: false,
  draftActions: [],

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setDraftActions: (actions) => set({ draftActions: actions }),

  clearDraft: () => set({ draftActions: [] }),

  reset: () => set({ messages: [], isLoading: false, draftActions: [] }),
}));
