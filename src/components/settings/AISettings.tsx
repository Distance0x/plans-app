import { useState } from 'react';

export function AISettings() {
  const [baseURL, setBaseURL] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadConfig = async () => {
    try {
      const result = await window.electron.ai.loadConfig();
      if (result.config) {
        setBaseURL(result.config.baseURL);
        setApiKey(result.config.apiKey);
        setModel(result.config.model);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  useState(() => {
    loadConfig();
  });

  const handleSave = async () => {
    if (!baseURL || !apiKey || !model) {
      setMessage('请填写所有字段');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await window.electron.ai.saveConfig({ baseURL, apiKey, model });
      setMessage('保存成功');
    } catch (error) {
      setMessage(`保存失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除 AI 配置吗？')) return;

    setLoading(true);
    try {
      await window.electron.ai.deleteConfig();
      setBaseURL('');
      setApiKey('');
      setModel('');
      setMessage('配置已删除');
    } catch (error) {
      setMessage(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">AI 配置</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Base URL
          </label>
          <input
            type="text"
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            支持任何 OpenAI 兼容的 API（如 OpenAI、Azure OpenAI、本地模型等）
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            API 密钥将使用系统加密存储
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Model
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            模型名称（如 gpt-4o-mini、gpt-4o、claude-3-5-sonnet-20241022 等）
          </p>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.includes('成功')
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '保存中...' : '保存配置'}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            删除配置
          </button>
        </div>
      </div>
    </div>
  );
}
