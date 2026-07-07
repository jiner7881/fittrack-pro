import { useState, useEffect } from 'react';
import { Segmented, Button, Spin } from 'antd';
import { RobotOutlined, WifiOutlined } from '@ant-design/icons';
import { useWorkoutStore, useDietStore, useBodyDataStore, useUserStore } from '../../core/stores';
import { getExerciseRecommendation, getDietAdvice, getBodyAnalysis, getOfflineExerciseRecommendation, getOfflineDietAdvice, getAIConfig } from '../../core/services/ai';
import BodyDataPage from '../body-data/BodyDataPage';

type SubTab = 'overview' | 'body-data';

export default function AnalyticsPage() {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiError, setAiError] = useState('');
  const { recentLogs, loadRecentLogs } = useWorkoutStore();
  const { dailyDiet, loadTodayDiet } = useDietStore();
  const { measurements, loadMeasurements } = useBodyDataStore();
  const { profile, loadProfile } = useUserStore();

  useEffect(() => {
    const init = async () => {
      await loadRecentLogs(7);
      await loadTodayDiet();
      await loadMeasurements(30);
      await loadProfile();
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Weekly stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekLogs = recentLogs.filter((l) => l.startTime >= new Date(weekStartStr).getTime());
  const trainingDays = new Set(weekLogs.map((l) => new Date(l.startTime).toISOString().slice(0, 10))).size;
  const totalVolume = weekLogs.reduce((s, l) => s + (l.totalVolume || 0), 0);
  const totalCaloriesBurned = weekLogs.reduce((s, l) => s + (l.estimatedCalories || 0), 0);

  // Calorie balance
  const intakeCal = dailyDiet?.totalCalories || 0;
  const tdee = profile?.tdee || 2200;
  const burnedCal = totalCaloriesBurned;
  const remainingCal = tdee + burnedCal - intakeCal;

  if (subTab === 'body-data') {
    return (
      <>
        <div style={{ padding: '12px 16px 0', background: 'var(--white)' }}>
          <Segmented
            options={[
              { label: '训练概览', value: 'overview' },
              { label: '身体数据', value: 'body-data' },
            ]}
            value={subTab}
            onChange={(v) => setSubTab(v as SubTab)}
            block
          />
        </div>
        <BodyDataPage />
      </>
    );
  }

  return (
    <div className="page active" id="page-analytics">
      <div className="page-header">
        <h1>数据分析</h1>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <Segmented
          options={[
            { label: '训练概览', value: 'overview' },
            { label: '身体数据', value: 'body-data' },
          ]}
          value={subTab}
          onChange={(v) => setSubTab(v as SubTab)}
          block
        />
      </div>

      {/* Calorie Balance */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: 'linear-gradient(135deg, #1A5276, #2E86C1)', color: 'white', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>今日热量平衡</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
            <span style={{ color: remainingCal >= 0 ? '#7DCEA0' : '#F5B041' }}>
              {remainingCal >= 0 ? '+' : ''}{remainingCal}
            </span>{' '}
            <span style={{ fontSize: 14, opacity: 0.7 }}>kcal 剩余</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#7DCEA0' }}>{intakeCal}</div>
              <div style={{ fontSize: 10, opacity: 0.75 }}>摄入 kcal</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#F5B041' }}>{burnedCal}</div>
              <div style={{ fontSize: 10, opacity: 0.75 }}>消耗 kcal</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{tdee}</div>
              <div style={{ fontSize: 10, opacity: 0.75 }}>TDEE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Training Summary */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>本周训练概览</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ textAlign: 'center', background: 'var(--primary-bg)', borderRadius: 10, padding: '12px 8px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{trainingDays}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>训练天数</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--orange-bg)', borderRadius: 10, padding: '12px 8px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>{totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}k` : 0}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>总容量(kg)</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--green-bg)', borderRadius: 10, padding: '12px 8px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{burnedCal}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>消耗(kcal)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Muscle Group Balance */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>肌群训练平衡</div>
          {[
            { group: '胸部', sets: 0, color: '#E74C3C' },
            { group: '背部', sets: 0, color: '#3498DB' },
            { group: '腿部', sets: 0, color: '#27AE60' },
            { group: '肩部', sets: 0, color: '#F39C12' },
            { group: '手臂', sets: 0, color: '#9B59B6' },
            { group: '核心', sets: 0, color: '#1ABC9C' },
          ].map((item) => {
            const maxSets = 16;
            const pct = Math.min((item.sets / maxSets) * 100, 100);
            return (
              <div key={item.group} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, width: 35, flexShrink: 0 }}>{item.group}</span>
                <div style={{ flex: 1, height: 10, background: '#eee', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: 5, transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--gray)', width: 30 }}>{item.sets}组</span>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 6, textAlign: 'center' }}>
            完成本周训练后将展示肌群平衡数据
          </div>
        </div>
      </div>

      {/* Recovery Status */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>恢复状态</div>
          {weekLogs.length > 0 ? (
            <div>
              {weekLogs.slice(0, 5).map((log) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{log.planName || '自由训练'}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)' }}>
                      {new Date(log.startTime).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                    {log.totalDuration ? `${Math.round(log.totalDuration / 60)}分钟` : '--'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--gray)', fontSize: 13 }}>
              本周暂无训练记录
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ background: 'linear-gradient(135deg, #8E44AD, #9B59B6)', color: 'white', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              <RobotOutlined style={{ marginRight: 6 }} />AI 综合分析
            </div>
            <Button
              size="small"
              type="primary"
              loading={aiLoading}
              onClick={async () => {
                setAiLoading(true);
                setAiError('');
                const config = getAIConfig();
                const goalLabel = profile?.fitnessGoal === 'muscle_gain' ? '增肌' : profile?.fitnessGoal === 'fat_loss' ? '减脂' : '塑形';
                const levelLabel = profile?.trainingLevel === 'beginner' ? '初学' : profile?.trainingLevel === 'advanced' ? '高级' : '中级';

                if (!config.enabled) {
                  // Offline fallback
                  const exerciseAdvice = getOfflineExerciseRecommendation({ goal: goalLabel, level: levelLabel });
                  const dietAdvice = getOfflineDietAdvice({
                    goal: goalLabel,
                    todayCalories: intakeCal,
                    targetCalories: tdee,
                    todayProtein: dailyDiet?.totalProtein || 0,
                    targetProtein: (profile?.tdee && profile?.macroSplit) ? Math.round(profile.tdee * profile.macroSplit.proteinRatio / 4) : 140,
                  });
                  setAiContent(`【训练建议】\n${exerciseAdvice}\n\n【饮食建议】\n${dietAdvice}`);
                  setAiLoading(false);
                  return;
                }

                try {
                  // Call AI for combined analysis
                  const [exResp, dietResp, bodyResp] = await Promise.all([
                    getExerciseRecommendation({
                      goal: goalLabel, level: levelLabel,
                      currentPlan: weekLogs.length > 0 ? `本周训练${trainingDays}天，容量${(totalVolume / 1000).toFixed(1)}k kg` : undefined,
                    }),
                    getDietAdvice({
                      goal: goalLabel,
                      todayCalories: intakeCal, targetCalories: tdee,
                      todayProtein: dailyDiet?.totalProtein || 0, targetProtein: (profile?.tdee && profile?.macroSplit) ? Math.round(profile.tdee * profile.macroSplit.proteinRatio / 4) : 140,
                      todayCarbs: dailyDiet?.totalCarbs || 0, targetCarbs: (profile?.tdee && profile?.macroSplit) ? Math.round(profile.tdee * profile.macroSplit.carbsRatio / 4) : 220,
                      todayFat: dailyDiet?.totalFat || 0, targetFat: (profile?.tdee && profile?.macroSplit) ? Math.round(profile.tdee * profile.macroSplit.fatRatio / 9) : 60,
                    }),
                    getBodyAnalysis({
                      weight: measurements.length > 0 ? measurements[0].bodyWeight : undefined,
                      bodyFat: measurements.length > 0 ? measurements[0].bodyFatRate : undefined,
                      muscleMass: measurements.length > 0 ? measurements[0].muscleMass : undefined,
                      bmi: measurements.length > 0 && measurements[0].bodyWeight && profile?.height
                        ? Number((measurements[0].bodyWeight! / ((profile.height / 100) ** 2)).toFixed(1))
                        : undefined,
                      trend: measurements.length >= 3 ? `近${measurements.length}次记录` : undefined,
                      goal: goalLabel,
                    }),
                  ]);

                  const parts = [];
                  if (exResp.content) parts.push(`【训练建议】\n${exResp.content}`);
                  if (dietResp.content) parts.push(`【饮食建议】\n${dietResp.content}`);
                  if (bodyResp.content) parts.push(`【身体分析】\n${bodyResp.content}`);
                  const errors = [exResp, dietResp, bodyResp].filter(r => r.error).map(r => r.error);
                  if (parts.length > 0) {
                    setAiContent(parts.join('\n\n'));
                  }
                  if (errors.length > 0) {
                    setAiError(errors.join('; '));
                  }
                } catch (err: any) {
                  setAiError(err.message);
                }
                setAiLoading(false);
              }}
              style={{ background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <WifiOutlined /> {getAIConfig().enabled ? 'AI 分析' : '离线建议'}
            </Button>
          </div>
          {aiLoading ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}><Spin /></div>
          ) : aiContent ? (
            <div style={{ fontSize: 13, lineHeight: 1.8, opacity: 0.95, whiteSpace: 'pre-wrap' }}>{aiContent}</div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.9 }}>
              点击分析按钮获取个性化训练和饮食建议
              {!getAIConfig().enabled && '（当前为离线模式，配置 API Key 后可获得更详细的 AI 建议）'}
            </div>
          )}
          {aiError && (
            <div style={{ fontSize: 11, marginTop: 8, opacity: 0.7, color: '#F5B041' }}>
              {aiError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
