import { useState, useEffect, useRef } from 'react';
import { Sender } from '@ant-design/x';
import { RobotOutlined, SettingOutlined, PlusOutlined, ClearOutlined, EditOutlined } from '@ant-design/icons';
import { Select, Card, Button, Popconfirm } from 'antd';
import { useAgentStore } from '../../stores/agent-store';
import { useTaskStore } from '../../stores/task-store';
import { TaskForm } from '../tasks/TaskForm';
import { MessageBubble } from './MessageBubble';

interface AIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

interface AIStreamChunk {
  streamId?: string;
  sequence?: number;
  thinking?: string;
  toolCalls?: any[];
  content?: string;
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
    showThinking,
    addMessage,
    loadMessages,
    deleteMessage,
    setLoading,
    setStreamingThinking,
    setPendingToolCalls,
    setDraftActions,
    clearDraft,
    setShowThinking,
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
  const [streamingContent, setStreamingContent] = useState('');
  const streamingContentRef = useRef('');
  const streamBufferRef = useRef('');
  const streamFlushTimerRef = useRef<number | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const cancelledRequestIdsRef = useRef<Set<string>>(new Set());
  const activeStreamRef = useRef<{
    streamId?: string;
    seenSequences: Set<number>;
    active: boolean;
  }>({
    seenSequences: new Set(),
    active: false,
  });
  const [appliedMessages, setAppliedMessages] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ai-applied-messages');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const resetStreamBuffer = () => {
    streamBufferRef.current = '';
    if (streamFlushTimerRef.current !== null) {
      window.clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }
  };

  const clearStreamingState = (requestId?: string) => {
    if (requestId && activeRequestIdRef.current !== requestId) return;

    setLoading(false);
    activeRequestIdRef.current = null;
    activeStreamRef.current.active = false;
    streamingContentRef.current = '';
    setStreamingThinking('');
    setPendingToolCalls([]);
    setStreamingContent('');
    resetStreamBuffer();
  };
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

    const flushStreamingBuffer = () => {
      const nextContent = streamBufferRef.current;
      if (!nextContent) return;

      streamBufferRef.current = '';
      setStreamingContent(prev => {
        const nextValue = prev + nextContent;
        streamingContentRef.current = nextValue;
        return nextValue;
      });
    };

    const enqueueStreamingContent = (content: string) => {
      streamBufferRef.current += content;
      if (streamFlushTimerRef.current !== null) return;

      streamFlushTimerRef.current = window.setTimeout(() => {
        streamFlushTimerRef.current = null;
        flushStreamingBuffer();
      }, 32);
    };

    const handleStream = (chunk: AIStreamChunk) => {
      if (!activeStreamRef.current.active) return;

      const hasStreamId = typeof chunk.streamId === 'string' && chunk.streamId.length > 0;
      if (hasStreamId && chunk.streamId !== activeStreamRef.current.streamId) {
        return;
      }

      if (hasStreamId && typeof chunk.sequence === 'number') {
        if (activeStreamRef.current.seenSequences.has(chunk.sequence)) {
          return;
        }
        activeStreamRef.current.seenSequences.add(chunk.sequence);
      }

      if (chunk.thinking) {
        setStreamingThinking(chunk.thinking);
      }
      if (chunk.toolCalls) {
        setPendingToolCalls(chunk.toolCalls);
      }
      if (chunk.content) {
        enqueueStreamingContent(chunk.content);
      }
    };

    window.electron.on('ai:stream', handleStream);

    return () => {
      window.electron.off('ai:stream', handleStream);
      resetStreamBuffer();
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

  const handleCancel = () => {
    const requestId = activeRequestIdRef.current;
    if (!requestId) return;

    cancelledRequestIdsRef.current.add(requestId);
    activeStreamRef.current.active = false;

    const partialContent = streamingContentRef.current + streamBufferRef.current;
    const assistantContent = partialContent.trim()
      ? `${partialContent}\n\n（已中止）`
      : '已中止';
    const toolCallsSnapshot = pendingToolCalls.length > 0 ? [...pendingToolCalls] : undefined;
    const thinkingSnapshot = streamingThinking || undefined;

    clearStreamingState(requestId);
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: assistantContent,
      thinking: thinkingSnapshot,
      toolCalls: toolCallsSnapshot,
      timestamp: Date.now(),
    });

    window.electron.ai.cancelChat(requestId)
      .catch(error => console.error('Failed to cancel AI request:', error));
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const requestId = `stream_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
    setStreamingContent('');
    streamingContentRef.current = '';
    resetStreamBuffer();
    activeRequestIdRef.current = requestId;
    cancelledRequestIdsRef.current.delete(requestId);

    activeStreamRef.current = {
      streamId: requestId,
      seenSequences: new Set(),
      active: true,
    };

    try {
      const response = await window.electron.ai.chat(message, currentSessionId, requestId);

      if (response.cancelled || cancelledRequestIdsRef.current.has(requestId)) {
        cancelledRequestIdsRef.current.delete(requestId);
        clearStreamingState(requestId);
        return;
      }

      clearStreamingState(requestId);

      // 然后再添加最终消息到历史
      // 使用后端返回的 assistantText，不使用前端累积的 streamingContent
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
      if (cancelledRequestIdsRef.current.has(requestId)) {
        cancelledRequestIdsRef.current.delete(requestId);
        clearStreamingState(requestId);
        return;
      }

      clearStreamingState(requestId);

      addMessage({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
      });
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
            onClick={() => setShowThinking(!showThinking)}
            className={`p-2 rounded-lg transition-colors ${
              showThinking
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
            title={showThinking ? '隐藏思考过程' : '显示思考过程'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
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
          <div key={msg.id}>
            <MessageBubble
              role={msg.role}
              content={msg.content}
              thinking={showThinking ? msg.thinking : undefined}
              toolCalls={msg.toolCalls}
              timestamp={msg.timestamp}
              onDelete={msg.role === 'assistant' ? () => deleteMessage(msg.id) : undefined}
            />
            {msg.draftActions && msg.draftActions.length > 0 && msg.draftActions[0].type === 'create_task' && (
              <div className="mt-2 ml-11 space-y-2">
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
        ))}

        {isLoading && (
          <MessageBubble
            role="assistant"
            content={streamingContent || "正在处理..."}
            thinking={showThinking ? streamingThinking : undefined}
            toolCalls={pendingToolCalls}
            isStreaming={true}
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
                        }>;
                        for (const update of updates) {
                          const { taskId, ...fields } = update;
                          await updateTask(taskId, fields);
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
          onCancel={handleCancel}
          loading={isLoading}
          readOnly={isLoading}
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
