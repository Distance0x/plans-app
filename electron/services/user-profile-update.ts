import { getDatabase } from '../database/db';
import { userTimePreferences } from '../database/schema';
import { eq } from 'drizzle-orm';

export interface UserProfileSettings {
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

export async function saveUserProfileSettings(settings: UserProfileSettings): Promise<void> {
  const db = await getDatabase();

  const weeklyPattern = {
    default: settings.timeMap.workdays,
    exceptions: settings.timeMap.weeklyExceptions
  };

  const existing = await db.select().from(userTimePreferences).limit(1);

  if (existing.length > 0) {
    await db.update(userTimePreferences)
      .set({
        weeklyPattern: JSON.stringify(weeklyPattern),
        updatedAt: new Date().toISOString()
      })
      .where(eq(userTimePreferences.id, existing[0].id));
  } else {
    await db.insert(userTimePreferences).values({
      id: `pref_${Date.now()}`,
      weeklyPattern: JSON.stringify(weeklyPattern),
      productiveHours: JSON.stringify([]),
      avgTaskDuration: 60,
      updatedAt: new Date().toISOString()
    });
  }
}
