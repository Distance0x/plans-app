import { useEffect, useState } from 'react';
import { RecurrenceRule, useTaskStore } from '@/stores/task-store';
import { type ReminderChannel, useSettingsStore } from '@/stores/settings-store';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { X } from 'lucide-react';

interface TaskFormProps {
  taskId?: string;
  parentId?: string;
  onClose: () => void;
  initialData?: {
    title?: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
    dueDate?: string;
    dueTime?: string;
    duration?: number;
  };
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

function getAttachmentName(value: any) {
  if (typeof value === 'string') {
    return value.split(/[\\/]/).pop() || value;
  }

  return value?.originalName || value?.storedPath?.split(/[\\/]/).pop() || '附件';
}

function getAttachmentKey(value: any) {
  return typeof value === 'string' ? value : value?.storedPath || value?.sourcePath || value?.originalName;
}

function getAttachmentPath(value: any) {
  return typeof value === 'string' ? value : value?.storedPath;
}

function formatAttachmentSize(value: any) {
  const size = Number(value?.size);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

const reminderOffsetOptions = [
  { value: 0, label: '准时' },
  { value: 5, label: '提前 5 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 1440, label: '提前 1 天' },
];

const weekDayOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
];

export function TaskForm({ taskId, parentId, onClose, initialData }: TaskFormProps) {
  const { tasks, lists, tags, fetchLists, fetchTags, createTag, createTask, updateTask } = useTaskStore();
  const { defaultReminderOffsets, defaultReminderChannel } = useSettingsStore();
  const existingTask = taskId ? tasks.find((t) => t.id === taskId) : null;
  const existingRule = parseRecurrenceRule(existingTask?.recurrenceRule);
  const existingTagIds = existingTask?.tags?.map((tag) => tag.id) || [];

  const [formData, setFormData] = useState({
    title: initialData?.title || existingTask?.title || '',
    description: initialData?.description || existingTask?.description || '',
    priority: initialData?.priority || existingTask?.priority || 'medium',
    dueDate: initialData?.dueDate || existingTask?.dueDate || '',
    dueTime: initialData?.dueTime || existingTask?.dueTime || '',
    duration: String(initialData?.duration || existingTask?.duration || 60),
    scheduledStartTime: existingTask?.scheduledStartTime || '',
    scheduledEndTime: existingTask?.scheduledEndTime || '',
    listId: existingTask?.listId || 'inbox',
    tagIds: existingTagIds,
    newTagName: '',
    notes: existingTask?.notes || '',
    attachments: parseAttachments(existingTask?.attachments),
    reminderAt: '',
    reminderOffsets: existingTask ? [15] : defaultReminderOffsets,
    reminderChannel: existingTask ? 'notification' : defaultReminderChannel,
    recurrenceFrequency: existingRule?.frequency || 'none',
    recurrenceInterval: String(existingRule?.interval || 1),
    recurrenceDaysOfWeek: existingRule?.daysOfWeek || [],
    recurrenceLastDayOfMonth: Boolean(existingRule?.lastDayOfMonth),
    recurrenceEndDate: existingRule?.endDate || '',
    recurrenceCount: existingRule?.count ? String(existingRule.count) : '',
    recurrenceExceptionDate: '',
    recurrenceExceptions: existingRule?.exceptions || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchLists();
    void fetchTags();
  }, [fetchLists, fetchTags]);

  useEffect(() => {
    if (!taskId || !window.electron?.reminder) return;

    window.electron.reminder.listTask(taskId).then((reminders) => {
      if (reminders.length === 0) return;

      const dueAt =
        existingTask?.dueDate && existingTask?.dueTime
          ? new Date(`${existingTask.dueDate}T${existingTask.dueTime}`)
          : null;
      const offsets = new Set<number>();
      let customReminderAt = '';
      let channel = reminders[0]?.channel || 'notification';

      for (const reminder of reminders) {
        channel = reminder.channel || channel;
        if (reminder.type === 'custom' || !dueAt || Number.isNaN(dueAt.getTime())) {
          if (!customReminderAt) customReminderAt = toLocalDateTimeValue(reminder.triggerAt);
          continue;
        }

        const offset = Math.round((dueAt.getTime() - new Date(reminder.triggerAt).getTime()) / 60_000);
        if (reminderOffsetOptions.some((option) => option.value === offset)) {
          offsets.add(offset);
        }
      }

      setFormData((current) => ({
        ...current,
        reminderAt: customReminderAt,
        reminderOffsets: offsets.size > 0 ? Array.from(offsets) : current.reminderOffsets,
        reminderChannel: channel,
      }));
    });
  }, [existingTask?.dueDate, existingTask?.dueTime, taskId]);

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
            daysOfWeek:
              formData.recurrenceFrequency === 'weekly' && formData.recurrenceDaysOfWeek.length > 0
                ? formData.recurrenceDaysOfWeek
                : undefined,
            dayOfMonth:
              formData.recurrenceFrequency === 'monthly' && !formData.recurrenceLastDayOfMonth && formData.dueDate
                ? new Date(`${formData.dueDate}T00:00:00`).getDate()
                : undefined,
            lastDayOfMonth:
              formData.recurrenceFrequency === 'monthly' ? formData.recurrenceLastDayOfMonth : undefined,
            endDate: formData.recurrenceEndDate || undefined,
            count: formData.recurrenceCount ? Number(formData.recurrenceCount) : undefined,
            exceptions: formData.recurrenceExceptions.length > 0 ? formData.recurrenceExceptions : undefined,
          };

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      priority: formData.priority as 'high' | 'medium' | 'low',
      dueDate: formData.dueDate,
      dueTime: formData.dueTime,
      duration: Number(formData.duration) || 60,
      scheduledStartTime: formData.scheduledStartTime || undefined,
      scheduledEndTime: formData.scheduledEndTime || undefined,
      listId: formData.listId || 'inbox',
      tagIds: formData.tagIds,
      notes: formData.notes.trim(),
      attachments: formData.attachments,
      parentId: parentId ?? existingTask?.parentId ?? undefined,
      reminderAt: formData.reminderAt,
      reminderOffsets: formData.reminderOffsets,
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
              label="开始时间"
              type="datetime-local"
              value={formData.scheduledStartTime}
              onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
            />
            <Input
              label="结束时间"
              type="datetime-local"
              value={formData.scheduledEndTime}
              onChange={(e) => setFormData({ ...formData, scheduledEndTime: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, reminderChannel: e.target.value as ReminderChannel })}
              options={[
                { value: 'notification', label: '系统通知' },
                { value: 'sound', label: '声音' },
                { value: 'both', label: '通知 + 声音' },
              ]}
            />
          </div>

          <Input
            label="自定义提醒时间"
            type="datetime-local"
            value={formData.reminderAt}
            onChange={(e) => setFormData({ ...formData, reminderAt: e.target.value })}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              相对截止时间提醒
            </label>
            <div className="flex flex-wrap gap-2">
              {reminderOffsetOptions.map((option) => {
                const selected = formData.reminderOffsets.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!formData.dueDate || !formData.dueTime}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        reminderOffsets: selected
                          ? formData.reminderOffsets.filter((value) => value !== option.value)
                          : [...formData.reminderOffsets, option.value].sort((a, b) => b - a),
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400">
              需要设置截止日期和截止时间后才会生效。
            </p>
          </div>

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
                { value: 'yearly', label: '每年' },
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
            <div className="space-y-4">
              {formData.recurrenceFrequency === 'weekly' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    每周重复日期
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {weekDayOptions.map((day) => {
                      const selected = formData.recurrenceDaysOfWeek.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              recurrenceDaysOfWeek: selected
                                ? formData.recurrenceDaysOfWeek.filter((value) => value !== day.value)
                                : [...formData.recurrenceDaysOfWeek, day.value],
                            })
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            selected
                              ? 'border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-950/50'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {formData.recurrenceFrequency === 'monthly' && (
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.recurrenceLastDayOfMonth}
                    onChange={(e) => setFormData({ ...formData, recurrenceLastDayOfMonth: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  每月最后一天重复
                </label>
              )}

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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  跳过日期
                </label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={formData.recurrenceExceptionDate}
                    onChange={(e) => setFormData({ ...formData, recurrenceExceptionDate: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!formData.recurrenceExceptionDate) return;
                      setFormData({
                        ...formData,
                        recurrenceExceptionDate: '',
                        recurrenceExceptions: Array.from(new Set([
                          ...formData.recurrenceExceptions,
                          formData.recurrenceExceptionDate,
                        ])).sort(),
                      });
                    }}
                  >
                    添加
                  </Button>
                </div>
                {formData.recurrenceExceptions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.recurrenceExceptions.map((date) => (
                      <button
                        key={date}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            recurrenceExceptions: formData.recurrenceExceptions.filter((item) => item !== date),
                          })
                        }
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-red-200 hover:text-red-500 dark:border-gray-700"
                      >
                        {date} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                    attachments: [...formData.attachments, ...selected],
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
                    key={getAttachmentKey(filePath)}
                    className="flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate" title={getAttachmentPath(filePath)}>
                        {getAttachmentName(filePath)}
                      </div>
                      {formatAttachmentSize(filePath) && (
                        <div className="text-xs text-gray-400">{formatAttachmentSize(filePath)}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const targetPath = getAttachmentPath(filePath);
                        if (!targetPath) return;
                        await window.electron.file.openAttachment(targetPath);
                      }}
                      className="text-blue-500 hover:text-blue-600"
                    >
                      打开
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          attachments: formData.attachments.filter((item) => getAttachmentKey(item) !== getAttachmentKey(filePath)),
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
