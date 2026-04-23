import { useEffect, useState } from 'react';
import { useTimerStore } from '@/stores/timer-store';
import { useSettingsStore } from '@/stores/settings-store';
import { Play, Pause, RotateCcw, SkipForward, Timer, Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';
import { FocusStats } from './FocusStats';

export function PomodoroTimer() {
  const {
    isRunning,
    isPaused,
    sessionType,
    remainingTime,
    totalTime,
    completedPomodoros,
    start,
    pause,
    resume,
    reset,
    skip,
    fetchStatus,
  } = useTimerStore();
  const {
    workDuration: savedWorkDuration,
    shortBreakDuration: savedShortBreakDuration,
    longBreakDuration: savedLongBreakDuration,
    loadSettings,
    updateSettings,
  } = useSettingsStore();

  const [showSettings, setShowSettings] = useState(false);
  const [lockMode, setLockMode] = useState(false);
  const [workDuration, setWorkDuration] = useState(savedWorkDuration / 60);
  const [shortBreakDuration, setShortBreakDuration] = useState(savedShortBreakDuration / 60);
  const [longBreakDuration, setLongBreakDuration] = useState(savedLongBreakDuration / 60);

  useEffect(() => {
    fetchStatus();
    loadSettings();
  }, [fetchStatus, loadSettings]);

  useEffect(() => {
    setWorkDuration(Math.round(savedWorkDuration / 60));
    setShortBreakDuration(Math.round(savedShortBreakDuration / 60));
    setLongBreakDuration(Math.round(savedLongBreakDuration / 60));
  }, [savedWorkDuration, savedShortBreakDuration, savedLongBreakDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((totalTime - remainingTime) / totalTime) * 100;

  const sessionLabels = {
    work: '工作时间',
    short_break: '短休息',
    long_break: '长休息',
  };

  const sessionColors = {
    work: 'text-red-500 border-red-500',
    short_break: 'text-green-500 border-green-500',
    long_break: 'text-blue-500 border-blue-500',
  };

  return (
    <div className="glass-card p-8 rounded-lg backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/30 shadow-xl">
      {/* 设置按钮 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="设置"
        >
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {showSettings ? (
        /* 设置面板 */
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            番茄钟设置
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                工作时长（分钟）
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={workDuration}
                onChange={(e) => setWorkDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                短休息时长（分钟）
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                长休息时长（分钟）
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  await updateSettings({
                    workDuration: Math.max(1, workDuration) * 60,
                    shortBreakDuration: Math.max(1, shortBreakDuration) * 60,
                    longBreakDuration: Math.max(1, longBreakDuration) * 60,
                  });
                  await fetchStatus();
                  setShowSettings(false);
                }}
                className="flex-1"
              >
                保存设置
              </Button>
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* 番茄钟主界面 */
        <>
          {/* 会话类型 */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Timer className={cn('w-5 h-5', sessionColors[sessionType])} />
            <h3 className={cn('text-lg font-semibold', sessionColors[sessionType])}>
              {sessionLabels[sessionType]}
            </h3>
          </div>

          {/* 倒计时显示 */}
          <div className="relative mb-8">
            <div className="text-center">
              <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                {formatTime(remainingTime)}
              </div>
              <div className="text-sm text-gray-500">
                已完成 {completedPomodoros} 个番茄钟
              </div>
            </div>

            {/* 进度环 */}
            <svg className="absolute inset-0 w-full h-full -z-10" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={cn(sessionColors[sessionType])}
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                transform="rotate(-90 100 100)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-3">
            {!isRunning || isPaused ? (
              <Button
                onClick={() => (isPaused ? resume() : start())}
                size="lg"
                className="w-32"
              >
                <Play className="w-5 h-5 mr-2" />
                {isPaused ? '继续' : '开始'}
              </Button>
            ) : (
              <Button onClick={pause} size="lg" className="w-32">
                <Pause className="w-5 h-5 mr-2" />
                暂停
              </Button>
            )}

            <Button onClick={reset} variant="outline" size="lg">
              <RotateCcw className="w-5 h-5" />
            </Button>

            <Button onClick={skip} variant="outline" size="lg">
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              id="lock-mode"
              type="checkbox"
              checked={lockMode}
              onChange={(e) => setLockMode(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="lock-mode">锁屏专注模式</label>
          </div>

          <FocusStats />

          {lockMode && isRunning && !isPaused && (
            <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gray-950 text-white">
              <div className="text-sm text-gray-400 mb-3">{sessionLabels[sessionType]}</div>
              <div className="text-7xl font-bold mb-6">{formatTime(remainingTime)}</div>
              <div className="flex gap-3">
                <Button onClick={pause} size="lg">
                  <Pause className="w-5 h-5 mr-2" />
                  暂停
                </Button>
                <Button onClick={() => setLockMode(false)} variant="outline" size="lg">
                  退出锁屏
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
