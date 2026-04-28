import { ipcMain } from 'electron';
import { recommendationEngine } from '../services/recommendation-engine';

export function registerRecommendationHandlers() {
  ipcMain.handle('recommendation:get', async () => {
    try {
      const recommendations = await recommendationEngine.generateRecommendations();
      return { success: true, recommendations };
    } catch (error: any) {
      console.error('Failed to generate recommendations:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('recommendation:profile', async () => {
    try {
      const profile = await recommendationEngine.getUserProfile();
      return { success: true, profile };
    } catch (error: any) {
      console.error('Failed to get user profile:', error);
      return { success: false, error: error.message };
    }
  });
}
