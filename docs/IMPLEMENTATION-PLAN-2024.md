# Plans App 无服务器改进实施计划

> 基于《plans-app 无服务器改进研究报告》(2024-04-28)
> 
> **核心战略**：在保持本地优先架构的基础上，引入 AI Agent 智能调度能力，提升用户体验，避免过早引入服务端复杂度。

---

## 📋 执行摘要

### 当前状态
- ✅ 本地桌面版核心功能已完成（任务管理、日历、番茄钟、提醒、重复规则）
- ✅ 数据存储：sql.js + Drizzle ORM
- ✅ 架构：Electron + React + Zustand
- ⚠️ 缺失：AI 智能调度、自然语言输入、ICS 导出、完整备份恢复

### 新增能力（无服务器方案）
1. **AI Agent 智能调度** - 使用 OpenAI Responses API，本地执行，无需服务端
2. **中文自然语言解析** - 规则引擎 + AI 增强，离线优先
3. **智能时间块分配** - 基于优先级、截止日期、工作时间自动排期
4. **ICS 日历导出** - 与外部日历应用集成
5. **完整备份恢复** - 包含附件的完整数据包

### 优先级排序
- **P0（必须）**: AI Agent 核心、中文 NLP、智能调度引擎、完整备份
- **P1（重要）**: ICS 导出、会话恢复、密钥管理
- **P2（可选）**: PWA companion、OAuth 集成

---

## 🎯 核心功能设计

### 1. AI Agent 智能调度

#### 架构设计
```
用户输入 → AgentPanel (React)
    ↓
Preload IPC Bridge (ai.chat)
    ↓
Main Process: ai-service.ts
    ↓
OpenAI Responses API (GPT-5.4 mini)
    ↓
Tool Calls: create_tasks / update_tasks / find_free_slots / schedule_tasks
    ↓
Draft Actions (待用户确认)
    ↓
Apply → 更新本地 SQLite
```

#### 工作流程
1. **Draft（草稿）** - AI 生成任务和排期建议
2. **Confirm（确认）** - 用户审核并修改
3. **Apply（应用）** - 写入数据库
4. **Undo（撤销）** - 回滚到上一个快照

#### API Key 管理
- **Windows/macOS**: 使用 `Electron.safeStorage` 加密存储
- **Linux**: 提供 session-only 模式或主密码加密
- 存储位置: `userData/secrets.json` (加密)

#### 成本估算
- GPT-5.4 mini: $0.75/1M input tokens, $4.50/1M output tokens
- 典型对话（600 input + 250 output）: ~$0.0016
- 复杂排期（2500 input + 900 output）: ~$0.0059
- 每日使用 10 次: ~$0.05/天 = $1.5/月

---

### 2. 中文自然语言解析

#### 两层架构
```
用户输入: "明天下午3点开会，重要"
    ↓
Layer 1: 规则引擎 (parse-cntime.ts)
    - 正则匹配: 明天/下周/每周一
    - 时间解析: 下午3点 → 15:00
    - 优先级关键词: 重要 → high
    ↓
Layer 2: AI 增强 (nlp-fallback.ts)
    - 规则引擎失败时调用
    - 处理复杂/模糊表达
    ↓
输出: { title, dueDate, dueTime, priority, recurrenceRule }
```

#### 支持的表达
- **日期**: 今天、明天、后天、下周三、4月30日
- **时间**: 上午9点、下午3点半、晚上8点
- **重复**: 每天、每周一、每月15号
- **优先级**: 重要、紧急、普通
- **时长**: 1小时、30分钟

---

### 3. 智能时间块分配

