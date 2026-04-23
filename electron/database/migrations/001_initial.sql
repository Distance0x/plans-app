-- 初始化数据库
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_state_trigger ON reminders(state, trigger_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_task_id ON pomodoro_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_start_time ON pomodoro_sessions(start_time);

-- 插入默认设置
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('theme', '"light"', datetime('now')),
  ('workDuration', '1500', datetime('now')),
  ('shortBreakDuration', '300', datetime('now')),
  ('longBreakDuration', '1800', datetime('now')),
  ('pomodorosUntilLongBreak', '4', datetime('now')),
  ('soundEnabled', 'true', datetime('now')),
  ('notificationEnabled', 'true', datetime('now'));
