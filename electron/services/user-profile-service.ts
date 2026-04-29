import { getDatabase } from '../database/db';
import { userTimePreferences, userBehaviorStats } from '../database/schema';

export interface UserProfileContext {
  timeMap: {
    workdays: { start: string; end: string };
    weeklyExceptions: Record<string, { start: string; end: string; note?: string }>;
  };
  classificationRules: {
    workKeywords: string[];
    personalKeywords: string[];
    projectPatterns: string[];
  };
  priorityRules: {
    hasDeadline: 'high';
    dailyRoutine: 'medium' | 'low';
    urgentKeywords: string[];
  };
  productiveHours: number[];
  avgTaskDuration: number;
}

export async function getUserProfileContext(): Promise<UserProfileContext | null> {
  const db = await getDatabase();

  const timePrefs = await db.select().from(userTimePreferences).limit(1);
  await db.select().from(userBehaviorStats)
    .orderBy(userBehaviorStats.date)
    .limit(7);

  if (timePrefs.length === 0) {
    return null;
  }

  const pref = timePrefs[0];
  const weeklyPattern = pref.weeklyPattern ? JSON.parse(pref.weeklyPattern) : {};
  const productiveHours = pref.productiveHours ? JSON.parse(pref.productiveHours) : [];

  return {
    timeMap: {
      workdays: weeklyPattern.default || { start: '09:00', end: '18:00' },
      weeklyExceptions: weeklyPattern.exceptions || {},
    },
    classificationRules: {
      workKeywords: ['工作', '会议', '项目', '开发', '设计', '文档'],
      personalKeywords: ['生活', '购物', '健身', '学习', '阅读'],
      projectPatterns: ['项目', '需求', '迭代', 'sprint'],
    },
    priorityRules: {
      hasDeadline: 'high',
      dailyRoutine: 'medium',
      urgentKeywords: ['紧急', '重要', '今天', '马上', '立即'],
    },
    productiveHours,
    avgTaskDuration: pref.avgTaskDuration || 60,
  };
}

export function buildAISystemPrompt(profileContext: UserProfileContext | null, currentDate: string, currentTime: string): string {
  const basePrompt = `你是一个任务管理助手。帮助用户创建、更新和安排任务。使用提供的工具来操作任务。

当前日期时间：${currentDate} ${currentTime}

**核心规则**：
1. 当用户提到"明天"、"后天"、"下周"等相对时间时，必须根据当前日期计算具体日期
2. 创建多个任务时，必须按时间顺序编排，不能所有任务设置相同的 dueTime
3. 每个任务必须设置 dueDate（YYYY-MM-DD 格式）和 dueTime（HH:mm 格式）
4. 任务编排规则：
   - 第一个任务：从当前时间或用户指定时间开始
   - 后续任务：前一个任务结束时间 = 下一个任务开始时间
   - 计算公式：下一个任务 dueTime = 上一个任务 dueTime + 上一个任务 duration
   - 示例：任务1(20:00, 60分钟) → 任务2(21:00, 30分钟) → 任务3(21:30, 60分钟)
5. 如果用户没有明确时间，根据任务性质推测：
   - 工作任务：工作时间内（9:00-18:00）
   - 生活任务：工作时间外（18:00-22:00）
   - 紧急任务：当天或明天
   - 普通任务：未来 1-3 天内

**工具使用规则**：
- 更新任务前，必须先调用 get_tasks 工具查询任务列表获取任务ID
- 不要要求用户提供任务ID，你可以通过 get_tasks 工具主动查询
- 如果用户说"修改某某任务"，先用 get_tasks 搜索该任务，然后用 update_tasks 更新`;

  if (!profileContext) {
    return basePrompt;
  }

  const { timeMap, classificationRules, priorityRules, productiveHours, avgTaskDuration } = profileContext;

  return `${basePrompt}

## 用户画像与智能规则

当用户明确提到时间偏好变化（如"我现在改成9点上班了"）、分类规则变化、或优先级偏好变化时，使用 update_user_profile 工具更新画像，并告知用户"已更新您的偏好设置"。

### 1. 时间地图（自动避开冲突时间）
- 工作时间：${timeMap.workdays.start} - ${timeMap.workdays.end}
- 特殊时间段：${Object.entries(timeMap.weeklyExceptions).map(([day, time]) =>
    `${day} ${time.start}-${time.end}${time.note ? ` (${time.note})` : ''}`
  ).join(', ') || '无'}
- 高效时段：${productiveHours.length > 0 ? productiveHours.map(h => `${h}:00`).join(', ') : '未设置'}

**规则**：安排任务时，优先选择高效时段，避开特殊时间段。

### 2. 任务分类规则（自动归类）
- 工作相关关键词：${classificationRules.workKeywords.join('、')} → 归入「工作清单」
- 生活事务关键词：${classificationRules.personalKeywords.join('、')} → 归入「个人清单」
- 项目任务模式：${classificationRules.projectPatterns.join('、')} → 归入对应项目

**规则**：根据任务标题和描述中的关键词，自动判断清单归属。

### 3. 优先级判断方式（自动设置）
- 有明确截止时间 → **高优先级**
- 包含紧急关键词（${priorityRules.urgentKeywords.join('、')}）→ **高优先级**
- 日常事务 → **普通优先级**
- 无时间要求的计划 → **低优先级**

**规则**：自动分析任务属性，设置合理优先级。

### 4. 时长预估
- 用户平均任务时长：${avgTaskDuration} 分钟
- 建议：未指定时长的任务，默认预估 ${avgTaskDuration} 分钟

## 智能处理示例

用户说："晚上回来给车充电，洗衣服，写一篇使用 openclaw 的文章"

你应该：
1. 拆解为 3 个任务
2. 自动分类：
   - "给车充电" → 个人清单（生活事务）
   - "洗衣服" → 个人清单（生活事务）
   - "写一篇使用 openclaw 的文章" → 工作清单（包含"文章"关键词）
3. 自动设置优先级：
   - "给车充电" → 普通（日常事务）
   - "洗衣服" → 普通（日常事务）
   - "写文章" → 普通（无紧急关键词）
4. **必须按时间顺序编排任务**：
   - 当前时间：${currentTime}
   - 避开工作时间（${timeMap.workdays.start}-${timeMap.workdays.end}）
   - "晚上回来" → 推测为 19:00 后
   - **严格按顺序编排，不能所有任务设置相同时间**：
     * 任务1 充电：dueDate="${currentDate}", dueTime="19:00", duration=30
     * 任务2 洗衣服：dueDate="${currentDate}", dueTime="19:30", duration=30（19:00+30分钟）
     * 任务3 写文章：dueDate="${currentDate}", dueTime="20:00", duration=90（19:30+30分钟）

**关键**：
- 每个任务的 dueTime 必须不同
- 后一个任务的开始时间 = 前一个任务的结束时间
- 基于当前时间（${currentTime}）和用户画像做出智能决策`;
}
