import { useState } from 'react';
import { BulbOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import { Card, Space } from 'antd';

interface ThinkingIndicatorProps {
  thinking?: string;
  expanded?: boolean;
  isStreaming?: boolean;
}

export function ThinkingIndicator({ thinking, expanded = false, isStreaming = false }: ThinkingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  if (!thinking) return null;

  return (
    <Card
      size="small"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 12,
        marginBottom: 8,
        border: 'none'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space>
            <BulbOutlined spin={isStreaming} />
            <span style={{ fontWeight: 500 }}>{isStreaming ? '正在思考...' : '思考过程'}</span>
          </Space>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            {isExpanded ? <UpOutlined /> : <DownOutlined />}
          </button>
        </div>
        {isExpanded && (
          <div style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '300px',
            overflowY: 'auto',
            marginTop: 8,
            lineHeight: 1.6
          }}>
            {thinking}
          </div>
        )}
      </Space>
    </Card>
  );
}
