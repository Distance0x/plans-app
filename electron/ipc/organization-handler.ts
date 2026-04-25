import { ipcMain } from 'electron';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../database/db';
import { lists, savedFilters, tags, taskTags, tasks } from '../database/schema';
import { broadcastToWindows } from '../utils/window-broadcast';

const DEFAULT_LIST_ID = 'inbox';

function normalizeName(value: unknown) {
  return String(value || '').trim();
}

export function registerOrganizationHandlers() {
  ipcMain.handle('list:list', async () => {
    const db = await getDatabase();
    return await db.select().from(lists);
  });

  ipcMain.handle('list:create', async (_, data) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const name = normalizeName(data?.name);

    if (!name) {
      throw new Error('List name is required');
    }

    const list = {
      id: randomUUID(),
      name,
      color: data?.color || '#3B82F6',
      orderIndex: Number(data?.orderIndex || 0),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(lists).values(list);
    broadcastToWindows('lists:changed');
    return list;
  });

  ipcMain.handle('list:update', async (_, id, updates) => {
    if (id === DEFAULT_LIST_ID && updates?.archivedAt) {
      throw new Error('Default inbox cannot be archived');
    }

    const db = await getDatabase();
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if ('name' in updates) updateData.name = normalizeName(updates.name);
    if ('color' in updates) updateData.color = updates.color;
    if ('orderIndex' in updates) updateData.orderIndex = Number(updates.orderIndex || 0);
    if ('archivedAt' in updates) updateData.archivedAt = updates.archivedAt;

    await db.update(lists).set(updateData).where(eq(lists.id, id));
    const [updated] = await db.select().from(lists).where(eq(lists.id, id));
    broadcastToWindows('lists:changed');
    return updated;
  });

  ipcMain.handle('list:delete', async (_, id) => {
    if (id === DEFAULT_LIST_ID) {
      throw new Error('Default inbox cannot be deleted');
    }

    const db = await getDatabase();
    await db.update(tasks).set({ listId: DEFAULT_LIST_ID }).where(eq(tasks.listId, id));
    await db.delete(lists).where(eq(lists.id, id));
    broadcastToWindows('lists:changed');
    broadcastToWindows('tasks:changed');
  });

  ipcMain.handle('tag:list', async () => {
    const db = await getDatabase();
    return await db.select().from(tags);
  });

  ipcMain.handle('tag:create', async (_, data) => {
    const db = await getDatabase();
    const name = normalizeName(data?.name);

    if (!name) {
      throw new Error('Tag name is required');
    }

    const existing = await db.select().from(tags).where(eq(tags.name, name));
    if (existing[0]) {
      return existing[0];
    }

    const tag = {
      id: randomUUID(),
      name,
      color: data?.color || '#3B82F6',
      createdAt: new Date().toISOString(),
    };

    await db.insert(tags).values(tag);
    broadcastToWindows('tags:changed');
    return tag;
  });

  ipcMain.handle('tag:update', async (_, id, updates) => {
    const db = await getDatabase();
    const updateData: any = {};

    if ('name' in updates) updateData.name = normalizeName(updates.name);
    if ('color' in updates) updateData.color = updates.color;

    await db.update(tags).set(updateData).where(eq(tags.id, id));
    const [updated] = await db.select().from(tags).where(eq(tags.id, id));
    broadcastToWindows('tags:changed');
    return updated;
  });

  ipcMain.handle('tag:delete', async (_, id) => {
    const db = await getDatabase();
    await db.delete(taskTags).where(eq(taskTags.tagId, id));
    await db.delete(tags).where(eq(tags.id, id));
    broadcastToWindows('tags:changed');
    broadcastToWindows('tasks:changed');
  });

  ipcMain.handle('tag:set-task-tags', async (_, taskId, tagIds: string[]) => {
    const db = await getDatabase();
    const uniqueTagIds = Array.from(new Set(tagIds || []));

    await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
    if (uniqueTagIds.length > 0) {
      await db.insert(taskTags).values(
        uniqueTagIds.map((tagId) => ({
          taskId,
          tagId,
        }))
      );
    }

    broadcastToWindows('tasks:changed');
    return uniqueTagIds;
  });

  ipcMain.handle('saved-filter:list', async () => {
    const db = await getDatabase();
    return await db.select().from(savedFilters);
  });

  ipcMain.handle('saved-filter:create', async (_, data) => {
    const db = await getDatabase();
    const name = normalizeName(data?.name);

    if (!name) {
      throw new Error('Filter name is required');
    }

    const now = new Date().toISOString();
    const filter = {
      id: randomUUID(),
      name,
      rules: JSON.stringify(data?.rules || {}),
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(savedFilters).values(filter);
    broadcastToWindows('saved-filters:changed');
    return filter;
  });

  ipcMain.handle('saved-filter:update', async (_, id, updates) => {
    const db = await getDatabase();
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if ('name' in updates) updateData.name = normalizeName(updates.name);
    if ('rules' in updates) updateData.rules = JSON.stringify(updates.rules || {});

    await db.update(savedFilters).set(updateData).where(eq(savedFilters.id, id));
    const [updated] = await db.select().from(savedFilters).where(eq(savedFilters.id, id));
    broadcastToWindows('saved-filters:changed');
    return updated;
  });

  ipcMain.handle('saved-filter:delete', async (_, id) => {
    const db = await getDatabase();
    await db.delete(savedFilters).where(eq(savedFilters.id, id));
    broadcastToWindows('saved-filters:changed');
  });
}
