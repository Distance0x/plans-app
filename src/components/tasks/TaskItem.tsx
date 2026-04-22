import { useTaskStore } from '@/stores/task-store';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: 'high' | 'medium' | 'low';
    status: 'todo' | 'in_progress' | 'completed';
    dueDate?: string;
  };
}

export function TaskItem({ task }: TaskItemProps) {
  const { toggleComplete, deleteTask } = useTaskStore();

  const priorityColors = {
    high: 'text-red-500 border-red-200',
    medium: 'text-yellow-500 border-yellow-200',
    low: 'text-blue-500 border-blue-200',
  };

  return (
    <div
      className={cn(
        'glass-card p-4 rounded-lg border backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border-white/30 shadow-md hover:shadow-lg transition-all',
        task.status === 'completed' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* 完成按钮 */}
        <button
          onClick={() => toggleComplete(task.id)}
          className="mt-1 flex-shrink-0 hover:scale-110 transition-transform"
        >
          {task.status === 'completed' ? (
            <CheckCircle className="w-5 h-5 text-primary-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* 任务内容 */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-medium text-gray-900 dark:text-white',
              task.status === 'completed' && 'line-through text-gray-500'
            )}
          >
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                'text-xs px-2 py-1 rounded border',
                priorityColors[task.priority]
              )}
            >
              {task.priority}
            </span>
            {task.dueDate && (
              <span className="text-xs text-gray-500">{task.dueDate}</span>
            )}
          </div>
        </div>

        {/* 删除按钮 */}
        <button
          onClick={() => deleteTask(task.id)}
          className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
