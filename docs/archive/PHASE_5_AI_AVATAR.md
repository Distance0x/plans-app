# 阶段五：AI 虚拟形象 - 实现方案

## 功能概述

在番茄钟和任务管理中加入AI虚拟形象，提供陪伴式学习/工作体验。

## 核心功能

### 1. 虚拟形象显示（3-4小时）

#### 1.1 形象选择
**技术方案**:
- **方案A**: Live2D 模型（推荐）
  - 优点：动画流畅、表情丰富、文件小
  - 缺点：需要集成 Live2D SDK
  - 资源：使用开源 Live2D 模型或 VRoid Studio 创建
  
- **方案B**: Spine 动画
  - 优点：性能好、工具成熟
  - 缺点：需要购买 Spine 授权
  
- **方案C**: GIF/Lottie 动画（最简单）
  - 优点：实现简单、无需额外 SDK
  - 缺点：动画不够灵活
  - **推荐用于 MVP**

**实现位置**: 右下角悬浮窗或侧边栏

#### 1.2 形象状态
根据应用状态切换形象动画：

| 状态 | 动画 | 触发条件 |
|------|------|---------|
| 待机 | 呼吸、眨眼 | 无任务进行 |
| 工作中 | 专注、打字 | 番茄钟工作时间 |
| 休息中 | 放松、喝水 | 番茄钟休息时间 |
| 完成任务 | 庆祝、鼓掌 | 任务完成 |
| 提醒 | 挥手、指向 | 任务提醒触发 |
| 鼓励 | 加油、点赞 | 连续完成多个番茄钟 |

### 2. 语音交互（2-3小时）

#### 2.1 TTS 语音播报
**技术方案**:
- **方案A**: Web Speech API（免费）
  ```typescript
  const utterance = new SpeechSynthesisUtterance('加油！');
  utterance.lang = 'zh-CN';
  speechSynthesis.speak(utterance);
  ```
  
- **方案B**: Azure TTS / Google TTS（付费，音质更好）
  
- **方案C**: 本地 TTS 引擎（离线可用）

**推荐**: 先用 Web Speech API，后续可升级

#### 2.2 语音内容
- **任务提醒**: "该开始工作了！今天的任务是：{任务标题}"
- **番茄钟开始**: "开始专注25分钟，加油！"
- **番茄钟结束**: "做得很棒！休息一下吧"
- **任务完成**: "恭喜完成任务！继续保持"
- **鼓励**: "已经完成{N}个番茄钟了，真厉害！"

#### 2.3 语音设置
- 开关语音
- 音量调节
- 语速调节
- 音色选择（男声/女声）

### 3. 智能对话（可选，4-5小时）

#### 3.1 简单对话
使用预设对话模板：
```typescript
const dialogues = {
  morning: ['早上好！今天要完成什么任务呢？', '新的一天开始了！'],
  taskComplete: ['太棒了！', '完成得很好！', '继续加油！'],
  longBreak: ['工作很久了，要不要休息一下？'],
  encouragement: ['你可以的！', '相信自己！', '加油！'],
};
```

#### 3.2 AI 对话（高级）
集成 AI API（OpenAI / Claude / 本地模型）：
- 任务建议："根据你的日程，建议先完成高优先级任务"
- 时间管理："你已经工作2小时了，建议休息15分钟"
- 情绪支持："看起来任务很多，一步一步来，不要着急"

**成本考虑**: 
- 使用本地小模型（Ollama + Llama 3.2）
- 或限制每日对话次数

### 4. 个性化设置（1-2小时）

#### 4.1 形象自定义
- 选择不同角色（学生、白领、猫咪、机器人）
- 调整大小和位置
- 显示/隐藏形象

#### 4.2 互动设置
- 互动频率（高/中/低）
- 语音开关
- 对话风格（正式/轻松/可爱）

#### 4.3 触发规则
- 番茄钟开始/结束时提醒
- 任务完成时庆祝
- 长时间无操作时提醒
- 每完成N个番茄钟鼓励

## 实现方案（MVP）

### 技术栈
- **动画**: Lottie (lottie-web)
- **语音**: Web Speech API
- **对话**: 预设文本模板
- **UI**: React + Tailwind CSS

### 文件结构
```
src/
├── components/
│   └── avatar/
│       ├── Avatar.tsx           # 主组件
│       ├── AvatarAnimation.tsx  # 动画控制
│       ├── AvatarSpeech.tsx     # 语音播报
│       └── AvatarSettings.tsx   # 设置面板
├── stores/
│   └── avatar-store.ts          # 状态管理
└── assets/
    └── avatars/
        ├── idle.json            # 待机动画
        ├── working.json         # 工作动画
        ├── resting.json         # 休息动画
        └── celebrating.json     # 庆祝动画
```

### 核心代码

