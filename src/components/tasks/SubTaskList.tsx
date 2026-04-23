import { useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, Check, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

interface SubTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'completed';
  parentId: string;
  createdAt: string;
}

interface SubTaskListProps {
  taskId: string;
  subTasks: SubTask[];
  onAddSubTask: (title: string) => void;
  onToggleSubTask: (subTaskId: string) => void;
  onDeleteSubTask: (subTaskId: string) => void;
  renderSubTask?: (subTask: SubTask) => ReactNode;
}

export function SubTaskList({
  taskId,
  subTasks,
  onAddSubTask,
  onToggleSubTask,
  onDeleteSubTask,
  renderSubTask,
}: SubTaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [expanded, setExpanded] = useState(true);

  const handleAdd = () => {
    if (newSubTaskTitle.trim()) {
      onAddSubTask(newSubTaskTitle.trim());
      setNewSubTaskTitle('');
      setIsAdding(false);
    }
  };

  const completedCount = subTasks.filter(st => st.status === 'completed').length;
  const totalCount = subTasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div id={`subtasks-${taskId}`} className="space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span>子任务</span>
          {totalCount > 0 && (
            <span className="text-xs text-gray-500">
              {completedCount}/{totalCount}
            </span>
          )}
        </button>

        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            添加子任务
          </Button>
        )}
      </div>

      {/* 进度条 */}
      {totalCount > 0 && expanded && (
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 子任务列表 */}
      {expanded && (
        <div className="space-y-2">
          {subTasks.map((subTask) => (
            renderSubTask ? (
              <div key={subTask.id}>{renderSubTask(subTask)}</div>
            ) : (
              <div
                key={subTask.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 group"
              >
                {/* 完成按钮 */}
                <button
                  onClick={() => onToggleSubTask(subTask.id)}
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                    subTask.status === 'completed'
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                  )}
                >
                  {subTask.status === 'completed' && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>

                {/* 标题 */}
                <span
                  className={cn(
                    'flex-1 text-sm',
                    subTask.status === 'completed'
                      ? 'line-through text-gray-500'
                      : 'text-gray-900 dark:text-white'
                  )}
                >
                  {subTask.title}
                </span>

                {/* 删除按钮 */}
                <button
                  onClick={() => onDeleteSubTask(subTask.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )
          ))}

          {/* 添加子任务输入框 */}
          {isAdding && (
            <div className="flex items-center gap-2 p-2 border border-blue-500 rounded-lg">
              <input
                type="text"
                value={newSubTaskTitle}
                onChange={(e) => setNewSubTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdd();
                  } else if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewSubTaskTitle('');
                  }
                }}
                placeholder="输入子任务标题..."
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white"
                autoFocus
              />
              <Button onClick={handleAdd} size="sm" className="text-xs">
                添加
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setNewSubTaskTitle('');
                }}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                取消
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
