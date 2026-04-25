import { useState } from 'react';
import {
  Bell,
  CheckSquare,
  CheckCircle2,
  Calendar,
  Inbox,
  Clock,
  ChevronRight,
  ChevronDown,
  Grid,
  Plus,
  Trash2,
  TimerReset,
  Minimize2,
  Maximize2,
  X,
  ExternalLink
} from 'lucide-react';
import { TaskList } from './components/tasks/TaskList';
import { TaskDetailPanel } from './components/tasks/TaskDetailPanel';
import { PomodoroTimer } from './components/timer/PomodoroTimer';
import { FocusStats } from './components/timer/FocusStats';
import { Calendar as CalendarView } from './components/calendar/Calendar';
// import { MascotWidget } from './components/mascot';
import { useTaskStore } from './stores/task-store';
import { useTimerStore } from './stores/timer-store';
import { useSettingsStore, type ThemeMode } from './stores/settings-store';
import { useEffect } from 'react';
import { cn } from './lib/utils';
import type { Task } from './stores/task-store';

type ViewType = 'today' | 'recent' | 'inbox' | 'calendar' | 'pomodoro' | 'stats' | 'search' | 'group' | 'list' | 'tag' | 'saved-filter';

interface SidebarGroup {
  id: string;
  name: string;
  icon: any;
  color: string;
  count: number;
  expanded?: boolean;
}

interface ActiveReminder {
  id: string;
  reminder: {
    id: string;
    taskId: string;
    triggerAt: string;
    type: 'due' | 'before_due' | 'custom';
    channel?: 'notification' | 'sound' | 'both';
  };
  task: Task;
}

