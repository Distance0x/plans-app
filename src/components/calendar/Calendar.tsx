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

  const firstVisibleDay = new Date(year, month, 1);
  firstVisibleDay.setDate(firstVisibleDay.getDate() - firstVisibleDay.getDay());

  const calendarDays: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + i);
    calendarDays.push(date);
  }

  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getTasksForDay = (date: Date) => {
    const dateStr = getDateKey(date);
    return tasks.filter((task: any) => task.dueDate === dateStr);
  };

  const today = new Date();
  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => date.getMonth() === month;

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (date: Date) => {
    if (!draggedTask) return;
    try {
      await updateTask(draggedTask, { dueDate: getDateKey(date) });
      setDraggedTask(null);
    } catch (error) {
      console.error('Failed to update task date:', error);
    }
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* 星期标题 */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-800/60">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            周{day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date) => {
          const dayTasks = getTasksForDay(date);
          const currentMonth = isCurrentMonth(date);
          const todayCell = isToday(date);

          return (
            <div
              key={getDateKey(date)}
              className={cn(
                'min-h-[116px] border-r border-b border-gray-100 p-1.5 transition-colors',
                'hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-950/20',
                !currentMonth && 'bg-gray-50/60 text-gray-400 dark:bg-gray-900/40',
                draggedTask && 'bg-blue-50/40 dark:bg-blue-950/20'
              )}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(date)}
            >
              <div className="flex flex-col h-full">
                <div
                  className={cn(
                    'mb-1 flex h-6 items-center text-sm font-medium',
                    currentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400',
                    todayCell && 'text-blue-600 dark:text-blue-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1',
                      todayCell && 'bg-blue-500 text-white'
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>
                {dayTasks.length > 0 && (
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayTasks.slice(0, 4).map((task: any, taskIndex: number) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        className={cn(
                          'flex h-6 cursor-move items-center gap-1 rounded px-1.5 text-[12px] leading-none shadow-sm',
                          getMonthTaskColor(task, taskIndex),
                          task.status === 'completed' && 'opacity-50 line-through'
                        )}
                        title={`${task.title}${task.dueTime ? ` ${task.dueTime}` : ''}`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTask(task.id, { status: task.status === 'completed' ? 'todo' : 'completed' });
                          }}
                          className="h-3 w-3 flex-shrink-0 rounded border border-current opacity-60 hover:opacity-100 transition-opacity"
                        />
                        <span className="min-w-0 flex-1 truncate">{task.title}</span>
                        {task.dueTime && <span className="flex-shrink-0 tabular-nums opacity-75">{task.dueTime}</span>}
                      </div>
                    ))}
                    {dayTasks.length > 4 && (
                      <div className="px-1 text-[11px] text-gray-400">+{dayTasks.length - 4} 更多</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getMonthTaskColor(task: any, index: number) {
  if (task.priority === 'high') {
    return 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100';
  }

  const colors = [
    'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/50 dark:text-cyan-100',
    'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100',
    'bg-purple-100 text-purple-900 dark:bg-purple-900/50 dark:text-purple-100',
    'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
    'bg-lime-100 text-lime-900 dark:bg-lime-900/50 dark:text-lime-100',
  ];

  return colors[index % colors.length];
}

const RESIZE_STEP_MINUTES = 15;

// 周视图组件
function WeekView({ currentDate, tasks, updateTask }: any) {
  const [resizePreview, setResizePreview] = useState<{ taskId: string; duration: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ taskId: string; startMinute: number } | null>(null);

  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day);
  }

  const getTasksForDay = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return tasks.filter((task: any) => task.dueDate === dateStr);
  };

  // 计算所有任务的时间范围
  const allWeekTasks = weekDays.flatMap(getTasksForDay);
  const taskTimes = allWeekTasks
    .filter((task: any) => task.dueTime)
    .map((task: any) => {
      const [hours, minutes] = task.dueTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const duration = Number(task.duration) || 60;
      return { start: startMinutes, end: startMinutes + duration };
    });

  // 动态计算显示范围
  let startHour = 8;
  let endHour = 20;

  if (taskTimes.length > 0) {
    const minTime = Math.min(...taskTimes.map(t => t.start));
    const maxTime = Math.max(...taskTimes.map(t => t.end));

    startHour = Math.max(0, Math.floor(minTime / 60) - 1);
    endHour = Math.min(24, Math.ceil(maxTime / 60) + 1);
  }

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const hourHeight = Math.max(50, Math.min(80, 700 / hours.length));
  const minuteHeight = hourHeight / 60;

  const getTaskStartMinute = (task: any) => {
    if (dragPreview && dragPreview.taskId === task.id) {
      return dragPreview.startMinute;
    }
    if (!task.dueTime) return startHour * 60;
    const [hours, minutes] = task.dueTime.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getTaskDuration = (task: any) => {
    if (resizePreview && resizePreview.taskId === task.id) {
      return resizePreview.duration;
    }
    return Math.max(Number(task.duration) || 60, RESIZE_STEP_MINUTES);
  };

  const getTaskPosition = (task: any) => {
    const startMinute = getTaskStartMinute(task);
    const duration = getTaskDuration(task);
    const relativeMinutes = startMinute - (startHour * 60);
    const clampedDuration = Math.min(duration, (endHour * 60) - startMinute);

    return {
      top: (relativeMinutes / 60) * hourHeight,
      height: Math.max((clampedDuration / 60) * hourHeight, 30),
    };
  };

  const startDrag = (e: React.MouseEvent<HTMLDivElement>, task: any) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startMinute = getTaskStartMinute(task);

    const handleMove = (event: MouseEvent) => {
      const deltaY = event.clientY - startY;
      const deltaMinutes = deltaY / minuteHeight;
      const nextStartMinute = snapToGrid(startMinute + deltaMinutes);
      setDragPreview({ taskId: task.id, startMinute: nextStartMinute });
    };

    const handleUp = async (event: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      const deltaY = event.clientY - startY;
      const deltaMinutes = deltaY / minuteHeight;
      const nextStartMinute = snapToGrid(startMinute + deltaMinutes);
      setDragPreview(null);
      await updateTask(task.id, { dueTime: formatClock(nextStartMinute) });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const startResize = (e: React.MouseEvent<HTMLDivElement>, task: any) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startDuration = getTaskDuration(task);

    const handleMove = (event: MouseEvent) => {
      const deltaMinutes = (event.clientY - startY) / minuteHeight;
      const nextDuration = snapDuration(startDuration + deltaMinutes);
      setResizePreview({ taskId: task.id, duration: nextDuration });
    };

    const handleUp = async (event: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      const deltaMinutes = (event.clientY - startY) / minuteHeight;
      const nextDuration = snapDuration(startDuration + deltaMinutes);
      setResizePreview(null);
      await updateTask(task.id, { duration: nextDuration });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
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
    <div className="flex overflow-x-auto">
      {/* 时间轴 */}
      <div className="w-16 flex-shrink-0 sticky left-0 bg-white dark:bg-gray-900 z-10">
        <div className="h-12"></div>
        {hours.map((hour) => (
          <div key={hour} className="text-xs text-gray-500 pr-2 text-right border-b border-gray-100 dark:border-gray-800" style={{ height: `${hourHeight}px`, lineHeight: `${hourHeight}px` }}>
            {String(hour).padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* 日期列 */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
        {weekDays.map((date, index) => {
          const dayTasks = getTasksForDay(date);

          return (
            <div key={index} className="flex flex-col bg-white dark:bg-gray-900">
              {/* 日期头部 */}
              <div
                className={cn(
                  'h-12 flex flex-col items-center justify-center',
                  isToday(date)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 dark:bg-gray-800'
                )}
              >
                <div className="text-xs">{weekDayNames[index]}</div>
                <div className="text-lg font-bold">{date.getDate()}</div>
              </div>

              {/* 时间格子 */}
              <div className="relative flex-1">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-gray-100 dark:border-gray-800"
                    style={{ height: `${hourHeight}px` }}
                  ></div>
                ))}

                {/* 任务卡片 */}
                {dayTasks.map((task: any) => {
                  const pos = getTaskPosition(task);
                  const startMinute = getTaskStartMinute(task);
                  const duration = getTaskDuration(task);
                  const endMinute = Math.min(startMinute + duration, endHour * 60);

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'absolute left-1 right-1 px-2 py-1 rounded text-xs overflow-hidden group',
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
                        cursor: dragPreview || resizePreview ? 'default' : 'move',
                      }}
                      title={`${task.title} ${formatClock(startMinute)} - ${formatClock(endMinute)}`}
                      onMouseDown={(e) => {
                        if (!resizePreview && !dragPreview) {
                          startDrag(e, task);
                        }
                      }}
                    >
                      <div className="font-medium truncate pointer-events-none">
                        {formatClock(startMinute)} - {formatClock(endMinute)}
                      </div>
                      <div className="truncate pointer-events-none">{task.title}</div>

                      {/* 底部拖动手柄 */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize opacity-0 group-hover:opacity-100 pointer-events-auto"
                        onMouseDown={(e) => startResize(e, task)}
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
  );
}

// 日视图组件
function DayView({ currentDate, tasks, updateTask }: any) {
  const [resizePreview, setResizePreview] = useState<{ taskId: string; duration: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ taskId: string; startMinute: number } | null>(null);
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

  // 计算动态时间范围
  const taskTimes = sortedTasks
    .filter((task: any) => task.dueTime)
    .map((task: any) => {
      const [hour, minute] = task.dueTime.split(':').map(Number);
      return hour * 60 + minute;
    });

  let startHour = 0;
  let endHour = 24;

  if (taskTimes.length > 0) {
    const minTime = Math.min(...taskTimes);
    const maxTime = Math.max(...taskTimes.map((time, idx) => {
      const task = sortedTasks.filter((t: any) => t.dueTime)[idx];
      return time + (Number(task?.duration) || 60);
    }));

    startHour = Math.max(0, Math.floor(minTime / 60) - 1);
    endHour = Math.min(24, Math.ceil(maxTime / 60) + 1);
  }

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const DYNAMIC_HOUR_HEIGHT = Math.max(50, Math.min(100, 800 / hours.length));
  const DYNAMIC_MINUTE_HEIGHT = DYNAMIC_HOUR_HEIGHT / 60;

  const getTaskStartMinute = (task: any) => {
    if (dragPreview && dragPreview.taskId === task.id) {
      return dragPreview.startMinute;
    }
    if (!task.dueTime) return startHour * 60;
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

  const getTimeAtPosition = (y: number) => {
    const rawMinutes = (y / DYNAMIC_HOUR_HEIGHT) * 60 + startHour * 60;
    const snapped = Math.round(rawMinutes / RESIZE_STEP_MINUTES) * RESIZE_STEP_MINUTES;
    return Math.min((endHour - 1) * 60 + 45, Math.max(startHour * 60, snapped));
  };

  const handleTimeDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMinute = getTimeAtPosition(y);

    await updateTask(taskId, {
      dueDate: dateStr,
      dueTime: formatClock(startMinute),
    });
  };

  const startDrag = (e: React.MouseEvent<HTMLDivElement>, task: any) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startMinute = getTaskStartMinute(task);

    const handleMove = (event: MouseEvent) => {
      const deltaY = event.clientY - startY;
      const deltaMinutes = (deltaY / DYNAMIC_MINUTE_HEIGHT);
      const nextStartMinute = snapToGrid(startMinute + deltaMinutes);
      setDragPreview({ taskId: task.id, startMinute: nextStartMinute });
    };

    const handleUp = async (event: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      const deltaY = event.clientY - startY;
      const deltaMinutes = (deltaY / DYNAMIC_MINUTE_HEIGHT);
      const nextStartMinute = snapToGrid(startMinute + deltaMinutes);
      setDragPreview(null);
      await updateTask(task.id, { dueTime: formatClock(nextStartMinute) });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const startResize = (e: React.MouseEvent<HTMLDivElement>, task: any) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startDuration = getTaskDuration(task);

    const handleMove = (event: MouseEvent) => {
      const deltaMinutes = (event.clientY - startY) / DYNAMIC_MINUTE_HEIGHT;
      const nextDuration = snapDuration(startDuration + deltaMinutes);
      setResizePreview({ taskId: task.id, duration: nextDuration });
    };

    const handleUp = async (event: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      const deltaMinutes = (event.clientY - startY) / DYNAMIC_MINUTE_HEIGHT;
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
              style={{ height: `${DYNAMIC_HOUR_HEIGHT}px` }}
            >
              <span className="relative -top-2">
                {hour === 12 ? '正午' : `${String(hour).padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>

        <div
          className="relative flex-1 rounded-lg bg-white/40 dark:bg-gray-900/30"
          style={{ height: `${hours.length * DYNAMIC_HOUR_HEIGHT}px` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleTimeDrop}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
              style={{ top: `${(hour - startHour) * DYNAMIC_HOUR_HEIGHT}px`, height: `${DYNAMIC_HOUR_HEIGHT}px` }}
            />
          ))}

          {sortedTasks.map((task: any, index: number) => {
            const startMinute = getTaskStartMinute(task);
            const duration = getTaskDuration(task);
            const endMinute = Math.min(startMinute + duration, endHour * 60);
            const relativeStartMinute = startMinute - (startHour * 60);

            return (
              <div
                key={task.id}
                className={cn(
                  'absolute left-1 right-1 rounded-md border px-3 py-2 shadow-sm overflow-hidden group',
                  'transition-shadow hover:shadow-md',
                  getTaskColor(task, index),
                  task.status === 'completed' && 'opacity-60'
                )}
                style={{
                  top: `${relativeStartMinute * DYNAMIC_MINUTE_HEIGHT}px`,
                  height: `${Math.max(duration * DYNAMIC_MINUTE_HEIGHT, 28)}px`,
                  cursor: dragPreview || resizePreview ? 'default' : 'move',
                }}
                title={`${task.title} ${formatClock(startMinute)} - ${formatClock(endMinute)}`}
                onMouseDown={(e) => {
                  if (!resizePreview && !dragPreview) {
                    startDrag(e, task);
                  }
                }}
              >
                <div className="flex items-start gap-2 pointer-events-none">
                  <span className="mt-1 h-4 w-4 flex-shrink-0 rounded border border-current opacity-70" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{task.title}</div>
                    <div className="text-sm opacity-75">
                      {formatClock(startMinute)} - {formatClock(endMinute)}
                    </div>
                  </div>
                </div>

                <div
                  className="absolute bottom-0 left-0 right-0 h-3 cursor-row-resize opacity-0 group-hover:opacity-100 pointer-events-auto"
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

function snapToGrid(minutes: number) {
  const snapped = Math.round(minutes / RESIZE_STEP_MINUTES) * RESIZE_STEP_MINUTES;
  return Math.max(0, Math.min(24 * 60 - RESIZE_STEP_MINUTES, snapped));
}
