import { getDatabase } from '../database/db';
import { userBehaviorStats, userTimePreferences, userTagPreferences } from '../database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export class BehaviorTracker {
  private db = getDatabase();

  async trackTaskCreated(taskData: { priority?: string; tags?: string[] }) {
    const db = await this.db;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // 更新每日统计
    const existing = await db
      .select()
      .from(userBehaviorStats)
      .where(eq(userBehaviorStats.date, today))
      .limit(1);

    if (existing.length > 0) {
      const stat = existing[0];
      const priorityDist = stat.priorityDistribution
        ? JSON.parse(stat.priorityDistribution)
        : { high: 0, medium: 0, low: 0 };

      if (taskData.priority) {
        priorityDist[taskData.priority as 'high' | 'medium' | 'low'] =
          (priorityDist[taskData.priority as 'high' | 'medium' | 'low'] || 0) + 1;
      }

      await db
        .update(userBehaviorStats)
        .set({
          tasksCreated: (stat.tasksCreated || 0) + 1,
          priorityDistribution: JSON.stringify(priorityDist),
          updatedAt: now,
        })
        .where(eq(userBehaviorStats.id, stat.id));
    } else {
      const priorityDist = { high: 0, medium: 0, low: 0 };
      if (taskData.priority) {
        priorityDist[taskData.priority as 'high' | 'medium' | 'low'] = 1;
      }

      await db.insert(userBehaviorStats).values({
        id: randomUUID(),
        date: today,
        tasksCreated: 1,
        tasksCompleted: 0,
        completionRate: 0,
        priorityDistribution: JSON.stringify(priorityDist),
        createdAt: now,
        updatedAt: now,
      });
    }

    // 更新标签偏好
    if (taskData.tags && taskData.tags.length > 0) {
      for (const tagId of taskData.tags) {
        const tagPref = await db
          .select()
          .from(userTagPreferences)
          .where(eq(userTagPreferences.tagId, tagId))
          .limit(1);

        if (tagPref.length > 0) {
          await db
            .update(userTagPreferences)
            .set({
              usageCount: (tagPref[0].usageCount || 0) + 1,
              lastUsedAt: now,
            })
            .where(eq(userTagPreferences.tagId, tagId));
        } else {
          await db.insert(userTagPreferences).values({
            tagId,
            usageCount: 1,
            lastUsedAt: now,
            createdAt: now,
          });
        }
      }
    }
  }

  async trackTaskCompleted(taskData: { duration?: number }) {
    const db = await this.db;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const currentHour = new Date().getHours();

    const existing = await db
      .select()
      .from(userBehaviorStats)
      .where(eq(userBehaviorStats.date, today))
      .limit(1);

    if (existing.length > 0) {
      const stat = existing[0];
      const completed = (stat.tasksCompleted || 0) + 1;
      const created = stat.tasksCreated || 0;
      const completionRate = created > 0 ? Math.round((completed / created) * 100) : 0;

      const hourlyDist = stat.hourlyDistribution
        ? JSON.parse(stat.hourlyDistribution)
        : {};
      hourlyDist[currentHour] = (hourlyDist[currentHour] || 0) + 1;

      await db
        .update(userBehaviorStats)
        .set({
          tasksCompleted: completed,
          completionRate,
          hourlyDistribution: JSON.stringify(hourlyDist),
          updatedAt: now,
        })
        .where(eq(userBehaviorStats.id, stat.id));
    }

    // 更新时间偏好
    await this.updateTimePreferences(currentHour, taskData.duration);
    await this.updateStreak();
  }

  async trackPomodoroCompleted(duration: number) {
    const db = await this.db;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const existing = await db
      .select()
      .from(userBehaviorStats)
      .where(eq(userBehaviorStats.date, today))
      .limit(1);

    if (existing.length > 0) {
      const stat = existing[0];
      await db
        .update(userBehaviorStats)
        .set({
          pomodoroCompleted: (stat.pomodoroCompleted || 0) + 1,
          focusMinutes: (stat.focusMinutes || 0) + Math.round(duration / 60),
          updatedAt: now,
        })
        .where(eq(userBehaviorStats.id, stat.id));
    }
  }

  async trackAIConversation(tasksGenerated: number = 0) {
    const db = await this.db;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const existing = await db
      .select()
      .from(userBehaviorStats)
      .where(eq(userBehaviorStats.date, today))
      .limit(1);

    if (existing.length > 0) {
      const stat = existing[0];
      await db
        .update(userBehaviorStats)
        .set({
          aiConversations: (stat.aiConversations || 0) + 1,
          aiTasksGenerated: (stat.aiTasksGenerated || 0) + tasksGenerated,
          updatedAt: now,
        })
        .where(eq(userBehaviorStats.id, stat.id));
    } else {
      await db.insert(userBehaviorStats).values({
        id: randomUUID(),
        date: today,
        tasksCreated: 0,
        tasksCompleted: 0,
        completionRate: 0,
        aiConversations: 1,
        aiTasksGenerated: tasksGenerated,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  private async updateTimePreferences(hour: number, duration?: number) {
    const db = await this.db;
    const now = new Date().toISOString();

    const existing = await db.select().from(userTimePreferences).limit(1);

    if (existing.length > 0) {
      const pref = existing[0];
      const productiveHours: number[] = pref.productiveHours
        ? JSON.parse(pref.productiveHours)
        : [];

      if (!productiveHours.includes(hour)) {
        productiveHours.push(hour);
        productiveHours.sort((a, b) => a - b);
      }

      const avgDuration = duration
        ? Math.round(((pref.avgTaskDuration || 60) * 0.9 + duration * 0.1))
        : (pref.avgTaskDuration || 60);

      await db
        .update(userTimePreferences)
        .set({
          productiveHours: JSON.stringify(productiveHours),
          avgTaskDuration: avgDuration,
          updatedAt: now,
        })
        .where(eq(userTimePreferences.id, pref.id));
    } else {
      await db.insert(userTimePreferences).values({
        id: randomUUID(),
        productiveHours: JSON.stringify([hour]),
        avgTaskDuration: duration || 60,
        streakDays: 0,
        updatedAt: now,
      });
    }
  }

  private async updateStreak() {
    const db = await this.db;
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const existing = await db.select().from(userTimePreferences).limit(1);

    if (existing.length > 0) {
      const pref = existing[0];
      const lastDate = pref.lastStreakDate;

      if (lastDate === today) {
        return;
      }

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const newStreak = lastDate === yesterday ? (pref.streakDays || 0) + 1 : 1;

      await db
        .update(userTimePreferences)
        .set({
          streakDays: newStreak,
          lastStreakDate: today,
          updatedAt: now,
        })
        .where(eq(userTimePreferences.id, pref.id));
    }
  }
}

export const behaviorTracker = new BehaviorTracker();
