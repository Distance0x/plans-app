import OpenAI from 'openai';
import { loadAIConfig } from './keyvault';
import { randomUUID } from 'crypto';
import { getUserProfileContext, buildAISystemPrompt } from './user-profile-service';
import { saveUserProfileSettings } from './user-profile-update';

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ChatResponse {
  responseId: string;
  assistantText: string;
  draftActions: DraftAction[];
  thinking?: string;
  toolCalls?: ToolCallInfo[];
}

interface ToolCallInfo {
  id: string;
  name: string;
  arguments: string;
  status: 'pending' | 'completed' | 'failed';
}

interface DraftAction {
  type: 'create_task' | 'update_task' | 'schedule_task' | 'update_profile';
  payload: unknown;
}

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: '查询任务列表，用于在更新任务前获取任务ID',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['todo', 'in_progress', 'completed', 'all'], description: '任务状态筛选，默认 all' },
          keyword: { type: 'string', description: '按标题关键词搜索' },
        },
      },
    },
  },
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
  {
    type: 'function',
    function: {
      name: 'update_user_profile',
      description: '更新用户画像设置（工作时间、分类规则、优先级规则）',
      parameters: {
        type: 'object',
        properties: {
          timeMap: {
            type: 'object',
            properties: {
              workdays: {
                type: 'object',
                properties: {
                  start: { type: 'string', description: 'HH:mm' },
                  end: { type: 'string', description: 'HH:mm' }
                }
              },
              weeklyExceptions: {
                type: 'object',
                description: '特定日期的例外时间'
              }
            }
          },
          classificationRules: {
            type: 'object',
            properties: {
              workKeywords: { type: 'array', items: { type: 'string' } },
              personalKeywords: { type: 'array', items: { type: 'string' } },
              projectPatterns: { type: 'array', items: { type: 'string' } }
            }
          },
          priorityRules: {
            type: 'object',
            properties: {
              hasDeadline: { type: 'string', enum: ['high'] },
              dailyRoutine: { type: 'string', enum: ['medium', 'low'] },
              urgentKeywords: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    }
  }
];

export async function chatAndPlan(
  request: ChatRequest,
  onStream?: (chunk: { thinking?: string; toolCalls?: ToolCallInfo[]; content?: string }) => void
): Promise<ChatResponse> {
  const config = loadAIConfig();
  if (!config) {
    throw new Error('AI configuration not set');
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: 15000,
  });

  const now = new Date();
  const currentDate = now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const currentTime = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const profileContext = await getUserProfileContext();
  const systemPrompt = buildAISystemPrompt(profileContext, currentDate, currentTime);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...request.messages,
  ];

  const stream = await client.chat.completions.create({
    model: config.model,
    messages,
    tools,
    tool_choice: 'auto',
    stream: true,
  });

  let assistantText = '';
  let thinking = '';
  const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
  const draftActions: DraftAction[] = [];

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    if (delta.content) {
      assistantText += delta.content;
      onStream?.({ content: delta.content });
    }

    if (delta.tool_calls) {
      for (const toolCall of delta.tool_calls) {
        const index = toolCall.index;
        const existing = toolCallsMap.get(index);

        if (!existing) {
          toolCallsMap.set(index, {
            id: toolCall.id || '',
            name: toolCall.function?.name || '',
            arguments: toolCall.function?.arguments || '',
          });
        } else {
          if (toolCall.function?.arguments) {
            existing.arguments += toolCall.function.arguments;
          }
        }
      }

      const toolCalls: ToolCallInfo[] = Array.from(toolCallsMap.values()).map(tc => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
        status: 'pending' as const,
      }));
      onStream?.({ toolCalls });
    }
  }

  const completedToolCalls: ToolCallInfo[] = Array.from(toolCallsMap.values()).map(tc => ({
    id: tc.id,
    name: tc.name,
    arguments: tc.arguments,
    status: 'completed' as const,
  }));

  for (const toolCall of completedToolCalls) {
    try {
      const args = JSON.parse(toolCall.arguments);

      if (toolCall.name === 'get_tasks') {
        const { getDatabase } = await import('../database/db');
        const { tasks } = await import('../database/schema');
        const { eq } = await import('drizzle-orm');

        const db = await getDatabase();
        let query = db.select().from(tasks);

        if (args.status && args.status !== 'all') {
          query = query.where(eq(tasks.status, args.status)) as any;
        }

        let result = await query;

        if (args.keyword) {
          const keyword = args.keyword.toLowerCase();
          result = result.filter(t => t.title.toLowerCase().includes(keyword));
        }

        const taskList = result.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          dueTime: t.dueTime,
        }));

        assistantText += `\n\n找到 ${taskList.length} 个任务：\n${taskList.map(t => `- ${t.title} (ID: ${t.id}, 状态: ${t.status})`).join('\n')}`;
      } else if (toolCall.name === 'create_tasks') {
        draftActions.push({
          type: 'create_task',
          payload: args.tasks,
        });
      } else if (toolCall.name === 'update_tasks') {
        draftActions.push({
          type: 'update_task',
          payload: args.updates,
        });
      } else if (toolCall.name === 'schedule_tasks') {
        draftActions.push({
          type: 'schedule_task',
          payload: args.schedules,
        });
      } else if (toolCall.name === 'update_user_profile') {
        await saveUserProfileSettings(args);
        draftActions.push({
          type: 'update_profile',
          payload: args,
        });
      }
    } catch (e) {
      console.error('Failed to parse tool call arguments:', e);
    }
  }

  return {
    responseId: randomUUID(),
    assistantText: assistantText || '已生成任务建议',
    draftActions,
    thinking: thinking || undefined,
    toolCalls: completedToolCalls.length > 0 ? completedToolCalls : undefined,
  };
}

export async function testConnection(): Promise<void> {
  const config = loadAIConfig();
  if (!config) {
    throw new Error('AI configuration not set');
  }

  console.log('[AI Test] Config:', {
    baseURL: config.baseURL,
    model: config.model,
    hasApiKey: !!config.apiKey,
  });

  // Step 1: Test network reachability
  try {
    const url = new URL(config.baseURL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(url.origin, {
      method: 'HEAD',
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    console.log('[AI Test] Network reachable');
  } catch (error: any) {
    console.error('[AI Test] Network unreachable:', error.message);
    throw new Error(`网络不可达: ${error.message}`);
  }

  // Step 2: Test API with minimal request
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: 15000,
    maxRetries: 0,
  });

  try {
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 5,
    });
    console.log('[AI Test] Success:', response.id);
  } catch (error: any) {
    console.error('[AI Test] Failed:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type,
    });

    if (error.message?.includes('timed out')) {
      throw new Error('API 响应超时，请检查：1) 网络连接 2) API 服务商状态 3) 是否需要代理');
    }

    throw new Error(`连接失败: ${error.message || error.code || '未知错误'}`);
  }
}
