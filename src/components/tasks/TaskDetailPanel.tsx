import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckSquare, Flag, FileText } from 'lucide-react';
import { type Task, useTaskStore } from '@/stores/task-store';
import { cn } from '@/lib/utils';

interface TaskDetailPanelProps {
  task: Task | null;
}

export function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  const { updateTask, toggleComplete } = useTaskStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  useEffect(() => {
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    setNotes(task?.notes || '');
    setTab('write');
  }, [task?.id]);

  const statusLabel = useMemo(() => {
    if (!task) return '';
    return task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '处理中' : '待处理';
  }, [task]);

  const saveTextFields = async () => {
    if (!task) return;
    await updateTask(task.id, {
      title: title.trim() || task.title,
      description: description.trim(),
      notes: notes.trim(),
    });
  };

  if (!task) {
    return (
      <aside className="w-[360px] flex-shrink-0 border-l border-gray-200 bg-white/80 p-6 dark:border-gray-700 dark:bg-gray-900/80">
        <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
          选择一个任务查看详情
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[380px] flex-shrink-0 border-l border-gray-200 bg-white/90 dark:border-gray-700 dark:bg-gray-900/90">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <button
            onClick={() => toggleComplete(task.id)}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded border transition-colors',
              task.status === 'completed'
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-300 text-gray-400 hover:border-blue-500'
            )}
            title="完成"
          >
            {task.status === 'completed' && <CheckSquare className="h-4 w-4" />}
          </button>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTextFields}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="min-w-0 flex-1 bg-transparent text-xl font-semibold text-gray-900 outline-none dark:text-white"
          />
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-[88px_1fr] items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Flag className="h-4 w-4" />
              状态
            </div>
            <div className="flex gap-2">
              {(['todo', 'in_progress', 'completed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => updateTask(task.id, { status })}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs transition-colors',
                    task.status === status
                      ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                  )}
                >
                  {status === 'todo' ? '待处理' : status === 'in_progress' ? '处理中' : '已完成'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-gray-400">
              <Flag className="h-4 w-4" />
              优先级
            </div>
            <select
              value={task.priority}
              onChange={(event) => updateTask(task.id, { priority: event.target.value as Task['priority'] })}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>

            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="h-4 w-4" />
              日期
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={(event) => updateTask(task.id, { dueDate: event.target.value })}
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
              <input
                type="time"
                value={task.dueTime || ''}
                onChange={(event) => updateTask(task.id, { dueTime: event.target.value })}
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <FileText className="h-4 w-4" />
              描述
            </label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={saveTextFields}
              placeholder="添加简短描述"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Markdown 内容</label>
              <div className="rounded-md bg-gray-100 p-0.5 text-xs dark:bg-gray-800">
                <button
                  onClick={() => setTab('write')}
                  className={cn('rounded px-2 py-1', tab === 'write' && 'bg-white shadow-sm dark:bg-gray-700')}
                >
                  编辑
                </button>
                <button
                  onClick={() => setTab('preview')}
                  className={cn('rounded px-2 py-1', tab === 'preview' && 'bg-white shadow-sm dark:bg-gray-700')}
                >
                  预览
                </button>
              </div>
            </div>
            {tab === 'write' ? (
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                onBlur={saveTextFields}
                placeholder="# 标题&#10;- 待办&#10;**重点**"
                className="min-h-[280px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 font-mono text-sm leading-6 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            ) : (
              <MarkdownPreview markdown={notes} />
            )}
          </div>

          <div className="text-xs text-gray-400">
            {statusLabel} · 创建于 {new Date(task.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');

  if (!markdown.trim()) {
    return (
      <div className="min-h-[280px] rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-400 dark:border-gray-700">
        暂无内容
      </div>
    );
  }

  return (
    <div className="min-h-[280px] space-y-2 rounded-md border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
      {lines.map((line, index) => renderMarkdownLine(line, index))}
    </div>
  );
}

function renderMarkdownLine(line: string, index: number) {
  if (!line.trim()) {
    return <div key={index} className="h-3" />;
  }

  if (line.startsWith('### ')) {
    return <h3 key={index} className="text-base font-semibold">{renderInlineMarkdown(line.slice(4))}</h3>;
  }

  if (line.startsWith('## ')) {
    return <h2 key={index} className="text-lg font-semibold">{renderInlineMarkdown(line.slice(3))}</h2>;
  }

  if (line.startsWith('# ')) {
    return <h1 key={index} className="text-xl font-bold">{renderInlineMarkdown(line.slice(2))}</h1>;
  }

  if (line.startsWith('- ') || line.startsWith('* ')) {
    return (
      <div key={index} className="flex gap-2">
        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
        <span>{renderInlineMarkdown(line.slice(2))}</span>
      </div>
    );
  }

  if (line.startsWith('> ')) {
    return (
      <blockquote key={index} className="border-l-2 border-blue-300 pl-3 text-gray-500">
        {renderInlineMarkdown(line.slice(2))}
      </blockquote>
    );
  }

  return <p key={index}>{renderInlineMarkdown(line)}</p>;
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
