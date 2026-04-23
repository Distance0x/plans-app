import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Flag, Paperclip, Plus, X } from 'lucide-react';
import { useTaskStore } from '@/stores/task-store';
import { cn } from '@/lib/utils';

const priorityOptions = [
  { value: 'high', label: '高', className: 'text-red-500 bg-red-50 border-red-100' },
  { value: 'medium', label: '中', className: 'text-amber-500 bg-amber-50 border-amber-100' },
  { value: 'low', label: '低', className: 'text-blue-500 bg-blue-50 border-blue-100' },
] as const;

export function QuickAddTask() {
  const { createTask, fetchTasks } = useTaskStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [openPanel, setOpenPanel] = useState<'date' | 'priority' | null>(null);

  useEffect(() => {
    const handleFocus = () => inputRef.current?.focus();
    window.addEventListener('focus-quick-add', handleFocus);
    return () => window.removeEventListener('focus-quick-add', handleFocus);
  }, []);

  const submit = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;

    await createTask({
      title: normalizedTitle,
      priority,
      dueDate,
      dueTime,
      duration: Number(duration) || 60,
      attachments,
    });
    await fetchTasks();
    setTitle('');
    setAttachments([]);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-blue-500 bg-white px-3 py-2 shadow-sm dark:bg-gray-800">
        <Plus className="h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="添加任务"
          className="min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
        />

        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === 'date' ? null : 'date')}
          className={cn(
            'rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700',
            (dueDate || dueTime) && 'text-blue-600'
          )}
          title="日期和时间"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setOpenPanel(openPanel === 'priority' ? null : 'priority')}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="优先级"
        >
          <Flag className={cn('h-4 w-4', priority === 'high' && 'text-red-500', priority === 'medium' && 'text-amber-500', priority === 'low' && 'text-blue-500')} />
        </button>
        <button
          type="button"
          onClick={async () => {
            const selected = await window.electron.file.selectAttachments();
            if (selected.length > 0) {
              setAttachments(Array.from(new Set([...attachments, ...selected])));
            }
          }}
          className={cn(
            'rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700',
            attachments.length > 0 && 'text-blue-600'
          )}
          title="附件"
        >
          <Paperclip className="h-4 w-4" />
        </button>
      </div>

      {openPanel === 'date' && (
        <div className="absolute right-0 top-12 z-30 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-medium text-gray-900 dark:text-white">日期与时间段</div>
            <button onClick={() => setOpenPanel(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <span>日期</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 dark:border-gray-600 dark:bg-gray-900"
              />
            </label>
            <label className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <span>开始</span>
              <input
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 dark:border-gray-600 dark:bg-gray-900"
              />
            </label>
            <label className="col-span-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <span>时长（分钟）</span>
              <input
                type="number"
                min="15"
                step="15"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 dark:border-gray-600 dark:bg-gray-900"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setOpenPanel(null)}
              className="flex-1 rounded-md bg-blue-500 px-3 py-2 text-white hover:bg-blue-600"
            >
              确定
            </button>
            <button
              onClick={() => {
                setDueDate('');
                setDueTime('');
                setDuration('60');
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              清除
            </button>
          </div>
        </div>
      )}

      {openPanel === 'priority' && (
        <div className="absolute right-10 top-12 z-30 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">优先级</div>
          <div className="grid grid-cols-3 gap-2">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setPriority(option.value);
                  setOpenPanel(null);
                }}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm',
                  option.className,
                  priority === option.value && 'ring-2 ring-blue-500'
                )}
              >
                <Flag className="mx-auto mb-1 h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          已选 {attachments.length} 个附件
        </div>
      )}
    </div>
  );
}
