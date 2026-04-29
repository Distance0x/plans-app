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
  scheduledStartTime: text('scheduled_start_time'),
  scheduledEndTime: text('scheduled_end_time'),
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
  sessionId: text('session_id').notNull(),
  title: text('title'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  lastResponseId: text('last_response_id'),
  summary: text('summary'),
  parentMessageId: text('parent_message_id'),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiMessages = sqliteTable('ai_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  thinking: text('thinking'),
  toolCalls: text('tool_calls'), // JSON string
  draftActions: text('draft_actions'), // JSON string
  timestamp: integer('timestamp').notNull(),
  createdAt: text('created_at').notNull(),
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

// 用户画像 - 行为习惯统计
export const userBehaviorStats = sqliteTable('user_behavior_stats', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD
  // 任务完成统计
  tasksCreated: integer('tasks_created').default(0),
  tasksCompleted: integer('tasks_completed').default(0),
  completionRate: integer('completion_rate').default(0), // 百分比
  // 时间分布（JSON: {hour: count}）
  hourlyDistribution: text('hourly_distribution'),
  // 优先级分布（JSON: {high: n, medium: n, low: n}）
  priorityDistribution: text('priority_distribution'),
  // 番茄钟统计
  pomodoroCompleted: integer('pomodoro_completed').default(0),
  focusMinutes: integer('focus_minutes').default(0),
  // AI 交互统计
  aiConversations: integer('ai_conversations').default(0),
  aiTasksGenerated: integer('ai_tasks_generated').default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 用户画像 - 标签偏好
export const userTagPreferences = sqliteTable('user_tag_preferences', {
  tagId: text('tag_id').notNull(),
  usageCount: integer('usage_count').default(0),
  lastUsedAt: text('last_used_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// 用户画像 - 时间偏好分析
export const userTimePreferences = sqliteTable('user_time_preferences', {
  id: text('id').primaryKey(),
  // 高效时段（JSON: [9, 10, 14, 15]）
  productiveHours: text('productive_hours'),
  // 平均任务时长（分钟）
  avgTaskDuration: integer('avg_task_duration').default(60),
  // 连续完成天数
  streakDays: integer('streak_days').default(0),
  lastStreakDate: text('last_streak_date'),
  // 周工作模式（JSON: {monday: {start: "09:00", end: "18:00"}, ...}）
  weeklyPattern: text('weekly_pattern'),
  updatedAt: text('updated_at').notNull(),
});
