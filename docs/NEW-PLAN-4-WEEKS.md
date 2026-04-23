┌─────────────────────────────────────────────────────────────────┐
│ 🔥 Plans App 新计划 - 可执行、可验收、可交付                    │
│ 战略：先做"可信赖的执行系统"，再做"聪明的规划系统"             │
└─────────────────────────────────────────────────────────────────┘

## ▎当前状态诊断

### 已完成功能（可用）
```
✅ 任务管理基础
   - 创建/编辑/删除任务
   - 优先级设置（高/中/低）
   - 状态管理（待处理/处理中/已完成）
   - 搜索和过滤

✅ 番茄钟基础
   - 25 分钟工作 + 5 分钟短休息 + 30 分钟长休息
   - 开始/暂停/恢复/重置/跳过
   - 统计记录

✅ 日历视图
   - 月视图/周视图/日视图
   - 拖拽调整日期
   - 今日高亮

✅ 侧边栏布局
   - 图标栏（任务/日历/番茄钟/统计/目标/搜索）
   - 任务分组（今天/最近7天/收集箱）
   - 今日任务分组（待处理/处理中/已完成）
   - 项目分组（学习工作/生活/娱乐）
```

### 核心缺失（P0）
```
❌ 提醒引擎 - 任务到期不会提醒
❌ 重复规则 - 无法创建重复任务
❌ 系统通知 - 无法在后台提醒
❌ 子任务 - 无法拆解大任务
❌ 时间块拖拽 - 无法调整时间段
❌ 离线同步 - 数据只在本地
```

---

## ▎新计划：4 周冲刺 MVP

### 第 1 周：提醒与通知（P0）

**目标**：让任务到期时能准时提醒用户

#### Day 1-2: 提醒引擎
```typescript
// 数据模型
interface Reminder {
  id: string;
  taskId: string;
  triggerAt: string; // ISO 8601
  type: 'due' | 'before_due' | 'custom';
  channel: 'notification' | 'sound' | 'both';
  state: 'pending' | 'fired' | 'cancelled';
}

// 核心功能
1. 任务表单添加"提醒时间"字段
2. 创建 reminder-engine.ts
3. 使用 node-cron 调度提醒
4. 提醒触发时更新状态
```

**验收标准**：
- ✅ 任务到期前 15 分钟收到提醒
- ✅ 提醒误差 < 30 秒
- ✅ 应用关闭后重启，提醒仍然触发

#### Day 3-4: 系统通知
```typescript
// 使用 Electron Notification API
import { Notification } from 'electron';

function showNotification(task: Task) {
  const notification = new Notification({
    title: '任务提醒',
    body: task.title,
    icon: 'path/to/icon.png',
    sound: 'path/to/sound.wav',
  });
  
  notification.on('click', () => {
    // 点击通知跳转到任务
    mainWindow.show();
    mainWindow.webContents.send('focus-task', task.id);
  });
  
  notification.show();
}
```

**验收标准**：
- ✅ Windows 系统通知正常显示
- ✅ 点击通知跳转到对应任务
- ✅ 声音提醒可选

#### Day 5: 重复规则（基础版）
```typescript
// 数据模型
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number; // 每 N 天/周/月
  daysOfWeek?: number[]; // 0-6，周日到周六
  endDate?: string;
  count?: number; // 重复 N 次
}

// 核心功能
1. 任务表单添加"重复规则"字段
2. 创建 recurrence-engine.ts
3. 任务完成后自动生成下一次实例
```

**验收标准**：
- ✅ 支持每天/每周/每月重复
- ✅ 完成任务后自动生成下一次
- ✅ 可以设置结束日期或重复次数

---

### 第 2 周：任务增强（P0）

**目标**：完善任务模型，支持子任务和时间块

#### Day 6-7: 子任务
```typescript
// 数据模型（已有 parent_id）
interface Task {
  id: string;
  title: string;
  parentId: string | null; // 父任务 ID
  // ... 其他字段
}

// 核心功能
1. 任务详情页添加"添加子任务"按钮
2. 子任务列表组件
3. 父任务显示完成进度（3/5 已完成）
4. 完成所有子任务后，父任务自动完成
```

