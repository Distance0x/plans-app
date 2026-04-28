import { ipcMain } from 'electron';
import { chatAndPlan } from '../services/ai-service';
import { saveAIConfig, loadAIConfig, deleteAIConfig, getSecretHealth } from '../services/keyvault';

export function registerAIHandlers() {
  ipcMain.handle('ai:chat', async (_event, userText: string, threadId?: string) => {
    return chatAndPlan({ userText, threadId });
  });

  ipcMain.handle('ai:saveConfig', async (_event, baseURL: string, apiKey: string, model: string) => {
    saveAIConfig({ baseURL, apiKey, model });
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
