import { ipcMain, BrowserWindow } from 'electron';
import { chatAndPlan, testConnection } from '../services/ai-service';
import { saveAIConfig, loadAIConfig, deleteAIConfig, getSecretHealth } from '../services/keyvault';
import { behaviorTracker } from '../services/behavior-tracker';
import { getDatabase } from '../database/db';
import { aiMessages } from '../database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const activeAIRequests = new Map<string, AbortController>();

export function registerAIHandlers() {
  ipcMain.handle('ai:chat', async (event, userText: string, sessionId?: string, requestId?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const db = await getDatabase();
    const history = sessionId
      ? await db.select().from(aiMessages)
          .where(eq(aiMessages.sessionId, sessionId))
          .orderBy(aiMessages.timestamp)
      : [];

    const messages = history.map(msg => {
      const message: any = {
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      };
      // 如果是 assistant 消息且有 thinking，添加 reasoning_content
      if (msg.role === 'assistant' && msg.thinking) {
        message.reasoning_content = msg.thinking;
      }
      return message;
    });
    messages.push({ role: 'user', content: userText });

    const streamId = requestId || randomUUID();
    const abortController = new AbortController();
    let sequence = 0;
    activeAIRequests.set(streamId, abortController);

    try {
      const response = await chatAndPlan({ messages, signal: abortController.signal }, (chunk) => {
        if (abortController.signal.aborted) return;

        win?.webContents.send('ai:stream', {
          ...chunk,
          streamId,
          sequence: sequence++,
        });
      });

      const tasksGenerated = response.draftActions.filter(a => a.type === 'create_task').length;
      await behaviorTracker.trackAIConversation(tasksGenerated);

      return response;
    } catch (error: any) {
      if (abortController.signal.aborted || error?.name === 'AbortError') {
        return {
          responseId: streamId,
          assistantText: '',
          draftActions: [],
          cancelled: true,
        };
      }

      throw error;
    } finally {
      const activeController = activeAIRequests.get(streamId);
      if (activeController === abortController) {
        activeAIRequests.delete(streamId);
      }
    }
  });

  ipcMain.handle('ai:chat:cancel', async (_event, requestId: string) => {
    const controller = activeAIRequests.get(requestId);
    if (!controller) {
      return { success: false, reason: 'not_found' };
    }

    controller.abort();
    activeAIRequests.delete(requestId);
    return { success: true };
  });

  ipcMain.handle('ai:testConnection', async () => {
    try {
      await testConnection();
      return { success: true };
    } catch (error: any) {
      throw new Error(error?.message || String(error));
    }
  });

  ipcMain.handle('ai:saveConfig', async (_event, config: { baseURL: string; apiKey: string; model: string }) => {
    saveAIConfig(config);
    return { success: true };
  });

  ipcMain.handle('ai:loadConfig', async () => {
    const config = loadAIConfig();
    if (!config) return { config: null };
    return {
      config: {
        baseURL: config.baseURL,
        apiKey: '***',
        model: config.model,
      },
    };
  });

  ipcMain.handle('ai:deleteConfig', async () => {
    deleteAIConfig();
    return { success: true };
  });

  ipcMain.handle('ai:getHealth', async () => {
    return getSecretHealth();
  });

  ipcMain.handle('ai:messages:save', async (_, message: {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    thinking?: string;
    toolCalls?: any[];
    draftActions?: any[];
    timestamp: number;
  }) => {
    const db = await getDatabase();
    await db.insert(aiMessages).values({
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      thinking: message.thinking || null,
      toolCalls: message.toolCalls ? JSON.stringify(message.toolCalls) : null,
      draftActions: message.draftActions ? JSON.stringify(message.draftActions) : null,
      timestamp: message.timestamp,
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  });

  ipcMain.handle('ai:messages:load', async (_, sessionId: string) => {
    const db = await getDatabase();
    const messages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.sessionId, sessionId))
      .orderBy(aiMessages.timestamp);

    return messages.map((msg: any) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      thinking: msg.thinking || undefined,
      toolCalls: msg.toolCalls ? JSON.parse(msg.toolCalls) : undefined,
      draftActions: msg.draftActions ? JSON.parse(msg.draftActions) : undefined,
      timestamp: msg.timestamp,
    }));
  });

  ipcMain.handle('ai:messages:delete', async (_, messageId: string) => {
    const db = await getDatabase();
    await db.delete(aiMessages).where(eq(aiMessages.id, messageId));
    return { success: true };
  });

  ipcMain.handle('ai:messages:clear-session', async (_, sessionId: string) => {
    const db = await getDatabase();
    await db.delete(aiMessages).where(eq(aiMessages.sessionId, sessionId));
    return { success: true };
  });
}