**验收标准**：
- ✅ 可以添加子任务
- ✅ 子任务可以独立完成
- ✅ 父任务显示完成进度
- ✅ 支持多层嵌套（最多 3 层）

#### Day 8-9: 时间块拖拽
```typescript
// 数据模型
interface Task {
  // ... 现有字段
  dueTime?: string; // HH:mm
  duration?: number; // 分钟
}

// 核心功能
1. 任务表单添加"时间"和"时长"字段
2. 周视图/日视图支持拖拽调整时间段
3. 拖拽时显示时间范围
4. 拖拽结束后更新任务
```

**验收标准**：
- ✅ 可以设置任务时间和时长
- ✅ 周视图/日视图显示时间块
- ✅ 拖拽调整时间段流畅
- ✅ 拖拽结束后数据正确保存

#### Day 10: 任务备注与附件（简化版）
```typescript
// 数据模型
interface Task {
  // ... 现有字段
  notes?: string; // 备注（Markdown）
  attachments?: string[]; // 附件路径
}

// 核心功能
1. 任务详情页添加"备注"文本框
2. 支持 Markdown 格式
3. 附件上传（本地文件路径）
```

**验收标准**：
- ✅ 可以添加备注
- ✅ 备注支持 Markdown
- ✅ 可以添加附件（本地文件）

---

### 第 3 周：专注与系统集成（P1）

**目标**：增强专注模式，完成系统集成

#### Day 11-12: 专注模式增强
```typescript
// 数据模型
interface FocusSession {
  id: string;
  taskId: string | null;
  startAt: string;
  endAt: string | null;
  duration: number; // 分钟
  sessionType: 'work' | 'short_break' | 'long_break';
  interrupted: boolean;
  lockMode: boolean; // 锁屏模式
}

// 核心功能
1. 专注时可选"锁屏模式"
2. 锁屏模式下禁用其他功能
3. 专注统计：日报/周报/热力图
4. 白名单（v1.1）
```

**验收标准**：
- ✅ 锁屏模式可以锁定应用
- ✅ 专注统计显示日报/周报
- ✅ 热力图显示专注时长

#### Day 13: 系统托盘
```typescript
// 使用 Electron Tray API
import { Tray, Menu } from 'electron';

function createTray() {
  const tray = new Tray('path/to/icon.png');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => mainWindow.show() },
    { label: '快速添加任务', click: () => showQuickAdd() },
    { label: '开始番茄钟', click: () => startPomodoro() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow.show());
}
```

**验收标准**：
- ✅ 最小化到系统托盘
- ✅ 右键菜单功能完整
- ✅ 点击托盘图标显示主窗口

#### Day 14: 主题切换
```typescript
// 使用 Tailwind CSS dark mode
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  // ...
};

// 核心功能
1. 设置页面添加"主题"选项
2. 支持浅色/深色/跟随系统
3. 主题切换时平滑过渡
```

**验收标准**：
- ✅ 可以切换浅色/深色主题
- ✅ 可以跟随系统主题
- ✅ 主题切换平滑无闪烁

#### Day 15: 数据备份与恢复
```typescript
// 核心功能
1. 导出数据为 JSON
2. 导入 JSON 数据
3. 自动备份（每天一次）
4. 备份管理（查看/删除/恢复）
```

**验收标准**：
- ✅ 可以导出所有数据
- ✅ 可以导入数据
- ✅ 自动备份正常工作
- ✅ 可以恢复历史备份

---

### 第 4 周：打包与发布（P0）

**目标**：完成测试、文档、打包、发布

#### Day 16-17: 完整测试
```
功能测试：
- ✅ 任务 CRUD
- ✅ 提醒与通知
- ✅ 重复规则
- ✅ 子任务
- ✅ 日历视图
- ✅ 番茄钟
- ✅ 专注模式
- ✅ 系统托盘
- ✅ 主题切换
- ✅ 数据备份

性能测试：
- ✅ 冷启动 < 2s
- ✅ 本地操作 < 150ms
- ✅ 1000+ 任务流畅

兼容性测试：
- ✅ Windows 10
- ✅ Windows 11
```

