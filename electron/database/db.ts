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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      parent_id TEXT,
      order_index INTEGER DEFAULT 0,
      estimated_pomodoros INTEGER DEFAULT 0,
      actual_pomodoros INTEGER DEFAULT 0
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

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_task_id ON pomodoro_sessions(task_id);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_start_time ON pomodoro_sessions(start_time);
  `);

  // 插入默认设置
  const now = new Date().toISOString();
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

export { schema };
