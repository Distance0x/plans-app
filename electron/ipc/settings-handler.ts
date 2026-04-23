import { ipcMain, nativeTheme } from 'electron';
import { getDatabase } from '../database/db';
import { settings } from '../database/schema';

function parseValue(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', async () => {
    const db = await getDatabase();
    const rows = await db.select().from(settings);

    return Object.fromEntries(rows.map((row) => [row.key, parseValue(row.value)]));
  });

  ipcMain.handle('settings:update', async (_, updates: Record<string, unknown>) => {
    const db = await getDatabase();
    const now = new Date().toISOString();

    for (const [key, value] of Object.entries(updates)) {
      const serialized = JSON.stringify(value);
      await db
        .insert(settings)
        .values({ key, value: serialized, updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: serialized, updatedAt: now },
        });
    }

    if (updates.theme) {
      nativeTheme.themeSource = updates.theme as 'system' | 'light' | 'dark';
    }

    const rows = await db.select().from(settings);
    return Object.fromEntries(rows.map((row) => [row.key, parseValue(row.value)]));
  });
}
