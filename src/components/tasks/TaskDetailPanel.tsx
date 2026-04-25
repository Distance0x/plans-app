import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckSquare, ExternalLink, Flag, FileText, Paperclip } from 'lucide-react';
import { type Task, useTaskStore } from '@/stores/task-store';
import { cn } from '@/lib/utils';

interface TaskDetailPanelProps {
  task: Task | null;
}

export function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  const { lists, tags, createTag, updateTask, toggleComplete, setTaskTags } = useTaskStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    setTitle(task?.title || '');
    setDescription(task?.description || '');
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
      description: description.trim(),
      notes: notes.trim(),
    });
  };

  const attachments = parseAttachments(task?.attachments);

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

            <div className="flex items-center gap-2 text-gray-400">
              <Flag className="h-4 w-4" />
              清单
            </div>
            <select
              value={task.listId || 'inbox'}
              onChange={(event) => updateTask(task.id, { listId: event.target.value })}
              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">标签</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = task.tags?.some((item) => item.id === tag.id) ?? false;
                const nextTagIds = selected
                  ? (task.tags || []).filter((item) => item.id !== tag.id).map((item) => item.id)
                  : [...(task.tags || []).map((item) => item.id), tag.id];

                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setTaskTags(task.id, nextTagIds)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition-colors',
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700'
                    )}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="新建标签"
                className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
              <button
                type="button"
                onClick={async () => {
                  const tag = await createTag({ name: newTagName });
                  if (!tag) return;
                  setNewTagName('');
                  await setTaskTags(task.id, Array.from(new Set([...(task.tags || []).map((item) => item.id), tag.id])));
                }}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                添加
              </button>
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
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Paperclip className="h-4 w-4 text-gray-400" />
              附件
            </label>
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={getAttachmentKey(attachment)}
                    className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-gray-700 dark:text-gray-200">
                        {getAttachmentName(attachment)}
                      </div>
                      {formatAttachmentSize(attachment) && (
                        <div className="text-xs text-gray-400">{formatAttachmentSize(attachment)}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetPath = getAttachmentPath(attachment);
                        if (!targetPath) return;
                        await window.electron.file.openAttachment(targetPath);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      打开
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400 dark:border-gray-700">
                暂无附件
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">笔记</label>
            <div className="relative">
              <MarkdownEditor
                value={notes}
                onChange={setNotes}
                onBlur={saveTextFields}
              />
            </div>
          </div>

          <div className="text-xs text-gray-400">
            {statusLabel} · 创建于 {new Date(task.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </aside>
  );
}

function parseAttachments(value?: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getAttachmentName(value: any) {
  if (typeof value === 'string') {
    return value.split(/[\\/]/).pop() || value;
  }

  return value?.originalName || value?.storedPath?.split(/[\\/]/).pop() || '附件';
}

function getAttachmentPath(value: any) {
  return typeof value === 'string' ? value : value?.storedPath;
}

function getAttachmentKey(value: any) {
  return typeof value === 'string' ? value : value?.storedPath || value?.sourcePath || value?.originalName;
}

function formatAttachmentSize(value: any) {
  const size = Number(value?.size);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function MarkdownEditor({ value, onChange, onBlur }: MarkdownEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  if (!isFocused && value.trim()) {
    return (
      <div
        onClick={() => setIsFocused(true)}
        className="min-h-[280px] cursor-text rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
      >
        <MarkdownPreview markdown={value} />
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        setIsFocused(false);
        onBlur();
      }}
      onFocus={() => setIsFocused(true)}
      autoFocus={isFocused}
      placeholder="# 标题&#10;&#10;## 子标题&#10;&#10;- 列表项&#10;- [ ] 待办事项&#10;- [x] 已完成&#10;&#10;**粗体** *斜体* `代码`&#10;&#10;> 引用文本"
      className="min-h-[280px] w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
    />
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');

  if (!markdown.trim()) {
    return (
      <div className="text-sm text-gray-400">
        点击编辑笔记...
      </div>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {lines.map((line, index) => renderMarkdownLine(line, index))}
    </div>
  );
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
