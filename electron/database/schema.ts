import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority', { enum: ['high', 'medium', 'low'] }).default('medium'),
  status: text('status', { enum: ['todo', 'in_progress', 'completed'] }).default('todo'),
  dueDate: text('due_date'),
  dueTime: text('due_time'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  completedAt: text('completed_at'),
  parentId: text('parent_id'),
  orderIndex: integer('order_index').default(0),
  estimatedPomodoros: integer('estimated_pomodoros').default(0),
  actualPomodoros: integer('actual_pomodoros').default(0),
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