function App() {
  const {
    tasks,
    lists,
    tags,
    savedFilters,
    fetchTasks,
    fetchLists,
    fetchTags,
    fetchSavedFilters,
    createList,
    deleteList,
    deleteSavedFilter,
    updateTask,
    setFocusedTask,
  } = useTaskStore();
  const { start } = useTimerStore();
  const {
    theme,
    defaultReminderOffsets,
    defaultReminderChannel,
    loadSettings,
    updateSettings,
  } = useSettingsStore();
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string>('inbox');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedSavedFilterId, setSelectedSavedFilterId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [listPendingDelete, setListPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [listDeleteError, setListDeleteError] = useState('');
  const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['today-tasks']));
  const [editingSidebarId, setEditingSidebarId] = useState<string | null>(null);
  const [sidebarLabels, setSidebarLabels] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('plans-sidebar-labels') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetchTasks();
    fetchLists();
    fetchTags();
    fetchSavedFilters();
    loadSettings();
  }, [fetchLists, fetchSavedFilters, fetchTags, fetchTasks, loadSettings]);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const shouldUseDark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', shouldUseDark);
    };

    applyTheme();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyTheme);

    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    if (!window.electron) return;

    const handleFocusTask = (taskId: string) => {
      setCurrentView('inbox');
      setSelectedGroup(null);
      setSelectedTaskId(taskId);
      setFocusedTask(taskId);
    };

    const handleReminderFire = (payload: { reminder: ActiveReminder['reminder']; task: Task }) => {
      setActiveReminders((current) => {
        if (current.some((item) => item.reminder.id === payload.reminder.id)) return current;
        return [
          ...current,
          {
            id: payload.reminder.id,
            reminder: payload.reminder,
            task: payload.task,
          },
        ].slice(-3);
      });
    };

    const handleQuickAddTask = () => {
      setCurrentView('inbox');
      setSelectedGroup(null);
      window.setTimeout(() => window.dispatchEvent(new Event('focus-quick-add')), 0);
    };

    const handleTrayStartPomodoro = () => {
      setCurrentView('pomodoro');
      start();
    };

    const handleNotificationSound = () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.18);
    };

    window.electron.on('focus-task', handleFocusTask);
    window.electron.on('reminder:fire', handleReminderFire);
    window.electron.on('quick-add-task', handleQuickAddTask);
    window.electron.on('tray-start-pomodoro', handleTrayStartPomodoro);
    window.electron.on('play-notification-sound', handleNotificationSound);

    return () => {
      window.electron.off('focus-task', handleFocusTask);
      window.electron.off('reminder:fire', handleReminderFire);
      window.electron.off('quick-add-task', handleQuickAddTask);
      window.electron.off('tray-start-pomodoro', handleTrayStartPomodoro);
      window.electron.off('play-notification-sound', handleNotificationSound);
    };
  }, [setFocusedTask, start]);

  const dismissReminder = (reminderId: string) => {
    setActiveReminders((current) => current.filter((item) => item.reminder.id !== reminderId));
  };

  const openReminderTask = (taskId: string, reminderId?: string) => {
    setCurrentView('inbox');
    setSelectedGroup(null);
    setSelectedTaskId(taskId);
    setFocusedTask(taskId);
    if (reminderId) dismissReminder(reminderId);
  };

  const completeReminderTask = async (reminder: ActiveReminder) => {
    await updateTask(reminder.task.id, { status: 'completed' });
    await fetchTasks();
    dismissReminder(reminder.reminder.id);
  };

  const snoozeReminder = async (reminder: ActiveReminder) => {
    const triggerAt = new Date(Date.now() + 10 * 60_000).toISOString();
    await window.electron.reminder.create(
      reminder.task.id,
      triggerAt,
      'custom',
      reminder.reminder.channel || 'notification'
    );
    await fetchTasks();
    dismissReminder(reminder.reminder.id);
  };

  // 计算任务数量
  const todayTasks = tasks.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.dueDate === today && t.status !== 'completed';
  });

  const recentTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const today = new Date();
    const taskDate = new Date(t.dueDate);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    return taskDate >= sevenDaysAgo && taskDate <= sevenDaysLater;
  });

  const inboxTasks = tasks; // 收集箱显示所有任务
  const activeLists = lists.filter((list) => !list.archivedAt);

  const pendingTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // 侧边栏分组
  const sidebarGroups: SidebarGroup[] = [
    { id: 'today', name: '今天', icon: Calendar, color: 'blue', count: todayTasks.length },
    { id: 'recent', name: '最近7天', icon: Clock, color: 'gray', count: recentTasks.length },
    { id: 'inbox', name: '收集箱', icon: Inbox, color: 'gray', count: inboxTasks.length },
  ];

  const todayTaskGroups = [
    { id: 'pending', name: '待处理', icon: '🔥', color: 'red', count: pendingTasks.length },
    { id: 'in-progress', name: '处理中', icon: '⚡', color: 'orange', count: inProgressTasks.length },
    { id: 'completed', name: '已完成', icon: '✅', color: 'green', count: completedTasks.length },
  ];

  const getSidebarLabel = (id: string, fallback: string) => sidebarLabels[id] || fallback;

  const updateSidebarLabel = (id: string, name: string) => {
    const normalized = name.trim();
    setEditingSidebarId(null);
    if (!normalized) return;

    const next = { ...sidebarLabels, [id]: normalized };
    setSidebarLabels(next);
    localStorage.setItem('plans-sidebar-labels', JSON.stringify(next));
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const cycleTheme = async () => {
    const nextTheme: Record<ThemeMode, ThemeMode> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };
    await updateSettings({ theme: nextTheme[theme] });
  };

  const defaultReminderValue = defaultReminderOffsets[0] ?? 15;

  const getFilteredTasks = () => {
    if (currentView === 'today') {
      return todayTasks;
    } else if (currentView === 'recent') {
      return recentTasks;
    } else if (currentView === 'inbox') {
      return inboxTasks;
    } else if (selectedGroup === 'pending') {
      return pendingTasks;
    } else if (selectedGroup === 'in-progress') {
      return inProgressTasks;
    } else if (selectedGroup === 'completed') {
      return completedTasks;
    } else if (currentView === 'list') {
      return tasks.filter((task) => (task.listId || 'inbox') === selectedListId);
    } else if (currentView === 'tag' && selectedTagId) {
      return tasks.filter((task) => task.tags?.some((tag) => tag.id === selectedTagId));
    } else if (currentView === 'saved-filter' && selectedSavedFilterId) {
      const savedFilter = savedFilters.find((filter) => filter.id === selectedSavedFilterId);
      const rules = parseFilterRules(savedFilter?.rules);
      return tasks.filter((task) => matchesFilterRules(task, rules));
    }
    return tasks;
  };

  const filteredTasks = getFilteredTasks();
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || filteredTasks[0] || null;
  const selectedList = activeLists.find((list) => list.id === selectedListId);
  const selectedTag = tags.find((tag) => tag.id === selectedTagId);
  const selectedSavedFilter = savedFilters.find((filter) => filter.id === selectedSavedFilterId);
  const taskListTitle =
    currentView === 'search'
      ? '搜索任务'
      : currentView === 'list'
        ? selectedList?.name || '清单'
        : currentView === 'tag'
          ? `#${selectedTag?.name || '标签'}`
          : currentView === 'saved-filter'
            ? selectedSavedFilter?.name || '智能清单'
          : currentView === 'recent'
            ? '最近7天'
            : currentView === 'inbox'
              ? '收集箱'
              : '今天';
  const getFloatingMode = () => {
    if (currentView === 'calendar') return 'week';
    if (currentView === 'pomodoro') return 'pomodoro';
    return 'day';
  };

  useEffect(() => {
    if (currentView === 'calendar' || currentView === 'pomodoro') return;

    if (filteredTasks.length === 0) {
      if (selectedTaskId) setSelectedTaskId(null);
      return;
    }

    if (!selectedTaskId || !filteredTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(filteredTasks[0].id);
    }
  }, [currentView, filteredTasks, selectedTaskId]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      {/* 自定义标题栏 - 可拖拽 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 40,
          WebkitAppRegion: 'drag',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 8,
          background: 'transparent',
        } as React.CSSProperties}
      >
        {/* 窗口控制按钮 */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          <button
            onClick={() => window.electron?.window?.minimize()}
            className="w-8 h-8 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 flex items-center justify-center transition-colors"
            title="最小化"
          >
            <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => window.electron?.window?.maximize()}
            className="w-8 h-8 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 flex items-center justify-center transition-colors"
            title="最大化"
          >
            <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => window.electron?.window?.close()}
            className="w-8 h-8 rounded-lg hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* 最左侧图标栏 */}
      <div className="w-16 gradient-primary shadow-lg flex flex-col items-center py-4 space-y-4">
        <button
          onClick={() => setCurrentView('today')}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all hover-lift',
            !['calendar', 'pomodoro', 'stats', 'search'].includes(currentView)
              ? 'bg-white/30 text-white shadow-lg backdrop-blur-sm'
              : 'text-white/50 hover:bg-white/20 hover:text-white/80'
          )}
          title="任务"
        >
          <CheckSquare className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCurrentView('calendar')}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all hover-lift',
            currentView === 'calendar'
              ? 'bg-white/30 text-white shadow-lg backdrop-blur-sm'
              : 'text-white/50 hover:bg-white/20 hover:text-white/80'
          )}
          title="日历"
        >
          <Grid className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCurrentView('pomodoro')}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all hover-lift',
            currentView === 'pomodoro'
              ? 'bg-white/30 text-white shadow-lg backdrop-blur-sm'
              : 'text-white/50 hover:bg-white/20 hover:text-white/80'
          )}
          title="番茄钟"
        >
          <Clock className="w-5 h-5" />
        </button>

      </div>

      {/* 左侧边栏 */}
      {currentView !== 'calendar' && currentView !== 'pomodoro' && currentView !== 'stats' && (
        <div className="w-80 glass-effect shadow-xl border-r border-white/20 dark:border-gray-700/50 flex flex-col">
          <>
          {/* 顶部 */}
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-blue-500" />
              Plans App
            </h1>
          </div>

        {/* 侧边栏内容 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 快速访问 */}
          <div className="space-y-1">
            {sidebarGroups.map(group => (
              <button
                key={group.id}
                onClick={() => {
                  setCurrentView(group.id as ViewType);
                  setSelectedGroup(null);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all hover-lift',
                  currentView === group.id && !selectedGroup
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <group.icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  {editingSidebarId === group.id ? (
                    <input
                      autoFocus
                      defaultValue={getSidebarLabel(group.id, group.name)}
                      onClick={(event) => event.stopPropagation()}
                      onBlur={(event) => updateSidebarLabel(group.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') updateSidebarLabel(group.id, event.currentTarget.value);
                        if (event.key === 'Escape') setEditingSidebarId(null);
                      }}
                      className="w-28 rounded border border-blue-300 bg-white px-2 py-1 text-sm text-gray-900 dark:bg-gray-900 dark:text-white"
                    />
                  ) : (
                    <span
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        setEditingSidebarId(group.id);
                      }}
                      className="font-medium"
                    >
                      {getSidebarLabel(group.id, group.name)}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium px-2 py-1 rounded-lg bg-white/20 dark:bg-gray-800/50">
                  {group.count}
                </span>
              </button>
            ))}
          </div>

          {/* 今日任务分组 */}
          <div>
            <button
              onClick={() => toggleGroup('today-tasks')}
              className="w-full flex items-center justify-between px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-xl transition-all"
            >
              <div className="flex items-center gap-2">
                {expandedGroups.has('today-tasks') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                {editingSidebarId === 'today-tasks' ? (
                  <input
                    autoFocus
                    defaultValue={getSidebarLabel('today-tasks', '今日任务')}
                    onClick={(event) => event.stopPropagation()}
                    onBlur={(event) => updateSidebarLabel('today-tasks', event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') updateSidebarLabel('today-tasks', event.currentTarget.value);
                      if (event.key === 'Escape') setEditingSidebarId(null);
                    }}
                    className="w-28 rounded border border-blue-300 bg-white px-2 py-1 text-sm text-gray-900 dark:bg-gray-900 dark:text-white"
                  />
                ) : (
                  <span
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      setEditingSidebarId('today-tasks');
                    }}
                    className="text-sm font-medium"
                  >
                    💪 {getSidebarLabel('today-tasks', '今日任务')}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">{todayTasks.length}</span>
            </button>

            {expandedGroups.has('today-tasks') && (
              <div className="ml-6 mt-1 space-y-1">
                {todayTaskGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setCurrentView('group');
                      setSelectedGroup(group.id);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all text-sm hover-lift',
                      selectedGroup === group.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                        : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{group.icon}</span>
                      {editingSidebarId === group.id ? (
                        <input
                          autoFocus
                          defaultValue={getSidebarLabel(group.id, group.name)}
                          onClick={(event) => event.stopPropagation()}
                          onBlur={(event) => updateSidebarLabel(group.id, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') updateSidebarLabel(group.id, event.currentTarget.value);
                            if (event.key === 'Escape') setEditingSidebarId(null);
                          }}
                          className="w-24 rounded border border-blue-300 bg-white px-2 py-1 text-sm text-gray-900 dark:bg-gray-900 dark:text-white"
                        />
                      ) : (
                        <span
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            setEditingSidebarId(group.id);
                          }}
                        >
                          {getSidebarLabel(group.id, group.name)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {group.count > 0 && (
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            group.color === 'red' && 'bg-red-500',
                            group.color === 'orange' && 'bg-orange-500',
                            group.color === 'green' && 'bg-green-500'
                          )}
                        />
                      )}
                      <span className="text-gray-500">{group.count}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <span>清单</span>
            </div>
            <div className="space-y-1">
              {activeLists.map((list) => {
                const count = tasks.filter((task) => (task.listId || 'inbox') === list.id && task.status !== 'completed').length;
                return (
                  <div
                    key={list.id}
                    className={cn(
                      'group flex items-center gap-1 rounded-xl transition-all text-sm hover-lift',
                      currentView === 'list' && selectedListId === list.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                        : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <button
                      onClick={() => {
                      setCurrentView('list');
                      setSelectedListId(list.id);
                      setSelectedTagId(null);
                      setSelectedSavedFilterId(null);
                      setSelectedGroup(null);
                      }}
                      className="flex min-w-0 flex-1 items-center justify-between px-4 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: list.color || '#3B82F6' }} />
                        <span className="truncate">{list.name}</span>
                      </span>
                      <span className="text-xs text-gray-500">{count}</span>
                    </button>
                    {list.id !== 'inbox' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setListDeleteError('');
                          setListPendingDelete({ id: list.id, name: list.name });
                        }}
                        className={cn(
                          'mr-2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100',
                          currentView === 'list' && selectedListId === list.id
                            ? 'text-white/80 hover:bg-white/20'
                            : 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30'
                        )}
                        title="删除清单"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <form
              className="flex gap-2 px-1"
              onSubmit={async (event) => {
                event.preventDefault();
                const normalizedName = newListName.trim();
                if (!normalizedName) return;

                const list = await createList({ name: normalizedName });
                if (list) {
                  setNewListName('');
                  setCurrentView('list');
                  setSelectedListId(list.id);
                }
              }}
            >
              <input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="新清单"
                className="min-w-0 flex-1 rounded-lg border border-gray-200/60 bg-white/60 px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-lg border border-gray-200/60 px-2 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                title="创建清单"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>

          {tags.length > 0 && (
            <div className="space-y-2">
              <div className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                标签
              </div>
              <div className="flex flex-wrap gap-2 px-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setCurrentView('tag');
                      setSelectedTagId(tag.id);
                      setSelectedSavedFilterId(null);
                      setSelectedGroup(null);
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs transition-colors',
                      currentView === 'tag' && selectedTagId === tag.id
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/50'
                        : 'border-gray-200/70 text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
                    )}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {savedFilters.length > 0 && (
            <div className="space-y-2">
              <div className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                智能清单
              </div>
              <div className="space-y-1">
                {savedFilters.map((filter) => {
                  const rules = parseFilterRules(filter.rules);
                  const count = tasks.filter((task) => matchesFilterRules(task, rules)).length;
                  return (
                    <div
                      key={filter.id}
                      className={cn(
                        'group flex items-center gap-1 rounded-xl transition-all text-sm hover-lift',
                        currentView === 'saved-filter' && selectedSavedFilterId === filter.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                          : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <button
                        onClick={() => {
                          setCurrentView('saved-filter');
                          setSelectedSavedFilterId(filter.id);
                          setSelectedGroup(null);
                        }}
                        className="flex min-w-0 flex-1 items-center justify-between px-4 py-2.5"
                      >
                        <span className="truncate">🔎 {filter.name}</span>
                        <span className="text-xs text-gray-500">{count}</span>
                      </button>
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.stopPropagation();
                          await deleteSavedFilter(filter.id);
                          if (selectedSavedFilterId === filter.id) {
                            setSelectedSavedFilterId(null);
                            setCurrentView('today');
                          }
                        }}
                        className={cn(
                          'mr-2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100',
                          currentView === 'saved-filter' && selectedSavedFilterId === filter.id
                            ? 'text-white/80 hover:bg-white/20'
                            : 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30'
                        )}
                        title="删除智能清单"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* 底部工具 */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              <span className="mb-1 block">默认提醒</span>
              <select
                value={String(defaultReminderValue)}
                onChange={(event) => updateSettings({ defaultReminderOffsets: [Number(event.target.value)] })}
                className="w-full rounded-lg border border-gray-300/50 bg-white/70 px-2 py-2 text-xs text-gray-700 outline-none dark:border-gray-600/50 dark:bg-gray-900/60 dark:text-gray-200"
              >
                <option value="0">准时</option>
                <option value="5">提前 5 分钟</option>
                <option value="15">提前 15 分钟</option>
                <option value="30">提前 30 分钟</option>
                <option value="1440">提前 1 天</option>
              </select>
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              <span className="mb-1 block">提醒方式</span>
              <select
                value={defaultReminderChannel}
                onChange={(event) =>
                  updateSettings({ defaultReminderChannel: event.target.value as 'notification' | 'sound' | 'both' })
                }
                className="w-full rounded-lg border border-gray-300/50 bg-white/70 px-2 py-2 text-xs text-gray-700 outline-none dark:border-gray-600/50 dark:bg-gray-900/60 dark:text-gray-200"
              >
                <option value="notification">通知</option>
                <option value="sound">声音</option>
                <option value="both">通知 + 声音</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={cycleTheme}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all hover-lift"
            >
              主题: {theme === 'light' ? '☀️ 浅色' : theme === 'dark' ? '🌙 深色' : '🔄 系统'}
            </button>
            <button
              onClick={() => window.electron.backup.export()}
              className="px-3 py-2 text-xs rounded-xl border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all hover-lift"
            >
              📤 导出
            </button>
            <button
              onClick={async () => {
                const result = await window.electron.backup.import();
                if (!result.cancelled) {
                  await fetchTasks();
                }
              }}
              className="px-3 py-2 text-xs rounded-xl border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all hover-lift"
            >
              📥 导入
            </button>
          </div>
          <button
            onClick={() => setCurrentView('pomodoro')}
            className="w-full px-4 py-3 text-sm rounded-xl gradient-primary text-white hover:shadow-lg transition-all hover-lift font-medium"
          >
            🍅 打开番茄钟
          </button>
        </div>
        </>
      </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'calendar' ? (
          /* 日历视图 */
          <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-white/50 to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/50">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
                <CheckSquare className="w-8 h-8 text-blue-500" />
                Plans App - 日历
              </h1>
              <button
                onClick={() => setCurrentView('today')}
                className="px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all"
              >
                返回任务
              </button>
            </div>
            <CalendarView tasks={tasks} />
          </div>
        ) : currentView === 'pomodoro' ? (
          /* 番茄钟视图 */
          <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-white/50 to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/50">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                  🍅 番茄钟
                </h2>
                <button
                  onClick={() => setCurrentView('today')}
                  className="px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all"
                >
                  返回任务
                </button>
              </div>
              <PomodoroTimer />
            </div>
          </div>
        ) : currentView === 'stats' ? (
          <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-white/50 to-gray-50/50 dark:from-gray-800/50 dark:to-gray-900/50">
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  专注统计
                </h2>
                <button
                  onClick={() => setCurrentView('today')}
                  className="px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all"
                >
                  返回任务
                </button>
              </div>
              <div className="glass-effect rounded-3xl border border-white/30 p-8 shadow-2xl dark:border-gray-700/50">
                <FocusStats />
              </div>
            </div>
          </div>
        ) : (
          /* 任务视图 */
          <div className="flex flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {/* 顶部标题栏 */}
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 glass-effect">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="flex items-center gap-3 text-3xl font-bold">
                      {currentView === 'today' && (
                        <>
                          <Calendar className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                          <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            今天
                          </span>
                        </>
                      )}
                      {currentView === 'recent' && (
                        <>
                          <Clock className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                          <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            最近7天
                          </span>
                        </>
                      )}
                      {currentView === 'inbox' && (
                        <>
                          <Inbox className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                          <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            收集箱
                          </span>
                        </>
                      )}
                      {currentView === 'search' && '🔍 搜索'}
                      {currentView === 'list' && `📁 ${selectedList?.name || '清单'}`}
                      {currentView === 'tag' && `# ${selectedTag?.name || '标签'}`}
                      {currentView === 'saved-filter' && `🔎 ${selectedSavedFilter?.name || '智能清单'}`}
                      {selectedGroup === 'pending' && '🔥 待处理'}
                      {selectedGroup === 'in-progress' && '⚡ 处理中'}
                      {selectedGroup === 'completed' && '✅ 已完成'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                      共 {filteredTasks.length} 个任务
                    </p>
                  </div>
                  {currentView === 'list' && selectedList && selectedList.id !== 'inbox' && (
                    <button
                      type="button"
                      onClick={() => {
                        setListDeleteError('');
                        setListPendingDelete({ id: selectedList.id, name: selectedList.name });
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除清单
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.electron.floating.open(getFloatingMode())}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                  >
                    <Maximize2 className="h-4 w-4" />
                    浮窗
                  </button>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-white/30 to-gray-50/30 dark:from-gray-800/30 dark:to-gray-900/30">
                <TaskList
                  key={`${currentView}:${selectedListId}:${selectedTagId || ''}`}
                  title={taskListTitle}
                  autoFocusSearch={currentView === 'search'}
                  visibleTasks={filteredTasks}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                  quickAddDefaultToNow={currentView === 'today' && !selectedGroup}
                  quickAddDefaultListId={currentView === 'list' ? selectedListId : 'inbox'}
                />
              </div>
            </div>
            <TaskDetailPanel task={selectedTask} />
          </div>
        )}
      </div>

      {/* 吉祥物功能已注释 */}
      {/* <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <MascotWidget size={150} mode="simple" />
      </div> */}

      {activeReminders.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[10001] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
          {activeReminders.map((reminder) => (
            <div
              key={reminder.id}
              className="overflow-hidden rounded-2xl border border-blue-200/70 bg-white/95 shadow-2xl shadow-slate-900/15 backdrop-blur-xl dark:border-blue-900/50 dark:bg-slate-900/95"
            >
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        任务提醒
                      </p>
                      <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">
                        {reminder.task.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissReminder(reminder.reminder.id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="关闭"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openReminderTask(reminder.task.id, reminder.reminder.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      打开
                    </button>
                    <button
                      type="button"
                      onClick={() => snoozeReminder(reminder)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                    >
                      <TimerReset className="h-3.5 w-3.5" />
                      稍后 10 分钟
                    </button>
                    <button
                      type="button"
                      onClick={() => completeReminderTask(reminder)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      完成
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {listPendingDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/40 bg-white/90 shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/90">
            <div className="relative p-6">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-red-400/20 blur-2xl" />
              <div className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />

              <div className="relative flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 shadow-sm dark:bg-red-950/40 dark:text-red-300">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    删除清单
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    确定删除「{listPendingDelete.name}」吗？这个清单内的任务不会丢失，会自动移动到收集箱。
                  </p>
                  {listDeleteError && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                      {listDeleteError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200/70 bg-slate-50/70 px-6 py-4 dark:border-slate-700/70 dark:bg-slate-800/50">
              <button
                type="button"
                onClick={() => setListPendingDelete(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = listPendingDelete;
                  if (!target) return;

                  const deleted = await deleteList(target.id);
                  if (!deleted) {
                    setListDeleteError('删除失败。请重启应用后再试，如果仍失败说明主进程还没有加载最新 IPC。');
                    return;
                  }

                  await fetchLists();
                  await fetchTasks();

                  if (selectedListId === target.id) {
                    setSelectedListId('inbox');
                    setCurrentView('inbox');
                  }
                  setListPendingDelete(null);
                  setListDeleteError('');
                }}
                className="rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-transform hover:-translate-y-0.5 hover:shadow-red-500/30"
              >
                删除并移动任务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseFilterRules(value?: string | null) {
  if (!value) return {};

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function matchesFilterRules(task: Task, rules: Record<string, any>) {
  if (rules.status && task.status !== rules.status) return false;
  if (rules.priority && task.priority !== rules.priority) return false;
  if (rules.dueDate && task.dueDate !== rules.dueDate) return false;
  if (rules.dueStart && (!task.dueDate || task.dueDate < rules.dueStart)) return false;
  if (rules.dueEnd && (!task.dueDate || task.dueDate > rules.dueEnd)) return false;
  if (rules.listId && (task.listId || 'inbox') !== rules.listId) return false;
  if (rules.tagId && !task.tags?.some((tag) => tag.id === rules.tagId)) return false;
  if (rules.hasReminder && !task.hasReminder) return false;
  if (rules.isRecurring && !task.recurrenceRule) return false;

  if (rules.searchQuery) {
    const query = String(rules.searchQuery).toLowerCase();
    const haystack = [
      task.title,
      task.description,
      task.notes,
      ...(task.tags || []).map((tag) => tag.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(query)) return false;
  }

  return true;
}

export default App;
