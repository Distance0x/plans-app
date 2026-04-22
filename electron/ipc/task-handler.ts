import { ipcMain } from 'electron';
import { getDatabase } from '../database/db';
import { tasks } from '../database/schema';
import { eq, like, or, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export function registerTaskHandlers() {
  // 创建任务
  ipcMain.handle('task:create', async (_, data) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const task = {
      id: randomUUID(),
      title: data.title,
      description: data.description || null,
      priority: (data.priority || 'medium') as 'high' | 'medium' | 'low',
      status: 'todo' as const,
      dueDate: data.dueDate || null,
      dueTime: data.dueTime || null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      parentId: data.parentId || null,
      orderIndex: data.orderIndex || 0,
      estimatedPomodoros: data.estimatedPomodoros || 0,
      actualPomodoros: 0,
    };

    await db.insert(tasks).values(task);
    return task;
  });

  // 更新任务
  ipcMain.handle('task:update', async (_, id, updates) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const updateData: any = {
      ...updates,
      updatedAt: now,
    };

    if (updates.status === 'completed' && !updates.completedAt) {
      updateData.completedAt = now;
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, id));

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));
    return updated;
  });

  // 删除任务
  ipcMain.handle('task:delete', async (_, id) => {
    const db = await getDatabase();
    await db.delete(tasks).where(eq(tasks.id, id));
  });

  // 获取任务列表
  ipcMain.handle('task:list', async (_, filters = {}) => {
    const db = await getDatabase();
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(tasks.status, filters.status));
    }

    if (filters.priority) {
      conditions.push(eq(tasks.priority, filters.priority));
    }

    if (filters.dueDate) {
      conditions.push(eq(tasks.dueDate, filters.dueDate));
    }

    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push(isNull(tasks.parentId));
      } else {
        conditions.push(eq(tasks.parentId, filters.parentId));
      }
    }

    let query = db.select().from(tasks);

    if (conditions.length > 0) {
      query = query.where(conditions[0]) as any;
    }

    const result = await query;
    return result;
  });

  // 搜索任务
  ipcMain.handle('task:search', async (_, searchQuery) => {
    const db = await getDatabase();
    const result = await db
      .select()
      .from(tasks)
      .where(
        or(
          like(tasks.title, `%${searchQuery}%`),
          like(tasks.description, `%${searchQuery}%`)
        )
      );
    return result;
  });
}
