import { ipcMain, BrowserWindow } from 'electron';
import { chatAndPlan, testConnection } from '../services/ai-service';
import { saveAIConfig, loadAIConfig, deleteAIConfig, getSecretHealth } from '../services/keyvault';

export function registerAIHandlers() {
  ipcMain.handle('ai:chat', async (event, userText: string, threadId?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);

    return chatAndPlan({ userText, threadId }, (chunk) => {
      win?.webContents.send('ai:stream', chunk);
    });
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
