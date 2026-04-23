import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

interface CalendarProps {
  tasks: Array<{
    id: string;
    title: string;
    dueDate?: string;
    status: string;
    priority: string;
  }>;
}

export function Calendar({ tasks }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 获取当月第一天和最后一天
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 获取当月第一天是星期几（0-6）
  const firstDayOfWeek = firstDay.getDay();

  // 获取当月天数
  const daysInMonth = lastDay.getDate();

  // 生成日历数组
  const calendarDays: (number | null)[] = [];

  // 填充前面的空白
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // 填充当月日期
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // 获取某一天的任务
  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter((task) => task.dueDate === dateStr);
  };

  // 上一月
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // 下一月
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 今天
  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="glass-card p-6 rounded-lg backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/30 shadow-xl">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {year} 年 {monthNames[month]}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {day}
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
          const hasHighPriority = dayTasks.some((t) => t.priority === 'high');

          return (
            <div
              key={day}
              className={cn(
                'aspect-square p-2 rounded-lg border transition-all cursor-pointer',
                'hover:border-primary-500 hover:shadow-md',
                isToday(day)
                  ? 'bg-primary-500 text-white border-primary-600'
                  : 'bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600',
                hasHighPriority && !isToday(day) && 'border-red-300'
              )}
            >
              <div className="flex flex-col h-full">
                <div
                  className={cn(
                    'text-sm font-medium mb-1',
                    isToday(day) ? 'text-white' : 'text-gray-900 dark:text-white'
                  )}
                >
                  {day}
                </div>
                {dayTasks.length > 0 && (
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          'text-xs px-1 py-0.5 rounded truncate',
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700',
                          task.status === 'completed' && 'opacity-50 line-through'
                        )}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayTasks.length - 2}
                      </div>
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
