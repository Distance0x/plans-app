import { ipcMain } from 'electron';
import { getDatabase } from '../database/db';
import { tasks, reminders } from '../database/schema';
import { eq, and, lte } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import * as cron from 'node-cron';

interface Reminder {
  id: string;
  taskId: string;
  triggerAt: string; // ISO 8601
  type: 'due' | 'before_due' | 'custom';
  channel: 'notification' | 'sound' | 'both';
  state: 'pending' | 'fired' | 'cancelled';
  createdAt: string;
}

// 提醒调度器
class ReminderEngine {
  private cronJob: cron.ScheduledTask | null = null;
  private mainWindow: Electron.BrowserWindow | null = null;

  constructor(mainWindow: Electron.BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  // 启动提醒引擎
  start() {
    // 每分钟检查一次待触发的提醒
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkPendingReminders();
    });

    console.log('[ReminderEngine] Started');
  }

  // 停止提醒引擎
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    console.log('[ReminderEngine] Stopped');
  }

  // 检查待触发的提醒
  private async checkPendingReminders() {
    try {
      const db = await getDatabase();
      const now = new Date().toISOString();

      // 查询所有待触发的提醒
      const pendingReminders = await db
        .select()
        .from(reminders)
        .where(
          and(
            eq(reminders.state, 'pending'),
            lte(reminders.triggerAt, now)
          )
        );

      for (const reminder of pendingReminders) {
        await this.fireReminder(reminder);
      }
    } catch (error) {
      console.error('[ReminderEngine] Error checking reminders:', error);
    }
  }

  // 触发提醒
  private async fireReminder(reminder: any) {
    try {
      const db = await getDatabase();

      // 获取任务信息
      const task = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, reminder.taskId))
        .limit(1);

      if (task.length === 0) {
        console.warn('[ReminderEngine] Task not found:', reminder.taskId);
        return;
      }

      const taskData = task[0];

      // 发送通知到渲染进程
      if (this.mainWindow) {
        this.mainWindow.webContents.send('reminder:fire', {
          reminder,
          task: taskData,
        });
      }

      // 更新提醒状态
      await db
        .update(reminders)
        .set({
          state: 'fired',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(reminders.id, reminder.id));

      console.log('[ReminderEngine] Fired reminder:', reminder.id);
    } catch (error) {
      console.error('[ReminderEngine] Error firing reminder:', error);
    }
  }

  // 创建提醒
  async createReminder(
    taskId: string,
    triggerAt: string,
    type: 'due' | 'before_due' | 'custom' = 'due',
    channel: 'notification' | 'sound' | 'both' = 'notification'
  ): Promise<string> {
    const db = await getDatabase();
    const reminderId = randomUUID();

    await db.insert(reminders).values({
      id: reminderId,
      taskId,
      triggerAt,
      type,
      channel,
      state: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log('[ReminderEngine] Created reminder:', reminderId);
    return reminderId;
  }

  // 取消提醒
  async cancelReminder(reminderId: string) {
    const db = await getDatabase();

    await db
      .update(reminders)
      .set({
        state: 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(reminders.id, reminderId));

    console.log('[ReminderEngine] Cancelled reminder:', reminderId);
  }

  // 取消任务的所有提醒
  async cancelTaskReminders(taskId: string) {
    const db = await getDatabase();

    await db
      .update(reminders)
      .set({
        state: 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(reminders.taskId, taskId),
          eq(reminders.state, 'pending')
        )
      );

    console.log('[ReminderEngine] Cancelled all reminders for task:', taskId);
  }
}

let reminderEngine: ReminderEngine | null = null;

export function initReminderEngine(mainWindow: Electron.BrowserWindow) {
  reminderEngine = new ReminderEngine(mainWindow);
  reminderEngine.start();
}

export function stopReminderEngine() {
  if (reminderEngine) {
    reminderEngine.stop();
    reminderEngine = null;
  }
}

export function registerReminderHandlers() {
  // 创建提醒
  ipcMain.handle('reminder:create', async (_, taskId, triggerAt, type, channel) => {
    if (!reminderEngine) {
      throw new Error('ReminderEngine not initialized');
    }
    return await reminderEngine.createReminder(taskId, triggerAt, type, channel);
  });

  // 取消提醒
  ipcMain.handle('reminder:cancel', async (_, reminderId) => {
    if (!reminderEngine) {
      throw new Error('ReminderEngine not initialized');
    }
    await reminderEngine.cancelReminder(reminderId);
  });

  // 取消任务的所有提醒
  ipcMain.handle('reminder:cancel-task', async (_, taskId) => {
    if (!reminderEngine) {
      throw new Error('ReminderEngine not initialized');
    }
    await reminderEngine.cancelTaskReminders(taskId);
  });
}
