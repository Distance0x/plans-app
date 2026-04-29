import { ipcMain } from 'electron';
import { getDatabase } from '../database/db';
import { userTimePreferences } from '../database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface UserProfileSettings {
  timeMap: {
    workdays: { start: string; end: string };
    weeklyExceptions: Record<string, { start: string; end: string; note?: string }>;
  };
  classificationRules: {
    workKeywords: string[];
    personalKeywords: string[];
    projectPatterns: string[];
  };
  priorityRules: {
    hasDeadline: 'high';
    dailyRoutine: 'medium' | 'low';
    urgentKeywords: string[];
  };
}

export function registerUserProfileHandlers() {
  ipcMain.handle('userProfile:getSettings', async () => {
    try {
      const db = await getDatabase();
      const prefs = await db.select().from(userTimePreferences).limit(1);

      if (prefs.length === 0) {
        return { success: true, settings: null };
      }

      const pref = prefs[0];
      const weeklyPattern = pref.weeklyPattern ? JSON.parse(pref.weeklyPattern) : {};

      const settings: UserProfileSettings = {
        timeMap: {
          workdays: weeklyPattern.default || { start: '09:00', end: '18:00' },
          weeklyExceptions: weeklyPattern.exceptions || {},
        },
        classificationRules: {
          workKeywords: ['工作', '会议', '项目', '开发', '设计', '文档'],
          personalKeywords: ['生活', '购物', '健身', '学习', '阅读'],
          projectPatterns: ['项目', '需求', '迭代', 'sprint'],
        },
        priorityRules: {
          hasDeadline: 'high',
          dailyRoutine: 'medium',
          urgentKeywords: ['紧急', '重要', '今天', '马上', '立即'],
        },
      };

      return { success: true, settings };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('userProfile:saveSettings', async (_event, settings: UserProfileSettings) => {
    try {
      const db = await getDatabase();
      const now = new Date().toISOString();

      const weeklyPattern = JSON.stringify({
        default: settings.timeMap.workdays,
        exceptions: settings.timeMap.weeklyExceptions,
      });

      const existing = await db.select().from(userTimePreferences).limit(1);

      if (existing.length === 0) {
        await db.insert(userTimePreferences).values({
          id: randomUUID(),
          weeklyPattern,
          avgTaskDuration: 60,
          streakDays: 0,
          lastStreakDate: null,
          productiveHours: JSON.stringify([9, 10, 14, 15]),
          updatedAt: now,
        });
      } else {
        await db.update(userTimePreferences)
          .set({ weeklyPattern, updatedAt: now })
          .where(eq(userTimePreferences.id, existing[0].id));
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
