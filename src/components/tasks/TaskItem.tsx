import { useEffect, useRef } from 'react';
import { useTaskStore, type Task } from '@/stores/task-store';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubTaskList } from './SubTaskList';

interface TaskItemProps {
  task: Task;
  level?: number;
  selected?: boolean;
  selectedTaskId?: string | null;
  onSelectTask?: (taskId: string) => void;
}

export function TaskItem({
  task,
  level = 0,
  selected = false,
  selectedTaskId,
  onSelectTask,
}: TaskItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const {
    tasks,
    focusedTaskId,
    setFocusedTask,
    createTask,
    toggleComplete,
    deleteTask,
  } = useTaskStore();
  const subTasks = tasks.filter((item) => item.parentId === task.id);
  const canNest = level < 2;
  const isFocused = focusedTaskId === task.id;
  const attachments = parseAttachments(task.attachments);

  useEffect(() => {
    if (!isFocused || !itemRef.current) return;

    itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = window.setTimeout(() => setFocusedTask(null), 3000);

    return () => window.clearTimeout(timer);
  }, [isFocused, setFocusedTask]);

  const priorityColors = {
    high: 'bg-gradient-to-r from-red-500 to-pink-500 text-white border-0',
    medium: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0',
    low: 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white border-0',
  };

  const priorityLabels = {
    high: '🔥 高',
    medium: '⚡ 中',
    low: '💧 低',
  };

  return (
    <div
      ref={itemRef}
      onClick={() => onSelectTask?.(task.id)}
      className={cn(
        level === 0
          ? 'glass-effect p-5 rounded-2xl border border-white/30 dark:border-gray-700/50 shadow-lg hover:shadow-xl hover-lift'
          : 'p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-800/60',
        'transition-all cursor-pointer animate-fade-in',
        selected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent shadow-xl',
        isFocused && 'ring-2 ring-purple-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 animate-pulse',
        task.status === 'completed' && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* 完成按钮 */}
        <button
          onClick={(event) => {
            event.stopPropagation();
            toggleComplete(task.id);
          }}
          className="mt-1 flex-shrink-0 hover:scale-125 transition-transform"
        >
          {task.status === 'completed' ? (
            <CheckCircle className="w-6 h-6 text-green-500 drop-shadow-md" />
          ) : (
            <Circle className="w-6 h-6 text-gray-400 hover:text-blue-500" />
          )}
        </button>

        {/* 任务内容 */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-semibold text-gray-900 dark:text-white text-base',
              task.status === 'completed' && 'line-through text-gray-500 dark:text-gray-400'
            )}
          >
            {task.title}
          </h3>
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
              {task.description}
            </p>
          )}
          {task.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap line-clamp-3 leading-relaxed">
              {task.notes}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span
              className={cn(
                'text-xs px-3 py-1.5 rounded-full font-medium shadow-sm',
                priorityColors[task.priority]
              )}
            >
              {priorityLabels[task.priority]}
            </span>
            {task.dueDate && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                📅 {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ''}
              </span>
            )}
            {task.recurrenceRule && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                🔄 重复
              </span>
            )}
            {attachments.length > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                📎 {attachments.length}
              </span>
            )}
          </div>
        </div>

        {/* 删除按钮 */}
        <button
          onClick={(event) => {
            event.stopPropagation();
            deleteTask(task.id);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-all hover:scale-110"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {canNest && (
        <div className="mt-3 pl-8">
          <SubTaskList
            taskId={task.id}
            subTasks={subTasks as any}
            onAddSubTask={(title) =>
              createTask({
                title,
                parentId: task.id,
                priority: 'medium',
                status: 'todo',
              })
            }
            onToggleSubTask={toggleComplete}
            onDeleteSubTask={deleteTask}
            renderSubTask={(subTask) => (
              <TaskItem
                task={subTask as Task}
                level={level + 1}
                selected={selectedTaskId === subTask.id}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
              />
            )}
          />
        </div>
      )}
    </div>
  );
}

function parseAttachments(value?: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