#### Avatar.tsx
```typescript
import Lottie from 'lottie-react';
import { useAvatarStore } from '@/stores/avatar-store';
import idleAnimation from '@/assets/avatars/idle.json';
import workingAnimation from '@/assets/avatars/working.json';

export function Avatar() {
  const { state, visible, speak } = useAvatarStore();
  
  const animations = {
    idle: idleAnimation,
    working: workingAnimation,
    resting: restingAnimation,
    celebrating: celebratingAnimation,
  };
  
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 w-32 h-32 z-50">
      <Lottie 
        animationData={animations[state]} 
        loop={state !== 'celebrating'}
      />
      {/* 对话气泡 */}
      {speak && (
        <div className="absolute -top-16 right-0 bg-white rounded-lg p-2 shadow-lg">
          {speak}
        </div>
      )}
    </div>
  );
}
```

#### avatar-store.ts
```typescript
interface AvatarStore {
  state: 'idle' | 'working' | 'resting' | 'celebrating';
  visible: boolean;
  speak: string | null;
  
  setState: (state: AvatarState) => void;
  setVisible: (visible: boolean) => void;
  say: (text: string, useTTS?: boolean) => void;
}

export const useAvatarStore = create<AvatarStore>((set) => ({
  state: 'idle',
  visible: true,
  speak: null,
  
  setState: (state) => set({ state }),
  setVisible: (visible) => set({ visible }),
  
  say: (text, useTTS = true) => {
    set({ speak: text });
    
    if (useTTS && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      speechSynthesis.speak(utterance);
    }
    
    // 3秒后清除对话
    setTimeout(() => set({ speak: null }), 3000);
  },
}));
```

#### 集成到番茄钟
```typescript
// PomodoroTimer.tsx
const { setState, say } = useAvatarStore();

const start = () => {
  timerStore.start();
  setState('working');
  say('开始专注25分钟，加油！');
};

const onComplete = () => {
  setState('celebrating');
  say('做得很棒！休息一下吧');
};
```

## 动画资源

### 免费资源
1. **LottieFiles**: https://lottiefiles.com/
   - 搜索 "character", "mascot", "avatar"
   - 下载 JSON 格式动画

2. **Mixamo**: https://www.mixamo.com/
   - 3D 角色动画（需要转换）

3. **OpenGameArt**: https://opengameart.org/
   - 2D 精灵动画

### 自制动画
1. **Adobe After Effects + Bodymovin**
   - 专业动画制作
   
2. **Rive**: https://rive.app/
   - 交互式动画编辑器
   
3. **Spline**: https://spline.design/
   - 3D 动画（可导出为视频）

## 实现步骤

### Day 1: 基础形象显示（4小时）
1. 安装 lottie-react
2. 下载/创建基础动画（待机、工作、休息、庆祝）
3. 创建 Avatar 组件
4. 集成到主界面
5. 实现状态切换

### Day 2: 语音和对话（3小时）
1. 实现 TTS 语音播报
2. 创建对话文本库
3. 添加对话气泡 UI
4. 集成到番茄钟和任务事件

### Day 3: 个性化和优化（3小时）
1. 创建设置面板
2. 实现形象切换
3. 添加互动触发规则
4. 性能优化和测试

## 预期效果

### 用户体验
- 🎭 可爱的虚拟形象陪伴
- 🗣️ 语音提醒和鼓励
- 💬 智能对话互动
- 🎨 个性化形象选择
- ⚡ 流畅的动画效果

### 技术指标
- 动画帧率 > 30 FPS
- 语音延迟 < 500ms
- 内存占用 < 50MB
- CPU 占用 < 5%

## 进阶功能（可选）

### 阶段 5.1: 高级动画
- Live2D 集成
- 表情识别（根据任务状态）
- 手势动画（指向任务、挥手）

### 阶段 5.2: AI 对话
- 集成本地 LLM（Ollama）
- 任务建议和时间管理
- 情绪支持和鼓励

### 阶段 5.3: 社交功能
- 多个形象选择
- 形象商店
- 用户自定义形象

## 风险和挑战

### 技术风险
1. **动画性能**: Lottie 动画可能占用较多资源
2. **语音质量**: Web Speech API 音质一般
3. **跨平台兼容**: 不同系统 TTS 效果不同

### 解决方案
1. 优化动画文件大小，使用 WebGL 渲染
2. 提供音质更好的付费 TTS 选项
3. 测试多平台，提供降级方案

## 总结

AI 虚拟形象将为应用增添趣味性和陪伴感，提升用户粘性。

**预计工作量**: 10-12 小时（MVP）
**完成后进度**: 90%（5/6 阶段完成）
**下一阶段**: 打包和优化

## 参考项目

- **Tamagui**: https://tamagui.dev/ (动画库)
- **Vtuber**: https://github.com/guansss/pixi-live2d-display
- **Desktop Pet**: https://github.com/Adriandmen/05AB1E (桌面宠物)
