import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { registerTaskHandlers } from '../ipc/task-handler';
import { registerTimerHandlers } from '../ipc/timer-handler';
import { registerSettingsHandlers } from '../ipc/settings-handler';
import { registerBackupHandlers } from '../ipc/backup-handler';
import { registerOrganizationHandlers } from '../ipc/organization-handler';
import { registerAIHandlers } from '../ipc/ai-handler';
import { initReminderEngine, registerReminderHandlers, stopReminderEngine } from '../services/reminder-engine';
import { initNotificationService } from '../services/notification-service';
import { createAppTray } from '../utils/tray';

let mainWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;

type FloatingMode = 'day' | 'week' | 'pomodoro';

app.setAppUserModelId('com.plans.app');

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

function loadAppWindow(window: BrowserWindow, hash = '') {
  if (process.env.NODE_ENV === 'development') {
    window.loadURL(`http://localhost:5173${hash}`);
  } else {
    window.loadFile(path.join(__dirname, '../../dist-renderer/index.html'), {
      hash: hash.replace(/^#/, ''),
    });
  }
}

function createFloatingWindow(mode: FloatingMode = 'day') {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.show();
    floatingWindow.focus();
    loadAppWindow(floatingWindow, `#/floating/${mode}`);
    return floatingWindow;
  }

  floatingWindow = new BrowserWindow({
    width: mode === 'pomodoro' ? 340 : 390,
    height: mode === 'pomodoro' ? 420 : 560,
    minWidth: 300,
    minHeight: 320,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loadAppWindow(floatingWindow, `#/floating/${mode}`);
  floatingWindow.once('ready-to-show', () => floatingWindow?.show());
  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });

  return floatingWindow;
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    restoreMainWindow();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // macOS 风格窗口 - 隐藏菜单栏但保留窗口控制按钮
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false,
    trafficLightPosition: { x: 16, y: 16 },
  });

  // 开发环境加载 Vite 服务器
  if (process.env.NODE_ENV === 'development') {
    loadAppWindow(mainWindow);
    mainWindow.webContents.openDevTools();

    // 调试：打印 preload 路径
    console.log('[Main] Preload path:', path.join(__dirname, '../preload/index.js'));
    console.log('[Main] __dirname:', __dirname);
  } else {
    // 生产环境加载打包后的文件
    loadAppWindow(mainWindow);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function restoreMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

app.on('second-instance', () => {
  restoreMainWindow();
});

app.whenReady().then(async () => {
  // 注册 IPC 处理器
  registerTaskHandlers();
  registerTimerHandlers();
  registerSettingsHandlers();
  registerBackupHandlers();
  registerOrganizationHandlers();
  registerReminderHandlers();
  registerAIHandlers();

  // 注册窗口控制处理器
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });
  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });
  ipcMain.handle('floating:open', (_, mode: FloatingMode) => {
    createFloatingWindow(mode);
    if (mainWindow) mainWindow.minimize();
  });
  ipcMain.handle('floating:close', (event) => {
    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    if (sourceWindow && sourceWindow === floatingWindow) {
      sourceWindow.close();
    }
  });
  ipcMain.handle('floating:set-always-on-top', (event, enabled: boolean) => {
    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    if (sourceWindow && sourceWindow === floatingWindow) {
      sourceWindow.setAlwaysOnTop(enabled);
    }
  });
  ipcMain.handle('floating:show-main', () => {
    restoreMainWindow();
  });

  createWindow();

  // 初始化提醒引擎和通知服务
  if (mainWindow) {
    initNotificationService(mainWindow);
    initReminderEngine(mainWindow);
    createAppTray(mainWindow, createFloatingWindow);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopReminderEngine();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
