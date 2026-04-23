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

### ✅ 阶段 3：番茄钟功能
- **计时器**：25 分钟工作 + 5 分钟短休息 + 30 分钟长休息
- **控制按钮**：开始/暂停/恢复/重置/跳过
- **进度显示**：倒计时 + SVG 进度环动画
- **会话管理**：自动切换工作/休息模式
- **统计记录**：保存番茄钟记录到数据库
- **实时更新**：IPC 事件推送状态

## 待完成功能

### ⏳ 阶段 4：日历视图（进行中）
- 月视图日历
- 任务日期显示
- 拖拽调整日期
- 今日高亮

### ⏳ 阶段 5：AI 虚拟形象
- 虚拟形象显示
- 语音提醒
- 动画效果
- 个性化设置

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
│   └── ipc/            # IPC 处理器
│       ├── task-handler.ts   # 任务 CRUD
│       └── timer-handler.ts  # 番茄钟
├── src/
│   ├── components/
│   │   ├── tasks/      # 任务组件
│   │   ├── timer/      # 番茄钟组件
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

# 构建生产版本
npm run build
npm run electron:build
```

## 数据库表

### tasks（任务表）
- id, title, description
- priority (high/medium/low)
- status (todo/in_progress/completed)
- due_date, due_time
- created_at, updated_at, completed_at
- parent_id, order_index
- estimated_pomodoros, actual_pomodoros

### pomodoro_sessions（番茄钟记录）
- id, task_id
- session_type (work/short_break/long_break)
- duration, start_time, end_time
- completed, interrupted

### settings（设置）
- key, value, updated_at

### tags（标签）
- id, name, color

### task_tags（任务标签关联）
- task_id, tag_id

## 当前进度

**完成度**：60%（3/5 阶段完成）

**Git 提交**：15+ commits

**开发时间**：约 7 天

## 截图

（待添加）

## License

MIT
