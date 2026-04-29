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

**重要规则**：
1. 当用户提到"明天"、"后天"、"下周"等相对时间时，必须根据当前日期计算具体日期
2. 创建任务时，必须为每个任务设置 dueDate（YYYY-MM-DD 格式）
3. 如果用户提到具体时间（如"晚上"、"19点"），必须设置 dueTime（HH:mm 格式）
4. 如果用户没有明确时间，根据任务性质推测合理时间：
   - 工作任务：工作时间内（9:00-18:00）
   - 生活任务：工作时间外（18:00-22:00）
   - 紧急任务：当天或明天
   - 普通任务：未来 1-3 天内`;

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
4. **必须自动安排时间**：
   - 当前时间：${currentTime}
   - 避开工作时间（${timeMap.workdays.start}-${timeMap.workdays.end}）
   - "晚上回来" → 推测为 19:00 后
   - 按顺序安排：
     * 充电：dueDate="${currentDate}", dueTime="19:00", duration=30
     * 洗衣服：dueDate="${currentDate}", dueTime="19:30", duration=30
     * 写文章：dueDate="${currentDate}", dueTime="20:00", duration=90

**重要**：
- 每个任务必须有 dueDate 和 dueTime
- 基于当前时间（${currentTime}）和用户画像做出智能决策
- 减少用户手动操作`;
}
