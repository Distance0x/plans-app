import { useEffect, useRef, useState } from 'react';
import {
  AlarmClock,
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Moon,
  Paperclip,
  Plus,
  Repeat,
  Sunrise,
  Sun,
} from 'lucide-react';
import { useTaskStore } from '@/stores/task-store';
import { cn } from '@/lib/utils';

const priorityOptions = [
  { value: 'high', label: '高', className: 'text-red-500 bg-red-50 border-red-100' },
  { value: 'medium', label: '中', className: 'text-amber-500 bg-amber-50 border-amber-100' },
  { value: 'low', label: '低', className: 'text-blue-500 bg-blue-50 border-blue-100' },
] as const;

interface QuickAddTaskProps {
  defaultToNow?: boolean;
  defaultListId?: string;
}

type DatePanelMode = 'date' | 'duration';

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

export function QuickAddTask({ defaultToNow = false, defaultListId = 'inbox' }: QuickAddTaskProps) {
  const { createTask, fetchTasks } = useTaskStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [openPanel, setOpenPanel] = useState<'date' | 'priority' | null>(null);
  const [datePanelMode, setDatePanelMode] = useState<DatePanelMode>('date');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const handleFocus = () => inputRef.current?.focus();
    window.addEventListener('focus-quick-add', handleFocus);
    return () => window.removeEventListener('focus-quick-add', handleFocus);
  }, []);

  const submit = async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) return;
    if (submitting) return;

    const now = new Date();
    const fallbackDueDate = defaultToNow ? formatDateKey(now) : '';
    const fallbackDueTime = defaultToNow ? formatTimeValue(now) : '';
    const taskDueDate = dueDate || fallbackDueDate;
    const taskDueTime = dueTime || (taskDueDate ? fallbackDueTime : '');

    setSubmitting(true);
    setSubmitError('');

    try {
      const task = await createTask({
        title: normalizedTitle,
        priority,
        dueDate: taskDueDate,
        dueTime: taskDueTime,
        duration: Number(duration) || 60,
        listId: defaultListId,
        attachments,
      });

      if (!task) {
        setSubmitError('创建失败，请重试');
        return;
      }

      await fetchTasks();
      setTitle('');
      setAttachments([]);
      setOpenPanel(null);
    } catch (error) {
      console.error('快速创建任务失败:', error);
      setSubmitError('创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const openDatePanel = () => {
    if (openPanel === 'date') {
      setOpenPanel(null);
      return;
    }

    if (defaultToNow && !dueDate && !dueTime) {
      const now = new Date();
      setDueDate(formatDateKey(now));
      setDueTime(formatTimeValue(now));
      setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    }

    setDatePanelMode('date');
    setOpenPanel('date');
  };

  const selectDate = (date: Date) => {
    setDueDate(formatDateKey(date));
    setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  const selectQuickDate = (offsetDays: number, time?: string) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    selectDate(date);
    if (time) setDueTime(time);
  };

  const selectedDate = dueDate || (defaultToNow ? formatDateKey(new Date()) : '');
  const calendarDays = getCalendarDays(calendarMonth);
  const todayKey = formatDateKey(new Date());
  const monthLabel = `${calendarMonth.getFullYear()}年${String(calendarMonth.getMonth() + 1).padStart(2, '0')}月`;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-blue-500 bg-white px-3 py-2 shadow-sm dark:bg-gray-800">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !title.trim()}
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-gray-700"
          title="创建任务"
        >
          <Plus className="h-4 w-4" />
        </button>
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
          onClick={openDatePanel}
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
              setAttachments([...attachments, ...selected]);
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
        <div className="absolute right-0 top-12 z-30 w-[300px] rounded-xl border border-gray-100 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 grid grid-cols-2 rounded-lg bg-gray-100 p-0.5 text-sm dark:bg-gray-700">
            <button
              type="button"
              onClick={() => setDatePanelMode('date')}
              className={cn(
                'rounded-md py-2 font-medium text-gray-500 transition-colors',
                datePanelMode === 'date' && 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
              )}
            >
              日期
            </button>
            <button
              type="button"
              onClick={() => setDatePanelMode('duration')}
              className={cn(
                'rounded-md py-2 font-medium text-gray-500 transition-colors',
                datePanelMode === 'duration' && 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
              )}
            >
              时间段
            </button>
          </div>

          {datePanelMode === 'date' ? (
            <>
              <div className="mb-3 grid grid-cols-4 gap-2 text-gray-500">
                {[
                  { icon: Sun, title: '今天', onClick: () => selectQuickDate(0) },
                  { icon: Sunrise, title: '明天上午', onClick: () => selectQuickDate(1, '09:00') },
                  { icon: CalendarPlus, title: '一周后', onClick: () => selectQuickDate(7) },
                  { icon: Moon, title: '今晚', onClick: () => selectQuickDate(0, '20:00') },
                ].map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={item.onClick}
                    title={item.title}
                    className="flex h-9 items-center justify-center rounded-lg hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700"
                  >
                    <item.icon className="h-6 w-6" />
                  </button>
                ))}
              </div>

              <div className="mb-2 flex items-center justify-between">
                <div className="text-base font-medium text-gray-900 dark:text-white">{monthLabel}</div>
                <div className="flex items-center gap-1 text-gray-500">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="上个月"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date())}
                    className="h-6 w-6 rounded-md text-base leading-none hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="回到今天"
                  >
                    ∘
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="下个月"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-y-1 text-center">
                {weekDays.map((day) => (
                  <div key={day} className="py-0.5 text-xs text-gray-400">
                    {day}
                  </div>
                ))}
                {calendarDays.map((date) => {
                  const dateKey = formatDateKey(date);
                  const isSelected = dateKey === selectedDate;
                  const isThisMonth = date.getMonth() === calendarMonth.getMonth();
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => selectDate(date)}
                      className={cn(
                        'relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors',
                        isThisMonth ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600',
                        dateKey === todayKey && !isSelected && 'text-blue-600',
                        isSelected && 'bg-blue-500 font-semibold text-white shadow-md'
                      )}
                    >
                      {date.getDate()}
                      {isWeekend && !isSelected && (
                        <span className="absolute right-0 top-0 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-400 text-[8px] leading-none text-white">
                          休
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-3 py-1">
              <label className="block space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <span>开始时间</span>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(event) => setDueTime(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
              <label className="block space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <span>时间段（分钟）</span>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
              </label>
            </div>
          )}

          <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-700 text-sm">
            <label className="flex h-10 items-center gap-3 text-gray-600 dark:text-gray-300">
              <Clock className="h-5 w-5" />
              <span className="flex-1">时间</span>
              <input
                type="time"
                value={dueTime}
                onChange={(event) => setDueTime(event.target.value)}
                className="w-24 rounded-md border border-transparent bg-transparent px-1 py-1 text-right text-gray-700 outline-none hover:border-gray-200 dark:text-gray-200 dark:hover:border-gray-600"
              />
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </label>
            <button
              type="button"
              className="flex h-10 w-full items-center gap-3 text-left text-gray-600 dark:text-gray-300"
            >
              <AlarmClock className="h-5 w-5" />
              <span className="flex-1">提醒</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
            <button
              type="button"
              className="flex h-10 w-full items-center gap-3 text-left text-gray-600 dark:text-gray-300"
            >
              <Repeat className="h-5 w-5" />
              <span className="flex-1">重复</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              onClick={() => setOpenPanel(null)}
              className="rounded-lg bg-blue-500 px-3 py-2.5 font-medium text-white hover:bg-blue-600"
            >
              确定
            </button>
            <button
              onClick={() => {
                setDueDate('');
                setDueTime('');
                setDuration('60');
              }}
              className="rounded-lg border border-gray-300 px-3 py-2.5 font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
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
      {submitError && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          {submitError}
        </div>
      )}
    </div>
  );
}
