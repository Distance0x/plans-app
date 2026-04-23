# 🔍 Electron API 问题诊断报告

## 问题现象
- ❌ 错误: Electron API not available
- ❌ 番茄钟功能点击无效
- ❌ 计时不开启

## 根因分析

### 1. 架构层面 ✅
- **Preload 脚本**: 已正确配置 `contextBridge.exposeInMainWorld`
- **IPC 处理器**: `registerTimerHandlers()` 已在主进程注册
- **类型定义**: `window.electron` 类型已定义

### 2. 编译输出 ✅
```
dist-electron/
├── main/index.js       ✅ 主进程编译正常
├── preload/index.js    ✅ Preload 编译正常
├── ipc/
│   ├── task-handler.js ✅
│   └── timer-handler.js ✅
└── database/
    ├── db.js           ✅
    └── schema.js       ✅
```

### 3. 启动流程问题 ⚠️

**问题**: 用户可能使用了错误的启动命令

#### 错误启动方式:
```bash
# ❌ 只启动 Vite，没有 Electron
npm run dev

# ❌ 没有先启动 Vite
npm run electron:dev
```

#### 正确启动方式:
```bash
# ✅ 方式 1: 使用新增的 start 命令（推荐）
npm start

# ✅ 方式 2: 手动分步启动
# 终端 1: 启动 Vite
npm run dev

# 终端 2: 等待 Vite 启动后，启动 Electron
npm run electron:dev
```

## 解决方案

### 已实施的修复

#### 1. 添加调试日志
```typescript
// electron/main/index.ts
console.log('[Main] Preload path:', path.join(__dirname, '../preload/index.js'));

// electron/preload/index.ts
console.log('[Preload] Script loaded successfully!');
```

#### 2. 新增 `npm start` 命令
```json
{
  "scripts": {
    "start": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run electron:dev\""
  }
}
```

**优势**:
- ✅ 自动启动 Vite 和 Electron
- ✅ 等待 Vite 就绪后再启动 Electron
- ✅ 一条命令完成所有操作

#### 3. 创建测试页面
`test-electron-api.html` - 用于验证 `window.electron` 是否可用

## 验证步骤

### Step 1: 重新编译
```bash
npm run build:electron
```

### Step 2: 启动应用
```bash
npm start
```

### Step 3: 检查控制台
打开 DevTools，应该看到:
```
[Preload] Script loaded successfully!
[Main] Preload path: D:\...\dist-electron\preload\index.js
```

### Step 4: 测试番茄钟
1. 点击"开始"按钮
2. 观察倒计时是否开始
3. 检查控制台是否有错误

## 常见问题排查

### Q1: 仍然显示 "Electron API not available"
**原因**: 在浏览器中打开了 `http://localhost:5173`，而不是 Electron 窗口

**解决**: 
- 关闭浏览器标签页
- 使用 `npm start` 启动 Electron 应用

### Q2: Electron 窗口打开但是空白
**原因**: Vite 开发服务器未启动

**解决**:
```bash
# 先启动 Vite
npm run dev

# 等待 "Local: http://localhost:5173" 出现后
# 再启动 Electron
npm run electron:dev
```

### Q3: 点击按钮没有反应
**原因**: IPC 通信失败

**检查**:
1. 打开 DevTools Console
2. 输入 `window.electron`
3. 应该看到对象，包含 `task`, `timer`, `settings` 等属性

## 技术细节

### Preload 脚本加载流程
```
1. Electron 主进程启动
   ↓
2. 创建 BrowserWindow，指定 preload 路径
   ↓
3. 加载 preload/index.js
   ↓
4. contextBridge.exposeInMainWorld('electron', {...})
   ↓
5. 加载渲染进程页面 (http://localhost:5173)
   ↓
6. 渲染进程可以访问 window.electron
```

### IPC 通信流程
```
渲染进程                     主进程
   |                           |
   | window.electron.timer.start()
   |-------------------------->|
   |   ipcRenderer.invoke     |
   |                          |
   |                    ipcMain.handle
   |                    'timer:start'
   |                          |
   |                    执行计时器逻辑
   |                          |
   |<--------------------------|
   |   返回 timerState        |
   |                          |
   |   定时器 tick 事件       |
   |<--------------------------|
   |   win.webContents.send   |
   |   'timer:tick'           |
```

## 下一步行动

1. ✅ 用户使用 `npm start` 启动应用
2. ⏳ 验证番茄钟功能正常工作
3. ⏳ 如果仍有问题，提供 DevTools Console 截图

## Owner 责任人
- 问题诊断: ✅ 完成
- 代码修复: ✅ 完成
- 验证测试: ⏳ 等待用户反馈
