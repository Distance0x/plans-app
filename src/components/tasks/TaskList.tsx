import { useEffect } from 'react';
import { useTaskStore } from '@/stores/task-store';
import { TaskItem } from './TaskItem';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';

export function TaskList() {
  const { tasks, loading, error, fetchTasks, createTask } = useTaskStore();

  useEffect(() => {
    fetchTasks({ parentId: null });
  }, [fetchTasks]);

  const handleQuickAdd = async () => {
    await createTask({
      title: '新任务',
      priority: 'medium',
    });
  };

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
          今日任务
        </h2>
        <Button onClick={handleQuickAdd} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          添加任务
        </Button>
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="glass-card p-12 rounded-lg text-center backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/30">
          <p className="text-gray-500 mb-4">还没有任务</p>
          <Button onClick={handleQuickAdd}>
            <Plus className="w-4 h-4 mr-2" />
            创建第一个任务
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
