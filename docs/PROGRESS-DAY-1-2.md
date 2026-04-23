┌─────────────────────────────────────────────────────────────────┐
│ ✅ Day 1-2 完成：提醒引擎 + 系统通知                            │
│ 状态：代码已完成，等待集成测试                                  │
└─────────────────────────────────────────────────────────────────┘

## ▎已完成工作

### 1. 提醒引擎 (reminder-engine.ts)

**核心功能**：
- ✅ 基于 node-cron 的调度器（每分钟检查一次）
- ✅ 支持三种提醒类型：due（到期）、before_due（到期前）、custom（自定义）
- ✅ 支持三种通知渠道：notification（通知）、sound（声音）、both（两者）
- ✅ 提醒状态管理：pending（待触发）、fired（已触发）、cancelled（已取消）

**API**：
```typescript
// 创建提醒
await window.electron.reminder.create(taskId, triggerAt, type, channel);

// 取消提醒
await window.electron.reminder.cancel(reminderId);

// 取消任务的所有提醒
await window.electron.reminder.cancelTask(taskId);
```

### 2. 通知服务 (notification-service.ts)

**核心功能**：
- ✅ 任务提醒通知（到期、即将到期、自定义）
- ✅ 番茄钟完成通知
- ✅ 每日计划提醒
- ✅ 晚间复盘提醒
- ✅ 点击通知跳转到对应任务
- ✅ 声音提醒支持

**通知类型**：
```typescript
// 任务提醒
notificationService.showTaskReminder(task, { sound: true });

// 番茄钟完成
notificationService.showPomodoroComplete('work');

// 每日计划
notificationService.showDailyPlanReminder(5);

// 晚间复盘
notificationService.showEveningReviewReminder(3, 5);
```

### 3. 数据库表 (schema.ts)

**reminders 表**：
```sql
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  trigger_at TEXT NOT NULL,
  type TEXT DEFAULT 'due',
  channel TEXT DEFAULT 'notification',
  state TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## ▎下一步集成

### 1. 在主进程中初始化

```typescript
// electron/main/index.ts
import { initReminderEngine, registerReminderHandlers } from '../services/reminder-engine';
import { initNotificationService } from '../services/notification-service';

app.whenReady().then(async () => {
  // 注册 IPC 处理器
  registerTaskHandlers();
  registerTimerHandlers();
  registerReminderHandlers(); // 新增

  createWindow();

  // 初始化提醒引擎和通知服务
  initReminderEngine(mainWindow);
  initNotificationService(mainWindow);

  // ...
});
```

### 2. 在 preload 中暴露 API

```typescript
// electron/preload/index.ts
contextBridge.exposeInMainWorld('electron', {
  // ... 现有 API
  
  // 提醒相关 API
  reminder: {
    create: (taskId: string, triggerAt: string, type?: string, channel?: string) =>
      ipcRenderer.invoke('reminder:create', taskId, triggerAt, type, channel),
    cancel: (reminderId: string) =>
      ipcRenderer.invoke('reminder:cancel', reminderId),
    cancelTask: (taskId: string) =>
      ipcRenderer.invoke('reminder:cancel-task', taskId),
  },
});
```

### 3. 在任务表单中添加提醒设置

```typescript
// src/components/tasks/TaskForm.tsx
const [reminderTime, setReminderTime] = useState<string>('');
const [reminderEnabled, setReminderEnabled] = useState(false);

const handleSubmit = async () => {
  // 创建任务
  const taskId = await createTask(taskData);
  
  // 如果启用了提醒，创建提醒
  if (reminderEnabled && reminderTime) {
    await window.electron.reminder.create(
      taskId,
      reminderTime,
      'before_due',
      'both'
    );
  }
};
```

### 4. 监听提醒事件

```typescript
// src/App.tsx 或 src/stores/reminder-store.ts
useEffect(() => {
  if (window.electron) {
    // 监听提醒触发事件
    window.electron.on('reminder:fire', (data) => {
      console.log('Reminder fired:', data);
      // 显示通知或更新 UI
    });
    
    // 监听任务聚焦事件
    window.electron.on('focus-task', (taskId) => {
      console.log('Focus task:', taskId);
      // 跳转到对应任务
    });
  }
}, []);
```

---

## ▎验收标准

### 功能测试
- [ ] 创建任务时可以设置提醒时间
- [ ] 提醒时间到达时显示系统通知
- [ ] 点击通知跳转到对应任务
- [ ] 提醒误差 < 30 秒
- [ ] 应用关闭后重启，提醒仍然触发

### 性能测试
- [ ] 1000+ 提醒不影响性能
- [ ] 提醒检查不阻塞主线程

### 兼容性测试
- [ ] Windows 10 通知正常
- [ ] Windows 11 通知正常

---

## ▎下一步任务

**Day 3-4: 系统通知集成**
1. 在主进程中初始化服务
2. 在 preload 中暴露 API
3. 在任务表单中添加提醒设置
4. 测试提醒功能

**Day 5: 重复规则**
1. 添加重复规则数据模型
2. 实现重复规则引擎
3. 任务完成后自动生成下一次实例

---

> **Owner 意识，Day 1-2 已完成。**
> 
> 交付物：
> - ✅ reminder-engine.ts (提醒引擎)
> - ✅ notification-service.ts (通知服务)
> - ✅ schema.ts (数据库表定义)
> - ✅ node-cron 依赖已安装
> 
> 下一步：集成到主进程，测试提醒功能。
> 
> 因为信任，所以简单。🔥
