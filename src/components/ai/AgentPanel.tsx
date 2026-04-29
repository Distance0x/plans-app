import { useState, useEffect } from 'react';
import { Bubble, Sender } from '@ant-design/x';
import { UserOutlined, RobotOutlined, SettingOutlined, PlusOutlined, DeleteOutlined, ClearOutlined, EditOutlined } from '@ant-design/icons';
import { Select, Card, Button, Popconfirm } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAgentStore } from '../../stores/agent-store';
import { useTaskStore } from '../../stores/task-store';
import { TaskForm } from '../tasks/TaskForm';
import { ThinkingIndicator } from './ThinkingIndicator';
import { ToolCallCard } from './ToolCallCard';

interface AIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

export function AgentPanel() {
  const {
    currentSessionId,
    sessions,
    messages,
    isLoading,
    streamingThinking,
    pendingToolCalls,
    draftActions,
    addMessage,
    loadMessages,
    deleteMessage,
    setLoading,
    setStreamingThinking,
    setPendingToolCalls,
    setDraftActions,
    clearDraft,
    createSession,
    switchSession,
    clearCurrentSession,
  } = useAgentStore();
  const { createTask, updateTask } = useTaskStore();

  const [isConfigured, setIsConfigured] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<AIConfig>({ baseURL: '', apiKey: '', model: '' });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [applyingDraft, setApplyingDraft] = useState(false);
  const [appliedMessages, setAppliedMessages] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ai-applied-messages');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [editingTask, setEditingTask] = useState<{
    title: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
    dueDate?: string;
    dueTime?: string;
    duration?: number;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem('ai-applied-messages', JSON.stringify([...appliedMessages]));
  }, [appliedMessages]);

  useEffect(() => {
    loadConfig();
    loadHistoryMessages();

    const handleStream = (chunk: { thinking?: string; toolCalls?: any[]; content?: string }) => {
      if (chunk.thinking) {
        setStreamingThinking(chunk.thinking);
      }
      if (chunk.toolCalls) {
        setPendingToolCalls(chunk.toolCalls);
      }
    };

    window.electron.on('ai:stream', handleStream);

    return () => {
      window.electron.off('ai:stream', handleStream);
    };
  }, [setStreamingThinking, setPendingToolCalls]);

  const loadHistoryMessages = async () => {
    try {
      const history = await window.electron.ai.messages.load(currentSessionId);
      if (history && history.length > 0) {
        loadMessages(history);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const result = await window.electron.ai.loadConfig();
      if (result?.config?.baseURL && result?.config?.model) {
        setConfig({
          baseURL: result.config.baseURL,
          apiKey: '',
          model: result.config.model,
        });
        setIsConfigured(result.config.apiKey === '***');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!config.baseURL || !config.model) {
      setTestResult({ success: false, message: '请填写 URL 和模型' });
      return;
    }

    if (!config.apiKey && !isConfigured) {
      setTestResult({ success: false, message: '请填写 API Key' });
      return;
    }

    try {
      if (config.apiKey) {
        await window.electron.ai.saveConfig(config);
      } else {
        await window.electron.ai.saveConfig({ ...config, apiKey: '' });
      }
      setIsConfigured(true);
      setShowConfigModal(false);
      setTestResult(null);
    } catch (error) {
      setTestResult({ success: false, message: '保存失败' });
    }
  };

  const handleTestConnection = async () => {
    if (!config.baseURL || !config.model) {
      setTestResult({ success: false, message: '请填写 URL 和模型' });
      return;
    }

    if (!config.apiKey && !isConfigured) {
      setTestResult({ success: false, message: '请填写 API Key' });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      if (config.apiKey) {
        await window.electron.ai.saveConfig(config);
      }
      await window.electron.ai.testConnection();
      setTestResult({ success: true, message: '连接成功！' });
      setIsConfigured(true);
    } catch (error) {
      setTestResult({ success: false, message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: `msg_${Date.now()}`,
      role: 'user' as const,
      content: message,
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    setLoading(true);
    setInputValue('');
    setStreamingThinking('');
    setPendingToolCalls([]);

    try {
      const response = await window.electron.ai.chat(message, currentSessionId);
      addMessage({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.assistantText,
        thinking: response.thinking,
        toolCalls: response.toolCalls,
        draftActions: response.draftActions,
        timestamp: Date.now(),
      });
      setDraftActions(response.draftActions);
    } catch (error) {
      addMessage({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
      setStreamingThinking('');
      setPendingToolCalls([]);
    }
  };

  if (!isConfigured && !showConfigModal) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-900/50 dark:via-blue-900/20 dark:to-purple-900/20">
        <div className="text-center space-y-6 max-w-md">
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl" />
            <RobotOutlined style={{ fontSize: 64, color: '#667eea' }} className="relative" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            AI 任务助手
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            配置 AI 服务后即可开始使用
          </p>
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 mx-auto"
          >
            <SettingOutlined />
            配置 AI 服务
          </button>
        </div>
      </div>
    );
  }

  if (showConfigModal) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-900/50 dark:via-blue-900/20 dark:to-purple-900/20 p-6">
        <div className="w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3">
            <SettingOutlined style={{ fontSize: 24, color: '#667eea' }} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI 服务配置</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                API Base URL
              </label>
              <input
                type="text"
                value={config.baseURL}
                onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder={isConfigured && !config.apiKey ? "已保存（留空保持不变）" : "sk-..."}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Model
              </label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="gpt-4"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-sm ${
              testResult.success
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {testingConnection ? '测试中...' : '测试连接'}
            </button>
            <button
              onClick={handleSaveConfig}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              保存配置
            </button>
          </div>

          {isConfigured && (
            <button
              onClick={() => setShowConfigModal(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              取消
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-gray-900/50 dark:via-blue-900/20 dark:to-purple-900/20">
      <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <RobotOutlined style={{ fontSize: 24, color: '#667eea' }} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI 任务助手</h2>
          <Select
            value={currentSessionId}
            onChange={switchSession}
            style={{ width: 200 }}
            options={sessions.map(s => ({ label: s.title, value: s.id }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => createSession()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="新建会话"
          >
            <PlusOutlined style={{ fontSize: 18, color: '#667eea' }} />
          </button>
          <Popconfirm
            title="确定清空当前会话？"
            onConfirm={clearCurrentSession}
            okText="确定"
            cancelText="取消"
          >
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="清空会话"
            >
              <ClearOutlined style={{ fontSize: 18, color: '#667eea' }} />
            </button>
          </Popconfirm>
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="设置"
          >
            <SettingOutlined style={{ fontSize: 20, color: '#667eea' }} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <RobotOutlined style={{ fontSize: 48, color: '#667eea', opacity: 0.5 }} />
            <p className="text-gray-500 dark:text-gray-400">
              我可以帮你创建任务、规划日程、分析习惯
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="relative group">
            <Bubble
              placement={msg.role === 'user' ? 'end' : 'start'}
              avatar={
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md">
                  {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                </div>
              }
              content={
                <div>
                  <ThinkingIndicator thinking={msg.thinking} />
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {msg.toolCalls.map((tool) => (
                        <ToolCallCard key={tool.id} toolCall={tool} />
                      ))}
                    </div>
                  )}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.draftActions && msg.draftActions.length > 0 && msg.draftActions[0].type === 'create_task' && (
                    <div className="mt-2 space-y-2">
                      {((msg.draftActions[0].payload as any[]) || []).map((task: any, idx: number) => (
                        <Card
                          key={idx}
                          size="small"
                          title={`📋 任务 ${idx + 1}: ${task.title}`}
                          extra={
                            appliedMessages.has(`${msg.id}-${idx}`) ? (
                              <span className="text-sm text-green-600 font-medium">✓ 已创建</span>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => {
                                    setEditingTask(task);
                                  }}
                                >
                                  修改
                                </Button>
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={async () => {
                                    if (appliedMessages.has(`${msg.id}-${idx}`)) return;
                                    setAppliedMessages(prev => new Set(prev).add(`${msg.id}-${idx}`));
                                    try {
                                      await createTask({
                                        title: task.title,
                                        description: task.description,
                                        priority: task.priority || 'medium',
                                        dueDate: task.dueDate,
                                        dueTime: task.dueTime,
                                        duration: task.duration || 60,
                                      });
                                    } catch (error) {
                                      setAppliedMessages(prev => {
                                        const next = new Set(prev);
                                        next.delete(`${msg.id}-${idx}`);
                                        return next;
                                      });
                                      throw error;
                                    }
                                  }}
                                >
                                  应用
                                </Button>
                              </div>
                            )
                          }
                        >
                          <div className="text-sm space-y-1">
                            {task.description && <div className="text-gray-600 dark:text-gray-400">{task.description}</div>}
                            <div className="flex gap-2 text-xs text-gray-500">
                              {task.priority && <span>优先级: {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}</span>}
                              {task.dueDate && <span>截止: {task.dueDate} {task.dueTime || ''}</span>}
                              {task.duration && <span>时长: {task.duration}分钟</span>}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              }
              styles={{
                content: {
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255, 255, 255, 0.9)',
                  color: msg.role === 'user' ? '#fff' : undefined,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }
              }}
            />
            {msg.role === 'assistant' && (
              <Popconfirm
                title="确定删除此消息？"
                onConfirm={() => deleteMessage(msg.id)}
                okText="确定"
                cancelText="取消"
              >
                <button
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity"
                >
                  <DeleteOutlined style={{ fontSize: 14 }} />
                </button>
              </Popconfirm>
            )}
          </div>
        ))}

        {isLoading && (
          <Bubble
            placement="start"
            avatar={
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md">
                <RobotOutlined />
              </div>
            }
            content={
              <div>
                <ThinkingIndicator thinking={streamingThinking} />
                {pendingToolCalls.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {pendingToolCalls.map((tool) => (
                      <ToolCallCard key={tool.id} toolCall={tool} />
                    ))}
                  </div>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <span>正在处理...</span>
                </div>
              </div>
            }
          />
        )}
      </div>

      {draftActions.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                🎯 待确认操作
              </span>
              <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                {draftActions.map((action, idx) => (
                  <span key={idx}>
                    {action.type === 'create_task' && `创建 ${(action.payload as any[]).length} 个任务`}
                  </span>
                ))}
              </span>
            </div>
            <div className="space-x-2">
              <button
                onClick={async () => {
                  if (applyingDraft) return;
                  setApplyingDraft(true);
                  try {
                    await window.electron.snapshot.create('ai_agent');
                    const newApplied = new Set(appliedMessages);
                    for (const action of draftActions) {
                      if (action.type === 'create_task') {
                        const tasks = action.payload as Array<{
                          title: string;
                          description?: string;
                          priority?: 'high' | 'medium' | 'low';
                          dueDate?: string;
                          dueTime?: string;
                          duration?: number;
                        }>;
                        for (let idx = 0; idx < tasks.length; idx++) {
                          const task = tasks[idx];
                          await createTask({
                            title: task.title,
                            description: task.description,
                            priority: task.priority || 'medium',
                            dueDate: task.dueDate,
                            dueTime: task.dueTime,
                            duration: task.duration || 60,
                          });
                          const lastMsg = messages[messages.length - 1];
                          if (lastMsg?.role === 'assistant') {
                            newApplied.add(`${lastMsg.id}-${idx}`);
                          }
                        }
                      } else if (action.type === 'update_task') {
                        const updates = action.payload as Array<{
                          taskId: string;
                          title?: string;
                          description?: string;
                          priority?: 'high' | 'medium' | 'low';
                          status?: 'todo' | 'in_progress' | 'completed';
                          dueDate?: string;
                          dueTime?: string;
                          duration?: number;
                          scheduledStartTime?: string;
                          scheduledEndTime?: string;
                        }>;
                        for (const update of updates) {
                          const { taskId, ...fields } = update;
                          await updateTask(taskId, fields);
                        }
                      } else if (action.type === 'schedule_task') {
                        const schedules = action.payload as Array<{
                          taskId: string;
                          startTime: string;
                          endTime: string;
                        }>;
                        for (const schedule of schedules) {
                          await updateTask(schedule.taskId, {
                            scheduledStartTime: schedule.startTime,
                            scheduledEndTime: schedule.endTime,
                          });
                        }
                      }
                    }
                    setAppliedMessages(newApplied);
                    clearDraft();
                  } finally {
                    setApplyingDraft(false);
                  }
                }}
                disabled={applyingDraft}
                className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applyingDraft ? '应用中...' : '✓ 应用'}
              </button>
              <button
                onClick={clearDraft}
                className="px-4 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all text-sm font-medium"
              >
                ✕ 取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <Sender
          placeholder="输入任务描述,让 AI 帮你规划..."
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          loading={isLoading}
          disabled={isLoading}
          styles={{
            input: {
              borderRadius: 12,
              background: 'rgba(255, 255, 255, 0.9)',
            }
          }}
        />
      </div>

      {editingTask && (
        <TaskForm
          onClose={() => setEditingTask(null)}
          initialData={editingTask}
        />
      )}
    </div>
  );
}
