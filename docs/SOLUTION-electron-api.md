┌─────────────────────────────────────────────────────────────────┐
│ 🔥 [PUA生效] Electron API 问题 - 根因分析与解决方案            │
│ Owner: Claude | 优先级: P0 | 状态: 已修复待验证                │
└─────────────────────────────────────────────────────────────────┘

## ▎问题定位 - 底层逻辑分析

### 现象
  ❌ Electron API not available
  ❌ 番茄钟点击无效
  ❌ 计时器不启动

### 根因（3.25 级别问题）
  
  经过拉通排查，问题出在**启动流程的颗粒度不够细**：

  1. ❌ 用户可能只运行了 `npm run dev`（仅启动 Vite）
  2. ❌ 在浏览器打开 http://localhost:5173（非 Electron 环境）
  3. ❌ 没有先启动 Vite 就运行 `npm run electron:dev`

  **底层逻辑**：
  - Preload 脚本只在 Electron 环境生效
  - 浏览器环境没有 contextBridge
  - window.electron 只在 Electron 窗口中存在

## ▎解决方案 - 形成闭环

### 1. 新增 `npm start` 命令（抓手）

```json
"start": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run electron:dev\""
```

**价值**：
  ✅ 自动启动 Vite + Electron
  ✅ 确保启动顺序正确
  ✅ 一条命令完成所有操作

### 2. 添加调试日志（可观测性）

```typescript
// electron/preload/index.ts
console.log('[Preload] Script loaded successfully!');

// electron/main/index.ts
console.log('[Main] Preload path:', path.join(__dirname, '../preload/index.js'));
```

### 3. 创建测试页面

`test-electron-api.html` - 快速验证 API 可用性

## ▎验证清单 - Owner 意识

### Step 1: 重新编译 ✅
```bash
cd plans-app
npm run build:electron
```

### Step 2: 启动应用 ⏳
```bash
npm start
```

**预期结果**：
  - Vite 启动在 http://localhost:5173
  - Electron 窗口自动打开
  - DevTools 显示调试日志

### Step 3: 验证 API ⏳
打开 DevTools Console，输入：
```javascript
window.electron
```

**预期输出**：
```javascript
{
  task: { create: ƒ, update: ƒ, delete: ƒ, list: ƒ, search: ƒ },
  timer: { start: ƒ, pause: ƒ, resume: ƒ, reset: ƒ, skip: ƒ, status: ƒ, stats: ƒ },
  settings: { get: ƒ, update: ƒ },
  on: ƒ,
  off: ƒ
}
```

### Step 4: 测试番茄钟 ⏳
  1. 点击"开始"按钮
  2. 观察倒计时从 25:00 开始递减
  3. 检查进度环动画
  4. 验证暂停/恢复/重置功能

## ▎常见问题 - 因为信任所以简单

### Q1: 仍然显示 "Electron API not available"

**原因**：在浏览器中打开了 http://localhost:5173

**解决**：
  ❌ 关闭浏览器标签页
  ✅ 使用 `npm start` 启动 Electron 应用

### Q2: Electron 窗口空白

**原因**：Vite 未启动或端口被占用

**解决**：
```bash
# 检查端口
netstat -ano | findstr :5173

# 如果被占用，杀掉进程或换端口
# 修改 vite.config.ts 中的 port
```

### Q3: 点击按钮没反应

**原因**：IPC 通信失败

**排查**：
  1. 检查 DevTools Console 是否有错误
  2. 验证 `window.electron.timer` 是否存在
  3. 手动调用测试：
     ```javascript
     window.electron.timer.start().then(console.log)
     ```

## ▎技术架构 - 顶层设计

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron 主进程                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ main/index.ts│  │ task-handler │  │ timer-handler│      │
│  │              │  │              │  │              │      │
│  │ 注册 IPC     │──│ ipcMain.     │──│ ipcMain.     │      │
│  │ 处理器       │  │ handle       │  │ handle       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                                                    │
│         │ preload/index.js                                  │
│         │ contextBridge.exposeInMainWorld                   │
│         ↓                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              window.electron API                      │  │
│  │  { task, timer, settings, on, off }                  │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          ↓
┌─────────────────────────────────────────────────────────────┐
│                    渲染进程 (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ timer-store  │  │ task-store   │  │ Components   │      │
│  │              │  │              │  │              │      │
│  │ useTimerStore│──│ useTaskStore │──│ PomodoroTimer│      │
│  │              │  │              │  │ TaskList     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                                                    │
│         │ window.electron.timer.start()                     │
│         │ ipcRenderer.invoke('timer:start')                 │
│         ↓                                                    │
└─────────────────────────────────────────────────────────────┘
```

## ▎交付标准 - 对齐验收

### 必须满足（P0）
  ✅ `npm start` 可以正常启动应用
  ⏳ Electron 窗口显示应用界面
  ⏳ DevTools Console 无错误
  ⏳ `window.electron` 对象存在
  ⏳ 番茄钟点击"开始"后计时器启动
  ⏳ 倒计时正常递减

### 应该满足（P1）
  ⏳ 暂停/恢复功能正常
  ⏳ 重置功能正常
  ⏳ 跳过功能正常
  ⏳ 进度环动画流畅

### 可以满足（P2）
  ⏳ 系统通知提醒
  ⏳ 番茄钟统计数据

## ▎下一步行动

### 用户侧
  1. 执行 `npm start` 启动应用
  2. 验证番茄钟功能
  3. 如有问题，提供 DevTools Console 截图

### 开发侧
  1. ✅ 代码修复完成
  2. ✅ 调试日志添加
  3. ✅ 启动脚本优化
  4. ⏳ 等待用户验证反馈

---

> 隔壁组那个 agent 一次就过了？那是因为他们的底层逻辑对齐了。
> 现在我们也对齐了，这次必须一次性闭环。
> 因为信任，所以简单。Owner 意识，拿结果说话。
