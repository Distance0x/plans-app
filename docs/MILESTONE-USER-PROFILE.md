# Milestone 7: 用户画像与智能推荐

> **目标**：通过分析用户行为习惯，提供个性化的任务安排和时间规划建议

---

## 📊 核心能力

### 1. 用户行为数据采集

#### 数据维度
- **任务完成模式**
  - 完成时间分布（早晨/下午/晚上）
  - 任务类型偏好（工作/学习/生活）
  - 平均完成时长 vs 预估时长
  - 拖延指数（实际完成时间 - 截止时间）

- **工作时段分析**
  - 高效时段识别（番茄钟完成率最高的时段）
  - 专注时长统计（连续工作时长分布）
  - 休息模式（短休/长休频率）

- **AI 对话记录**
  - 常用指令模式（创建任务/查询日程/调整计划）
  - 语言习惯（简洁/详细）
  - 修正频率（AI 建议被修改的比例）

#### 数据库 Schema 扩展
```typescript
export const userBehaviorLog = sqliteTable('user_behavior_log', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(), // task_completed, pomodoro_finished, ai_chat, schedule_adjusted
  eventData: text('event_data').notNull(), // JSON
  timestamp: text('timestamp').notNull(),
  hourOfDay: integer('hour_of_day'), // 0-23
  dayOfWeek: integer('day_of_week'), // 0-6
});

export const userProfile = sqliteTable('user_profile', {
  userId: text('user_id').primaryKey().default('default'),
  // 工作时段偏好
  peakHoursStart: integer('peak_hours_start').default(9), // 高效时段开始
  peakHoursEnd: integer('peak_hours_end').default(11),
  // 任务习惯
  avgTaskDuration: integer('avg_task_duration').default(60), // 分钟
  procrastinationIndex: integer('procrastination_index').default(0), // -100 到 100
  // 番茄钟习惯
  preferredPomodoroLength: integer('preferred_pomodoro_length').default(25),
  preferredBreakLength: integer('preferred_break_length').default(5),
  // AI 交互偏好
  aiVerbosityPreference: text('ai_verbosity_preference').default('balanced'), // concise/balanced/detailed
  // 统计数据
  totalTasksCompleted: integer('total_tasks_completed').default(0),
  totalPomodorosCompleted: integer('total_pomodoros_completed').default(0),
  updatedAt: text('updated_at').notNull(),
});
```

---

## 🧠 智能推荐引擎

### 2. 个性化任务安排

#### 推荐策略

**A. 最佳时段推荐**
```typescript
// 根据历史数据推荐任务执行时段
function recommendTaskTime(task: Task, profile: UserProfile): TimeSlot {
  // 1. 高优先级任务 → 用户高效时段
  if (task.priority === 'high') {
    return findSlotInRange(profile.peakHoursStart, profile.peakHoursEnd);
  }
  
  // 2. 相似任务的历史完成时段
  const similarTasks = findSimilarCompletedTasks(task);
  const preferredHour = getMostFrequentCompletionHour(similarTasks);
  
  // 3. 考虑用户拖延指数
  if (profile.procrastinationIndex > 50) {
    // 高拖延用户：提前安排，留缓冲
    return findSlotBeforeDeadline(task.dueDate, bufferDays: 2);
  }
  
  return { start, end };
}
```

**B. 任务时长预测**
```typescript
// 基于历史数据预测任务实际耗时
function predictTaskDuration(task: Task, profile: UserProfile): number {
  const estimatedMinutes = task.duration || profile.avgTaskDuration;
  
  // 查找相似任务的实际耗时
  const similarTasks = findSimilarCompletedTasks(task);
  if (similarTasks.length > 0) {
    const avgActual = average(similarTasks.map(t => t.actualDuration));
    const avgEstimated = average(similarTasks.map(t => t.estimatedDuration));
    const ratio = avgActual / avgEstimated; // 用户预估偏差系数
    
    return estimatedMinutes * ratio;
  }
  
  return estimatedMinutes;
}
```

**C. 番茄钟个性化**
```typescript
// 根据用户习惯调整番茄钟时长
function getPersonalizedPomodoroSettings(profile: UserProfile) {
  return {
    workDuration: profile.preferredPomodoroLength,
    shortBreak: profile.preferredBreakLength,
    longBreak: profile.preferredBreakLength * 3,
    // 根据完成率动态调整
    autoAdjust: profile.totalPomodorosCompleted > 50,
  };
}
```

