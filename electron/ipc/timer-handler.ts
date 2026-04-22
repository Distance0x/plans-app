import { ipcMain, BrowserWindow } from 'electron';
import { getDatabase } from '../database/db';
import { pomodoroSessions } from '../database/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  sessionType: 'work' | 'short_break' | 'long_break';
  remainingTime: number;
  totalTime: number;
  currentTaskId: string | null;
  sessionId: string | null;
  startTime: string | null;
  completedPomodoros: number;
}

let timerState: TimerState = {
  isRunning: false,
  isPaused: false,
  sessionType: 'work',
  remainingTime: 1500, // 25 分钟
  totalTime: 1500,
  currentTaskId: null,
  sessionId: null,
  startTime: null,
  completedPomodoros: 0,
};

let timerInterval: NodeJS.Timeout | null = null;

const DURATIONS = {
  work: 1500, // 25 分钟
  short_break: 300, // 5 分钟
  long_break: 1800, // 30 分钟
};

export function registerTimerHandlers() {
  // 开始番茄钟
  ipcMain.handle('timer:start', async (_, taskId?: string) => {
    if (timerState.isRunning && !timerState.isPaused) {
      return timerState;
    }

    const db = await getDatabase();

    if (!timerState.isPaused) {
      // 新会话
      timerState.sessionId = randomUUID();
      timerState.currentTaskId = taskId || null;
      timerState.startTime = new Date().toISOString();
      timerState.remainingTime = timerState.totalTime;

      // 保存到数据库
      await db.insert(pomodoroSessions).values({
        id: timerState.sessionId,
        taskId: taskId || null,
        sessionType: timerState.sessionType,
        duration: timerState.totalTime,
        startTime: timerState.startTime,
        endTime: null,
        completed: false,
        interrupted: false,
        createdAt: timerState.startTime,
      });
    }

    timerState.isRunning = true;
    timerState.isPaused = false;

    startTimer();
    return timerState;
  });

  // 暂停番茄钟
  ipcMain.handle('timer:pause', async () => {
    if (!timerState.isRunning) return timerState;

    timerState.isPaused = true;
    stopTimer();
    return timerState;
  });

  // 恢复番茄钟
  ipcMain.handle('timer:resume', async () => {
    if (!timerState.isPaused) return timerState;

    timerState.isPaused = false;
    startTimer();
    return timerState;
  });

  // 重置番茄钟
  ipcMain.handle('timer:reset', async () => {
    const db = await getDatabase();

    // 标记当前会话为中断
    if (timerState.sessionId) {
      await db
        .update(pomodoroSessions)
        .set({
          interrupted: true,
          endTime: new Date().toISOString(),
        })
        .where(eq(pomodoroSessions.id, timerState.sessionId));
    }

    stopTimer();
    timerState = {
      isRunning: false,
      isPaused: false,
      sessionType: 'work',
      remainingTime: DURATIONS.work,
      totalTime: DURATIONS.work,
      currentTaskId: null,
      sessionId: null,
      startTime: null,
      completedPomodoros: timerState.completedPomodoros,
    };

    return timerState;
  });

  // 跳过当前番茄钟
  ipcMain.handle('timer:skip', async () => {
    await completeSession();
    switchToNextSession();
    return timerState;
  });

  // 获取番茄钟状态
  ipcMain.handle('timer:status', async () => {
    return timerState;
  });

  // 获取番茄钟统计
  ipcMain.handle('timer:stats', async () => {
    const db = await getDatabase();

    let query = db.select().from(pomodoroSessions);

    const sessions = await query;

    const stats = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.completed).length,
      totalWorkTime: sessions
        .filter((s) => s.sessionType === 'work' && s.completed)
        .reduce((sum, s) => sum + s.duration, 0),
      totalBreakTime: sessions
        .filter((s) => s.sessionType !== 'work' && s.completed)
        .reduce((sum, s) => sum + s.duration, 0),
    };

    return stats;
  });
}

function startTimer() {
  if (timerInterval) return;

  timerInterval = setInterval(() => {
    timerState.remainingTime--;

    // 发送更新到渲染进程
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      win.webContents.send('timer:tick', timerState);
    });

    if (timerState.remainingTime <= 0) {
      completeSession();
      switchToNextSession();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function completeSession() {
  const db = await getDatabase();

  if (timerState.sessionId) {
    await db
      .update(pomodoroSessions)
      .set({
        completed: true,
        endTime: new Date().toISOString(),
      })
      .where(eq(pomodoroSessions.id, timerState.sessionId));

    if (timerState.sessionType === 'work') {
      timerState.completedPomodoros++;
    }
  }

  stopTimer();
}

function switchToNextSession() {
  if (timerState.sessionType === 'work') {
    // 工作完成，进入休息
    if (timerState.completedPomodoros % 4 === 0) {
      timerState.sessionType = 'long_break';
      timerState.totalTime = DURATIONS.long_break;
    } else {
      timerState.sessionType = 'short_break';
      timerState.totalTime = DURATIONS.short_break;
    }
  } else {
    // 休息完成，进入工作
    timerState.sessionType = 'work';
    timerState.totalTime = DURATIONS.work;
  }

  timerState.remainingTime = timerState.totalTime;
  timerState.isRunning = false;
  timerState.isPaused = false;
  timerState.sessionId = null;
  timerState.startTime = null;

  // 通知渲染进程
  const windows = BrowserWindow.getAllWindows();
  windows.forEach((win) => {
    win.webContents.send('timer:complete', timerState);
  });
}
