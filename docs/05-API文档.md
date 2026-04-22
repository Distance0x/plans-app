# API 文档

## IPC 通信接口

### 任务管理 API

#### task:create
创建新任务

**请求**:
```typescript
interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;  // ISO 8601
  dueTime?: string;  // HH:MM
  parentId?: string;
  tags?: string[];
}

ipcRenderer.invoke('task:create', data: CreateTaskRequest)
```

**响应**:
```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'completed';
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  parentId?: string;
  orderIndex: number;
  estimatedPomodoros: number;
  actualPomodoros: number;
}

Promise<Task>
```

#### task:update
更新任务

**请求**:
```typescript
ipcRenderer.invoke('task:update', taskId: string, updates: Partial<Task>)
```

**响应**:
```typescript
Promise<Task>
```

#### task:delete
删除任务

**请求**:
```typescript
ipcRenderer.invoke('task:delete', taskId: string)
```

**响应**:
```typescript
Promise<void>
```

#### task:list
获取任务列表

**请求**:
```typescript
interface TaskFilters {
  status?: 'todo' | 'in_progress' | 'completed';
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
  dueDate?: string;
  parentId?: string | null;
}

ipcRenderer.invoke('task:list', filters?: TaskFilters)
```

**响应**:
```typescript
Promise<Task[]>
```

#### task:search
搜索任务

**请求**:
```typescript
ipcRenderer.invoke('task:search', query: string)
```

**响应**:
```typescript
Promise<Task[]>
```

### 番茄钟 API

#### timer:start
开始番茄钟

**请求**:
```typescript
ipcRenderer.invoke('timer:start', taskId?: string)
```

**响应**:
```typescript
Promise<void>
```

#### timer:pause
暂停番茄钟

**请求**:
```typescript
ipcRenderer.invoke('timer:pause')
```

**响应**:
```typescript
Promise<void>
```

#### timer:resume
恢复番茄钟

**请求**:
```typescript
ipcRenderer.invoke('timer:resume')
```

**响应**:
```typescript
Promise<void>
```

#### timer:reset
重置番茄钟

**请求**:
```typescript
ipcRenderer.invoke('timer:reset')
```

**响应**:
```typescript
Promise<void>
```

#### timer:skip
跳过当前阶段

**请求**:
```typescript
ipcRenderer.invoke('timer:skip')
```

**响应**:
```typescript
Promise<void>
```

#### timer:status
获取番茄钟状态

**请求**:
```typescript
ipcRenderer.invoke('timer:status')
```

**响应**:
```typescript
interface TimerStatus {
  status: 'idle' | 'running' | 'paused';
  sessionType: 'work' | 'short_break' | 'long_break';
  timeLeft: number;  // 秒
  totalTime: number;  // 秒
  completedPomodoros: number;
  currentTaskId?: string;
}

Promise<TimerStatus>
```

#### timer:stats
获取番茄钟统计

**请求**:
```typescript
interface StatsRequest {
  startDate: string;  // ISO 8601
  endDate: string;    // ISO 8601
}

ipcRenderer.invoke('timer:stats', request: StatsRequest)
```

**响应**:
```typescript
interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  totalDuration: number;  // 秒
  byDate: {
    date: string;
    count: number;
    duration: number;
  }[];
}

Promise<PomodoroStats>
```

### 标签 API

#### tag:create
创建标签

**请求**:
```typescript
interface CreateTagRequest {
  name: string;
  color?: string;  // HEX color
}

ipcRenderer.invoke('tag:create', data: CreateTagRequest)
```

**响应**:
```typescript
interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

Promise<Tag>
```

#### tag:list
获取所有标签

**请求**:
```typescript
ipcRenderer.invoke('tag:list')
```

**响应**:
```typescript
Promise<Tag[]>
```

#### tag:delete
删除标签

**请求**:
```typescript
ipcRenderer.invoke('tag:delete', tagId: string)
```

**响应**:
```typescript
Promise<void>
```

### 设置 API

#### settings:get
获取设置

**请求**:
```typescript
ipcRenderer.invoke('settings:get')
```

**响应**:
```typescript
interface Settings {
  theme: 'light' | 'dark' | 'system';
  workDuration: number;  // 秒
  shortBreakDuration: number;  // 秒
  longBreakDuration: number;  // 秒
  pomodorosUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  notificationEnabled: boolean;
  startOnBoot: boolean;
}

Promise<Settings>
```

#### settings:update
更新设置

**请求**:
```typescript
ipcRenderer.invoke('settings:update', updates: Partial<Settings>)
```

**响应**:
```typescript
Promise<Settings>
```

### 数据备份 API

#### data:export
导出数据

**请求**:
```typescript
ipcRenderer.invoke('data:export', filePath: string)
```

**响应**:
```typescript
Promise<void>
```

#### data:import
导入数据

**请求**:
```typescript
ipcRenderer.invoke('data:import', filePath: string)
```

**响应**:
```typescript
Promise<void>
```

## IPC 事件监听

### timer:tick
番茄钟计时更新

**事件数据**:
```typescript
interface TimerTickEvent {
  timeLeft: number;
  totalTime: number;
  sessionType: 'work' | 'short_break' | 'long_break';
}

ipcRenderer.on('timer:tick', (event, data: TimerTickEvent) => {
  // 处理计时更新
});
```

### timer:complete
番茄钟完成

**事件数据**:
```typescript
interface TimerCompleteEvent {
  sessionType: 'work' | 'short_break' | 'long_break';
  nextSessionType: 'work' | 'short_break' | 'long_break';
  completedPomodoros: number;
}

ipcRenderer.on('timer:complete', (event, data: TimerCompleteEvent) => {
  // 处理完成事件
});
```

### task:updated
任务更新通知

**事件数据**:
```typescript
ipcRenderer.on('task:updated', (event, task: Task) => {
  // 处理任务更新
});
```

## 错误处理

所有 IPC 调用可能抛出以下错误：

```typescript
interface IPCError {
  code: string;
  message: string;
  details?: any;
}
```

### 错误代码

- `VALIDATION_ERROR`: 参数验证失败
- `NOT_FOUND`: 资源不存在
- `DATABASE_ERROR`: 数据库操作失败
- `PERMISSION_DENIED`: 权限不足
- `INTERNAL_ERROR`: 内部错误

### 错误处理示例

```typescript
try {
  const task = await window.electron.task.create(data);
} catch (error) {
  if (error.code === 'VALIDATION_ERROR') {
    // 处理验证错误
  } else if (error.code === 'DATABASE_ERROR') {
    // 处理数据库错误
  } else {
    // 处理其他错误
  }
}
```
