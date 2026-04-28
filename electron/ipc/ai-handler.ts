import { ipcMain } from 'electron';
import { chatAndPlan } from '../services/ai-service';
import { saveSecret, loadSecret, deleteSecret, getSecretHealth } from '../services/keyvault';

export function registerAIHandlers() {
  ipcMain.handle('ai:chat', async (_event, userText: string, threadId?: string) => {
    return chatAndPlan({ userText, threadId });
  });

  ipcMain.handle('ai:saveApiKey', async (_event, apiKey: string) => {
    saveSecret('openai_api_key', apiKey);
    return { success: true };
  });

  ipcMain.handle('ai:loadApiKey', async () => {
    const apiKey = loadSecret('openai_api_key');
    return { apiKey: apiKey ? '***' : null };
  });

  ipcMain.handle('ai:deleteApiKey', async () => {
    deleteSecret('openai_api_key');
    return { success: true };
  });

  ipcMain.handle('ai:getHealth', async () => {
    return getSecretHealth();
  });
}
