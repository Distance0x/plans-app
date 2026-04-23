import { useState } from 'react';
import {
  CheckSquare,
  Calendar,
  Inbox,
  Clock,
  Briefcase,
  Home,
  Heart,
  ChevronRight,
  ChevronDown,
  Plus,
  Grid,
  Target,
  Search
} from 'lucide-react';
import { TaskList } from './components/tasks/TaskList';
import { PomodoroTimer } from './components/timer/PomodoroTimer';
import { Calendar as CalendarView } from './components/calendar/Calendar';
import { useTaskStore } from './stores/task-store';
import { useEffect } from 'react';
import { cn } from './lib/utils';

type ViewType = 'today' | 'recent' | 'inbox' | 'calendar' | 'pomodoro' | 'group';

interface SidebarGroup {
  id: string;
  name: string;
  icon: any;
  color: string;
  count: number;
  expanded?: boolean;
}

function App() {
  const { tasks, fetchTasks } = useTaskStore();
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['today-tasks']));

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 计算任务数量
  const todayTasks = tasks.filter(t => {
    const today = new Date().toISOString().split('T')[0];
    return t.dueDate === today;
  });

  const recentTasks = tasks.filter(t => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    return t.dueDate && new Date(t.dueDate) >= sevenDaysAgo;
  });

  const pendingTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // 侧边栏分组
  const sidebarGroups: SidebarGroup[] = [
    { id: 'today', name: '今天', icon: Calendar, color: 'blue', count: todayTasks.length },
    { id: 'recent', name: '最近7天', icon: Clock, color: 'gray', count: recentTasks.length },
    { id: 'inbox', name: '收集箱', icon: Inbox, color: 'gray', count: tasks.length },
  ];

  const todayTaskGroups = [
    { id: 'pending', name: '待处理', icon: '🔥', color: 'red', count: pendingTasks.length },
    { id: 'in-progress', name: '处理中', icon: '⚡', color: 'orange', count: inProgressTasks.length },
    { id: 'completed', name: '已完成', icon: '✅', color: 'green', count: completedTasks.length },
  ];

  const projectGroups = [
    { id: 'work', name: '学习工作', icon: '🎓', color: 'gray', count: 9 },
    { id: 'life', name: '生活', icon: '🏠', color: 'gray', count: 0 },
    { id: 'fun', name: '娱乐', icon: '❤️', color: 'green', count: 5 },
  ];

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getFilteredTasks = () => {
    if (currentView === 'today') {
      return todayTasks;
    } else if (currentView === 'recent') {
      return recentTasks;
    } else if (selectedGroup === 'pending') {
      return pendingTasks;
    } else if (selectedGroup === 'in-progress') {
      return inProgressTasks;
    } else if (selectedGroup === 'completed') {
      return completedTasks;
    }
    return tasks;
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 最左侧图标栏 */}
      <div className="w-16 bg-blue-600 flex flex-col items-center py-4 space-y-4">
        <button
          onClick={() => setCurrentView('today')}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
            currentView !== 'calendar' ? 'bg-blue-500 text-white' : 'text-blue-200 hover:bg-blue-500'
          )}
          title="任务"
        >
          <CheckSquare className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCurrentView('calendar')}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
            currentView === 'calendar' ? 'bg-blue-500 text-white' : 'text-blue-200 hover:bg-blue-500'
          )}
          title="日历"
        >
          <Grid className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCurrentView('pomodoro')}
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
            currentView === 'pomodoro' ? 'bg-blue-500 text-white' : 'text-blue-200 hover:bg-blue-500'
          )}
          title="番茄钟"
        >
          <Clock className="w-5 h-5" />
        </button>

        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-blue-200 hover:bg-blue-500 transition-all"
          title="统计"
        >
          <Grid className="w-5 h-5" />
        </button>

        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-blue-200 hover:bg-blue-500 transition-all"
          title="目标"
        >
          <Target className="w-5 h-5" />
        </button>

        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-blue-200 hover:bg-blue-500 transition-all"
          title="搜索"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* 左侧边栏 */}
      <div className="w-80 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 flex flex-col">{currentView !== 'calendar' && currentView !== 'pomodoro' && (
        <>
        {/* 顶部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all',
                  currentView === group.id && !selectedGroup
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <group.icon className="w-5 h-5" />
                  <span className="font-medium">{group.name}</span>
                </div>
                <span className="text-sm text-gray-500">{group.count}</span>
              </button>
            ))}
          </div>

          {/* 今日任务分组 */}
          <div>
            <button
              onClick={() => toggleGroup('today-tasks')}
              className="w-full flex items-center justify-between px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {expandedGroups.has('today-tasks') ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">💪 今日任务</span>
              </div>
              <span className="text-sm text-gray-500">1</span>
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
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm',
                      selectedGroup === group.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{group.icon}</span>
                      <span>{group.name}</span>
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

          {/* 项目分组 */}
          <div className="space-y-1">
            {projectGroups.map(group => (
              <button
                key={group.id}
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4" />
                  <span>{group.icon}</span>
                  <span className="text-sm font-medium">{group.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {group.count > 0 && group.color === 'green' && (
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                  <span className="text-sm text-gray-500">{group.count}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 底部番茄钟 */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 mb-2">番茄钟</div>
          <PomodoroTimer />
        </div>
        </>
      )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'calendar' ? (
          /* 日历视图 */
          <div className="flex-1 overflow-y-auto p-6">
            <CalendarView tasks={tasks} />
          </div>
        ) : currentView === 'pomodoro' ? (
          /* 番茄钟视图 */
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                番茄钟
              </h2>
              <PomodoroTimer />
            </div>
          </div>
        ) : (
          /* 任务视图 */
          <>
            {/* 顶部标题栏 */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentView === 'today' && '今天'}
                    {currentView === 'recent' && '最近7天'}
                    {currentView === 'inbox' && '收集箱'}
                    {selectedGroup === 'pending' && '待处理'}
                    {selectedGroup === 'in-progress' && '处理中'}
                    {selectedGroup === 'completed' && '已完成'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {getFilteredTasks().length} 个任务
                  </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  <Plus className="w-4 h-4" />
                  添加任务
                </button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              <TaskList />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
