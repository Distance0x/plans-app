import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useTaskStore } from '@/stores/task-store';

interface TaskFiltersProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
  autoFocusSearch?: boolean;
  onSaveFilter?: (name: string, filters: any) => Promise<void>;
}

export function TaskFilters({ onSearch, onFilterChange, autoFocusSearch = false, onSaveFilter }: TaskFiltersProps) {
  const { lists, tags } = useTaskStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [savedFilterName, setSavedFilterName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    dueDate: '',
    dueStart: '',
    dueEnd: '',
    listId: '',
    tagId: '',
    hasReminder: '',
    isRecurring: '',
  });

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    const nextFilters = { ...filters, searchQuery: value.trim() };
    if (value.trim()) onSearch(value);
    onFilterChange(cleanFilterObject(nextFilters));
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // 移除空值
    onFilterChange(cleanFilterObject({ ...newFilters, searchQuery }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      dueDate: '',
      dueStart: '',
      dueEnd: '',
      listId: '',
      tagId: '',
      hasReminder: '',
      isRecurring: '',
    });
    setSearchQuery('');
    setSavedFilterName('');
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '') || searchQuery !== '';
  const currentFilterRules = cleanFilterObject({ ...filters, searchQuery });

  return (
    <div className="space-y-3">
      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
            autoFocus={autoFocusSearch}
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 过滤器 */}
      {showFilters && (
        <div className="glass-card p-4 rounded-lg backdrop-blur-md bg-white/70 dark:bg-gray-800/70 border border-white/30">
          <div className="grid grid-cols-5 gap-3">
            <Select
              label="状态"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              options={[
                { value: '', label: '全部' },
                { value: 'todo', label: '待办' },
                { value: 'in_progress', label: '进行中' },
                { value: 'completed', label: '已完成' },
              ]}
            />
            <Select
              label="优先级"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              options={[
                { value: '', label: '全部' },
                { value: 'high', label: '高' },
                { value: 'medium', label: '中' },
                { value: 'low', label: '低' },
              ]}
            />
            <Input
              label="截止日期"
              type="date"
              value={filters.dueDate}
              onChange={(e) => handleFilterChange('dueDate', e.target.value)}
            />
            <Input
              label="开始日期"
              type="date"
              value={filters.dueStart}
              onChange={(e) => handleFilterChange('dueStart', e.target.value)}
            />
            <Input
              label="结束日期"
              type="date"
              value={filters.dueEnd}
              onChange={(e) => handleFilterChange('dueEnd', e.target.value)}
            />
            <Select
              label="清单"
              value={filters.listId}
              onChange={(e) => handleFilterChange('listId', e.target.value)}
              options={[
                { value: '', label: '全部' },
                ...lists.map((list) => ({ value: list.id, label: list.name })),
              ]}
            />
            <Select
              label="标签"
              value={filters.tagId}
              onChange={(e) => handleFilterChange('tagId', e.target.value)}
              options={[
                { value: '', label: '全部' },
                ...tags.map((tag) => ({ value: tag.id, label: `#${tag.name}` })),
              ]}
            />
            <Select
              label="提醒"
              value={filters.hasReminder}
              onChange={(e) => handleFilterChange('hasReminder', e.target.value)}
              options={[
                { value: '', label: '全部' },
                { value: 'true', label: '有提醒' },
              ]}
            />
            <Select
              label="重复"
              value={filters.isRecurring}
              onChange={(e) => handleFilterChange('isRecurring', e.target.value)}
              options={[
                { value: '', label: '全部' },
                { value: 'true', label: '重复任务' },
              ]}
            />
          </div>
          {onSaveFilter && hasActiveFilters && (
            <div className="mt-4 flex gap-2 border-t border-gray-200/70 pt-4 dark:border-gray-700/70">
              <Input
                placeholder="保存为智能清单名称"
                value={savedFilterName}
                onChange={(event) => setSavedFilterName(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const name = savedFilterName.trim();
                  if (!name) return;

                  await onSaveFilter(name, currentFilterRules);
                  setSavedFilterName('');
                }}
              >
                保存过滤器
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function cleanFilterObject(filters: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  );
}
