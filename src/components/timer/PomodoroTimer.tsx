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
    work: '🍅 工作时间',
    short_break: '☕ 短休息',
    long_break: '🌴 长休息',
  };

  const sessionColors = {
    work: 'text-red-500 border-red-500',
    short_break: 'text-green-500 border-green-500',
    long_break: 'text-blue-500 border-blue-500',
  };

  const sessionGradients = {
    work: 'from-red-500 to-orange-500',
    short_break: 'from-green-500 to-emerald-500',
    long_break: 'from-blue-500 to-cyan-500',
  };

  return (
    <div className="glass-effect p-10 rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/50 hover-lift">
      {/* 设置按钮 */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-all hover-lift"
          title="设置"
        >
          <Settings className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {showSettings ? (
        /* 设置面板 */
        <div className="space-y-6 animate-fade-in">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            ⚙️ 番茄钟设置
          </h3>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                🍅 工作时长（分钟）
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={workDuration}
                onChange={(e) => setWorkDuration(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                ☕ 短休息时长（分钟）
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                🌴 长休息时长（分钟）
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
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
                className="flex-1 gradient-primary hover:shadow-xl"
              >
                💾 保存设置
              </Button>
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                className="flex-1"
              >
                ❌ 取消
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* 番茄钟主界面 */
        <>
          {/* 倒计时显示 */}
          <div className="relative mb-8 flex flex-col items-center justify-center">
            {/* 会话类型 - 移到进度环外面 */}
            <div className="flex items-center justify-center gap-3 mb-6 z-20">
              <div className={cn('p-3 rounded-2xl bg-gradient-to-br shadow-lg', sessionGradients[sessionType])}>
                <Timer className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {sessionLabels[sessionType]}
              </h3>
            </div>

            {/* 进度环和时间 */}
            <div className="relative flex items-center justify-center">
              <div className="text-center z-10">
                <div className="text-7xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3 tracking-tight">
                  {formatTime(remainingTime)}
                </div>
                <div className="text-base text-gray-600 dark:text-gray-400 font-medium">
                  已完成 <span className="text-red-500 font-bold">{completedPomodoros}</span> 个番茄钟 🍅
                </div>
              </div>

              {/* 进度环 */}
              <svg className="absolute w-[280px] h-[280px] -z-10" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={cn(sessionColors[sessionType])}
                  strokeDasharray={`${2 * Math.PI * 85}`}
                  strokeDashoffset={`${2 * Math.PI * 85 * (1 - progress / 100)}`}
                  transform="rotate(-90 100 100)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-4">
            {!isRunning || isPaused ? (
              <Button
                onClick={() => (isPaused ? resume() : start())}
                size="lg"
                className="w-40 gradient-primary hover:shadow-2xl text-lg font-semibold"
              >
                <Play className="w-6 h-6 mr-2" />
                {isPaused ? '继续' : '开始'}
              </Button>
            ) : (
              <Button onClick={pause} size="lg" className="w-40 gradient-warning hover:shadow-2xl text-lg font-semibold">
                <Pause className="w-6 h-6 mr-2" />
                暂停
              </Button>
            )}

            <Button onClick={reset} variant="outline" size="lg" className="hover-lift">
              <RotateCcw className="w-6 h-6" />
            </Button>

            <Button onClick={skip} variant="outline" size="lg" className="hover-lift">
              <SkipForward className="w-6 h-6" />
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
              <input
                id="lock-mode"
                type="checkbox"
                checked={lockMode}
                onChange={(e) => setLockMode(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-gray-700 dark:text-gray-300">🔒 锁屏专注模式</span>
            </label>
          </div>

          <FocusStats />

          {lockMode && isRunning && !isPaused && (
            <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white animate-fade-in">
              <div className="text-lg text-gray-400 mb-4 font-medium">{sessionLabels[sessionType]}</div>
              <div className="text-8xl font-bold mb-8 bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">{formatTime(remainingTime)}</div>
              <div className="flex gap-4">
                <Button onClick={pause} size="lg" className="gradient-warning hover:shadow-2xl">
                  <Pause className="w-6 h-6 mr-2" />
                  暂停
                </Button>
                <Button onClick={() => setLockMode(false)} variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
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
