# Plans App

番茄钟 + 任务管理 + 日历视图的桌面应用

## 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **桌面**: Electron 28
- **数据库**: sql.js (SQLite)
- **状态管理**: Zustand
- **构建工具**: Vite 5

## 已完成功能

### ✅ 阶段 1：项目基础搭建
- Electron + React + Vite 项目初始化
- TypeScript 严格模式配置
- Tailwind CSS + Glassmorphism 样式系统
- IPC 通信基础架构
- sql.js 数据库层（自动保存）

### ✅ 阶段 2：核心功能 - 每日清单
- **任务 CRUD**：创建、编辑、删除、完成任务
- **任务列表 UI**：Glassmorphism 毛玻璃样式
- **任务表单**：标题、描述、优先级、截止日期
- **搜索和过滤**：实时搜索、状态/优先级/日期过滤
- **优先级标识**：高/中/低颜色区分
- **子任务支持**：最多2层嵌套
- **Markdown笔记**：Obsidian风格实时预览

### ✅ 阶段 3：番茄钟功能
- **计时器**：25 分钟工作 + 5 分钟短休息 + 30 分钟长休息
- **控制按钮**：开始/暂停/恢复/重置/跳过
- **进度显示**：倒计时 + SVG 进度环动画
- **会话管理**：自动切换工作/休息模式
- **统计记录**：保存番茄钟记录到数据库
- **实时更新**：IPC 事件推送状态
- **锁屏专注模式**：全屏倒计时，减少干扰
- **自定义时长**：可调整工作/休息时间

### ✅ 阶段 4：日历视图
- **月视图**：完整月历，任务卡片显示，拖拽调整日期
- **周视图**：时间轴显示，动态时间范围，上下拖动调整开始/结束时间
- **日视图**：详细时间线，拖动调整任务时间和时长
- **今日高亮**：当前日期特殊标识
- **任务筛选**：今天/最近7天/收集箱独立筛选逻辑

### ✅ UI/UX 优化
- **美化界面**：渐变背景、玻璃态效果、动画过渡
- **响应式布局**：日历/番茄钟全屏显示，隐藏侧边栏
- **图标优化**：统一灰色调，选中高亮
- **任务卡片**：圆角、阴影、悬停效果、优先级渐变标签

## 待完成功能

### ⏳ 阶段 5：提醒和重复任务
- **提醒引擎**：基于 node-cron 的定时提醒
- **系统通知**：Electron 原生通知 + 声音提示
- **重复规则**：每天/每周/每月/自定义重复
- **提醒设置**：提前提醒、多次提醒
- **快捷操作**：通知中快速完成/延后任务

### ⏳ 阶段 6：打包和优化
- Windows 安装包
- 性能优化
- 错误处理
- 用户文档

## 项目结构

```
plans-app/
├── electron/
│   ├── main/           # 主进程
│   ├── preload/        # 预加载脚本
│   ├── database/       # 数据库层
│   │   ├── schema.ts   # 数据库表定义
│   │   ├── db.ts       # 数据库连接
│   │   └── migrations/ # 迁移脚本
│   ├── ipc/            # IPC 处理器
│   │   ├── task-handler.ts   # 任务 CRUD
│   │   └── timer-handler.ts  # 番茄钟
│   └── services/       # 后台服务
│       ├── reminder-engine.ts      # 提醒引擎
│       ├── recurrence-engine.ts    # 重复任务引擎
│       └── notification-service.ts # 通知服务
├── src/
│   ├── components/
│   │   ├── tasks/      # 任务组件
│   │   ├── timer/      # 番茄钟组件
│   │   ├── calendar/   # 日历组件
│   │   └── ui/         # 基础 UI 组件
│   ├── stores/         # Zustand 状态管理
│   ├── types/          # TypeScript 类型
│   └── styles/         # 全局样式
└── dist-electron/      # 编译输出

```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（仅前端）
npm run dev

# 编译 Electron 代码
npm run build:electron

# 启动 Electron 应用
npm run electron:dev

# 同时启动前端和 Electron
npm start

# 构建生产版本
npm run build
npm run electron:build
```

## 数据库表

### tasks（任务表）
- id, title, description, notes
- priority (high/medium/low)
- status (todo/in_progress/completed)
- due_date, due_time, duration
- created_at, updated_at, completed_at
- parent_id, order_index
- recurrence_rule, reminder_time
- attachments

### pomodoro_sessions（番茄钟记录）
- id, task_id
- session_type (work/short_break/long_break)
- duration, start_time, end_time
- completed, interrupted

### settings（设置）
- key, value, updated_at

## 当前进度

**完成度**：80%（4/5 阶段完成）

**Git 提交**：25+ commits

**开发时间**：约 7 天

## 特色功能

- 🎨 **现代化UI**：渐变背景、玻璃态效果、流畅动画
- 📅 **强大日历**：月/周/日三种视图，拖拽调整时间
- 🍅 **专注番茄钟**：锁屏模式、自定义时长、进度可视化
- 📝 **Markdown笔记**：实时预览、待办事项、代码高亮
- 🔄 **智能筛选**：今天/最近7天/收集箱独立逻辑
- ⚡ **快速操作**：快捷键、拖拽、双击编辑

## License

MIT