#### Day 18: 打包配置
```json
// electron-builder.json
{
  "appId": "com.plans.app",
  "productName": "Plans App",
  "directories": {
    "output": "dist"
  },
  "win": {
    "target": ["nsis"],
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

**验收标准**：
- ✅ 可以生成 Windows 安装包
- ✅ 安装包可以正常安装
- ✅ 安装后应用可以正常运行

#### Day 19: 用户文档
```markdown
# Plans App 使用指南

## 快速开始
1. 创建任务
2. 设置提醒
3. 开始番茄钟

## 功能介绍
- 任务管理
- 日历视图
- 番茄钟
- 专注模式

## 常见问题
- 如何设置重复任务？
- 如何备份数据？
- 如何切换主题？
```

#### Day 20: 发布 v1.0
```
1. 创建 GitHub Release
2. 上传安装包
3. 编写 Release Notes
4. 发布公告
```

---

## ▎验收标准总览

| 功能模块 | 验收标准 | 优先级 |
|---------|---------|--------|
| 提醒引擎 | 到期前 15 分钟提醒，误差 < 30s | P0 |
| 系统通知 | Windows 通知正常，点击跳转 | P0 |
| 重复规则 | 支持每天/每周/每月，自动生成 | P0 |
| 子任务 | 支持多层嵌套，显示完成进度 | P0 |
| 时间块拖拽 | 周视图/日视图拖拽流畅 | P0 |
| 专注模式 | 锁屏模式，统计报表 | P1 |
| 系统托盘 | 最小化到托盘，右键菜单 | P1 |
| 主题切换 | 浅色/深色/跟随系统 | P1 |
| 数据备份 | 导出/导入/自动备份 | P1 |
| 性能 | 冷启动 < 2s，操作 < 150ms | P0 |

---

## ▎交付物清单

### 代码交付
```
src/
├── components/
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskItem.tsx
│   │   ├── TaskForm.tsx
│   │   ├── SubTaskList.tsx ← 新增
│   │   └── TaskDetail.tsx ← 新增
│   ├── timer/
│   │   ├── PomodoroTimer.tsx
│   │   └── FocusStats.tsx ← 新增
│   └── calendar/
│       └── Calendar.tsx
├── stores/
│   ├── task-store.ts
│   ├── timer-store.ts
│   └── settings-store.ts ← 新增
├── services/
│   ├── reminder-engine.ts ← 新增
│   ├── recurrence-engine.ts ← 新增
│   └── notification-service.ts ← 新增
└── electron/
    ├── main/index.ts
    ├── preload/index.ts
    ├── ipc/
    │   ├── task-handler.ts
    │   ├── timer-handler.ts
    │   └── reminder-handler.ts ← 新增
    └── utils/
        ├── tray.ts ← 新增
        └── notification.ts ← 新增
```

### 文档交付
```
docs/
├── README.md
├── USER-GUIDE.md ← 新增
├── FAQ.md ← 新增
├── CHANGELOG.md ← 新增
└── REDESIGN-PLAN-v2.md
```

### 发布交付
```
dist/
├── Plans-App-Setup-1.0.0.exe
└── latest.yml
```

---

## ▎风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 提醒引擎复杂度高 | 延期 2-3 天 | 先做基础版，高级功能延后 |
| 系统通知权限问题 | 功能不可用 | 提供权限申请引导 |
| 重复规则边界情况多 | 测试不充分 | 编写 200+ 测试用例 |
| 性能优化不足 | 用户体验差 | 虚拟滚动、数据库索引 |

---

> **Owner 意识，可执行计划。**
> 
> 新计划核心：
> - ✅ 4 周冲刺 MVP
> - ✅ 每周有明确目标和验收标准
> - ✅ 每天有具体任务和代码示例
> - ✅ 最终交付：安装包 + 文档 + 测试报告
> 
> 第 1 周重点：提醒与通知（P0）
> 第 2 周重点：任务增强（P0）
> 第 3 周重点：专注与系统集成（P1）
> 第 4 周重点：打包与发布（P0）
> 
> 预计 4 周后发布 v1.0。
> 
> 立即开始执行？
> 
> 因为信任，所以简单。🔥