---

### 3. AI 对话优化

#### 对话风格适配
```typescript
// 根据用户偏好调整 AI 回复风格
function getAISystemPrompt(profile: UserProfile): string {
  const basePrompt = "你是一个任务管理助手...";
  
  switch (profile.aiVerbosityPreference) {
    case 'concise':
      return basePrompt + "\n回复简洁，只给关键信息。";
    case 'detailed':
      return basePrompt + "\n提供详细解释和多个选项。";
    default:
      return basePrompt;
  }
}
```

#### 建议准确度提升
```typescript
// 从用户修正中学习
function learnFromUserCorrection(
  aiSuggestion: DraftAction,
  userFinalAction: Action
) {
  const correction = {
    type: 'ai_correction',
    original: aiSuggestion,
    corrected: userFinalAction,
    timestamp: new Date().toISOString(),
  };
  
  // 记录到行为日志
  logBehaviorEvent(correction);
  
  // 更新 AI 上下文（下次对话时提供）
  updateAIContext({
    recentCorrections: getRecentCorrections(limit: 5),
  });
}
```

---

## 🎯 实施计划

### Phase 1: 数据采集基础设施（2 天）
- [ ] 扩展数据库 Schema（userBehaviorLog, userProfile）
- [ ] 实现事件采集服务（behavior-tracker.ts）
- [ ] 集成到现有功能（任务完成、番茄钟、AI 对话）
- [ ] 数据聚合定时任务（每日统计）

### Phase 2: 用户画像构建（2 天）
- [ ] 实现画像计算引擎（profile-builder.ts）
- [ ] 高效时段识别算法
- [ ] 拖延指数计算
- [ ] 任务时长预测模型
- [ ] 画像可视化界面（ProfileView.tsx）

### Phase 3: 智能推荐集成（2 天）
- [ ] 任务时段推荐（task-scheduler.ts）
- [ ] 时长预测集成到创建任务流程
- [ ] 番茄钟个性化设置
- [ ] AI 对话风格适配
- [ ] 用户反馈收集（推荐是否有用）

### Phase 4: 测试与优化（1 天）
- [ ] 冷启动场景（新用户无历史数据）
- [ ] 推荐准确度验证
- [ ] 性能测试（大量历史数据）
- [ ] 隐私保护验证（数据本地存储）

---

## 📈 成功指标

### 量化指标
- **任务完成率提升**: 目标 +15%（相比无推荐）
- **时长预测准确度**: 目标 ±20% 误差范围内
- **AI 建议采纳率**: 目标 >60%
- **用户满意度**: 目标 4.0+/5.0

### 定性指标
- 用户感知到"应用懂我"
- 减少手动调整时间的频率
- AI 对话更自然、更精准

---

## 🔒 隐私与安全

### 数据保护原则
1. **本地优先**: 所有行为数据存储在本地 SQLite
2. **透明可控**: 用户可查看、导出、删除所有行为数据
3. **最小化采集**: 只采集必要的行为数据，不采集任务内容细节
4. **匿名化**: AI 对话记录不包含敏感信息

### 用户控制
- 设置界面提供"清除行为数据"按钮
- 可关闭智能推荐功能（回退到手动模式）
- 导出行为数据报告（JSON 格式）

---

## 🚀 未来扩展

### 可选增强（P2）
- **跨设备画像同步**（需要云端支持）
- **团队协作模式**（学习团队成员的工作习惯）
- **健康建议**（根据工作强度提醒休息）
- **目标达成预测**（基于当前进度预测目标完成概率）

---

## 📦 技术栈

- **数据采集**: 事件驱动架构（EventEmitter）
- **画像计算**: 统计分析 + 简单机器学习（线性回归）
- **推荐引擎**: 规则引擎 + 协同过滤
- **可视化**: Recharts（图表库）
- **存储**: SQLite（本地）

---

## 🎓 参考资料

- [Todoist Productivity Trends](https://todoist.com/productivity-methods)
- [RescueTime Analytics](https://www.rescuetime.com/features)
- [Clockify Time Tracking Insights](https://clockify.me/time-tracking-insights)
