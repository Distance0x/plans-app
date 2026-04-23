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
    high: 'text-red-500 border-red-200',
    medium: 'text-yellow-500 border-yellow-200',
    low: 'text-blue-500 border-blue-200',
  };

  return (
    <div
      ref={itemRef}
      onClick={() => onSelectTask?.(task.id)}
      className={cn(
        level === 0
          ? 'glass-card p-4 rounded-lg border backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border-white/30 shadow-md hover:shadow-lg'
          : 'p-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-white/40 dark:bg-gray-800/40',
        'transition-all cursor-pointer',
        selected && 'border-blue-400 bg-blue-50/80 dark:border-blue-500 dark:bg-blue-950/30',
        isFocused && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900',
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
          {task.notes && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-wrap line-clamp-3">
              {task.notes}
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
              <span className="text-xs text-gray-500">
                {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ''}
              </span>
            )}
            {task.recurrenceRule && (
              <span className="text-xs text-purple-600">重复</span>
            )}
            {attachments.length > 0 && (
              <span className="text-xs text-gray-500">附件 {attachments.length}</span>
            )}
          </div>
        </div>

        {/* 删除按钮 */}
        <button
          onClick={(event) => {
            event.stopPropagation();
            deleteTask(task.id);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
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