#### 调度算法
```typescript
function draftDailySchedule(tasks, fixedBlocks, constraints) {
  // 1. 计算可用时间段
  const freeSlots = subtractFromWorkHours(
    constraints.workStart,  // 例如 09:00
    constraints.workEnd,    // 例如 18:00
    fixedBlocks            // 已有会议、午休等
  );

  // 2. 任务排序（多维度评分）
  const ranked = tasks
    .filter(t => !t.completed && !t.scheduled)
    .sort((a, b) => {
      const dueScore = scoreDueDate(a) - scoreDueDate(b);      // 截止日期越近越高
      const priorityScore = scorePriority(b) - scorePriority(a); // 优先级越高越高
      const effortScore = scoreDuration(a) - scoreDuration(b);   // 短任务优先
      return dueScore || priorityScore || effortScore;
    });

  // 3. 贪心分配
  const plan = [];
  for (const task of ranked) {
    const needed = clamp(task.duration ?? 30, 15, 180);
    const slot = chooseBestSlot(freeSlots, needed, task, constraints);
    if (!slot) continue;
    
    plan.push({
      taskId: task.id,
      dueDate: slot.date,
      dueTime: slot.start,
      duration: slot.duration
    });
    
    consumeSlot(freeSlots, slot);
  }
  
  return plan; // 仅草稿，需用户确认
}
```

#### 约束条件
- 工作时间: 默认 09:00-18:00，可自定义
- 专注时长: 25-90 分钟为一个时间块
- 休息间隔: 每个时间块后 5-15 分钟休息
- 能量水平: 上午高能量任务，下午低能量任务

---

### 4. ICS 日历导出

#### 功能
- 导出所有任务为 `.ics` 文件
- 支持导入到 Google Calendar、Outlook、Apple Calendar
- 包含: 标题、日期时间、描述、重复规则、提醒

#### 实现
```typescript
// electron/services/ics-service.ts
export function exportToICS(tasks: Task[]): string {
  const events = tasks.map(task => ({
    uid: task.id,
    summary: task.title,
    dtstart: formatICSDate(task.dueDate, task.dueTime),
    dtend: calculateEndTime(task.dueDate, task.dueTime, task.duration),
    description: task.description,
    rrule: convertToRRule(task.recurrenceRule),
    valarm: task.reminders?.map(r => formatAlarm(r))
  }));
  
  return generateICSFile(events);
}
```

---

### 5. 完整备份恢复

#### 备份格式
```
plans-bundle.zip
├── metadata.json          # 版本、时间戳、校验和
├── database.json          # 所有表数据
├── attachments/           # 附件文件
│   ├── abc123.pdf
│   └── def456.png
└── snapshots/             # 计划快照
    └── snapshot_20240428.json
```

#### 恢复流程
1. **预检** - 验证版本兼容性、数据完整性
2. **备份当前** - 自动创建恢复点
3. **导入数据** - 逐表导入，处理冲突
4. **恢复附件** - 复制到 userData/attachments
5. **验证** - 检查数据一致性
6. **回滚机制** - 失败时自动回滚

---

## 📊 数据库 Schema 扩展

### 新增表

```sql
-- AI 对话线程
CREATE TABLE ai_threads (
  id TEXT PRIMARY KEY,
  title TEXT,
  provider TEXT NOT NULL,           -- openai
  model TEXT NOT NULL,               -- gpt-5.4-mini
  last_response_id TEXT,             -- Responses API 的 response_id
  summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- AI 操作日志
CREATE TABLE ai_actions_log (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  action_type TEXT NOT NULL,        -- create_task / update_task / apply_schedule
  payload_json TEXT NOT NULL,
  applied INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 计划快照
CREATE TABLE plan_snapshots (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,             -- agent / manual / import
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 调度约束
CREATE TABLE schedule_constraints (
  date TEXT PRIMARY KEY,
  work_start TEXT,                  -- 09:00
  work_end TEXT,                    -- 18:00
  focus_block_min INTEGER DEFAULT 25,
  break_min INTEGER DEFAULT 5,
  no_schedule_json TEXT,            -- 午休、接孩子等固定时间段
  energy_level TEXT                 -- low / normal / high
);

-- 附件元数据（从 tasks.attachments JSON 迁移）
CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  created_at TEXT NOT NULL
);
```

---

## 🛠️ 实施里程碑

### Milestone 1: 基础设施（3 天）
**目标**: 搭建 AI Agent 基础架构

- [ ] 创建 `electron/services/ai-service.ts`
- [ ] 创建 `electron/services/keyvault.ts` (API key 加密存储)
- [ ] 创建 `electron/ipc/ai-handler.ts`
- [ ] 扩展 `preload/index.ts` 暴露 `ai.chat` API
- [ ] 扩展 `src/types/electron.d.ts` 类型定义
- [ ] 数据库迁移: 新增 4 张表
- [ ] 测试: API key 存储/读取、加密可用性检测

