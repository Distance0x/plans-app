import { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Tag, Alert, Spin } from 'antd';
import {
  TrophyOutlined,
  FireOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';

interface UserProfile {
  productiveHours: number[];
  avgTaskDuration: number;
  completionRate: number;
  streakDays: number;
  frequentTags: Array<{ tagId: string; count: number }>;
  priorityDistribution: Record<'high' | 'medium' | 'low', number>;
}

interface Recommendation {
  type: 'schedule' | 'break' | 'priority' | 'tag' | 'focus_time';
  message: string;
  confidence: number;
}

export function UserProfilePanel() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, recRes] = await Promise.all([
        window.electron.recommendation.profile(),
        window.electron.recommendation.get(),
      ]);

      if (profileRes.success && profileRes.profile) {
        setProfile(profileRes.profile);
      }

      if (recRes.success && recRes.recommendations) {
        setRecommendations(recRes.recommendations);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Alert
          message="暂无数据"
          description="开始使用应用后，这里将展示你的使用习惯和智能推荐"
          type="info"
          showIcon
        />
      </div>
    );
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'focus_time':
        return <FireOutlined style={{ color: '#ff4d4f' }} />;
      case 'break':
        return <ClockCircleOutlined style={{ color: '#52c41a' }} />;
      case 'priority':
        return <TrophyOutlined style={{ color: '#faad14' }} />;
      default:
        return <BulbOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getRecommendationType = (type: string) => {
    const typeMap: Record<string, { text: string; color: string }> = {
      focus_time: { text: '高效时段', color: 'red' },
      break: { text: '休息提醒', color: 'green' },
      priority: { text: '优先级建议', color: 'orange' },
      tag: { text: '标签推荐', color: 'blue' },
      schedule: { text: '日程建议', color: 'purple' },
    };
    return typeMap[type] || { text: '其他', color: 'default' };
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 用户画像</h2>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="完成率"
                value={profile.completionRate * 100}
                precision={0}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: profile.completionRate > 0.7 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="连续天数"
                value={profile.streakDays}
                suffix="天"
                prefix={<FireOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="平均时长"
                value={profile.avgTaskDuration}
                suffix="分钟"
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="高效时段"
                value={profile.productiveHours.length}
                suffix="个"
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {profile.productiveHours.length > 0 && (
        <Card title="⏰ 高效时段" size="small">
          <div className="flex flex-wrap gap-2">
            {profile.productiveHours.map((hour) => (
              <Tag key={hour} color="blue">
                {hour}:00 - {hour + 1}:00
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {profile.frequentTags.length > 0 && (
        <Card title="🏷️ 常用标签" size="small">
          <div className="flex flex-wrap gap-2">
            {profile.frequentTags.slice(0, 10).map((tag) => (
              <Tag key={tag.tagId} color="purple">
                {tag.tagId} ({tag.count})
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">💡 智能推荐</h3>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => {
              const typeInfo = getRecommendationType(rec.type);
              return (
                <Alert
                  key={idx}
                  message={
                    <div className="flex items-center justify-between">
                      <span>{rec.message}</span>
                      <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
                    </div>
                  }
                  type={rec.confidence > 0.8 ? 'success' : 'info'}
                  icon={getRecommendationIcon(rec.type)}
                  showIcon
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
