import { app, dialog, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getDatabase } from '../database/db';
import { lists, pomodoroSessions, reminders, savedFilters, settings, tags, taskTags, tasks } from '../database/schema';

const BACKUP_VERSION = 1;

export function registerBackupHandlers() {
  ipcMain.handle('backup:export', async () => {
    const db = await getDatabase();
    const backup = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data: {
        tasks: await db.select().from(tasks),
        reminders: await db.select().from(reminders),
        pomodoroSessions: await db.select().from(pomodoroSessions),
        settings: await db.select().from(settings),
        lists: await db.select().from(lists),
        tags: await db.select().from(tags),
        taskTags: await db.select().from(taskTags),
        savedFilters: await db.select().from(savedFilters),
      },
    };

    const result = await dialog.showSaveDialog({
      title: '导出 Plans App 数据',
      defaultPath: `plans-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) {
      return { cancelled: true };
    }

    fs.writeFileSync(result.filePath, JSON.stringify(backup, null, 2), 'utf8');
    return { cancelled: false, filePath: result.filePath };
  });

  ipcMain.handle('backup:import', async () => {
    const result = await dialog.showOpenDialog({
      title: '导入 Plans App 数据',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true };
    }

    const raw = fs.readFileSync(result.filePaths[0], 'utf8');
    const backup = JSON.parse(raw);
    if (!backup?.data || backup.version !== BACKUP_VERSION) {
      throw new Error('不支持的备份文件');
    }

    const db = await getDatabase();

    await db.delete(taskTags);
    await db.delete(tags);
    await db.delete(savedFilters);
    await db.delete(reminders);
    await db.delete(pomodoroSessions);
    await db.delete(tasks);
    await db.delete(lists);
    await db.delete(settings);

    if (backup.data.lists?.length) {
      await db.insert(lists).values(backup.data.lists);
    } else {
      const now = new Date().toISOString();
      await db.insert(lists).values({
        id: 'inbox',
        name: '收集箱',
        color: '#64748B',
        orderIndex: 0,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (backup.data.tasks?.length) await db.insert(tasks).values(backup.data.tasks);
    if (backup.data.reminders?.length) await db.insert(reminders).values(backup.data.reminders);
    if (backup.data.pomodoroSessions?.length) await db.insert(pomodoroSessions).values(backup.data.pomodoroSessions);
    if (backup.data.settings?.length) await db.insert(settings).values(backup.data.settings);
    if (backup.data.tags?.length) await db.insert(tags).values(backup.data.tags);
    if (backup.data.taskTags?.length) await db.insert(taskTags).values(backup.data.taskTags);
    if (backup.data.savedFilters?.length) await db.insert(savedFilters).values(backup.data.savedFilters);

    return { cancelled: false, filePath: result.filePaths[0] };
  });

  ipcMain.handle('file:select-attachments', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择附件',
      properties: ['openFile', 'multiSelections'],
    });

    if (result.canceled) {
      return [];
    }

    const attachmentDir = path.join(app.getPath('userData'), 'attachments');
    fs.mkdirSync(attachmentDir, { recursive: true });

    return result.filePaths.map((sourcePath) => {
      const ext = path.extname(sourcePath);
      const originalName = path.basename(sourcePath);
      const storedPath = path.join(attachmentDir, `${randomUUID()}${ext}`);
      fs.copyFileSync(sourcePath, storedPath);

      return {
        originalName,
        storedPath,
        sourcePath,
        size: fs.statSync(storedPath).size,
      };
    });
  });
}
