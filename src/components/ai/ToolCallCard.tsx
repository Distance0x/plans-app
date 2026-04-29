import { PlusCircleOutlined, EditOutlined, ClockCircleOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Card, Space } from 'antd';

interface ToolCallCardProps {
  toolCall: {
    id: string;
    name: string;
    arguments: string;
    status: 'pending' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
  };
}

const TOOL_LABELS: Record<string, string> = {
  get_tasks: '查询任务列表',
  create_tasks: '创建任务',
  update_tasks: '更新任务',
  schedule_tasks: '安排时间',
  update_user_profile: '更新用户画像',
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  get_tasks: <ClockCircleOutlined />,
  create_tasks: <PlusCircleOutlined />,
  update_tasks: <EditOutlined />,
  schedule_tasks: <ClockCircleOutlined />
};

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;
  const icon = TOOL_ICONS[toolCall.name];
  const duration = toolCall.startTime && toolCall.endTime ? toolCall.endTime - toolCall.startTime : null;

  const borderColor = toolCall.status === 'completed' ? '#52c41a' : toolCall.status === 'failed' ? '#ff4d4f' : '#1890ff';

  return (
    <Card
      size="small"
      style={{
        borderRadius: 8,
        borderLeft: `4px solid ${borderColor}`,
        marginBottom: 8
      }}
    >
      <Space>
        {icon}
        <span style={{ fontWeight: 500 }}>{label}</span>
        {toolCall.status === 'pending' && <LoadingOutlined spin />}
        {toolCall.status === 'completed' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
        {toolCall.status === 'failed' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
        {duration !== null && (
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>({duration}ms)</span>
        )}
      </Space>
    </Card>
  );
}
