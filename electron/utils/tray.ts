import { Event, app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';

let tray: Tray | null = null;

type FloatingMode = 'day' | 'week' | 'pomodoro';

export function createAppTray(
  mainWindow: BrowserWindow,
  openFloating?: (mode: FloatingMode) => BrowserWindow
) {
  const icon = nativeImage.createFromDataURL(
    'data:image/svg+xml;utf8,' +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill="#2563eb"/>
          <path d="M9 16.5l4 4L23 10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `)
  );
  tray = new Tray(icon);
  tray.setToolTip('Plans App');

  const showWindow = () => {
    mainWindow.show();
    mainWindow.focus();
  };

  const menu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: showWindow },
    {
      label: '快速添加任务',
      click: () => {
        showWindow();
        mainWindow.webContents.send('quick-add-task');
      },
    },
    {
      label: '开始番茄钟',
      click: () => {
        showWindow();
        mainWindow.webContents.send('tray-start-pomodoro');
      },
    },
    { type: 'separator' },
    {
      label: '今日浮窗',
      click: () => openFloating?.('day'),
    },
    {
      label: '周视图浮窗',
      click: () => openFloating?.('week'),
    },
    {
      label: '番茄钟浮窗',
      click: () => openFloating?.('pomodoro'),
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);

  tray.setContextMenu(menu);
  tray.on('click', showWindow);

  mainWindow.on('minimize', (event: Event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  return tray;
}
