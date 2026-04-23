import { useEffect, useMemo, useState } from 'react';

interface TimerStats {
  completedSessions: number;
  totalWorkTime: number;
  dailyWorkTime: Record<string, number>;
}

export function FocusStats() {
  const [stats, setStats] = useState<TimerStats | null>(null);

  useEffect(() => {
    if (!window.electron) return;

    window.electron.timer.stats({}).then(setStats);
  }, []);

  const summary = useMemo(() => {
    if (!stats) return { today: 0, week: 0 };

    const today = new Date().toISOString().slice(0, 10);
    const values = Object.values(stats.dailyWorkTime || {});
    return {
      today: stats.dailyWorkTime?.[today] || 0,
      week: values.reduce((sum, value) => sum + value, 0),
    };
  }, [stats]);

  if (!stats) {
    return null;
  }

  const dailyEntries = Object.entries(stats.dailyWorkTime || {});
  const maxDaily = Math.max(...dailyEntries.map(([, value]) => value), 1);

  return (
    <div className="mt-6 space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <StatCard label="今日" value={formatMinutes(summary.today)} />
        <StatCard label="本周" value={formatMinutes(summary.week)} />
        <StatCard label="完成" value={`${stats.completedSessions}`} />
      </div>

      <div className="flex items-end gap-2 h-20">
        {dailyEntries.map(([date, seconds]) => (
          <div key={date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-blue-500 transition-all"
              style={{ height: `${Math.max(8, (seconds / maxDaily) * 64)}px` }}
              title={`${date}: ${formatMinutes(seconds)}`}
            />
            <span className="text-[10px] text-gray-500">{date.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-700/60 px-3 py-2">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function formatMinutes(seconds: number) {
  return `${Math.round(seconds / 60)}m`;
}
