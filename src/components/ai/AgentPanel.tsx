import { useState } from 'react';
import { useAgentStore } from '../../stores/agent-store';
import { useTaskStore } from '../../stores/task-store';

export function AgentPanel() {
  const [input, setInput] = useState('');
  const { messages, isLoading, draftActions, addMessage, setLoading, setDraftActions, clearDraft } = useAgentStore();
  const { createTask } = useTaskStore();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    addMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      const response = await window.electron.ai.chat(input);
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
    // 创建快照
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {draftActions.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              待确认操作 ({draftActions.length})
            </span>
            <div className="space-x-2">
              <button
                onClick={handleApply}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                应用
              </button>
              <button
                onClick={clearDraft}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                取消
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {draftActions.map((action, idx) => (
              <div key={idx}>
                {action.type === 'create_task' && `创建 ${(action.payload as any[]).length} 个任务`}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入任务描述..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
