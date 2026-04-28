import { ipcMain } from 'electron';
import { getDatabase } from '../database/db';
import { planSnapshots, tasks } from '../database/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

export function registerSnapshotHandlers() {
  ipcMain.handle('snapshot:create', async (_event, source: string) => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    // 获取当前所有任务数据
    const allTasks = await db.select().from(tasks);

    const snapshot = {
      id: uuidv4(),
      source,
      snapshotJson: JSON.stringify({ tasks: allTasks, timestamp: now }),
      createdAt: now,
    };

    await db.insert(planSnapshots).values(snapshot);
    return snapshot;
  });

  ipcMain.handle('snapshot:restore', async (_event, snapshotId: string) => {
    const db = await getDatabase();

    const snapshot = await db.select().from(planSnapshots).where(eq(planSnapshots.id, snapshotId)).limit(1);

    if (!snapshot || snapshot.length === 0) {
      throw new Error('Snapshot not found');
    }

    const data = JSON.parse(snapshot[0].snapshotJson);
    return data;
  });

  ipcMain.handle('snapshot:list', async () => {
    const db = await getDatabase();
    return db.select().from(planSnapshots).orderBy(desc(planSnapshots.createdAt)).limit(10);
  });
}
