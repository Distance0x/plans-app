import { getDatabase } from '../database/db';
import { userBehaviorStats, userTimePreferences, userTagPreferences } from '../database/schema';
import { gte, desc } from 'drizzle-orm';

export interface SmartRecommendation {
  type: 'schedule' | 'break' | 'priority' | 'tag' | 'focus_time';
  message: string;
  confidence: number; // 0-1
  action?: {
    type: string;
    payload: unknown;
  };
}

export interface UserProfile {
  productiveHours: number[];
  avgTaskDuration: number;
  completionRate: number;
  streakDays: number;
  frequentTags: Array<{ tagId: string; count: number }>;
  priorityDistribution: Record<'high' | 'medium' | 'low', number>;
}

export class RecommendationEngine {
  private db = getDatabase();

  async getUserProfile(): Promise<UserProfile> {
    const db = await this.db;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    // 获取最近7天的行为统计
    const stats = await db
      .select()
      .from(userBehaviorStats)
      .where(gte(userBehaviorStats.date, dateStr))
      .orderBy(desc(userBehaviorStats.date));

    // 获取时间偏好
    const timePrefs = await db.select().from(userTimePreferences).limit(1);
    const timePref = timePrefs[0];

    // 获取标签偏好
    const tagPrefs = await db
      .select()
      .from(userTagPreferences)
      .orderBy(desc(userTagPreferences.usageCount))
      .limit(10);

    // 计算平均完成率
    const totalCompleted = stats.reduce((sum, s) => sum + (s.tasksCompleted || 0), 0);
    const totalCreated = stats.reduce((sum, s) => sum + (s.tasksCreated || 0), 0);
    const completionRate = totalCreated > 0 ? totalCompleted / totalCreated : 0;

    // 解析高效时段
    const productiveHours = timePref?.productiveHours
      ? JSON.parse(timePref.productiveHours)
      : [];

    // 计算优先级分布
    const priorityDist = { high: 0, medium: 0, low: 0 };
    for (const stat of stats) {
      if (stat.priorityDistribution) {
        const dist = JSON.parse(stat.priorityDistribution);
        priorityDist.high += dist.high || 0;
        priorityDist.medium += dist.medium || 0;
        priorityDist.low += dist.low || 0;
      }
    }

    return {
      productiveHours,
      avgTaskDuration: timePref?.avgTaskDuration || 60,
      completionRate,
      streakDays: timePref?.streakDays || 0,
      frequentTags: tagPrefs.map(t => ({ tagId: t.tagId, count: t.usageCount || 0 })),
      priorityDistribution: priorityDist,
    };
  }

  async generateRecommendations(): Promise<SmartRecommendation[]> {
    const profile = await this.getUserProfile();
    const recommendations: SmartRecommendation[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    // 推荐1: 高效时段提醒
    if (profile.productiveHours.includes(currentHour)) {
      recommendations.push({
        type: 'focus_time',
        message: `现在是你的高效时段（${currentHour}:00），建议处理重要任务`,
        confidence: 0.85,
      });
    }

    // 推荐2: 完成率低时的鼓励
    if (profile.completionRate < 0.5 && profile.completionRate > 0) {
      recommendations.push({
        type: 'priority',
        message: `最近完成率${(profile.completionRate * 100).toFixed(0)}%，建议优先完成小任务建立信心`,
        confidence: 0.75,
      });
    }

    // 推荐3: 连续完成天数激励
    if (profile.streakDays >= 3) {
      recommendations.push({
        type: 'break',
        message: `已连续完成${profile.streakDays}天，保持节奏！今天再完成一个任务延续连胜`,
        confidence: 0.9,
      });
    }

    // 推荐4: 休息提醒（非高效时段）
    if (!profile.productiveHours.includes(currentHour) && (currentHour < 9 || currentHour > 22)) {
      recommendations.push({
        type: 'break',
        message: '当前不是你的高效时段，建议休息或处理轻量任务',
        confidence: 0.7,
      });
    }

    // 推荐5: 标签建议
    if (profile.frequentTags.length > 0) {
      const topTag = profile.frequentTags[0];
      recommendations.push({
        type: 'tag',
        message: `你经常使用标签 #${topTag.tagId}，创建新任务时可以考虑`,
        confidence: 0.6,
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }
}

export const recommendationEngine = new RecommendationEngine();
