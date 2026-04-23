import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerTaskHandlers } from '../ipc/task-handler';
import { registerTimerHandlers } from '../ipc/timer-handler';
import { registerSettingsHandlers } from '../ipc/settings-handler';
import { registerBackupHandlers } from '../ipc/backup-handler';
import { initReminderEngine, registerReminderHandlers, stopReminderEngine } from '../services/reminder-engine';
import { initNotificationService } from '../services/notification-service';
import { createAppTray } from '../utils/tray';

let mainWindow: BrowserWindow | null = null;

app.setAppUserModelId('com.plans.app');

function createWindow() {
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
    frame: true,
    titleBarStyle: 'default',
  });

  // 开发环境加载 Vite 服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();

    // 调试：打印 preload 路径
    console.log('[Main] Preload path:', path.join(__dirname, '../preload/index.js'));
    console.log('[Main] __dirname:', __dirname);
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 注册 IPC 处理器
  registerTaskHandlers();
  registerTimerHandlers();
  registerSettingsHandlers();
  registerBackupHandlers();
  registerReminderHandlers();

  createWindow();

  // 初始化提醒引擎和通知服务
  if (mainWindow) {
    initNotificationService(mainWindow);
    initReminderEngine(mainWindow);
    createAppTray(mainWindow);
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
