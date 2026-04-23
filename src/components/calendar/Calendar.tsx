import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/stores/task-store';

type ViewMode = 'month' | 'week' | 'day';

interface CalendarProps {
  tasks: Array<{
    id: string;
    title: string;
    dueDate?: string;
    dueTime?: string;
    duration?: number;
    status: string;
    priority: string;
  }>;
}

export function Calendar({ tasks }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const { updateTask } = useTaskStore();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 上一个周期
  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  // 下一个周期
  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ];

  return (
    <div className="glass-card p-6 rounded-lg backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/30 shadow-xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {viewMode === 'month' && `${year} 年 ${monthNames[month]}`}
          {viewMode === 'week' && `${year} 年 ${monthNames[month]} 第 ${Math.ceil(currentDate.getDate() / 7)} 周`}
          {viewMode === 'day' && `${year} 年 ${month + 1} 月 ${currentDate.getDate()} 日`}
        </h2>

        <div className="flex gap-2">
          {/* 视图切换 */}
          <div className="flex gap-1 mr-4">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              月视图
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              周视图
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              日视图
            </Button>
          </div>

          {/* 导航按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            今天
          </Button>
          <Button variant="outline" size="sm" onClick={prevPeriod}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextPeriod}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 视图内容 */}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          tasks={tasks}
          draggedTask={draggedTask}
          setDraggedTask={setDraggedTask}
          updateTask={updateTask}
        />
      )}
      {viewMode === 'week' && (
        <WeekView currentDate={currentDate} tasks={tasks} updateTask={updateTask} />
      )}
      {viewMode === 'day' && (
        <DayView currentDate={currentDate} tasks={tasks} updateTask={updateTask} />
      )}
    </div>
  );
}

