import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority', { enum: ['high', 'medium', 'low'] }).default('medium'),
  status: text('status', { enum: ['todo', 'in_progress', 'completed'] }).default('todo'),
  dueDate: text('due_date'),
  dueTime: text('due_time'),
  duration: integer('duration').default(60),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  completedAt: text('completed_at'),
  parentId: text('parent_id'),
  listId: text('list_id').default('inbox'),
  orderIndex: integer('order_index').default(0),
  estimatedPomodoros: integer('estimated_pomodoros').default(0),
  actualPomodoros: integer('actual_pomodoros').default(0),
  notes: text('notes'),
  attachments: text('attachments'), // JSON string
  // 重复规则
  recurrenceRule: text('recurrence_rule'), // JSON string
  recurrenceParentId: text('recurrence_parent_id'), // 原始重复任务 ID
  recurrenceCount: integer('recurrence_count').default(0), // 已生成次数
});

export const lists = sqliteTable('lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').default('#3B82F6'),
  orderIndex: integer('order_index').default(0),
  archivedAt: text('archived_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const pomodoroSessions = sqliteTable('pomodoro_sessions', {
  id: text('id').primaryKey(),
  taskId: text('task_id'),
  sessionType: text('session_type', { enum: ['work', 'short_break', 'long_break'] }).notNull(),
  duration: integer('duration').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  interrupted: integer('interrupted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').default('#3B82F6'),
  createdAt: text('created_at').notNull(),
});

export const taskTags = sqliteTable('task_tags', {
  taskId: text('task_id').notNull(),
  tagId: text('tag_id').notNull(),
});

export const savedFilters = sqliteTable('saved_filters', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  rules: text('rules').notNull(), // JSON string
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  triggerAt: text('trigger_at').notNull(),
  type: text('type', { enum: ['due', 'before_due', 'custom'] }).default('due'),
  channel: text('channel', { enum: ['notification', 'sound', 'both'] }).default('notification'),
  state: text('state', { enum: ['pending', 'fired', 'cancelled'] }).default('pending'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiThreads = sqliteTable('ai_threads', {
  id: text('id').primaryKey(),
  title: text('title'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  lastResponseId: text('last_response_id'),
  summary: text('summary'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiActionsLog = sqliteTable('ai_actions_log', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull(),
  actionType: text('action_type').notNull(),
  payloadJson: text('payload_json').notNull(),
  applied: integer('applied', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

export const planSnapshots = sqliteTable('plan_snapshots', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  snapshotJson: text('snapshot_json').notNull(),
  createdAt: text('created_at').notNull(),
});

export const scheduleConstraints = sqliteTable('schedule_constraints', {
  date: text('date').primaryKey(),
  workStart: text('work_start'),
  workEnd: text('work_end'),
  focusBlockMin: integer('focus_block_min').default(25),
  breakMin: integer('break_min').default(5),
  noScheduleJson: text('no_schedule_json'),
  energyLevel: text('energy_level', { enum: ['low', 'normal', 'high'] }),
});

export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull(),
  originalName: text('original_name').notNull(),
  storedPath: text('stored_path').notNull(),
  mimeType: text('mime_type'),
  size: integer('size'),
  createdAt: text('created_at').notNull(),
});
