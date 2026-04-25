import { getDatabase } from '../database/db';
import { reminders, taskTags, tasks } from '../database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // 每 N 天/周/月/年
  daysOfWeek?: number[]; // 0-6，周日到周六（仅 weekly）
  dayOfMonth?: number;
  lastDayOfMonth?: boolean;
  endDate?: string; // ISO 8601
  count?: number; // 重复 N 次
  exceptions?: string[];
}

function parseLocalDate(value: string) {
  const [datePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getLastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonths(date: Date, months: number, preferredDay: number, lastDayOfMonth?: boolean) {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(date.getMonth() + months);
  const lastDay = getLastDayOfMonth(next.getFullYear(), next.getMonth());
  next.setDate(lastDayOfMonth ? lastDay : Math.min(preferredDay, lastDay));
  return next;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  const preferredDay = date.getDate();
  next.setFullYear(date.getFullYear() + years, date.getMonth(), 1);
  next.setDate(Math.min(preferredDay, getLastDayOfMonth(next.getFullYear(), next.getMonth())));
  return next;
}

export class RecurrenceEngine {
  // 计算下一次重复日期
  static calculateNextDate(currentDate: string, rule: RecurrenceRule): string | null {
    const current = parseLocalDate(currentDate);
    let next: Date;
    const interval = Math.max(1, Number(rule.interval) || 1);

    switch (rule.frequency) {
      case 'daily':
        next = new Date(current);
        next.setDate(current.getDate() + interval);
        break;

      case 'weekly':
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
          const currentDay = current.getDay();
          const nextDayThisWeek = sortedDays.find(day => day > currentDay);

          next = new Date(current);
          if (nextDayThisWeek !== undefined) {
            next.setDate(current.getDate() + (nextDayThisWeek - currentDay));
          } else {
            const startOfWeek = new Date(current);
            startOfWeek.setDate(current.getDate() - currentDay);
            next = new Date(startOfWeek);
            next.setDate(startOfWeek.getDate() + interval * 7 + sortedDays[0]);
          }
        } else {
          next = new Date(current);
          next.setDate(current.getDate() + interval * 7);
        }
        break;

      case 'monthly':
        next = addMonths(
          current,
          interval,
          rule.dayOfMonth || current.getDate(),
          rule.lastDayOfMonth
        );
        break;

      case 'yearly':
        next = addYears(current, interval);
        break;

      default:
        return null;
    }

    // 检查是否超过结束日期
    let nextDate = formatLocalDate(next);
    while (rule.exceptions?.includes(nextDate)) {
      const later = this.calculateNextDate(nextDate, { ...rule, exceptions: [] });
      if (!later) return null;
      nextDate = later;
    }

    if (rule.endDate && nextDate > rule.endDate) {
      return null;
    }

    return nextDate;
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
        duration: task.duration,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        parentId: task.parentId,
        listId: task.listId,
        orderIndex: task.orderIndex,
        estimatedPomodoros: task.estimatedPomodoros,
        actualPomodoros: 0,
        notes: task.notes,
        attachments: task.attachments,
        recurrenceRule: task.recurrenceRule,
        recurrenceParentId: task.recurrenceParentId || taskId,
        recurrenceCount: (task.recurrenceCount || 0) + 1,
      });

      const sourceTags = await db.select().from(taskTags).where(eq(taskTags.taskId, taskId));
      if (sourceTags.length > 0) {
        await db.insert(taskTags).values(
          sourceTags.map((relation) => ({
            taskId: newTaskId,
            tagId: relation.tagId,
          }))
        );
      }

      await this.copyRelativeReminders(taskId, newTaskId, task.dueDate, nextDate, task.dueTime);

      console.log('[RecurrenceEngine] Generated next instance:', newTaskId, 'for', taskId);
      return newTaskId;
    } catch (error) {
      console.error('[RecurrenceEngine] Error generating next instance:', error);
      return null;
    }
  }

  private static async copyRelativeReminders(
    sourceTaskId: string,
    nextTaskId: string,
    sourceDate: string | null,
    nextDate: string,
    dueTime: string | null
  ) {
    if (!sourceDate || !dueTime) return;

    const db = await getDatabase();
    const sourceDueAt = new Date(`${sourceDate}T${dueTime}`);
    const nextDueAt = new Date(`${nextDate}T${dueTime}`);
    if (Number.isNaN(sourceDueAt.getTime()) || Number.isNaN(nextDueAt.getTime())) return;

    const sourceReminders = await db
      .select()
      .from(reminders)
      .where(eq(reminders.taskId, sourceTaskId));

    const now = new Date().toISOString();
    const nextReminderRows = sourceReminders
      .filter((reminder) => reminder.type === 'due' || reminder.type === 'before_due')
      .map((reminder) => {
        const offsetMs = sourceDueAt.getTime() - new Date(reminder.triggerAt).getTime();
        return {
          id: randomUUID(),
          taskId: nextTaskId,
          triggerAt: new Date(nextDueAt.getTime() - offsetMs).toISOString(),
          type: reminder.type,
          channel: reminder.channel,
          state: 'pending' as const,
          createdAt: now,
          updatedAt: now,
        };
      })
      .filter((reminder) => new Date(reminder.triggerAt).getTime() > Date.now());

    if (nextReminderRows.length > 0) {
      await db.insert(reminders).values(nextReminderRows);
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

    if (rule.dayOfMonth && (rule.dayOfMonth < 1 || rule.dayOfMonth > 31)) {
      return false;
    }

    return true;
  }

  // 格式化重复规则为人类可读文本
  static formatRule(rule: RecurrenceRule): string {
    const { frequency, interval, daysOfWeek, dayOfMonth, lastDayOfMonth, endDate, count } = rule;

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
      if (lastDayOfMonth) {
        text += '最后一天';
      } else if (dayOfMonth) {
        text += `${dayOfMonth} 日`;
      }
    } else if (frequency === 'yearly') {
      text = interval === 1 ? '每年' : `每 ${interval} 年`;
    }

    if (endDate) {
      text += `，截止到 ${endDate}`;
    } else if (count) {
      text += `，共 ${count} 次`;
    }

    return text;
  }
}
