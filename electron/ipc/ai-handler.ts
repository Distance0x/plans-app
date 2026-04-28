import { ipcMain, BrowserWindow } from 'electron';
import { chatAndPlan, testConnection } from '../services/ai-service';
import { saveAIConfig, loadAIConfig, deleteAIConfig, getSecretHealth } from '../services/keyvault';
import { behaviorTracker } from '../services/behavior-tracker';

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
}
