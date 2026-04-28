import { loadSecret } from './keyvault';

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
  const apiKey = loadSecret('openai_api_key');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // TODO: Implement OpenAI Responses API integration
  // This is a placeholder for Milestone 2
  return {
    responseId: 'placeholder',
    assistantText: 'AI service ready. Full implementation in Milestone 2.',
    draftActions: [],
  };
}
