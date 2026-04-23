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
        <WeekView currentDate={currentDate} tasks={tasks} />
      )}
      {viewMode === 'day' && (
        <DayView currentDate={currentDate} tasks={tasks} />
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
function WeekView({ currentDate, tasks }: any) {
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

  const getTaskPosition = (time: string) => {
    if (!time) return { top: 0, height: 60 };
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return {
      top: (totalMinutes / 60) * 60, // 每小时60px
      height: 60, // 默认1小时
    };
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
                  ></div>
                ))}

                {/* 任务卡片 */}
                {dayTasks.map((task: any) => {
                  const pos = getTaskPosition(task.dueTime);
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'absolute left-0 right-0 mx-1 px-2 py-1 rounded text-xs cursor-pointer',
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
                      <div className="font-medium">{task.dueTime || '全天'}</div>
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

// 日视图组件
function DayView({ currentDate, tasks }: any) {
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

  const getTasksForHour = (hour: number) => {
    return sortedTasks.filter((task: any) => {
      if (!task.dueTime) return hour === 0;
      const [taskHour] = task.dueTime.split(':').map(Number);
      return taskHour === hour;
    });
  };

  const weekDayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayOfWeek = currentDate.getDay();

  return (
    <div className="max-w-3xl mx-auto">
      {/* 日期头部 */}
      <div className="mb-6 text-center">
        <div className="text-4xl font-bold text-blue-500 mb-2">{day}</div>
        <div className="text-lg text-gray-600 dark:text-gray-300">
          {weekDayNames[dayOfWeek]}
        </div>
      </div>

      {/* 任务列表 */}
      <div className="space-y-6">
        {hours.map((hour) => {
          const hourTasks = getTasksForHour(hour);
          if (hourTasks.length === 0) return null;

          return (
            <div key={hour} className="flex gap-4">
              {/* 时间标签 */}
              <div className="w-20 flex-shrink-0 text-right">
                <div className="text-sm text-gray-500">
                  {String(hour).padStart(2, '0')}:00
                </div>
              </div>

              {/* 任务卡片 */}
              <div className="flex-1 space-y-2">
                {hourTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className={cn(
                      'p-4 rounded-lg border-l-4 cursor-pointer transition-all',
                      'hover:shadow-md',
                      task.priority === 'high'
                        ? 'bg-red-50 border-red-500 dark:bg-red-900/20'
                        : task.priority === 'medium'
                        ? 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20'
                        : 'bg-blue-50 border-blue-500 dark:bg-blue-900/20',
                      task.status === 'completed' && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {task.dueTime || '全天'}
                          </span>
                          {task.status === 'completed' && (
                            <span className="text-xs text-green-600">✓ 已完成</span>
                          )}
                        </div>
                        <div
                          className={cn(
                            'text-base font-medium',
                            task.status === 'completed' && 'line-through'
                          )}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {sortedTasks.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            今天没有安排任务
          </div>
        )}
      </div>
    </div>
  );
}
