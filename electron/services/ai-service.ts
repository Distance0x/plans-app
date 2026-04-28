import OpenAI from 'openai';
import { loadAIConfig } from './keyvault';
import { v4 as uuidv4 } from 'uuid';

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

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_tasks',
      description: '创建一个或多个新任务',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: '任务标题' },
                description: { type: 'string', description: '任务描述' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                dueDate: { type: 'string', description: 'YYYY-MM-DD' },
                dueTime: { type: 'string', description: 'HH:mm' },
                duration: { type: 'number', description: '预计时长（分钟）' },
              },
              required: ['title'],
            },
          },
        },
        required: ['tasks'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_tasks',
      description: '更新现有任务',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                taskId: { type: 'string' },
                title: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                status: { type: 'string', enum: ['todo', 'in_progress', 'completed'] },
                dueDate: { type: 'string' },
                dueTime: { type: 'string' },
              },
              required: ['taskId'],
            },
          },
        },
        required: ['updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_tasks',
      description: '为任务安排具体时间块',
      parameters: {
        type: 'object',
        properties: {
          schedules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                taskId: { type: 'string' },
                startTime: { type: 'string', description: 'YYYY-MM-DD HH:mm' },
                endTime: { type: 'string', description: 'YYYY-MM-DD HH:mm' },
              },
              required: ['taskId', 'startTime', 'endTime'],
            },
          },
        },
        required: ['schedules'],
      },
    },
  },
];

export async function chatAndPlan(request: ChatRequest): Promise<ChatResponse> {
  const config = loadAIConfig();
  if (!config) {
    throw new Error('AI configuration not set');
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: '你是一个任务管理助手。帮助用户创建、更新和安排任务。使用提供的工具来操作任务。',
    },
    {
      role: 'user',
      content: request.userText,
    },
  ];

  const completion = await client.chat.completions.create({
    model: config.model,
    messages,
    tools,
    tool_choice: 'auto',
  });

  const responseMessage = completion.choices[0].message;
  const draftActions: DraftAction[] = [];

  if (responseMessage.tool_calls) {
    for (const toolCall of responseMessage.tool_calls) {
      if (toolCall.type !== 'function') continue;

      const args = JSON.parse(toolCall.function.arguments);

      if (toolCall.function.name === 'create_tasks') {
        draftActions.push({
          type: 'create_task',
          payload: args.tasks,
        });
      } else if (toolCall.function.name === 'update_tasks') {
        draftActions.push({
          type: 'update_task',
          payload: args.updates,
        });
      } else if (toolCall.function.name === 'schedule_tasks') {
        draftActions.push({
          type: 'schedule_task',
          payload: args.schedules,
        });
      }
    }
  }

  return {
    responseId: uuidv4(),
    assistantText: responseMessage.content || '已生成任务建议',
    draftActions,
  };
}
