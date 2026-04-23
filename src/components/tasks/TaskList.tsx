import { useEffect } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { TaskItem } from './TaskItem';
import { TaskFilters } from './TaskFilters';
import { QuickAddTask } from './QuickAddTask';

interface TaskListProps {
  title?: string;
  autoFocusSearch?: boolean;
}

export function TaskList({ title = '今日任务', autoFocusSearch = false }: TaskListProps) {
  const { tasks, loading, error, fetchTasks, searchTasks } = useTaskStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleSearch = async (query: string) => {
    await searchTasks(query);
  };

  const handleFilterChange = async (filters: any) => {
    await fetchTasks(filters);
  };

  const rootTasks = tasks.filter((task) => !task.parentId);

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">错误: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
      </div>

      <QuickAddTask />

      {/* 搜索和过滤 */}
      <TaskFilters
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        autoFocusSearch={autoFocusSearch}
      />

      {/* 任务列表 */}
      {rootTasks.length === 0 ? (
        <div className="glass-card p-12 rounded-lg text-center backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/30">
          <p className="text-gray-500 mb-4">还没有任务</p>
          <p className="text-sm text-gray-400">在上方输入任务标题，按 Enter 创建</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rootTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
