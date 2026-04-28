import { ipcMain, BrowserWindow } from 'electron';
import { chatAndPlan, testConnection } from '../services/ai-service';
import { saveAIConfig, loadAIConfig, deleteAIConfig, getSecretHealth } from '../services/keyvault';
import { behaviorTracker } from '../services/behavior-tracker';
import { getDatabase } from '../database/db';
import { aiMessages } from '../database/schema';
import { eq } from 'drizzle-orm';

export function registerAIHandlers() {
  ipcMain.handle('ai:chat', async (event, userText: string, threadId?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    const response = await chatAndPlan({ userText, threadId }, (chunk) => {
      win?.webContents.send('ai:stream', chunk);
    });

    // 追踪 AI 对话
    const tasksGenerated = response.draftActions.filter(a => a.type === 'create_task').length;
    await behaviorTracker.trackAIConversation(tasksGenerated);

    return response;
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
