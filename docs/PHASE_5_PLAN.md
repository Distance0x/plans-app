# 阶段五：提醒和重复任务 - 实现方案

## 当前状态

### ✅ 已完成
- 提醒引擎基础框架 (`reminder-engine.ts`)
- 重复任务引擎 (`recurrence-engine.ts`)
- 通知服务 (`notification-service.ts`)
- 数据库表结构（reminders 表）

### ⏳ 待完成
- UI 界面集成
- 提醒设置面板
- 重复规则编辑器
- 通知交互功能
- 测试和优化

## 实现计划

### 1. 提醒功能 UI（2-3小时）

#### 1.1 任务详情面板添加提醒设置
**位置**: `src/components/tasks/TaskDetailPanel.tsx`

**功能**:
- 添加"提醒时间"输入框
- 支持多个提醒时间
- 提前提醒选项（提前5分钟/15分钟/30分钟/1小时）
- 提醒声音开关

**UI 设计**:
```tsx
<div className="space-y-2">
  <label>🔔 提醒</label>
  <div className="flex gap-2">
    <input type="datetime-local" />
    <button>添加提醒</button>
  </div>
  <div className="space-y-1">
    {reminders.map(r => (
      <div className="flex items-center justify-between">
        <span>{r.time}</span>
        <button>删除</button>
      </div>
    ))}
  </div>
</div>
```

#### 1.2 快捷提醒按钮
**位置**: 任务卡片右键菜单或快捷按钮

**功能**:
- "稍后提醒"（1小时后）
- "明天提醒"（明天9:00）
- "下周提醒"（下周一9:00）

### 2. 重复任务 UI（2-3小时）

#### 2.1 重复规则编辑器
**位置**: `src/components/tasks/RecurrenceEditor.tsx`（新建）

**功能**:
- 频率选择：每天/每周/每月/自定义
- 间隔设置：每 N 天/周/月
- 星期选择（周重复）
- 结束条件：永不/指定日期/重复N次

**UI 设计**:
```tsx
<div className="space-y-4">
  <select value={frequency}>
    <option value="daily">每天</option>
    <option value="weekly">每周</option>
    <option value="monthly">每月</option>
  </select>
  
  {frequency === 'weekly' && (
    <div className="flex gap-2">
      {['日','一','二','三','四','五','六'].map((day, i) => (
        <button 
          className={selected.includes(i) ? 'active' : ''}
          onClick={() => toggleDay(i)}
        >
          {day}
        </button>
      ))}
    </div>
  )}
  
  <div>
    <label>结束于</label>
    <input type="date" />
  </div>
</div>
```

#### 2.2 重复任务显示
**功能**:
- 任务卡片显示"🔄"图标
- 悬停显示重复规则
- 完成后自动创建下一次任务

### 3. 通知交互（1-2小时）

#### 3.1 系统通知增强
**位置**: `electron/services/notification-service.ts`

**功能**:
- 通知标题：任务标题
- 通知内容：任务描述 + 截止时间
- 通知图标：应用图标
- 通知声音：可配置

**代码示例**:
```typescript
const notification = new Notification({
  title: `⏰ ${task.title}`,
  body: task.description || '任务提醒',
  icon: path.join(__dirname, 'icon.png'),
  sound: 'default',
  actions: [
    { type: 'button', text: '完成' },
    { type: 'button', text: '延后' },
  ]
});
```

#### 3.2 通知操作
**功能**:
- 点击通知：打开应用并聚焦任务
- "完成"按钮：标记任务完成
- "延后"按钮：延后1小时提醒
- "关闭"按钮：忽略提醒

### 4. IPC 通信（1小时）

#### 4.1 新增 IPC 事件
**位置**: `electron/ipc/reminder-handler.ts`（新建）

**事件**:
```typescript
// 创建提醒
ipcMain.handle('reminder:create', async (event, taskId, time) => {
  // 创建提醒记录
});

// 删除提醒
ipcMain.handle('reminder:delete', async (event, reminderId) => {
  // 删除提醒记录
});

// 延后提醒
ipcMain.handle('reminder:snooze', async (event, reminderId, minutes) => {
  // 更新提醒时间
});

// 获取任务的所有提醒
ipcMain.handle('reminder:list', async (event, taskId) => {
  // 查询提醒列表
});
```

