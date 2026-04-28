# Plans App 无服务器改进计划

基于《plans-app 无服务器改进研究报告》制定的完整实施计划。

## 一、核心架构升级

### 1.1 本地优先架构强化

**目标**：确保应用在完全离线状态下功能完整可用

**实施方案**：
- 移除所有云服务依赖的硬编码
- 实现完整的本地数据持久化
- 优化 SQLite 数据库性能
- 实现增量备份机制

**技术要点**：
```typescript
// 本地优先数据访问层
interface LocalFirstRepository<T> {
  // 所有操作优先本地，无网络依赖
  findAll(): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}
```

### 1.2 可选云同步设计

**目标**：提供可插拔的云同步能力，用户自主选择

**实施方案**：
- 设计云同步抽象接口
- 支持多种云存储后端（WebDAV、S3、OneDrive等）
- 实现冲突解决策略
- 提供同步状态可视化

**接口设计**：
```typescript
interface CloudSyncProvider {
  name: string
  authenticate(): Promise<void>
  upload(snapshot: Snapshot): Promise<void>
  download(): Promise<Snapshot>
  listVersions(): Promise<Version[]>
}

// 支持的提供商
type SyncProvider = 'webdav' | 's3' | 'onedrive' | 'local-only'
```

## 二、AI 能力增强

### 2.1 OpenAI Compatible API 集成

**当前状态**：✅ 已完成
- 支持任意 OpenAI 兼容 API
- 加密存储 API 配置
- Tool Calls 集成

### 2.2 本地 AI 模型支持

**目标**：支持完全离线的 AI 能力

**实施方案**：
- 集成 Ollama 本地模型
- 支持 llama.cpp 直接调用
- 实现模型自动下载与管理
- 提供模型性能监控

**配置界面**：
```typescript
interface AIConfig {
  mode: 'cloud' | 'local'
  
  // 云端配置
  cloud?: {
    baseURL: string
    apiKey: string
    model: string
  }
  
  // 本地配置
  local?: {
    provider: 'ollama' | 'llamacpp'
    modelPath: string
    contextSize: number
  }
}
```

### 2.3 用户画像与智能推荐

**目标**：基于用户行为提供个性化建议

**数据收集**：
- 任务创建/完成时间分布
- 任务类型偏好
- 番茄钟使用习惯
- AI 对话历史

**推荐引擎**：
```typescript
interface UserProfile {
  // 时间偏好
  productiveHours: number[] // [9, 10, 14, 15]
  averageTaskDuration: number // 分钟
  
  // 任务偏好
  frequentTags: string[]
  priorityDistribution: Record<Priority, number>
  
  // 完成率
  completionRate: number
  streakDays: number
}

interface SmartRecommendation {
  type: 'schedule' | 'break' | 'priority' | 'tag'
  message: string
  confidence: number
  action?: () => void
}
```

## 三、数据安全与隐私

### 3.1 端到端加密

**目标**：用户数据完全加密，即使同步到云端也无法被读取

**实施方案**：
- 使用用户主密码派生加密密钥
- 所有敏感数据加密存储
- 云同步时传输加密数据
- 支持密码修改与密钥轮换

**加密架构**：
```typescript
interface EncryptionService {
  // 使用用户密码派生密钥
  deriveKey(password: string, salt: string): Promise<CryptoKey>
  
  // 加密/解密数据
  encrypt(data: string, key: CryptoKey): Promise<string>
  decrypt(encrypted: string, key: CryptoKey): Promise<string>
  
  // 密钥管理
  rotateKey(oldPassword: string, newPassword: string): Promise<void>
}
```

### 3.2 本地数据备份

**目标**：防止数据丢失，支持多版本恢复

**实施方案**：
- 自动增量备份
- 手动完整备份
- 备份加密存储
- 跨设备备份恢复

**备份策略**：
- 每日自动备份（保留 7 天）
- 每周完整备份（保留 4 周）
- 重要操作前快照（AI 应用前、批量删除前）

## 四、性能优化

### 4.1 数据库优化

**目标**：提升大数据量下的查询性能

**优化措施**：
- 添加关键字段索引
- 实现查询结果缓存
- 优化复杂查询 SQL
- 实现虚拟滚动

