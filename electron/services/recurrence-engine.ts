import { getDatabase } from '../database/db';
import { tasks } from '../database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number; // 每 N 天/周/月
  daysOfWeek?: number[]; // 0-6，周日到周六（仅 weekly）
  endDate?: string; // ISO 8601
  count?: number; // 重复 N 次
}

export class RecurrenceEngine {
  // 计算下一次重复日期
  static calculateNextDate(currentDate: string, rule: RecurrenceRule): string | null {
    const current = new Date(currentDate);
    let next: Date;

    switch (rule.frequency) {
      case 'daily':
        next = new Date(current);
        next.setDate(current.getDate() + rule.interval);
        break;

      case 'weekly':
        next = new Date(current);
        next.setDate(current.getDate() + rule.interval * 7);

        // 如果指定了星期几，调整到下一个匹配的星期
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          const currentDay = next.getDay();
          const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);

          // 找到下一个匹配的星期几
          let targetDay = sortedDays.find(day => day > currentDay);
          if (!targetDay) {
            // 如果没有找到，使用下周的第一个匹配日
            targetDay = sortedDays[0];
            next.setDate(next.getDate() + 7);
          }

          const daysToAdd = targetDay - currentDay;
          next.setDate(next.getDate() + daysToAdd);
        }
        break;

      case 'monthly':
        next = new Date(current);
        next.setMonth(current.getMonth() + rule.interval);

        // 处理月底情况（如 1月31日 -> 2月28日）
        if (next.getDate() !== current.getDate()) {
          next.setDate(0); // 设置为上个月的最后一天
        }
        break;

      default:
        return null;
    }

    // 检查是否超过结束日期
    if (rule.endDate && next.toISOString() > rule.endDate) {
      return null;
    }

    return next.toISOString().split('T')[0];
  }

  // 任务完成后生成下一次实例
  static async generateNextInstance(taskId: string): Promise<string | null> {
    try {
      const db = await getDatabase();

      // 获取任务信息
      const taskResult = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (taskResult.length === 0) {
        console.warn('[RecurrenceEngine] Task not found:', taskId);
        return null;
      }

      const task = taskResult[0];

      // 检查是否有重复规则
      if (!task.recurrenceRule) {
        return null;
      }

      const rule: RecurrenceRule = JSON.parse(task.recurrenceRule);

      // 检查是否达到重复次数限制
      const currentCount = task.recurrenceCount || 0;
      if (rule.count && currentCount >= rule.count) {
        console.log('[RecurrenceEngine] Recurrence count limit reached:', taskId);
        return null;
      }

      // 计算下一次日期
      const nextDate = this.calculateNextDate(task.dueDate || new Date().toISOString(), rule);

      if (!nextDate) {
        console.log('[RecurrenceEngine] No next date (end date reached):', taskId);
        return null;
      }

      // 创建新任务实例
      const newTaskId = randomUUID();
      const now = new Date().toISOString();

      await db.insert(tasks).values({
        id: newTaskId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'todo',
        dueDate: nextDate,
        dueTime: task.dueTime,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        parentId: task.parentId,
        orderIndex: task.orderIndex,
        estimatedPomodoros: task.estimatedPomodoros,
        actualPomodoros: 0,
        recurrenceRule: task.recurrenceRule,
        recurrenceParentId: task.recurrenceParentId || taskId,
        recurrenceCount: (task.recurrenceCount || 0) + 1,
      });

      console.log('[RecurrenceEngine] Generated next instance:', newTaskId, 'for', taskId);
      return newTaskId;
    } catch (error) {
      console.error('[RecurrenceEngine] Error generating next instance:', error);
      return null;
    }
  }

  // 验证重复规则
  static validateRule(rule: RecurrenceRule): boolean {
    if (!rule.frequency || !rule.interval || rule.interval < 1) {
      return false;
    }

    if (rule.frequency === 'weekly' && rule.daysOfWeek) {
      if (!Array.isArray(rule.daysOfWeek) || rule.daysOfWeek.length === 0) {
        return false;
      }
      if (rule.daysOfWeek.some(day => day < 0 || day > 6)) {
        return false;
      }
    }

    if (rule.count && rule.count < 1) {
      return false;
    }

    return true;
  }

  // 格式化重复规则为人类可读文本
  static formatRule(rule: RecurrenceRule): string {
    const { frequency, interval, daysOfWeek, endDate, count } = rule;

    let text = '';

    if (frequency === 'daily') {
      text = interval === 1 ? '每天' : `每 ${interval} 天`;
    } else if (frequency === 'weekly') {
      text = interval === 1 ? '每周' : `每 ${interval} 周`;

      if (daysOfWeek && daysOfWeek.length > 0) {
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const dayText = daysOfWeek.map(d => dayNames[d]).join('、');
        text += ` (${dayText})`;
      }
    } else if (frequency === 'monthly') {
      text = interval === 1 ? '每月' : `每 ${interval} 个月`;
    }

    if (endDate) {
      text += `，截止到 ${endDate}`;
    } else if (count) {
      text += `，共 ${count} 次`;
    }

    return text;
  }
}