// 月视图组件
function MonthView({ currentDate, tasks, draggedTask, setDraggedTask, updateTask }: any) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter((task: any) => task.dueDate === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (day: number) => {
    if (!draggedTask) return;
    const newDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    try {
      await updateTask(draggedTask, { dueDate: newDate });
      setDraggedTask(null);
    } catch (error) {
      console.error('Failed to update task date:', error);
    }
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <>
      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            周{day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dayTasks = getTasksForDay(day);

          return (
            <div
              key={day}
              className={cn(
                'min-h-[100px] p-2 rounded-lg border transition-all cursor-pointer',
                'hover:border-blue-400 hover:shadow-md',
                isToday(day)
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600',
                draggedTask && 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
              )}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(day)}
            >
              <div className="flex flex-col h-full">
                <div
                  className={cn(
                    'text-sm font-medium mb-2',
                    isToday(day) ? 'text-white' : 'text-gray-900 dark:text-white'
                  )}
                >
                  {day}
                </div>
                {dayTasks.length > 0 && (
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayTasks.map((task: any) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        className={cn(
                          'text-xs px-2 py-1 rounded cursor-move truncate',
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-700 border-l-2 border-red-500'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 border-l-2 border-yellow-500'
                            : 'bg-blue-100 text-blue-700 border-l-2 border-blue-500',
                          task.status === 'completed' && 'opacity-50 line-through'
                        )}
                        title={task.title}
                      >
                        {task.dueTime && (
                          <span className="font-medium mr-1">{task.dueTime}</span>
                        )}
                        {task.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// 周视图组件
function WeekView({ currentDate, tasks, updateTask }: any) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getTasksForDay = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return tasks.filter((task: any) => task.dueDate === dateStr);
  };

  const getTaskPosition = (task: any) => {
    if (!task.dueTime) return { top: 0, height: 60 };
    const [hours, minutes] = task.dueTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return {
      top: totalMinutes,
      height: Math.max(Number(task.duration) || 60, 30),
    };
  };

  const handleTimeDrop = async (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const dueDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dueTime = `${String(hour).padStart(2, '0')}:00`;
    await updateTask(taskId, { dueDate, dueTime });
  };

  const today = new Date();
  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  return (
    <div className="flex">
      {/* 时间轴 */}
      <div className="w-16 flex-shrink-0">
        <div className="h-12"></div>
        {hours.map((hour) => (
          <div key={hour} className="h-[60px] text-xs text-gray-500 pr-2 text-right">
            {String(hour).padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* 日期列 */}
      <div className="flex-1 grid grid-cols-7 gap-1">
        {weekDays.map((date, index) => {
          const dayTasks = getTasksForDay(date);

          return (
            <div key={index} className="flex flex-col">
              {/* 日期头部 */}
              <div
                className={cn(
                  'h-12 flex flex-col items-center justify-center rounded-t-lg',
                  isToday(date)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <div className="text-xs">{weekDayNames[index]}</div>
                <div className="text-lg font-bold">{date.getDate()}</div>
              </div>

              {/* 时间格子 */}
              <div className="relative border-l border-gray-200 dark:border-gray-600">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-[60px] border-b border-gray-100 dark:border-gray-700"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleTimeDrop(e, date, hour)}
                  ></div>
                ))}

                {/* 任务卡片 */}
                {dayTasks.map((task: any) => {
                  const pos = getTaskPosition(task);
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                      className={cn(
                        'absolute left-0 right-0 mx-1 px-2 py-1 rounded text-xs cursor-move',
                        'overflow-hidden',
                        task.priority === 'high'
                          ? 'bg-red-100 text-red-700 border-l-2 border-red-500'
                          : task.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700 border-l-2 border-yellow-500'
                          : 'bg-blue-100 text-blue-700 border-l-2 border-blue-500',
                        task.status === 'completed' && 'opacity-50 line-through'
                      )}
                      style={{
                        top: `${pos.top}px`,
                        height: `${pos.height}px`,
                      }}
                      title={task.title}
                    >
                      <div className="font-medium">{task.dueTime || '全天'} · {task.duration || 60}m</div>
                      <div className="truncate">{task.title}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const HOUR_HEIGHT = 66;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
const RESIZE_STEP_MINUTES = 15;

// 日视图组件
function DayView({ currentDate, tasks, updateTask }: any) {
  const [resizePreview, setResizePreview] = useState<{ taskId: string; duration: number } | null>(null);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();

  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayTasks = tasks.filter((task: any) => task.dueDate === dateStr);

  // 按时间排序
  const sortedTasks = [...dayTasks].sort((a, b) => {
    const timeA = a.dueTime || '00:00';
    const timeB = b.dueTime || '00:00';
    return timeA.localeCompare(timeB);
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getTaskStartMinute = (task: any) => {
    if (!task.dueTime) return 0;
    const [hour, minute] = task.dueTime.split(':').map(Number);
    return hour * 60 + minute;
  };

  const getTaskDuration = (task: any) => {
    const preview = resizePreview;
    if (preview && preview.taskId === task.id) {
      return preview.duration;
    }

    return Math.max(Number(task.duration) || 60, RESIZE_STEP_MINUTES);
  };

  const getTaskColor = (task: any, index: number) => {
    const palette = [
      'bg-rose-100/90 border-rose-200 text-rose-900 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-100',
      'bg-blue-300/80 border-blue-400 text-blue-950 dark:bg-blue-800/70 dark:border-blue-700 dark:text-blue-100',
      'bg-cyan-200/80 border-cyan-300 text-cyan-950 dark:bg-cyan-900/60 dark:border-cyan-800 dark:text-cyan-100',
      'bg-lime-200/80 border-lime-300 text-lime-950 dark:bg-lime-900/50 dark:border-lime-800 dark:text-lime-100',
    ];

    if (task.priority === 'high') return palette[0];
    if (task.priority === 'medium') return palette[index % palette.length];
    return palette[(index + 2) % palette.length];
  };

  const getTimeAtDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, e.clientY - rect.top);
    const rawMinutes = y / MINUTE_HEIGHT;
    const snapped = Math.round(rawMinutes / RESIZE_STEP_MINUTES) * RESIZE_STEP_MINUTES;
    return Math.min(23 * 60 + 45, Math.max(0, snapped));
  };

  const handleTimeDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const startMinute = getTimeAtDrop(e);
    await updateTask(taskId, {
      dueDate: dateStr,
      dueTime: formatClock(startMinute),
    });
  };

  const startResize = (e: React.MouseEvent<HTMLDivElement>, task: any) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startDuration = getTaskDuration(task);

    const handleMove = (event: MouseEvent) => {
      const deltaMinutes = (event.clientY - startY) / MINUTE_HEIGHT;
      const nextDuration = snapDuration(startDuration + deltaMinutes);
      setResizePreview({ taskId: task.id, duration: nextDuration });
    };

    const handleUp = async (event: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      const deltaMinutes = (event.clientY - startY) / MINUTE_HEIGHT;
      const nextDuration = snapDuration(startDuration + deltaMinutes);
      setResizePreview(null);
      await updateTask(task.id, { duration: nextDuration });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayOfWeek = currentDate.getDay();

  return (
    <div className="w-full">
      {/* 日期头部 */}
      <div className="mb-4 text-center border-b border-gray-100 dark:border-gray-700 pb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {weekDayNames[dayOfWeek]}
        </div>
        <div className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-lg font-semibold text-white">
          {day}
        </div>
      </div>

      <div className="flex">
        <div className="w-20 flex-shrink-0 pr-3">
          {hours.map((hour) => (
            <div
              key={hour}
              className="relative text-right text-sm text-gray-500 dark:text-gray-400"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <span className="relative -top-2">
                {hour === 12 ? '正午' : `${String(hour).padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>

        <div
          className="relative flex-1 rounded-lg bg-white/40 dark:bg-gray-900/30"
          style={{ height: `${24 * HOUR_HEIGHT}px` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleTimeDrop}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
              style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
            />
          ))}

          {sortedTasks.map((task: any, index: number) => {
            const startMinute = getTaskStartMinute(task);
            const duration = getTaskDuration(task);
            const endMinute = Math.min(startMinute + duration, 24 * 60);

            return (
              <div
                key={task.id}
                draggable={!resizePreview}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                className={cn(
                  'absolute left-1 right-1 rounded-md border px-3 py-2 shadow-sm cursor-move overflow-hidden group',
                  'transition-shadow hover:shadow-md',
                  getTaskColor(task, index),
                  task.status === 'completed' && 'opacity-60'
                )}
                style={{
                  top: `${startMinute * MINUTE_HEIGHT}px`,
                  height: `${Math.max(duration * MINUTE_HEIGHT, 28)}px`,
                }}
                title={`${task.title} ${formatClock(startMinute)} - ${formatClock(endMinute)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-4 w-4 flex-shrink-0 rounded border border-current opacity-70" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{task.title}</div>
                    <div className="text-sm opacity-75">
                      {formatClock(startMinute)} - {formatClock(endMinute)}
                    </div>
                  </div>
                </div>

                <div
                  className="absolute bottom-0 left-0 right-0 h-3 cursor-row-resize opacity-0 group-hover:opacity-100"
                  onMouseDown={(e) => startResize(e, task)}
                >
                  <div className="mx-auto mt-1 h-1 w-12 rounded-full bg-current opacity-40" />
                </div>
              </div>
            );
          })}

          {sortedTasks.length === 0 && (
            <div className="absolute inset-x-0 top-20 text-center text-gray-400">
            今天没有安排任务
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatClock(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 24 * 60));
  const hour = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function snapDuration(minutes: number) {
  const snapped = Math.round(minutes / RESIZE_STEP_MINUTES) * RESIZE_STEP_MINUTES;
  return Math.max(RESIZE_STEP_MINUTES, Math.min(12 * 60, snapped));
}
