import { TaskList } from './components/tasks/TaskList';
import { PomodoroTimer } from './components/timer/PomodoroTimer';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Plans App
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            番茄钟 + 任务管理 + 日历视图
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 番茄钟 */}
          <div className="lg:col-span-1">
            <PomodoroTimer />
          </div>

          {/* 任务列表 */}
          <div className="lg:col-span-2">
            <TaskList />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