**验收标准**:
- ✅ API key 可以安全存储和读取
- ✅ AI service 可以调用 OpenAI Responses API
- ✅ 数据库 schema 迁移成功

---

### Milestone 2: AI Agent 核心（4 天）
**目标**: 实现 draft-confirm-apply-undo 工作流

- [ ] 实现 `chatAndPlan()` 函数（Responses API 集成）
- [ ] 定义 4 个 Tool: create_tasks / update_tasks / find_free_slots / schedule_tasks
- [ ] 实现 `runLocalTool()` 本地工具执行器
- [ ] 创建 `src/components/ai/AgentPanel.tsx`
- [ ] 创建 `src/stores/agent-store.ts`
- [ ] 实现 Draft Actions 预览 UI
- [ ] 实现 Apply/Undo 逻辑
- [ ] 错误处理: 429 限流、网络失败、token 超限

**验收标准**:
- ✅ 用户输入"明天下午3点开会"，AI 生成任务草稿
- ✅ 用户可以修改草稿后应用
- ✅ 应用后可以撤销到上一个快照
- ✅ 离线时提示用户，不崩溃

---

### Milestone 3: 中文 NLP（3 天）
**目标**: 80% 常见表达可以正确解析

- [ ] 创建 `src/lib/nlp/parse-cntime.ts` 规则引擎
- [ ] 支持日期解析（今天/明天/下周三/4月30日）
- [ ] 支持时间解析（上午9点/下午3点半）
- [ ] 支持重复规则（每天/每周一/每月15号）
- [ ] 支持优先级关键词（重要/紧急）
- [ ] 创建 `electron/services/nlp-fallback.ts` AI 增强
- [ ] 集成到 QuickAddTask 组件
- [ ] 集成到 TaskForm 组件
- [ ] 测试: 200+ 测试用例

**验收标准**:
- ✅ "明天下午3点开会" → { dueDate: "2024-04-29", dueTime: "15:00" }
- ✅ "每周一上午9点站会" → { recurrenceRule: { freq: "WEEKLY", byWeekday: [1] } }
- ✅ 解析失败时降级到 AI 增强

---

### Milestone 4: 智能调度（4 天）
**目标**: 自动生成每日任务排期

- [ ] 创建 `electron/services/scheduling-engine.ts`
- [ ] 实现 `draftDailySchedule()` 算法
- [ ] 实现 `findFreeSlots()` 空闲时间查找
- [ ] 实现 `scoreDueDate/Priority/Duration()` 评分函数
- [ ] 创建 `schedule_constraints` 表和 CRUD
- [ ] 在 Calendar 组件中集成"智能排期"按钮
- [ ] 在 Settings 中添加工作时间配置
- [ ] 测试: 边界情况（无空闲时间、任务过多、时长超限）

**验收标准**:
- ✅ 点击"智能排期"，未排期任务自动分配到日历
- ✅ 排期结果符合工作时间约束
- ✅ 高优先级任务优先分配
- ✅ 用户可以手动调整后重新排期

---

### Milestone 5: 完整备份与 ICS（3 天）
**目标**: 数据可以完整导出和恢复

- [ ] 创建 `electron/services/export-bundle.ts`
- [ ] 创建 `electron/services/import-validator.ts`
- [ ] 实现附件打包（复制到 bundle/attachments/）
- [ ] 实现快照打包（plan_snapshots 表）
- [ ] 实现导入预检（版本兼容性、数据完整性）
- [ ] 实现回滚机制（失败时恢复到备份点）
- [ ] 创建 `electron/services/ics-service.ts`
- [ ] 实现 ICS 导出（任务 → .ics 文件）
- [ ] 在 Settings 中添加"导出日历"按钮

**验收标准**:
- ✅ 导出 bundle 包含所有数据和附件
- ✅ 导入 bundle 后数据完整，附件可打开
- ✅ 导入失败时自动回滚
- ✅ 导出的 .ics 文件可以导入到 Google Calendar

---

### Milestone 6: 会话恢复与优化（2 天）
**目标**: 应用崩溃或重启后状态恢复

