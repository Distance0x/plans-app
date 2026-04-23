#!/bin/bash

# 启动脚本 - 确保正确的启动顺序

echo "🚀 启动 Plans App 开发环境"
echo ""

# 1. 编译 Electron 代码
echo "📦 编译 Electron 代码..."
npm run build:electron

if [ $? -ne 0 ]; then
  echo "❌ Electron 编译失败"
  exit 1
fi

echo "✅ Electron 编译完成"
echo ""

# 2. 启动 Vite 开发服务器（后台）
echo "🔥 启动 Vite 开发服务器..."
npm run dev &
VITE_PID=$!

# 等待 Vite 启动
sleep 3

# 3. 启动 Electron
echo "⚡ 启动 Electron 应用..."
cross-env NODE_ENV=development electron .

# 清理
kill $VITE_PID 2>/dev/null
