import { useEffect } from 'react';
import { useTimerStore } from '@/stores/timer-store';
import { Play, Pause, RotateCcw, SkipForward, Timer } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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
    </div>
  );
}
