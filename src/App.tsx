import { useState } from 'react';
import {
  CheckSquare,
  Calendar,
  Inbox,
  Clock,
  ChevronRight,
  ChevronDown,
  Plus,
  Grid,
  Target,
  Search
} from 'lucide-react';
import { TaskList } from './components/tasks/TaskList';
import { TaskDetailPanel } from './components/tasks/TaskDetailPanel';
import { PomodoroTimer } from './components/timer/PomodoroTimer';
import { Calendar as CalendarView } from './components/calendar/Calendar';
import { useTaskStore } from './stores/task-store';
import { useTimerStore } from './stores/timer-store';
import { useSettingsStore, type ThemeMode } from './stores/settings-store';
import { useEffect } from 'react';
import { cn } from './lib/utils';

type ViewType = 'today' | 'recent' | 'inbox' | 'calendar' | 'pomodoro' | 'search' | 'group';

interface SidebarGroup {
  id: string;
  name: string;
  icon: any;
  color: string;
  count: number;
  expanded?: boolean;
}

function App() {
  const { tasks, fetchTasks, setFocusedTask } = useTaskStore();
  const { start } = useTimerStore();
  const { theme, loadSettings, updateSettings } = useSettingsStore();
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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
    loadSettings();
  }, [fetchTasks, loadSettings]);

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
      setFocusedTask(taskId);
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
    window.electron.on('quick-add-task', handleQuickAddTask);
    window.electron.on('tray-start-pomodoro', handleTrayStartPomodoro);
    window.electron.on('play-notification-sound', handleNotificationSound);

    return () => {
      window.electron.off('focus-task', handleFocusTask);
      window.electron.off('quick-add-task', handleQuickAddTask);
      window.electron.off('tray-start-pomodoro', handleTrayStartPomodoro);
      window.electron.off('play-notification-sound', handleNotificationSound);
    };
  }, [setFocusedTask, start]);

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
    }
    return tasks;
  };

  const filteredTasks = getFilteredTasks();
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || filteredTasks[0] || null;

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
      {/* 最左侧图标栏 */}
      <div className="w-16 gradient-primary shadow-lg flex flex-col items-center py-4 space-y-4">
        <button
          onClick={() => setCurrentView('today')}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all hover-lift',
            !['calendar', 'pomodoro', 'search'].includes(currentView)
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

        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:bg-white/20 hover:text-white/80 transition-all hover-lift"
          title="统计"
        >
          <Grid className="w-5 h-5" />
        </button>

        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white/50 hover:bg-white/20 hover:text-white/80 transition-all hover-lift"
          title="目标"
        >
          <Target className="w-5 h-5" />
        </button>

        <button
          onClick={() => {
            setCurrentView('search');
            setSelectedGroup(null);
          }}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all hover-lift',
            currentView === 'search'
              ? 'bg-white/30 text-white shadow-lg backdrop-blur-sm'
              : 'text-white/50 hover:bg-white/20 hover:text-white/80'
          )}
          title="搜索"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* 左侧边栏 */}
      {currentView !== 'calendar' && currentView !== 'pomodoro' && (
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

        </div>

        {/* 底部工具 */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30">
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
        ) : (
          /* 任务视图 */
          <div className="flex flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {/* 顶部标题栏 */}
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 glass-effect">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      {currentView === 'today' && '📅 今天'}
                      {currentView === 'recent' && '🕐 最近7天'}
                      {currentView === 'inbox' && '📥 收集箱'}
                      {currentView === 'search' && '🔍 搜索'}
                      {selectedGroup === 'pending' && '🔥 待处理'}
                      {selectedGroup === 'in-progress' && '⚡ 处理中'}
                      {selectedGroup === 'completed' && '✅ 已完成'}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                      共 {filteredTasks.length} 个任务
                    </p>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new Event('focus-quick-add'))}
                    className="flex items-center gap-2 px-5 py-3 gradient-primary text-white rounded-xl hover:shadow-xl transition-all hover-lift font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    添加任务
                  </button>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-white/30 to-gray-50/30 dark:from-gray-800/30 dark:to-gray-900/30">
                <TaskList
                  key={currentView}
                  title={currentView === 'search' ? '搜索任务' : '今日任务'}
                  autoFocusSearch={currentView === 'search'}
                  visibleTasks={filteredTasks}
                  selectedTaskId={selectedTaskId}
                  onSelectTask={setSelectedTaskId}
                />
              </div>
            </div>
            <TaskDetailPanel task={selectedTask} />
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
