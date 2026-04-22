import { TaskList } from './components/tasks/TaskList';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Plans App
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            番茄钟 + 任务管理 + 日历视图
          </p>
        </div>

        <TaskList />
      </div>
    </div>
  );
}

export default App;
