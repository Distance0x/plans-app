# plans-app

一个本地优先的 Windows 桌面计划应用，面向个人任务管理、日历时间块和番茄专注。

## 主要功能

- 任务管理：创建、编辑、删除、完成任务，支持优先级、状态、日期、时间和持续时长。
- 清单系统：收集箱、自定义清单、清单删除与任务归档。
- 日历视图：月视图、周视图、日视图，支持任务拖动调整日期和时间块。
- 浮窗模式：今日浮窗、周视图浮窗、番茄钟浮窗，适合桌面常驻查看。
- 番茄钟：工作/短休息/长休息计时，支持专注统计。
- 提醒与重复：本地提醒、重复规则、通知操作。
- 任务详情：状态、优先级、日期时间、清单、Markdown 笔记。
- 搜索与过滤：任务搜索、状态/优先级/日期过滤。
- 本地存储：使用 SQLite/sql.js，本地保存数据，不依赖服务器。

## 技术栈

- React 18
- TypeScript
- Vite
- Electron 28
- Tailwind CSS
- Zustand
- Drizzle ORM
- sql.js
- electron-builder

## 安装使用

Windows 安装包位于：

```text
dist/plans-app Setup 1.0.0.exe
```

发布到 GitHub Releases 时，上传这个 `.exe` 安装包即可。如果后续做自动更新，再一起上传 `.blockmap`。

当前安装包配置为传统安装向导：

- 支持选择安装目录。
- 默认安装到当前用户目录。
- 会创建开始菜单入口。
- 桌面快捷方式由 NSIS/electron-builder 配置和安装过程决定。

## GitHub Release

推荐发布步骤：

1. 打开 GitHub 仓库的 `Releases` 页面。
2. 点击 `Draft a new release`。
3. 创建 tag，例如 `v1.0.0`。
4. Release title 填 `plans-app v1.0.0`。
5. 上传文件：

```text
dist/plans-app Setup 1.0.0.exe
```

也可以使用 GitHub CLI：

```powershell
gh release create v1.0.0 "dist\plans-app Setup 1.0.0.exe" --title "plans-app v1.0.0" --notes "Windows installer for plans-app."
```

## 开发

安装依赖：

```powershell
npm install
```

启动前端开发服务：

```powershell
npm run dev
```

启动 Electron 开发模式：

```powershell
npm run electron:dev
```

同时启动前端和 Electron：

```powershell
npm start
```

## 构建

构建前端：

```powershell
npm run build
```

构建 Electron 主进程：

```powershell
npm run build:electron
```

生成 Windows 安装包：

```powershell
npm run electron:build
```

构建输出：

```text
dist-renderer/    前端构建产物
dist-electron/    Electron 主进程构建产物
dist/             打包后的 Windows 应用和安装包
```

## 安装目录配置

安装包配置在 `package.json` 的 `build.nsis`：

```json
{
  "build": {
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

这表示安装时会显示安装向导，并允许用户选择安装路径。

## 数据说明

应用数据存储在本地用户目录下，不需要服务器。不同机器之间目前不会自动同步。

如果后续要做跨设备同步，需要新增账号、服务端数据库、冲突合并和加密策略；当前版本定位为单机本地应用。

## 项目结构

```text
plans-app/
  electron/          Electron 主进程、preload、数据库、IPC 和后台服务
  src/               React 渲染进程
  src/components/    UI 组件
  src/stores/        Zustand 状态管理
  src/types/         TypeScript 类型
  docs/              调研、设计和迭代规划文档
  dist/              打包输出
```

## 注意事项

- `node_modules/`、`dist/`、`dist-renderer/`、`dist-electron/` 不应提交到 Git。
- 本地研究报告、测试页面和未授权素材不应提交到 Release。
- 如果使用第三方角色图片或 Live2D 模型，只能在明确授权范围内使用，避免把未授权素材打包发布。

## License

MIT
