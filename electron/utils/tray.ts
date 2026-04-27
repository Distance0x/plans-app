import { Event, app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';

let tray: Tray | null = null;

type FloatingMode = 'day' | 'week' | 'pomodoro';

function createTrayIcon() {
  // Windows tray rendering is unreliable with SVG data URLs in packaged apps.
  // Use a PNG buffer so the notification area always gets an opaque icon.
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFmSURBVFhHYxgFMKCc/NpBNfl1A70wyD6o1RAAlfhPR9wAtRoCQAJoCmiNRx0wQhwQ2voeqzgQ09YBDuXv/t99/uc/CHz8+u+/VdFbdDW0cwDIsievIZbDQM+aL+jqaOMA49w3/689+g21FgFiuj6gq6W+A3Qy3vw/ePkn1EoEWHvkOzb11HfA7nOYloPEsKkFYuIdAAo+kO+wycHwsv3foVYiwIkbv/DpI+wAkGbklJzc/xFFHoYnbfwKVoMMQOkAlB6wqYdiwg7InPIRahwE/PiF6Yi6xZ+hsggAygFYsh06JuwAkCEgS5EBsiPQHQgCoJAClQHoZmHBxKWB8nmYPgQ5AhTs6I4DWe7XgLPkQ8fEJ0JsjkAH2KKHACbeASBMyBEFMz9h1YcHk+YAEMblCFBCxKaeACbdASCM7ghQWsCmjghMngNAGBTXIIuxlO+kYPIdQCU86oBRBwwyBwx433BgAAMDAEY5Zh/xYHuHAAAAAElFTkSuQmCC';
  const icon = nativeImage.createFromBuffer(Buffer.from(pngBase64, 'base64'));
  icon.setTemplateImage(false);
  return icon.resize({ width: 16, height: 16 });
}

export function createAppTray(
  mainWindow: BrowserWindow,
  openFloating?: (mode: FloatingMode) => BrowserWindow
) {
  const icon = createTrayIcon();
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
