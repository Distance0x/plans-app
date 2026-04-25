import { ipcMain } from 'electron';
import { getDatabase } from '../database/db';
import { reminders, tags, taskTags, tasks } from '../database/schema';
import { and, eq, like, or, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { RecurrenceEngine } from '../services/recurrence-engine';
import { broadcastToWindows } from '../utils/window-broadcast';

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
    listId: emptyToNull(data.listId) || 'inbox',
    orderIndex: data.orderIndex || 0,
    estimatedPomodoros: data.estimatedPomodoros || 0,
    notes: emptyToNull(data.notes),
    attachments: data.attachments ? JSON.stringify(data.attachments) : null,
    recurrenceRule,
  };
}

async function enrichTasksWithTags(db: Awaited<ReturnType<typeof getDatabase>>, taskRows: any[]) {
  if (taskRows.length === 0) return taskRows;

  const allTags = await db.select().from(tags);
  const tagMap = new Map(allTags.map((tag) => [tag.id, tag]));
  const allTaskTags = await db.select().from(taskTags);
  const tagsByTask = new Map<string, any[]>();

  for (const relation of allTaskTags) {
    const tag = tagMap.get(relation.tagId);
    if (!tag) continue;

    const current = tagsByTask.get(relation.taskId) || [];
    current.push(tag);
    tagsByTask.set(relation.taskId, current);
  }

  return taskRows.map((task) => ({
    ...task,
    tags: tagsByTask.get(task.id) || [],
  }));
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
  await db.delete(taskTags).where(eq(taskTags.taskId, id));
}

async function completeChildTasks(db: Awaited<ReturnType<typeof getDatabase>>, parentId: string) {
  const now = new Date().toISOString();
  const childTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.parentId, parentId));

  for (const child of childTasks) {
    await completeChildTasks(db, child.id);
  }

  await db
    .update(tasks)
    .set({
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(tasks.parentId, parentId));
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

    if (Array.isArray(data.tagIds) && data.tagIds.length > 0) {
      await db.insert(taskTags).values(
        Array.from(new Set(data.tagIds)).map((tagId) => ({
          taskId: task.id,
          tagId: String(tagId),
        }))
      );
    }

    const [enriched] = await enrichTasksWithTags(db, [task]);
    broadcastToWindows('tasks:changed');
    return enriched;
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
      if (key === 'tagIds' || key === 'tags') {
        continue;
      }

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

    if (Array.isArray(updates.tagIds)) {
      await db.delete(taskTags).where(eq(taskTags.taskId, id));
      const uniqueTagIds = Array.from(new Set(updates.tagIds));
      if (uniqueTagIds.length > 0) {
        await db.insert(taskTags).values(
          uniqueTagIds.map((tagId) => ({
            taskId: id,
            tagId: String(tagId),
          }))
        );
      }
    }

    const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));

    if (existing.status !== 'completed' && updates.status === 'completed') {
      await RecurrenceEngine.generateNextInstance(id);
      await completeChildTasks(db, id);
    }

    const [enriched] = await enrichTasksWithTags(db, [updated]);
    broadcastToWindows('tasks:changed');
    return enriched;
  });

  // 删除任务
  ipcMain.handle('task:delete', async (_, id) => {
    const db = await getDatabase();
    await deleteTaskCascade(db, id);
    broadcastToWindows('tasks:changed');
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

    if (filters.listId) {
      conditions.push(eq(tasks.listId, filters.listId));
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

    let result = await query;

    if (filters.tagId) {
      const relations = await db.select().from(taskTags).where(eq(taskTags.tagId, filters.tagId));
      const taskIds = new Set(relations.map((relation) => relation.taskId));
      result = result.filter((task) => taskIds.has(task.id));
    }

    return await enrichTasksWithTags(db, result);
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
          like(tasks.description, `%${searchQuery}%`),
          like(tasks.notes, `%${searchQuery}%`)
        )
      );
    return await enrichTasksWithTags(db, result);
  });
}
