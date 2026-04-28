import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';
import * as schema from './schema';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: ReturnType<typeof drizzle> | null = null;
let sqlDb: SqlJsDatabase | null = null;

export async function getDatabase() {
  if (db) return db;

  // 初始化 sql.js
  const SQL = await initSqlJs();

  // 获取用户数据目录
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'plans-app.db');

  // 确保目录存在
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  // 加载或创建数据库
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = drizzle(sqlDb, { schema });

  // 初始化数据库
  initDatabase(sqlDb);

  // 定期保存数据库
  setInterval(() => {
    if (sqlDb) {
      const data = sqlDb.export();
      fs.writeFileSync(dbPath, data);
    }
  }, 5000);

  return db;
}

function initDatabase(sqlDb: SqlJsDatabase) {
  // 创建表
  sqlDb.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT CHECK(priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
      status TEXT CHECK(status IN ('todo', 'in_progress', 'completed')) DEFAULT 'todo',
      due_date TEXT,
      due_time TEXT,
      duration INTEGER DEFAULT 60,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      parent_id TEXT,
      list_id TEXT DEFAULT 'inbox',
      order_index INTEGER DEFAULT 0,
      estimated_pomodoros INTEGER DEFAULT 0,
      actual_pomodoros INTEGER DEFAULT 0,
      notes TEXT,
      attachments TEXT,
      recurrence_rule TEXT,
      recurrence_parent_id TEXT,
      recurrence_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      trigger_at TEXT NOT NULL,
      type TEXT CHECK(type IN ('due', 'before_due', 'custom')) DEFAULT 'due',
      channel TEXT CHECK(channel IN ('notification', 'sound', 'both')) DEFAULT 'notification',
      state TEXT CHECK(state IN ('pending', 'fired', 'cancelled')) DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      session_type TEXT CHECK(session_type IN ('work', 'short_break', 'long_break')) NOT NULL,
      duration INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      completed INTEGER DEFAULT 0,
      interrupted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      order_index INTEGER DEFAULT 0,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (task_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS saved_filters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rules TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plan_snapshots (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_threads (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      title TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      last_response_id TEXT,
      summary TEXT,
      parent_message_id TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_actions_log (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      applied INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_constraints (
      date TEXT PRIMARY KEY,
      work_start TEXT,
      work_end TEXT,
      focus_block_min INTEGER DEFAULT 25,
      break_min INTEGER DEFAULT 5,
      no_schedule_json TEXT,
      energy_level TEXT CHECK(energy_level IN ('low', 'normal', 'high'))
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_state_trigger ON reminders(state, trigger_at);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_task_id ON pomodoro_sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_start_time ON pomodoro_sessions(start_time);
    CREATE INDEX IF NOT EXISTS idx_saved_filters_name ON saved_filters(name);
    CREATE INDEX IF NOT EXISTS idx_ai_threads_session_id ON ai_threads(session_id);
  `);

  ensureColumn(sqlDb, 'tasks', 'duration', 'INTEGER DEFAULT 60');
  ensureColumn(sqlDb, 'tasks', 'list_id', "TEXT DEFAULT 'inbox'");
  ensureColumn(sqlDb, 'tasks', 'notes', 'TEXT');
  ensureColumn(sqlDb, 'tasks', 'attachments', 'TEXT');
  ensureColumn(sqlDb, 'tasks', 'recurrence_rule', 'TEXT');
  ensureColumn(sqlDb, 'tasks', 'recurrence_parent_id', 'TEXT');
  ensureColumn(sqlDb, 'tasks', 'recurrence_count', 'INTEGER DEFAULT 0');
  ensureColumn(sqlDb, 'ai_threads', 'session_id', "TEXT NOT NULL DEFAULT 'default'");
  ensureColumn(sqlDb, 'ai_threads', 'parent_message_id', 'TEXT');
  ensureColumn(sqlDb, 'ai_threads', 'metadata', 'TEXT');
  sqlDb.run('CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id)');
  sqlDb.run('CREATE INDEX IF NOT EXISTS idx_ai_threads_session_id ON ai_threads(session_id)');

  // 插入默认设置
  const now = new Date().toISOString();
  sqlDb.run(
    `INSERT OR IGNORE INTO lists (id, name, color, order_index, archived_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['inbox', '收集箱', '#64748B', 0, null, now, now]
  );
  sqlDb.run('UPDATE tasks SET list_id = ? WHERE list_id IS NULL OR list_id = ?', ['inbox', '']);

  const defaultSettings = [
    ['theme', '"light"'],
    ['workDuration', '1500'],
    ['shortBreakDuration', '300'],
    ['longBreakDuration', '1800'],
    ['pomodorosUntilLongBreak', '4'],
    ['soundEnabled', 'true'],
    ['notificationEnabled', 'true'],
  ];

  for (const [key, value] of defaultSettings) {
    sqlDb.run(
      'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
      [key, value, now]
    );
  }
}

function ensureColumn(sqlDb: SqlJsDatabase, table: string, column: string, definition: string) {
  const tableInfo = sqlDb.exec(`PRAGMA table_info(${table})`);
  const columns = tableInfo[0]?.values.map((row) => row[1]) ?? [];

  if (!columns.includes(column)) {
    sqlDb.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export { schema };
