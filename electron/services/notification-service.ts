import { Notification } from 'electron';
import path from 'path';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: boolean;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
}

interface TaskNotification {
  taskId: string;
  taskTitle: string;
  type: 'due' | 'before_due' | 'custom';
}

export class NotificationService {
  private mainWindow: Electron.BrowserWindow | null = null;
  private iconPath: string;

  constructor(mainWindow: Electron.BrowserWindow) {
    this.mainWindow = mainWindow;
    this.iconPath = path.join(__dirname, '../../assets/icon.png');
  }

  // 显示任务提醒通知
  showTaskReminder(task: TaskNotification, options?: Partial<NotificationOptions>) {
    const title = this.getNotificationTitle(task.type);
    const body = task.taskTitle;

    this.show({
      title,
      body,
      icon: this.iconPath,
      sound: options?.sound ?? true,
      urgency: task.type === 'due' ? 'critical' : 'normal',
      ...options,
    }, () => {
      // 点击通知时，显示主窗口并跳转到任务
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
        this.mainWindow.webContents.send('focus-task', task.taskId);
      }
    });
  }

  // 显示通用通知
  show(options: NotificationOptions, onClick?: () => void) {
    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: options.icon || this.iconPath,
      silent: options.silent ?? false,
      urgency: options.urgency || 'normal',
      timeoutType: 'default',
    });

    if (onClick) {
      notification.on('click', onClick);
    }

    notification.show();

    // 播放声音（如果需要）
    if (options.sound && !options.silent) {
      this.playNotificationSound();
    }

    console.log('[NotificationService] Notification shown:', options.title);
  }

  // 播放提醒声音
  playNotificationSound() {
    // 在主窗口中播放声音
    if (this.mainWindow) {
      this.mainWindow.webContents.send('play-notification-sound');
    }
  }

  // 获取通知标题
  private getNotificationTitle(type: 'due' | 'before_due' | 'custom'): string {
    switch (type) {
      case 'due':
        return '⏰ 任务到期提醒';
      case 'before_due':
        return '⏰ 任务即将到期';
      case 'custom':
        return '📌 任务提醒';
      default:
        return '📌 提醒';
    }
  }

  // 显示番茄钟完成通知
  showPomodoroComplete(sessionType: 'work' | 'short_break' | 'long_break') {
    const titles = {
      work: '🍅 工作时间结束',
      short_break: '☕ 短休息结束',
      long_break: '🌟 长休息结束',
    };

    const bodies = {
      work: '休息一下吧！',
      short_break: '继续工作吧！',
      long_break: '准备好开始新的番茄钟了吗？',
    };

    this.show({
      title: titles[sessionType],
      body: bodies[sessionType],
      sound: true,
      urgency: 'normal',
    }, () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  // 显示每日计划提醒
  showDailyPlanReminder(taskCount: number) {
    this.show({
      title: '📅 早安！今天的计划',
      body: `你有 ${taskCount} 个任务待完成`,
      sound: false,
      urgency: 'low',
    }, () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  // 显示晚间复盘提醒
  showEveningReviewReminder(completedCount: number, totalCount: number) {
    this.show({
      title: '🌙 今日复盘',
      body: `今天完成了 ${completedCount}/${totalCount} 个任务`,
      sound: false,
      urgency: 'low',
    }, () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
        this.mainWindow.webContents.send('show-daily-review');
      }
    });
  }
}

let notificationService: NotificationService | null = null;

export function initNotificationService(mainWindow: Electron.BrowserWindow) {
  notificationService = new NotificationService(mainWindow);
  console.log('[NotificationService] Initialized');
}

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    throw new Error('NotificationService not initialized');
  }
  return notificationService;
}