- [ ] 创建 `electron/services/session-recovery.ts`
- [ ] 监听 `powerMonitor.resume` 事件
- [ ] 保存窗口状态（位置、大小、最后打开的视图）
- [ ] 保存 AI 对话状态（last_response_id）
- [ ] 恢复未完成的 Draft Actions
- [ ] 在 Tray 中添加"恢复会话"菜单项
- [ ] 性能优化: 数据库索引、虚拟滚动
- [ ] 测试: 强制关闭应用后重启

**验收标准**:
- ✅ 应用重启后恢复到上次的视图
- ✅ AI 对话可以继续（使用 previous_response_id）
- ✅ 未应用的草稿不会丢失

---

## 🚨 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| OpenAI API 限流 | AI 功能不可用 | 实现 429 重试 + 指数退避；提供降级到规则引擎 |
| API Key 泄露 | 安全风险 | 使用 safeStorage 加密；不提交到 Git；提供撤销/重置功能 |
| Linux safeStorage 不可用 | 无法存储 API key | 提供 session-only 模式或主密码加密 |
| 中文 NLP 准确率低 | 用户体验差 | 规则引擎优先；AI 增强作为 fallback；提供手动修正 |
| 智能调度算法不合理 | 排期结果不可用 | 提供手动调整；收集用户反馈迭代算法 |
| 备份文件过大 | 导入导出慢 | 压缩 JSON；附件可选打包；增量备份（未来） |
| 时区问题 | 日期时间错乱 | 统一使用 ISO 8601；存储时区信息；测试 DST |

---

## 📈 成功指标

### 功能指标
- [ ] AI Agent 对话成功率 > 95%
- [ ] 中文 NLP 解析准确率 > 80%
- [ ] 智能调度采纳率 > 60%（用户应用 AI 建议的比例）
- [ ] 备份恢复成功率 = 100%
- [ ] ICS 导出兼容性 > 95%（主流日历应用）

### 性能指标
- [ ] AI 响应时间 < 3s（P95）
- [ ] 智能排期计算时间 < 1s（100 个任务）
- [ ] 备份导出时间 < 5s（1000 个任务 + 100MB 附件）
- [ ] 应用冷启动 < 2s

### 成本指标
- [ ] 每用户每月 API 成本 < $2
- [ ] 本地存储占用 < 500MB（1 年使用）

---

## 🔄 后续迭代（P2）

### PWA Companion（可选）
- 轻量级 Web 版本，仅查看和快速添加
- 使用 Background Sync API 离线支持
- 通过 File System Access API 同步数据

### OAuth 集成（可选）
- Google Calendar 双向同步
- Outlook Calendar 集成
- 需要服务端中转（OAuth 回调）

### 移动端（长期）
- React Native 或 Flutter
- 复用核心业务逻辑
- 需要云同步支持

---

## 📚 参考资料

- [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)
- [Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron safeStorage](https://www.electronjs.org/docs/latest/api/safe-storage)
- [iCalendar RFC 5545](https://icalendar.org/RFC-Specifications/iCalendar-RFC-5545/)
- [Sunsama Timeboxing](https://www.sunsama.com/features/timeboxing)

---

## 📝 附录：System Prompt 示例

```
你是 Plans App 的 AI 助手，帮助用户管理任务和时间。

当前上下文:
- 今天日期: {today}
- 工作时间: {workStart} - {workEnd}
- 未完成任务: {tasks}
- 今日已排期: {scheduledToday}
- 可用时间段: {freeSlots}

你可以使用以下工具:
1. create_tasks - 创建新任务
2. update_tasks - 更新现有任务
3. find_free_slots - 查找空闲时间
4. schedule_tasks - 为任务分配时间

用户输入: {userText}

请分析用户意图，生成任务草稿或排期建议。输出格式:
- 如果是创建任务: 调用 create_tasks
- 如果是查询空闲时间: 调用 find_free_slots
- 如果是请求排期: 调用 schedule_tasks

注意:
- 所有操作都是草稿，需要用户确认后才会应用
- 日期格式: YYYY-MM-DD
- 时间格式: HH:mm
- 优先级: low / medium / high
- 重复规则: { freq: "DAILY" | "WEEKLY" | "MONTHLY", interval: number, ... }
```

---

**文档版本**: v2.0  
**最后更新**: 2024-04-28  
**负责人**: Plans App Team  
**状态**: 待执行