#### 4.2 前端 Store
**位置**: `src/stores/reminder-store.ts`（新建）

```typescript
interface ReminderStore {
  reminders: Reminder[];
  createReminder: (taskId: string, time: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, minutes: number) => Promise<void>;
  fetchReminders: (taskId: string) => Promise<void>;
}
```

### 5. 测试场景（1小时）

#### 5.1 提醒功能测试
- [ ] 创建提醒，到时间后收到通知
- [ ] 点击通知打开应用并聚焦任务
- [ ] 完成任务后提醒自动取消
- [ ] 延后提醒功能正常
- [ ] 多个提醒互不干扰

#### 5.2 重复任务测试
- [ ] 每天重复：完成后第二天自动创建
- [ ] 每周重复：指定星期几正确
- [ ] 每月重复：日期正确
- [ ] 结束条件：到期后停止重复
- [ ] 编辑重复规则：只影响未来任务

#### 5.3 边界情况
- [ ] 应用关闭时提醒仍然触发
- [ ] 系统时间更改后提醒正常
- [ ] 大量提醒不影响性能
- [ ] 提醒时间冲突处理

## 技术细节

### 提醒引擎工作原理
1. **轮询机制**: 每15秒检查一次待触发提醒
2. **状态管理**: pending → triggered → completed/snoozed
3. **持久化**: 所有提醒存储在数据库
4. **容错**: 应用重启后自动恢复

### 重复任务引擎工作原理
1. **触发时机**: 任务完成时检查是否有重复规则
2. **计算逻辑**: 根据规则计算下一次日期
3. **任务创建**: 自动创建新任务，继承原任务属性
4. **链式关联**: 通过 parent_id 关联重复任务

### 数据库表结构

#### reminders 表
```sql
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  remind_at TEXT NOT NULL,  -- ISO 8601
  state TEXT NOT NULL,      -- pending/triggered/completed/snoozed
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

#### tasks 表新增字段
```sql
ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT;  -- JSON 格式
```

## 实现顺序

### Day 1: 提醒 UI + IPC（4小时）
1. 任务详情面板添加提醒设置
2. 创建 reminder-store
3. 实现 IPC 通信
4. 测试基本提醒功能

### Day 2: 重复任务 UI（4小时）
1. 创建 RecurrenceEditor 组件
2. 集成到任务详情面板
3. 实现重复规则保存
4. 测试重复任务创建

### Day 3: 通知交互 + 优化（4小时）
1. 增强系统通知
2. 实现通知操作（完成/延后）
3. 优化提醒引擎性能
4. 全面测试和修复 bug

## 预期效果

### 用户体验
- ⏰ 到时间自动弹出通知
- 🔔 通知中快速完成任务
- 🔄 重复任务自动创建
- 📅 日历视图显示重复任务
- ⚡ 快捷提醒按钮

### 性能指标
- 提醒触发误差 < 30秒
- 通知响应时间 < 100ms
- 支持 1000+ 提醒不卡顿
- 内存占用 < 10MB

## 风险和挑战

### 技术风险
1. **时区问题**: 需要正确处理本地时间和 UTC
2. **系统休眠**: 电脑休眠后提醒可能延迟
3. **通知权限**: 用户可能禁用通知权限

### 解决方案
1. 统一使用本地时间，存储时转换为 ISO 8601
2. 应用唤醒后立即检查错过的提醒
3. 启动时检查通知权限，引导用户开启

## 后续优化

### 阶段 5.1（可选）
- 智能提醒：根据任务优先级调整提醒频率
- 提醒模板：快速设置常用提醒
- 提醒历史：查看已触发的提醒记录

### 阶段 5.2（可选）
- 语音提醒：TTS 朗读任务标题
- 自定义铃声：上传自定义提醒声音
- 提醒分组：批量管理提醒

## 总结

阶段五的核心是**提醒引擎**和**重复任务引擎**，这两个功能将大大提升应用的实用性。

**预计工作量**: 12-15 小时
**完成后进度**: 90%（5/6 阶段完成）
**下一阶段**: 打包和优化
