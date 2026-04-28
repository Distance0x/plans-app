import { Conversations, Bubble, Sender, Prompts, type PromptsProps } from '@ant-design/x';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { useAgentStore } from '../../stores/agent-store';
import { useTaskStore } from '../../stores/task-store';

export function AgentPanel() {
  const { messages, isLoading, draftActions, addMessage, setLoading, setDraftActions, clearDraft } = useAgentStore();
  const { createTask } = useTaskStore();

  const handleSend = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: message };
    addMessage(userMessage);
    setLoading(true);

    try {
      const response = await window.electron.ai.chat(message);
      addMessage({
        role: 'assistant',
        content: response.assistantText,
        draftActions: response.draftActions,
      });
      setDraftActions(response.draftActions);
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    await window.electron.snapshot.create('ai_agent');

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

        for (const task of tasks) {
          await createTask({
            title: task.title,
            description: task.description,
            priority: task.priority || 'medium',
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            duration: task.duration || 60,
          });
        }
      }
    }
    clearDraft();
  };

  const promptItems: PromptsProps['items'] = [
    { key: '1', label: '帮我规划今天的任务' },
    { key: '2', label: '创建一个学习计划' },
    { key: '3', label: '整理本周待办事项' },
    { key: '4', label: '分析我的任务完成情况' },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white/50 to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/50">
      <Conversations
        items={messages.map((msg, idx) => ({
          key: String(idx),
          label: msg.role === 'user' ? '我' : 'AI 助手',
        }))}
        style={{ height: '100%' }}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="text-center">
                  <RobotOutlined style={{ fontSize: 64, color: '#1890ff' }} />
                  <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
                    AI 任务助手
                  </h2>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    我可以帮你创建任务、规划日程、分析习惯
                  </p>
                </div>
                <Prompts
                  title="试试这些"
                  items={promptItems}
                  onItemClick={(info) => {
                    const label = info.data.label;
                    if (typeof label === 'string') {
                      handleSend(label);
                    }
                  }}
                  styles={{
                    list: { maxWidth: 600 },
                    item: { borderRadius: 8 }
                  }}
                />
              </div>
            )}

            {messages.map((msg, idx) => (
              <Bubble
                key={idx}
                placement={msg.role === 'user' ? 'end' : 'start'}
                avatar={<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white">
                  {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                </div>}
                content={msg.content}
                styles={{
                  content: {
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : undefined,
                    color: msg.role === 'user' ? '#fff' : undefined,
                  }
                }}
              />
            ))}

            {isLoading && (
              <Bubble
                placement="start"
                avatar={<div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white">
                  <RobotOutlined />
                </div>}
                content="正在思考..."
                loading
              />
            )}
          </div>

          {draftActions.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
              <div className="flex items-center justify-between mb-3">
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
                    onClick={handleApply}
                    className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 text-sm font-medium shadow-sm transition-all"
                  >
                    ✓ 应用
                  </button>
                  <button
                    onClick={clearDraft}
                    className="px-4 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium shadow-sm transition-all"
                  >
                    ✕ 取消
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <Sender
              placeholder="输入任务描述，让 AI 帮你规划..."
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
        </div>
      </Conversations>
    </div>
  );
}
