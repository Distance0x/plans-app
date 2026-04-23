import { ipcMain } from 'electron';
import { getDatabase } from '../database/db';
import { reminders, tasks } from '../database/schema';
import { and, eq, like, or, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { RecurrenceEngine } from '../services/recurrence-engine';

function emptyToNull(value: unknown): string | null {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  return String(value);
}

function normalizeTaskInput(data: any) {
  const recurrenceRule =
    data.recurrenceRule && typeof data.recurrenceRule !== 'string'
      ? JSON.stringify(data.recurrenceRule)
      : emptyToNull(data.recurrenceRule);

  return {
    title: data.title,
    description: emptyToNull(data.description),
    priority: (data.priority || 'medium') as 'high' | 'medium' | 'low',
    dueDate: emptyToNull(data.dueDate),
    dueTime: emptyToNull(data.dueTime),
    duration: data.duration ? Number(data.duration) : 60,
    parentId: emptyToNull(data.parentId),
    orderIndex: data.orderIndex || 0,
    estimatedPomodoros: data.estimatedPomodoros || 0,
    notes: emptyToNull(data.notes),
    attachments: data.attachments ? JSON.stringify(data.attachments) : null,
    recurrenceRule,
  };
}

async function deleteTaskCascade(db: Awaited<ReturnType<typeof getDatabase>>, id: string) {
  const childTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.parentId, id));

  for (const child of childTasks) {
    await deleteTaskCascade(db, child.id);
  }

  await db
    .update(reminders)
    .set({
      state: 'cancelled',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(reminders.taskId, id));

  await db.delete(tasks).where(eq(tasks.id, id));
}

async function completeParentIfAllChildrenDone(
  db: Awaited<ReturnType<typeof getDatabase>>,
  parentId: string | null
) {
  if (!parentId) return;

  const children = await db
    .select()
    .from(tasks)
    .where(eq(tasks.parentId, parentId));

  if (children.length === 0 || children.some((child) => child.status !== 'completed')) {
    return;
  }

  const now = new Date().toISOString();
  await db
    .update(tasks)
    .set({
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(tasks.id, parentId));
}

export function registerTaskHandlers() {
  // 创建任务
  ipcMain.handle('task:create', async (_, data) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const task = {
      id: randomUUID(),
      ...normalizeTaskInput(data),
      status: 'todo' as const,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      actualPomodoros: 0,
      recurrenceParentId: null,
      recurrenceCount: 0,
    };

    await db.insert(tasks).values(task);
    return task;
  });

  // 更新任务
  ipcMain.handle('task:update', async (_, id, updates) => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existing) {
      throw new Error('Task not found');
    }

    const normalized = normalizeTaskInput({ ...existing, ...updates });
    const updateData: any = {
      updatedAt: now,
    };

    for (const key of Object.keys(updates)) {
      if (key in normalized) {
        updateData[key] = (normalized as any)[key];
      } else {
        updateData[key] = updates[key];
      }
    }

    if (updates.status === 'completed' && !updates.completedAt) {
      updateData.completedAt = now;
    } else if (updates.status && updates.status !== 'completed') {
      updateData.completedAt = null;
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, id));

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));

    if (existing.status !== 'completed' && updates.status === 'completed') {
      await RecurrenceEngine.generateNextInstance(id);
      await completeParentIfAllChildrenDone(db, updated.parentId);
    }

    return updated;
  });

  // 删除任务
  ipcMain.handle('task:delete', async (_, id) => {
    const db = await getDatabase();
    await deleteTaskCascade(db, id);
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
      query = query.where(and(...conditions)) as any;
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
