import { loadAIConfig } from './keyvault';

interface ChatRequest {
  userText: string;
  threadId?: string;
}

interface ChatResponse {
  responseId: string;
  assistantText: string;
  draftActions: DraftAction[];
}

interface DraftAction {
  type: 'create_task' | 'update_task' | 'schedule_task';
  payload: unknown;
}

export async function chatAndPlan(_request: ChatRequest): Promise<ChatResponse> {
  const config = loadAIConfig();
  if (!config) {
    throw new Error('AI configuration not set');
  }

  // TODO: Implement OpenAI Compatible API integration
  // This is a placeholder for Milestone 2
  return {
    responseId: 'placeholder',
    assistantText: `AI service ready. Config: ${config.baseURL} / ${config.model}`,
    draftActions: [],
  };
}
