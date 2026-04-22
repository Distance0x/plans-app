import { Button } from './components/ui/Button';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-8">
        <div className="glass-card p-8 rounded-lg backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/30 shadow-xl">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Plans App
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            番茄钟 + 任务管理 + 日历视图
          </p>
          <div className="flex gap-4">
            <Button>开始番茄钟</Button>
            <Button variant="outline">查看任务</Button>
            <Button variant="ghost">设置</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