**索引策略**：
```sql
-- 任务查询优化
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(dueDate);
CREATE INDEX idx_tasks_list_id ON tasks(listId);
CREATE INDEX idx_tasks_created_at ON tasks(createdAt);

-- 复合索引
CREATE INDEX idx_tasks_status_due ON tasks(status, dueDate);
```

### 4.2 UI 渲染优化

**目标**：流畅的用户体验，即使在低端设备

**优化措施**：
- 虚拟列表渲染（react-window）
- 防抖/节流用户输入
- 懒加载非关键组件
- 优化动画性能

## 五、实施路线图

### Phase 1: 核心架构（2 周）
- [ ] 移除云服务硬依赖
- [ ] 实现完整本地功能
- [ ] 数据库性能优化
- [ ] 增量备份机制

### Phase 2: AI 增强（2 周）
- [ ] 本地 AI 模型集成（Ollama）
- [ ] 用户画像数据收集
- [ ] 智能推荐引擎
- [ ] AI 配置界面优化

### Phase 3: 安全加固（1 周）
- [ ] 端到端加密实现
- [ ] 密钥管理系统
- [ ] 备份加密
- [ ] 安全审计

### Phase 4: 云同步（2 周）
- [ ] 云同步抽象接口
- [ ] WebDAV 实现
- [ ] 冲突解决策略
- [ ] 同步状态 UI

### Phase 5: 体验优化（1 周）
- [ ] UI 渲染优化
- [ ] 性能监控
- [ ] 用户反馈收集
- [ ] 文档完善

## 六、技术选型

### 本地 AI 方案对比

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| Ollama | 易用、模型丰富、社区活跃 | 需要额外安装 | ⭐⭐⭐⭐⭐ |
| llama.cpp | 性能最优、无额外依赖 | 集成复杂 | ⭐⭐⭐⭐ |
| Transformers.js | 纯 JS、易集成 | 模型选择少、性能一般 | ⭐⭐⭐ |

**推荐**：优先 Ollama，提供 llama.cpp 作为高级选项

### 云同步方案对比

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| WebDAV | 开放标准、自托管友好 | 需要服务器 | ⭐⭐⭐⭐⭐ |
| S3 Compatible | 兼容性好、服务商多 | 需要付费 | ⭐⭐⭐⭐ |
| OneDrive/Google Drive | 用户基数大 | API 限制多 | ⭐⭐⭐ |

**推荐**：优先 WebDAV，支持 S3 作为备选

## 七、成功指标

### 功能指标
- ✅ 完全离线可用（无网络依赖）
- ✅ 本地 AI 响应时间 < 5s
- ✅ 数据库查询 < 100ms（1000+ 任务）
- ✅ 云同步成功率 > 99%

### 用户体验指标
- ✅ 应用启动时间 < 2s
- ✅ 任务列表渲染 < 100ms
- ✅ AI 推荐准确率 > 80%
- ✅ 数据恢复成功率 100%

### 安全指标
- ✅ 所有敏感数据加密存储
- ✅ 云端数据无法被服务商读取
- ✅ 通过安全审计（OWASP Top 10）

## 八、风险与应对

### 技术风险
1. **本地 AI 性能不足**
   - 应对：提供云端 AI 降级方案
   - 应对：优化模型选择（小模型优先）

2. **云同步冲突复杂**
   - 应对：采用 CRDT 算法
   - 应对：提供手动冲突解决界面

3. **加密性能开销**
   - 应对：仅加密敏感字段
   - 应对：使用硬件加速（Web Crypto API）

### 用户体验风险
1. **本地 AI 配置复杂**
   - 应对：提供一键安装脚本
   - 应对：详细的图文教程

2. **云同步配置门槛高**
   - 应对：提供常见服务商预设
   - 应对：视频教程

## 九、后续演进

### 短期（3 个月）
- 移动端支持（React Native）
- 浏览器插件（快速捕获）
- 邮件集成（任务导入）

### 中期（6 个月）
- 团队协作（可选）
- 公开分享（任务模板）
- API 开放（第三方集成）

### 长期（1 年）
- 跨平台同步（iOS/Android）
- 插件系统（社区扩展）
- 市场生态（模板/主题）
