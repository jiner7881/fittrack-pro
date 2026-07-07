import { useState, useEffect, useContext } from 'react';
import { NavigationContext } from '../../core/contexts';
import { useUserStore, useDietStore, useWorkoutStore, useBodyDataStore } from '../../core/stores';

export default function HomePage() {
  const { setActiveTab } = useContext(NavigationContext);
  const { profile, loadProfile } = useUserStore();
  const { dailyDiet, loadTodayDiet } = useDietStore();
  const { plans, recentLogs, loadPlans, loadRecentLogs } = useWorkoutStore();
  const { latestMeasurement, loadLatest } = useBodyDataStore();
  const [todayLog, setTodayLog] = useState<{ totalVolume: number; estimatedCalories: number } | null>(null);

  useEffect(() => {
    const init = async () => {
      await loadProfile();
      await loadTodayDiet();
      await loadPlans();
      await loadRecentLogs(7);
      await loadLatest();
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate today's workout data from recent logs
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(today).getTime();
    const todayEnd = todayStart + 86400000;
    const logs = recentLogs.filter((l) => l.startTime >= todayStart && l.startTime < todayEnd);
    if (logs.length > 0) {
      setTodayLog({
        totalVolume: logs.reduce((s, l) => s + (l.totalVolume || 0), 0),
        estimatedCalories: logs.reduce((s, l) => s + (l.estimatedCalories || 0), 0),
      });
    }
  }, [recentLogs]);

  // Calculations
  const intakeCal = dailyDiet?.totalCalories || 0;
  const tdee = profile?.tdee || 2200;
  const burnedCal = todayLog?.estimatedCalories || 0;
  const remainingCal = tdee + burnedCal - intakeCal;

  // Today's plan
  const today = new Date().toISOString().slice(0, 10);
  const todayPlans = plans.filter((p) => p.scheduledDate === today);
  const todayPlan = todayPlans[0];

  // Macros
  const proteinTarget = profile?.macroSplit?.proteinRatio ? Math.round((tdee * (profile.macroSplit.proteinRatio * 4)) / 4) : 140;
  const carbsTarget = profile?.macroSplit?.carbsRatio ? Math.round((tdee * (profile.macroSplit.carbsRatio * 4)) / 4) : 220;
  const fatTarget = profile?.macroSplit?.fatRatio ? Math.round((tdee * (profile.macroSplit.fatRatio * 9)) / 9) : 60;

  const currentProtein = dailyDiet?.totalProtein || 0;
  const currentCarbs = dailyDiet?.totalCarbs || 0;
  const currentFat = dailyDiet?.totalFat || 0;

  // Body data
  const body = latestMeasurement;

  // Previous measurement for change calculation
  const prevWeight: number | null = null; // Would need previous measurement

  return (
    <div className="page active" id="page-home">
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--gray)' }}>
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            你好{profile?.nickname ? `，${profile.nickname}` : ''}，今天状态如何？
          </div>
        </div>
      </div>

      {/* Calorie Balance */}
      <div className="card" style={{ margin: '12px 16px', background: 'linear-gradient(135deg, #1A5276, #2E86C1)', color: 'white', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>剩余可摄入</div>
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>
          <span style={{ color: remainingCal >= 0 ? '#7DCEA0' : '#F5B041' }}>
            {remainingCal.toLocaleString()}
          </span>{' '}
          <span style={{ fontSize: 16, opacity: 0.7 }}>kcal</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#7DCEA0' }}>{intakeCal.toLocaleString()}</div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>摄入 kcal</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#F5B041' }}>{burnedCal}</div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>训练消耗</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{tdee.toLocaleString()}</div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>TDEE</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: remainingCal >= 0 ? '#7DCEA0' : '#F5B041' }}>
              {remainingCal >= 0 ? remainingCal.toLocaleString() : `+${Math.abs(remainingCal).toLocaleString()}`}
            </div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>{remainingCal >= 0 ? '剩余 kcal' : '超量 kcal'}</div>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div className="card" style={{ margin: '0 16px 12px', padding: 16, background: 'var(--white)', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>宏量营养素</div>
        {[
          { name: '蛋白质', current: Math.round(currentProtein), total: proteinTarget, color: 'var(--primary)' },
          { name: '碳水', current: Math.round(currentCarbs), total: carbsTarget, color: 'var(--orange)' },
          { name: '脂肪', current: Math.round(currentFat), total: fatTarget, color: 'var(--green)' },
        ].map((macro) => (
          <div key={macro.name} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: macro.color, fontWeight: 600 }}>{macro.name}</span>
              <span style={{ color: 'var(--gray)' }}>{macro.current}g / {macro.total}g</span>
            </div>
            <div style={{ height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min((macro.current / macro.total) * 100, 100)}%`,
                height: '100%',
                background: macro.color,
                borderRadius: 4,
                transition: 'width 0.5s',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Today Workout */}
      <div
        className="card"
        onClick={() => setActiveTab('training')}
        style={{ margin: '0 16px 12px', padding: 16, background: 'var(--white)', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer' }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span>今日训练</span>
          <span style={{ fontSize: 12, color: 'var(--primary-light)' }}>查看计划</span>
        </div>
        {todayPlan ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              💪
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{todayPlan.name}</div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                {todayPlan.exercises.length}个动作 · {todayPlan.exercises.reduce((s, e) => s + e.targetSets, 0)}组
              </div>
            </div>
          </div>
        ) : todayLog ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              ✅
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>今日已完成训练</div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                容量 {todayLog.totalVolume}kg · 消耗 {todayLog.estimatedCalories}kcal
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--gray-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
              🏋️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>今日无训练计划</div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>去训练页创建计划</div>
            </div>
          </div>
        )}
      </div>

      {/* Body Data Quick View */}
      <div
        className="card"
        onClick={() => setActiveTab('analytics')}
        style={{ margin: '0 16px 12px', padding: 16, background: 'var(--white)', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', cursor: 'pointer' }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span>身体数据</span>
          <span style={{ fontSize: 12, color: 'var(--primary-light)' }}>查看趋势</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { val: body?.bodyWeight?.toFixed(1) ?? '--', label: '体重(kg)', change: prevWeight && body?.bodyWeight ? (body.bodyWeight > prevWeight ? '▲' : '▼') : '', changeColor: 'var(--gray)' },
            { val: body?.bodyFatRate?.toFixed(1) ?? '--', label: '体脂率(%)', change: '', changeColor: 'var(--gray)' },
            { val: body?.muscleMass?.toFixed(1) ?? '--', label: '肌肉量(kg)', change: '', changeColor: 'var(--gray)' },
            { val: body?.bmi?.toFixed(1) ?? '--', label: 'BMI', change: body?.bmi ? (body.bmi < 18.5 ? '偏瘦' : body.bmi < 24 ? '正常' : body.bmi < 28 ? '偏胖' : '肥胖') : '', changeColor: body?.bmi && body.bmi >= 18.5 && body.bmi < 24 ? 'var(--green)' : 'var(--orange)' },
          ].map((m) => (
            <div key={m.label} style={{ background: 'var(--gray-bg)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{m.val}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{m.label}</div>
              {m.change && <div style={{ fontSize: 10, fontWeight: 600, color: m.changeColor, marginTop: 2 }}>{m.change}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { icon: '🍽️', label: '记录饮食', tab: 'diet' },
            { icon: '💪', label: '开始训练', tab: 'training' },
            { icon: '📊', label: '记录体重', tab: 'analytics' },
          ].map((action) => (
            <div
              key={action.label}
              onClick={() => setActiveTab(action.tab)}
              style={{
                background: 'var(--white)', borderRadius: 12, padding: '14px 10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{action.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{action.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
