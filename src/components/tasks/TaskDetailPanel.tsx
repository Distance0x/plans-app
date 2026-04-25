import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, CheckSquare, Flag, ListChecks, StickyNote } from 'lucide-react';
import { type Task, useTaskStore } from '@/stores/task-store';
import { cn } from '@/lib/utils';

interface TaskDetailPanelProps {
  task: Task | null;
}

export function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  const { lists, updateTask, toggleComplete } = useTaskStore();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setTitle(task?.title || '');
    setNotes(task?.notes || '');
  }, [task?.id]);

  const statusLabel = useMemo(() => {
    if (!task) return '';
    return task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '处理中' : '待处理';
  }, [task]);

  const saveTextFields = async () => {
    if (!task) return;
    await updateTask(task.id, {
      title: title.trim() || task.title,
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
    <aside className="w-[420px] flex-shrink-0 border-l border-slate-200 bg-gradient-to-b from-slate-50 via-white to-blue-50/50 dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200/80 bg-white/80 px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
          <button
            onClick={() => toggleComplete(task.id)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
              task.status === 'completed'
                ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'border-slate-300 bg-white text-slate-400 hover:border-blue-500 hover:text-blue-500 dark:border-slate-700 dark:bg-slate-900'
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
            className="min-w-0 flex-1 bg-transparent text-2xl font-bold text-slate-900 outline-none dark:text-white"
          />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className={cn('rounded-full px-2.5 py-1 font-medium', getStatusColor(task.status))}>
              {statusLabel}
            </span>
            <span>创建于 {new Date(task.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <section className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <ListChecks className="h-4 w-4 text-blue-500" />
              任务属性
            </div>

            <div className="grid grid-cols-[72px_1fr] items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
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
                      ? getStatusColor(status)
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                  )}
                >
                  {status === 'todo' ? '待处理' : status === 'in_progress' ? '处理中' : '已完成'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <Flag className="h-4 w-4" />
              优先级
            </div>
            <select
              value={task.priority}
              onChange={(event) => updateTask(task.id, { priority: event.target.value as Task['priority'] })}
              className={cn(
                'rounded-lg border px-2.5 py-2 text-sm font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800',
                getPriorityColor(task.priority)
              )}
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>

            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-4 w-4" />
              日期
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={(event) => updateTask(task.id, { dueDate: event.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <input
                type="time"
                value={task.dueTime || ''}
                onChange={(event) => updateTask(task.id, { dueTime: event.target.value })}
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <Flag className="h-4 w-4" />
              清单
            </div>
            <select
              value={task.listId || 'inbox'}
              onChange={(event) => updateTask(task.id, { listId: event.target.value })}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
          </section>

          <section className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm dark:border-blue-900/40 dark:bg-slate-900/85">
            <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <StickyNote className="h-4 w-4 text-blue-500" />
              笔记
            </label>
              <MarkdownEditor
                value={notes}
                onChange={setNotes}
                onBlur={saveTextFields}
              />
          </section>
        </div>
      </div>
    </aside>
  );
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function MarkdownEditor({ value, onChange, onBlur }: MarkdownEditorProps) {
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(value ? null : 0);
  const lineRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const lines = value.length > 0 ? value.split('\n') : [''];

  useEffect(() => {
    if (activeLineIndex === null) return;
    lineRefs.current[activeLineIndex]?.focus();
  }, [activeLineIndex, lines.length]);

  const updateLine = (index: number, nextValue: string) => {
    const nextLines = [...lines];
    if (nextValue.includes('\n')) {
      const pastedLines = nextValue.split('\n');
      nextLines.splice(index, 1, ...pastedLines);
      onChange(nextLines.join('\n'));
      setActiveLineIndex(index + pastedLines.length - 1);
      return;
    }

    nextLines[index] = nextValue;
    onChange(nextLines.join('\n'));
  };

  const insertLineAfter = (index: number) => {
    const nextLines = [...lines];
    nextLines.splice(index + 1, 0, '');
    onChange(nextLines.join('\n'));
    setActiveLineIndex(index + 1);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) {
      onChange('');
      return;
    }

    const nextLines = [...lines];
    nextLines.splice(index, 1);
    onChange(nextLines.join('\n'));
    setActiveLineIndex(Math.max(0, index - 1));
  };

  return (
    <div
      className="min-h-[360px] rounded-xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/40 p-4 text-sm leading-relaxed dark:border-blue-900/40 dark:from-slate-900 dark:to-blue-950/20"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setActiveLineIndex(null);
          onBlur();
        }
      }}
      onClick={() => {
        if (value.trim()) return;
        setActiveLineIndex(0);
      }}
    >
      {lines.map((line, index) => {
        const isActive = activeLineIndex === index;

        if (isActive) {
          return (
            <textarea
              key={`edit-${index}`}
              ref={(element) => {
                lineRefs.current[index] = element;
              }}
              value={line}
              onChange={(event) => updateLine(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  insertLineAfter(index);
                }
                if (event.key === 'Backspace' && !line) {
                  event.preventDefault();
                  removeLine(index);
                }
              }}
              placeholder={index === 0 ? '# 标题' : ''}
              rows={1}
              className="block min-h-8 w-full resize-none rounded-lg border border-blue-200 bg-white/90 px-3 py-1.5 font-mono text-sm leading-6 text-slate-800 outline-none ring-2 ring-blue-500/15 dark:border-blue-900/60 dark:bg-slate-950/80 dark:text-slate-100"
            />
          );
        }

        return (
          <div
            key={`preview-${index}`}
            onClick={(event) => {
              event.stopPropagation();
              setActiveLineIndex(index);
            }}
            className="min-h-8 cursor-text rounded-lg px-3 py-1.5 hover:bg-blue-50/70 dark:hover:bg-blue-950/30"
          >
            {line.trim() ? renderMarkdownLine(line, index) : <div className="h-6" />}
          </div>
        );
      })}

      {!value.trim() && activeLineIndex === null && (
        <div
          onClick={() => setActiveLineIndex(0)}
          className="cursor-text rounded-lg px-3 py-2 text-slate-400"
        >
          点击编辑笔记...
        </div>
      )}
      </div>
  );
}

function getStatusColor(status: Task['status']) {
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'in_progress') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300';
  return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300';
}

function getPriorityColor(priority: Task['priority']) {
  if (priority === 'high') return 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300';
  if (priority === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
  return 'border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300';
}

function renderMarkdownLine(line: string, index: number) {
  if (!line.trim()) {
    return <div key={index} className="h-4" />;
  }

  // 标题
  if (line.startsWith('#### ')) {
    return <h4 key={index} className="text-sm font-semibold text-gray-900 dark:text-white mt-3 mb-1">{renderInlineMarkdown(line.slice(5))}</h4>;
  }
  if (line.startsWith('### ')) {
    return <h3 key={index} className="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">{renderInlineMarkdown(line.slice(4))}</h3>;
  }
  if (line.startsWith('## ')) {
    return <h2 key={index} className="text-lg font-bold text-gray-900 dark:text-white mt-5 mb-2">{renderInlineMarkdown(line.slice(3))}</h2>;
  }
  if (line.startsWith('# ')) {
    return <h1 key={index} className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">{renderInlineMarkdown(line.slice(2))}</h1>;
  }

  // 待办事项
  if (line.match(/^- \[ \] /)) {
    return (
      <div key={index} className="flex gap-2 items-start my-1">
        <input type="checkbox" disabled className="mt-1 h-4 w-4 rounded border-gray-300" />
        <span className="text-gray-700 dark:text-gray-300">{renderInlineMarkdown(line.slice(6))}</span>
      </div>
    );
  }
  if (line.match(/^- \[x\] /)) {
    return (
      <div key={index} className="flex gap-2 items-start my-1">
        <input type="checkbox" disabled checked className="mt-1 h-4 w-4 rounded border-gray-300" />
        <span className="text-gray-500 dark:text-gray-400 line-through">{renderInlineMarkdown(line.slice(6))}</span>
      </div>
    );
  }

  // 无序列表
  if (line.match(/^[-*] /)) {
    return (
      <div key={index} className="flex gap-2 items-start my-1">
        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
        <span className="text-gray-700 dark:text-gray-300">{renderInlineMarkdown(line.slice(2))}</span>
      </div>
    );
  }

  // 有序列表
  if (line.match(/^\d+\. /)) {
    const match = line.match(/^(\d+)\. (.+)$/);
    if (match) {
      return (
        <div key={index} className="flex gap-2 items-start my-1">
          <span className="text-blue-600 dark:text-blue-400 font-medium min-w-[1.5rem]">{match[1]}.</span>
          <span className="text-gray-700 dark:text-gray-300">{renderInlineMarkdown(match[2])}</span>
        </div>
      );
    }
  }

  // 引用
  if (line.startsWith('> ')) {
    return (
      <blockquote key={index} className="border-l-4 border-blue-400 pl-4 py-1 my-2 text-gray-600 dark:text-gray-400 italic bg-blue-50/50 dark:bg-blue-900/10">
        {renderInlineMarkdown(line.slice(2))}
      </blockquote>
    );
  }

  // 代码块
  if (line.startsWith('```')) {
    return <div key={index} className="text-xs text-gray-500 font-mono">```</div>;
  }

  // 分隔线
  if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
    return <hr key={index} className="my-4 border-gray-300 dark:border-gray-600" />;
  }

  // 普通段落
  return <p key={index} className="text-gray-700 dark:text-gray-300 my-1 leading-relaxed">{renderInlineMarkdown(line)}</p>;
}

function renderInlineMarkdown(text: string) {
  // 处理粗体、斜体、代码、链接
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g);

  return parts.map((part, index) => {
    // 粗体
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }

    // 斜体
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={index} className="italic text-gray-700 dark:text-gray-300">{part.slice(1, -1)}</em>;
    }

    // 行内代码
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs font-mono text-red-600 dark:text-red-400">
          {part.slice(1, -1)}
        </code>
      );
    }

    // 链接
    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      return (
        <a key={index} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
