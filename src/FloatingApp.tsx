import { useEffect, useRef, useState } from 'react';
import { CalendarDays, CheckCircle, Circle, Clock, Eye, EyeOff, Maximize2, X } from 'lucide-react';
import { useTaskStore, type Task } from './stores/task-store';
import { useTimerStore } from './stores/timer-store';
import { cn } from './lib/utils';

type FloatingMode = 'day' | 'week' | 'pomodoro';

function getInitialMode(): FloatingMode {
  const match = window.location.hash.match(/#\/floating\/(\w+)/);
  const mode = match?.[1];
  return mode === 'week' || mode === 'pomodoro' ? mode : 'day';
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimer(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function FloatingApp() {
  const [mode, setMode] = useState<FloatingMode>(getInitialMode);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const { tasks, fetchTasks, toggleComplete, updateTask } = useTaskStore();
  const timer = useTimerStore();

  useEffect(() => {
    void fetchTasks();
    void timer.fetchStatus();
  }, [fetchTasks, timer.fetchStatus]);

  const today = formatDateKey(new Date());
  const todayTasks = tasks.filter((task) => task.dueDate === today && task.status !== 'completed');
  const switchMode = (nextMode: FloatingMode) => {
    setMode(nextMode);
    window.location.hash = `/floating/${nextMode}`;
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-rose-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 dark:text-white">
      <div
        className="flex h-12 items-center justify-between border-b border-white/50 bg-white/60 px-3 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          浮窗
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={async () => {
              const next = !alwaysOnTop;
              setAlwaysOnTop(next);
              await window.electron.floating.setAlwaysOnTop(next);
            }}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800"
            title={alwaysOnTop ? '取消置顶' : '置顶'}
          >
            {alwaysOnTop ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={() => window.electron.floating.showMain()}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800"
            title="返回主窗口"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => window.electron.floating.close()}
            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-500 dark:text-slate-300 dark:hover:bg-red-950/40"
            title="关闭浮窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 p-3">
        {[
          ['day', '今日'],
          ['week', '周视图'],
          ['pomodoro', '番茄钟'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => switchMode(value as FloatingMode)}
            className={cn(
              'rounded-xl px-3 py-2 text-xs font-medium transition-colors',
              mode === value
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/60 text-slate-500 hover:bg-white dark:bg-slate-800/70 dark:text-slate-300'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="h-[calc(100vh-96px)] overflow-y-auto px-3 pb-4">
        {mode === 'day' && (
          <TaskSection
            icon={<CalendarDays className="h-4 w-4" />}
            title="今天"
            emptyText="今天没有未完成任务"
            tasks={todayTasks}
            onToggle={toggleComplete}
          />
        )}

        {mode === 'week' && <FloatingWeekTimeline tasks={tasks} updateTask={updateTask} />}

        {mode === 'pomodoro' && <FloatingPomodoro />}
      </main>
    </div>
  );
}

function TaskSection({
  icon,
  title,
  emptyText,
  tasks,
  onToggle,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  emptyText: string;
  tasks: Task[];
  onToggle: (id: string) => Promise<void>;
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/75 p-3 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          {icon}
          {title}
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-sm text-slate-400 dark:border-slate-700">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex w-full items-start gap-2 rounded-xl bg-slate-50/80 px-3 py-2 text-left transition-colors hover:bg-blue-50 dark:bg-slate-800/70 dark:hover:bg-slate-800"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void onToggle(task.id);
                }}
                className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                title="完成任务"
              >
                {task.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-400 hover:text-blue-500" />
                )}
              </button>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm font-medium', compact && 'text-xs')}>
                  {task.title}
                </span>
                {(task.dueTime || task.tags?.length) && (
                  <span className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-400">
                    {task.dueTime && <span>{task.dueTime}</span>}
                    {task.tags?.map((tag) => <span key={tag.id}>#{tag.name}</span>)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FloatingWeekTimeline({
  tasks,
  updateTask,
}: {
  tasks: Task[];
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | null>;
}) {
  const [dragPreview, setDragPreview] = useState<{ taskId: string; startMinute: number } | null>(null);
  const [resizePreview, setResizePreview] = useState<{ taskId: string; duration: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return date;
  });

  const weekTasks = weekDays.flatMap((date) => {
    const dateKey = formatDateKey(date);
    return tasks.filter((task) => task.dueDate === dateKey && task.status !== 'completed');
  });

  const taskTimes = weekTasks
    .filter((task) => task.dueTime)
    .map((task) => {
      const [hour, minute] = task.dueTime!.split(':').map(Number);
      const start = hour * 60 + minute;
      return {
        start,
        end: start + (Number(task.duration) || 60),
      };
    });

  let startHour = 8;
  let endHour = 20;

  if (taskTimes.length > 0) {
    startHour = Math.max(0, Math.floor(Math.min(...taskTimes.map((item) => item.start)) / 60) - 1);
    endHour = Math.min(24, Math.ceil(Math.max(...taskTimes.map((item) => item.end)) / 60) + 1);
  }

  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const hourHeight = 52;
  const minuteHeight = hourHeight / 60;
  const snapMinutes = 15;
  const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const todayIndex = weekDays.findIndex((date) => isToday(date));
    if (todayIndex < 0) return;

    const timelineWidth = container.scrollWidth - 48;
    const dayWidth = timelineWidth / 7;
    container.scrollLeft = Math.max(0, todayIndex * dayWidth - dayWidth * 0.25);
  }, []);

  const getTasksForDay = (date: Date) => {
    const dateKey = formatDateKey(date);
    return tasks.filter((task) => task.dueDate === dateKey && task.status !== 'completed');
  };

  const getTaskPosition = (task: Task) => {
    const startMinute = dragPreview?.taskId === task.id
      ? dragPreview.startMinute
      : getTaskStartMinute(task);
    const duration = getTaskDuration(task);
    const top = ((startMinute - startHour * 60) / 60) * hourHeight;
    const height = Math.max((duration / 60) * hourHeight, 28);

    return {
      top,
      height,
      startMinute,
      endMinute: startMinute + duration,
    };
  };

  const getTaskStartMinute = (task: Task) => {
    const [hour, minute] = (task.dueTime || `${startHour}:00`).split(':').map(Number);
    return hour * 60 + minute;
  };

  const getTaskDuration = (task: Task) => {
    if (resizePreview?.taskId === task.id) {
      return resizePreview.duration;
    }

    return Math.max(Number(task.duration) || 60, snapMinutes);
  };

  const snapToGrid = (minutes: number) => {
    const snapped = Math.round(minutes / snapMinutes) * snapMinutes;
    return Math.max(startHour * 60, Math.min(endHour * 60 - snapMinutes, snapped));
  };

  const startDrag = (event: React.MouseEvent<HTMLDivElement>, task: Task) => {
    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const startMinute = getTaskStartMinute(task);

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaMinutes = (moveEvent.clientY - startY) / minuteHeight;
      setDragPreview({ taskId: task.id, startMinute: snapToGrid(startMinute + deltaMinutes) });
    };

    const handleUp = async (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      const deltaMinutes = (upEvent.clientY - startY) / minuteHeight;
      const nextStartMinute = snapToGrid(startMinute + deltaMinutes);
      setDragPreview(null);
      await updateTask(task.id, { dueTime: formatClock(nextStartMinute) });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const snapDuration = (minutes: number) => {
    const snapped = Math.round(minutes / snapMinutes) * snapMinutes;
    return Math.max(snapMinutes, Math.min(12 * 60, snapped));
  };

  const startResize = (event: React.MouseEvent<HTMLDivElement>, task: Task) => {
    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const startDuration = getTaskDuration(task);

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaMinutes = (moveEvent.clientY - startY) / minuteHeight;
      setResizePreview({ taskId: task.id, duration: snapDuration(startDuration + deltaMinutes) });
    };

    const handleUp = async (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      const deltaMinutes = (upEvent.clientY - startY) / minuteHeight;
      const nextDuration = snapDuration(startDuration + deltaMinutes);
      setResizePreview(null);
      await updateTask(task.id, { duration: nextDuration });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const formatClock = (totalMinutes: number) => {
    const safe = Math.max(0, Math.min(totalMinutes, 24 * 60));
    const hour = Math.floor(safe / 60);
    const minute = safe % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };

  const isToday = (date: Date) => formatDateKey(date) === formatDateKey(today);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/60 bg-white/75 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        <div className="text-sm font-bold">本周时间轴</div>
        <div className="text-xs text-slate-400">
          {formatDateKey(weekDays[0]).slice(5)} - {formatDateKey(weekDays[6]).slice(5)}
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[calc(100vh-150px)] overflow-auto">
        <div className="flex min-w-[720px]">
          <div className="sticky left-0 z-20 w-12 flex-shrink-0 bg-white/95 dark:bg-slate-900/95">
            <div className="h-12 border-b border-slate-100 dark:border-slate-800" />
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b border-slate-100 pr-1 text-right text-[10px] leading-none text-slate-400 dark:border-slate-800"
                style={{ height: hourHeight }}
              >
                <span className="relative -top-1">{String(hour).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 bg-slate-200/70 dark:bg-slate-800">
            {weekDays.map((date, index) => {
              const dayTasks = getTasksForDay(date);
              return (
                <div key={formatDateKey(date)} className="min-w-24 bg-white dark:bg-slate-950">
                  <div
                    className={cn(
                      'sticky top-0 z-10 flex h-12 flex-col items-center justify-center border-b border-r border-slate-100 text-xs dark:border-slate-800',
                      isToday(date)
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-50/95 text-slate-500 dark:bg-slate-900/95 dark:text-slate-300'
                    )}
                  >
                    <div>{weekDayNames[index]}</div>
                    <div className="text-base font-bold">{date.getDate()}</div>
                  </div>

                  <div className="relative border-r border-slate-100 dark:border-slate-800" style={{ height: hours.length * hourHeight }}>
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="border-b border-slate-100 dark:border-slate-800"
                        style={{ height: hourHeight }}
                      />
                    ))}

                    {dayTasks.map((task, taskIndex) => {
                      const position = getTaskPosition(task);
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            'group absolute left-1 right-1 cursor-move overflow-hidden rounded-lg border-l-2 px-1.5 py-1 text-left text-[10px] shadow-sm transition-transform hover:scale-[1.02]',
                            task.priority === 'high'
                              ? 'border-red-500 bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-100'
                              : task.priority === 'medium'
                                ? 'border-amber-500 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-100'
                                : taskIndex % 2 === 0
                                  ? 'border-blue-500 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-100'
                                  : 'border-cyan-500 bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-100'
                          )}
                          style={{
                            top: Math.max(0, position.top),
                            height: position.height,
                          }}
                          title={`${task.title} ${formatClock(position.startMinute)} - ${formatClock(position.endMinute)}`}
                          onMouseDown={(event) => startDrag(event, task)}
                        >
                          <div className="truncate font-semibold">{task.title}</div>
                          <div className="truncate opacity-75">
                            {formatClock(position.startMinute)} - {formatClock(position.endMinute)}
                          </div>
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize opacity-0 group-hover:opacity-100"
                            onMouseDown={(event) => startResize(event, task)}
                            title="拖动修改结束时间"
                          >
                            <div className="mx-auto mt-0.5 h-0.5 w-8 rounded-full bg-current opacity-60" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingPomodoro() {
  const {
    isRunning,
    isPaused,
    sessionType,
    remainingTime,
    totalTime,
    completedPomodoros,
    start,
    pause,
    resume,
    reset,
    skip,
  } = useTimerStore();
  const progress = totalTime > 0 ? ((totalTime - remainingTime) / totalTime) * 100 : 0;
  const label = sessionType === 'work' ? '工作时间' : sessionType === 'short_break' ? '短休息' : '长休息';

  return (
    <section className="rounded-3xl border border-white/60 bg-white/75 p-5 text-center shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75">
      <div className="mb-4 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-300">
        <Clock className="h-4 w-4" />
        {label}
      </div>

      <div className="relative mx-auto mb-5 flex h-44 w-44 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/15 to-orange-500/15" />
        <svg className="absolute h-44 w-44 -rotate-90" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-200 dark:text-slate-800" />
          <circle
            cx="80"
            cy="80"
            r="68"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            className="text-red-500"
            strokeDasharray={2 * Math.PI * 68}
            strokeDashoffset={2 * Math.PI * 68 * (1 - progress / 100)}
          />
        </svg>
        <div className="relative">
          <div className="text-4xl font-black tracking-tight">{formatTimer(remainingTime)}</div>
          <div className="mt-1 text-xs text-slate-400">完成 {completedPomodoros} 个</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {!isRunning || isPaused ? (
          <button
            onClick={() => (isPaused ? resume() : start())}
            className="col-span-2 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-3 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20"
          >
            {isPaused ? '继续' : '开始'}
          </button>
        ) : (
          <button
            onClick={pause}
            className="col-span-2 rounded-2xl bg-amber-500 px-3 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20"
          >
            暂停
          </button>
        )}
        <button onClick={skip} className="rounded-2xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
          跳过
        </button>
        <button onClick={reset} className="col-span-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-300">
          重置
        </button>
      </div>
    </section>
  );
}
