import { useEffect, useState } from 'react';
import { RecurrenceRule, useTaskStore } from '@/stores/task-store';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

interface TaskFormProps {
  taskId?: string;
  parentId?: string;
  onClose: () => void;
}

function toLocalDateTimeValue(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseRecurrenceRule(value?: string | null): RecurrenceRule | null {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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

export function TaskForm({ taskId, parentId, onClose }: TaskFormProps) {
  const { tasks, lists, tags, fetchLists, fetchTags, createTag, createTask, updateTask } = useTaskStore();
  const existingTask = taskId ? tasks.find((t) => t.id === taskId) : null;
  const existingRule = parseRecurrenceRule(existingTask?.recurrenceRule);
  const existingTagIds = existingTask?.tags?.map((tag) => tag.id) || [];

  const [formData, setFormData] = useState({
    title: existingTask?.title || '',
    description: existingTask?.description || '',
    priority: existingTask?.priority || 'medium',
    dueDate: existingTask?.dueDate || '',
    dueTime: existingTask?.dueTime || '',
    duration: String(existingTask?.duration || 60),
    listId: existingTask?.listId || 'inbox',
    tagIds: existingTagIds,
    newTagName: '',
    notes: existingTask?.notes || '',
    attachments: parseAttachments(existingTask?.attachments),
    reminderAt: '',
    reminderChannel: 'notification',
    recurrenceFrequency: existingRule?.frequency || 'none',
    recurrenceInterval: String(existingRule?.interval || 1),
    recurrenceEndDate: existingRule?.endDate || '',
    recurrenceCount: existingRule?.count ? String(existingRule.count) : '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchLists();
    void fetchTags();
  }, [fetchLists, fetchTags]);

  useEffect(() => {
    if (!taskId || !window.electron?.reminder) return;

    window.electron.reminder.listTask(taskId).then((reminders) => {
      const [reminder] = reminders;
      if (!reminder) return;

      setFormData((current) => ({
        ...current,
        reminderAt: toLocalDateTimeValue(reminder.triggerAt),
        reminderChannel: reminder.channel || 'notification',
      }));
    });
  }, [taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = '请输入任务标题';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const recurrenceRule =
      formData.recurrenceFrequency === 'none'
        ? null
        : {
            frequency: formData.recurrenceFrequency as RecurrenceRule['frequency'],
            interval: Math.max(1, Number(formData.recurrenceInterval) || 1),
            endDate: formData.recurrenceEndDate || undefined,
            count: formData.recurrenceCount ? Number(formData.recurrenceCount) : undefined,
          };

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority as 'high' | 'medium' | 'low',
      dueDate: formData.dueDate,
      dueTime: formData.dueTime,
      duration: Number(formData.duration) || 60,
      listId: formData.listId || 'inbox',
      tagIds: formData.tagIds,
      notes: formData.notes.trim(),
      attachments: formData.attachments,
      parentId: parentId ?? existingTask?.parentId ?? undefined,
      reminderAt: formData.reminderAt,
      reminderChannel: formData.reminderChannel as 'notification' | 'sound' | 'both',
      recurrenceRule: recurrenceRule ? JSON.stringify(recurrenceRule) : null,
    };

    // 提交
    try {
      if (taskId) {
        await updateTask(taskId, payload);
      } else {
        await createTask(payload);
      }
      onClose();
    } catch (error) {
      console.error('保存任务失败:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-white/30 shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {taskId ? '编辑任务' : '创建任务'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="任务标题"
            placeholder="输入任务标题..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            error={errors.title}
            autoFocus
          />

          <Textarea
            label="任务描述"
            placeholder="输入任务描述（可选）..."
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <Textarea
            label="备注（Markdown）"
            placeholder="记录执行细节、链接或检查清单..."
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <Select
            label="优先级"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
            options={[
              { value: 'low', label: '低' },
              { value: 'medium', label: '中' },
              { value: 'high', label: '高' },
            ]}
          />

          <Select
            label="清单"
            value={formData.listId}
            onChange={(e) => setFormData({ ...formData, listId: e.target.value })}
            options={lists.map((list) => ({
              value: list.id,
              label: list.name,
            }))}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              标签
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = formData.tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        tagIds: selected
                          ? formData.tagIds.filter((id) => id !== tag.id)
                          : [...formData.tagIds, tag.id],
                      })
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700'
                    }`}
                  >
                    #{tag.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="新建标签"
                value={formData.newTagName}
                onChange={(e) => setFormData({ ...formData, newTagName: e.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const tag = await createTag({ name: formData.newTagName });
                  if (!tag) return;
                  setFormData({
                    ...formData,
                    newTagName: '',
                    tagIds: Array.from(new Set([...formData.tagIds, tag.id])),
                  });
                }}
              >
                添加
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="截止日期"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
            <Input
              label="截止时间"
              type="time"
              value={formData.dueTime}
              onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="时长（分钟）"
              type="number"
              min="5"
              step="5"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
            />
            <Select
              label="提醒方式"
              value={formData.reminderChannel}
              onChange={(e) => setFormData({ ...formData, reminderChannel: e.target.value })}
              options={[
                { value: 'notification', label: '系统通知' },
                { value: 'sound', label: '声音' },
                { value: 'both', label: '通知 + 声音' },
              ]}
            />
          </div>

          <Input
            label="提醒时间"
            type="datetime-local"
            value={formData.reminderAt}
            onChange={(e) => setFormData({ ...formData, reminderAt: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="重复规则"
              value={formData.recurrenceFrequency}
              onChange={(e) => setFormData({ ...formData, recurrenceFrequency: e.target.value })}
              options={[
                { value: 'none', label: '不重复' },
                { value: 'daily', label: '每天' },
                { value: 'weekly', label: '每周' },
                { value: 'monthly', label: '每月' },
              ]}
            />
            <Input
              label="重复间隔"
              type="number"
              min="1"
              value={formData.recurrenceInterval}
              disabled={formData.recurrenceFrequency === 'none'}
              onChange={(e) => setFormData({ ...formData, recurrenceInterval: e.target.value })}
            />
          </div>

          {formData.recurrenceFrequency !== 'none' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="结束日期"
                type="date"
                value={formData.recurrenceEndDate}
                onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
              />
              <Input
                label="重复次数"
                type="number"
                min="1"
                value={formData.recurrenceCount}
                onChange={(e) => setFormData({ ...formData, recurrenceCount: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                附件
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const selected = await window.electron.file.selectAttachments();
                  if (selected.length === 0) return;

                  setFormData({
                    ...formData,
                    attachments: Array.from(new Set([...formData.attachments, ...selected])),
                  });
                }}
              >
                选择文件
              </Button>
            </div>

            {formData.attachments.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                {formData.attachments.map((filePath) => (
                  <div
                    key={filePath}
                    className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span className="min-w-0 flex-1 truncate" title={filePath}>
                      {filePath}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          attachments: formData.attachments.filter((item) => item !== filePath),
                        })
                      }
                      className="text-gray-400 hover:text-red-500"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-3 text-sm text-gray-400">
                暂无附件
              </div>
            )}
          </div>

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {taskId ? '保存' : '创建'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
