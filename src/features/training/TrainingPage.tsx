import { useState, useEffect, useMemo } from 'react';
import { Button, Tag, Drawer, Modal } from 'antd';
import { PlusOutlined, CalendarOutlined, HistoryOutlined, TrophyOutlined, FireOutlined } from '@ant-design/icons';
import { useWorkoutStore } from '../../core/stores';
import { db } from '../../core/db';
import type { WorkoutPlan, WorkoutLog, ExerciseLog, ExerciseSetLog } from '../../core/types';
import PlanDetail from './components/PlanDetail';
import CreatePlanForm from './components/CreatePlanForm';
import WorkoutActiveScreen from './components/WorkoutActiveScreen';
import { useWorkoutSessionStore } from '../../core/stores/workoutSession';
import { estimateExerciseCalories, type ExerciseCalorieEstimate } from '../../core/services/calorieEstimation';

export default function TrainingPage() {
  const { plans, loading, loadPlans } = useWorkoutStore();
  const { session, isDrawerOpen } = useWorkoutSessionStore();
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const [logDetailOpen, setLogDetailOpen] = useState(false);

  useEffect(() => {
    loadPlans();
    loadRecentLogs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when session ends (workout completed)
  useEffect(() => {
    if (!isDrawerOpen && !session) {
      loadPlans();
      loadRecentLogs();
    }
  }, [isDrawerOpen, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRecentLogs = async () => {
    const logs = await db.workoutLogs
      .orderBy('createdAt')
      .reverse()
      .limit(20)
      .toArray();
    setRecentLogs(logs);
  };

  // Today's plans
  const today = new Date().toISOString().slice(0, 10);
  const todayPlans = plans.filter((p) => p.scheduledDate === today);
  const upcomingPlans = plans
    .filter((p) => p.scheduledDate && p.scheduledDate > today)
    .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))
    .slice(0, 5);

  const handleViewPlan = (plan: WorkoutPlan) => {
    setSelectedPlan(plan);
    setDetailOpen(true);
  };

  const handleViewLog = (log: WorkoutLog) => {
    setSelectedLog(log);
    setLogDetailOpen(true);
  };

  const handleStartWorkout = async (plan: WorkoutPlan) => {
    // Load exercise details for the plan
    const exerciseIds = [
      ...plan.warmupExercises.map((pe) => pe.exerciseId),
      ...plan.exercises.map((pe) => pe.exerciseId),
    ];
    const exerciseDocs = await db.exercises.bulkGet(exerciseIds);

    const exerciseLogs: ExerciseLog[] = [];

    // Warmup exercises
    plan.warmupExercises.forEach((pe, i) => {
      const doc = exerciseIds.indexOf(pe.exerciseId) >= 0
        ? exerciseDocs[exerciseIds.indexOf(pe.exerciseId)]
        : undefined;
      exerciseLogs.push({
        exerciseId: pe.exerciseId,
        exerciseName: doc?.name || pe.exerciseId,
        sets: Array.from({ length: pe.targetSets }, (_, si) => ({
          setNumber: si + 1,
          setType: 'warmup' as const,
          weight: null,
          reps: null,
          isCompleted: false,
        })),
        order: i,
        notes: pe.notes,
      });
    });

    // Main exercises
    plan.exercises.forEach((pe, i) => {
      const doc = exerciseDocs[exerciseIds.indexOf(pe.exerciseId)];
      exerciseLogs.push({
        exerciseId: pe.exerciseId,
        exerciseName: doc?.name || pe.exerciseId,
        sets: Array.from({ length: pe.targetSets }, (_, si) => ({
          setNumber: si + 1,
          setType: 'working' as const,
          weight: null,
          reps: null,
          isCompleted: false,
        })),
        order: plan.warmupExercises.length + i,
        notes: pe.notes,
      });
    });

    const { startSession } = useWorkoutSessionStore.getState();
    startSession(plan.id, plan.name, exerciseLogs);
    setDetailOpen(false);
  };

  const muscleColors: Record<string, string> = {
    chest: '#1A5276',
    back: '#27AE60',
    shoulder: '#E67E22',
    arm: '#8E44AD',
    leg: '#E74C3C',
    core: '#F39C12',
  };

  return (
    <div className="page active" id="page-training">
      <div className="page-header">
        <h1>训练计划</h1>
        <div className="subtitle">
          {new Date().getFullYear()}年{new Date().getMonth() + 1}月
        </div>
      </div>

      {/* Today's Plans */}
      <div className="card" style={{ margin: '0 16px 12px', padding: 16, background: 'var(--white)', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span>今日计划 — {new Date().getMonth() + 1}月{new Date().getDate()}日</span>
        </div>

        {todayPlans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray)', fontSize: 13 }}>
            今天暂无训练计划
          </div>
        ) : (
          todayPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              muscleColors={muscleColors}
              onView={() => handleViewPlan(plan)}
              onStart={() => handleStartWorkout(plan)}
              onViewLog={() => {
                const log = recentLogs.find((l) => l.planId === plan.id);
                if (log) handleViewLog(log);
              }}
            />
          ))
        )}

        {todayPlans.length === 0 && (
          <Button type="primary" block onClick={() => setCreateOpen(true)} style={{ marginTop: 8 }}>
            <PlusOutlined /> 快速开始训练
          </Button>
        )}
      </div>

      {/* Recent Workout Logs */}
      {recentLogs.length > 0 && (
        <div className="card" style={{ margin: '0 16px 12px', padding: 16, background: 'var(--white)', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <HistoryOutlined style={{ color: 'var(--primary)' }} />
            <span>训练记录</span>
          </div>

          {recentLogs.map((log) => (
            <WorkoutLogCard
              key={log.id}
              log={log}
              onClick={() => handleViewLog(log)}
            />
          ))}
        </div>
      )}

      {/* Upcoming Plans */}
      {upcomingPlans.length > 0 && (
        <div className="card" style={{ margin: '0 16px 12px', padding: 16, background: 'var(--white)', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>即将到来</div>
          {upcomingPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              muscleColors={muscleColors}
              onView={() => handleViewPlan(plan)}
              showDate
            />
          ))}
        </div>
      )}

      {/* All Plans */}
      <div className="card" style={{ margin: '0 16px 12px', padding: 16, background: 'var(--white)', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span>我的计划</span>
          <span style={{ fontSize: 12, color: 'var(--primary-light)', cursor: 'pointer' }} onClick={() => setCreateOpen(true)}>
            + 新建
          </span>
        </div>

        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--gray)', fontSize: 13 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
            还没有训练计划，点击下方按钮创建
          </div>
        ) : (
          plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              muscleColors={muscleColors}
              onView={() => handleViewPlan(plan)}
              onStart={() => handleStartWorkout(plan)}
              onViewLog={() => {
                const log = recentLogs.find((l) => l.planId === plan.id);
                if (log) handleViewLog(log);
              }}
              showDate
            />
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ margin: '0 16px 12px', display: 'flex', gap: 10 }}>
        <Button style={{ flex: 1 }} icon={<CalendarOutlined />} onClick={() => setCreateOpen(true)}>
          新建计划
        </Button>
        <Button type="primary" style={{ flex: 1 }} onClick={() => {
          const { startSession } = useWorkoutSessionStore.getState();
          startSession(undefined, '自由训练', []);
        }}>
          自由训练
        </Button>
      </div>

      {/* Plan Detail Drawer */}
      <Drawer
        title={selectedPlan?.name}
        placement="bottom"
        height="80%"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        styles={{ body: { padding: '16px 20px' } }}
        extra={
          selectedPlan && (
            <Button type="primary" onClick={() => handleStartWorkout(selectedPlan)}>
              开始训练
            </Button>
          )
        }
      >
        {selectedPlan && <PlanDetail plan={selectedPlan} />}
      </Drawer>

      {/* Workout Log Detail Drawer */}
      <Drawer
        title={selectedLog?.planName || '训练记录'}
        placement="bottom"
        height="85%"
        open={logDetailOpen}
        onClose={() => setLogDetailOpen(false)}
        styles={{ body: { padding: '16px 20px' } }}
      >
        {selectedLog && <WorkoutLogDetail log={selectedLog} />}
      </Drawer>

      {/* Create Plan Modal */}
      <Modal
        title="新建训练计划"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width="100%"
        style={{ top: 0, maxWidth: 375, margin: '0 auto' }}
      >
        <CreatePlanForm
          onSave={async (plan) => {
            await useWorkoutStore.getState().addPlan(plan);
            setCreateOpen(false);
            await loadPlans();
          }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Workout Active Screen (full-screen overlay) */}
      {isDrawerOpen && session && (
        <WorkoutActiveScreen />
      )}
    </div>
  );
}

// ---- Plan Card ----

function PlanCard({
  plan,
  muscleColors,
  onView,
  onStart,
  onViewLog,
  showDate,
}: {
  plan: WorkoutPlan;
  muscleColors: Record<string, string>;
  onView: () => void;
  onStart?: () => void;
  onViewLog?: () => void;
  showDate?: boolean;
}) {
  const isCompletedToday = plan.lastCompletedAt &&
    new Date(plan.lastCompletedAt).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

  const totalWorkingSets = plan.exercises.reduce((s, e) => s + e.targetSets, 0);
  const totalWarmupSets = plan.warmupExercises.reduce((s, e) => s + e.targetSets, 0);
  const primaryMuscle = plan.name.includes('胸') ? 'chest'
    : plan.name.includes('背') ? 'back'
    : plan.name.includes('肩') ? 'shoulder'
    : plan.name.includes('臂') ? 'arm'
    : plan.name.includes('腿') ? 'leg'
    : plan.name.includes('核心') ? 'core' : 'chest';

  const emoji = primaryMuscle === 'chest' ? '💪'
    : primaryMuscle === 'back' ? '🏋️'
    : primaryMuscle === 'leg' ? '🦵'
    : primaryMuscle === 'shoulder' ? '🎯'
    : primaryMuscle === 'arm' ? '💪'
    : '⚡';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: isCompletedToday ? 'linear-gradient(135deg, #f0f9f0 0%, #e8f5e8 100%)' : 'var(--gray-bg)',
        borderRadius: 10,
        marginBottom: 8,
        cursor: 'pointer',
        border: isCompletedToday ? '1px solid #c8e6c9' : 'none',
      }}
      onClick={onView}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: isCompletedToday ? 'var(--green)' : (muscleColors[primaryMuscle] || 'var(--primary)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        color: 'white',
      }}>
        {isCompletedToday ? '✓' : emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {plan.name}
          {isCompletedToday && (
            <Tag color="success" style={{ fontSize: 10, margin: 0, lineHeight: '18px' }}>已完成</Tag>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
          {plan.exercises.length}个动作 · {totalWorkingSets}组
          {totalWarmupSets > 0 && ` · 热身${totalWarmupSets}组`}
          {plan.cooldownExercises.length > 0 && ` · 拉伸${plan.cooldownExercises.length}`}
          {showDate && plan.scheduledDate && ` · ${formatDate(plan.scheduledDate)}`}
          {plan.lastCompletedAt && !isCompletedToday && (
            <> · 上次完成 {formatDate(new Date(plan.lastCompletedAt).toISOString().slice(0, 10))}</>
          )}
        </div>
      </div>
      {isCompletedToday ? (
        <Button size="small" style={{ color: 'var(--primary)' }} onClick={(e) => { e.stopPropagation(); onViewLog?.(); }}>
          查看记录
        </Button>
      ) : onStart ? (
        <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); onStart(); }}>
          开始
        </Button>
      ) : null}
    </div>
  );
}

// ---- Workout Log Card ----

function WorkoutLogCard({ log, onClick }: { log: WorkoutLog; onClick: () => void }) {
  const duration = log.totalDuration ? Math.floor(log.totalDuration / 60) : 0;
  const completedExercises = log.exercises.filter(
    (ex) => ex.sets.length > 0 && ex.sets.some((s) => s.isCompleted)
  ).length;

  const logDate = new Date(log.startTime);
  const dateStr = `${logDate.getMonth() + 1}月${logDate.getDate()}日`;
  const timeStr = `${logDate.getHours().toString().padStart(2, '0')}:${logDate.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'var(--gray-bg)',
        borderRadius: 10,
        marginBottom: 8,
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'var(--primary-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
      }}>
        <TrophyOutlined style={{ color: 'var(--primary)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{log.planName || '自由训练'}</div>
        <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
          {dateStr} {timeStr} · {duration}分钟 · {completedExercises}个动作
          {log.estimatedCalories ? ` · 约${log.estimatedCalories}kcal` : ''}
        </div>
      </div>
      <span style={{ fontSize: 16, color: 'var(--gray)' }}>›</span>
    </div>
  );
}

// ---- Workout Log Detail ----

function WorkoutLogDetail({ log }: { log: WorkoutLog }) {
  const duration = log.totalDuration ? Math.floor(log.totalDuration / 60) : 0;
  const logDate = new Date(log.startTime);
  const dateStr = `${logDate.getFullYear()}年${logDate.getMonth() + 1}月${logDate.getDate()}日`;
  const startTimeStr = `${logDate.getHours().toString().padStart(2, '0')}:${logDate.getMinutes().toString().padStart(2, '0')}`;
  const endTime = log.endTime ? new Date(log.endTime) : null;
  const endTimeStr = endTime ? `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}` : '-';

  const completedSets = log.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.isCompleted).length, 0
  );
  const totalVolume = log.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + (set.weight && set.reps && set.isCompleted ? set.weight * set.reps : 0), 0), 0
  );

  // Per-exercise calorie estimates
  const [exerciseCalories, setExerciseCalories] = useState<ExerciseCalorieEstimate[]>([]);

  useEffect(() => {
    const estimate = async () => {
      const results: ExerciseCalorieEstimate[] = [];
      let userWeight = 70;
      try {
        const profile = await db.userProfile.get('default');
        if (profile?.weight) userWeight = profile.weight;
      } catch { /* use default */ }

      for (const ex of log.exercises) {
        const est = await estimateExerciseCalories(ex, userWeight);
        results.push(est);
      }
      setExerciseCalories(results);
    };
    estimate();
  }, [log]);

  // Muscle group label
  const muscleLabels: Record<string, string> = {
    leg: '腿部', back: '背部', chest: '胸部', shoulder: '肩部',
    core: '核心', arm: '手臂', full_body: '全身', unknown: '其他',
  };

  return (
    <div>
      {/* Summary */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #4A90D9 100%)',
        borderRadius: 12,
        padding: 20,
        color: 'white',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          {log.planName || '自由训练'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{log.estimatedCalories || 0}<span style={{ fontSize: 11 }}>kcal</span></div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>消耗热量</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{duration}<span style={{ fontSize: 12 }}>分</span></div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>训练时长</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{completedSets}<span style={{ fontSize: 12 }}>组</span></div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>完成组数</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}` : '0'}<span style={{ fontSize: 12 }}>t</span></div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>总容量</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
          {dateStr} {startTimeStr} - {endTimeStr}
        </div>
      </div>

      {/* Calorie breakdown by muscle group */}
      {exerciseCalories.length > 0 && (
        <div style={{
          marginBottom: 16,
          padding: 14,
          background: 'var(--white)',
          borderRadius: 10,
          border: '1px solid #f0f0f0',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FireOutlined style={{ color: '#E74C3C' }} />
            热量消耗分布
          </div>
          {(() => {
            // Group by muscle
            const muscleCalories: Record<string, number> = {};
            for (const ec of exerciseCalories) {
              const key = ec.primaryMuscle || 'unknown';
              muscleCalories[key] = (muscleCalories[key] || 0) + ec.estimatedCalories;
            }
            const totalCal = Object.values(muscleCalories).reduce((s, v) => s + v, 0) || 1;
            const muscleColors: Record<string, string> = {
              leg: '#E74C3C', back: '#27AE60', chest: '#1A5276',
              shoulder: '#E67E22', core: '#F39C12', arm: '#8E44AD',
              full_body: '#2E86C1', unknown: '#95A5A6',
            };
            return Object.entries(muscleCalories)
              .sort(([, a], [, b]) => b - a)
              .map(([muscle, cal]) => {
                const pct = Math.round((cal / totalCal) * 100);
                return (
                  <div key={muscle} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{muscleLabels[muscle] || muscle}</span>
                      <span style={{ color: 'var(--gray)' }}>{cal}kcal ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: muscleColors[muscle] || '#2E86C1',
                        borderRadius: 3,
                        transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>
                );
              });
          })()}
        </div>
      )}

      {/* Exercise Details */}
      {log.exercises.map((exercise, exIndex) => {
        const exCompletedSets = exercise.sets.filter((s) => s.isCompleted).length;
        const exVolume = exercise.sets.reduce(
          (sum, s) => sum + (s.weight && s.reps && s.isCompleted ? s.weight * s.reps : 0), 0
        );
        const bestSet = exercise.sets
          .filter((s) => s.isCompleted && s.weight)
          .reduce((best, s) => ((s.weight || 0) * (s.reps || 0)) > ((best?.weight || 0) * (best?.reps || 0)) ? s : best,
            exercise.sets.find((s) => s.isCompleted && s.weight) as ExerciseSetLog | undefined
          );
        const exCal = exerciseCalories[exIndex];

        return (
          <div key={exIndex} style={{
            marginBottom: 12,
            padding: 14,
            background: 'var(--gray-bg)',
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {exIndex + 1}. {exercise.exerciseName}
              </span>
              <Tag color="blue" style={{ fontSize: 10 }}>{exCompletedSets}/{exercise.sets.length}组</Tag>
              {exCal && (
                <Tag color="volcano" style={{ fontSize: 10, marginLeft: 'auto' }}>
                  ~{exCal.estimatedCalories}kcal
                </Tag>
              )}
            </div>

            {/* Set details table */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0 6px', borderBottom: '1px solid #e0e0e0', marginBottom: 4 }}>
              <span style={{ width: 24, fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>组</span>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--gray)', textAlign: 'center' }}>重量</span>
              <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--gray)', textAlign: 'center' }}>次数</span>
              <span style={{ width: 30, fontSize: 11, fontWeight: 600, color: 'var(--gray)', textAlign: 'center' }}>类型</span>
            </div>

            {exercise.sets.map((set, setIndex) => (
              <div key={setIndex} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 0',
                borderBottom: '1px solid #f0f0f0',
                opacity: set.isCompleted ? 1 : 0.4,
              }}>
                <span style={{ width: 24, fontSize: 13, fontWeight: 600 }}>{set.setNumber}</span>
                <span style={{ flex: 1, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>
                  {set.weight ?? '-'} <span style={{ fontSize: 10, color: 'var(--gray)' }}>kg</span>
                </span>
                <span style={{ flex: 1, fontSize: 13, textAlign: 'center', fontWeight: 600 }}>
                  {set.reps ?? '-'} <span style={{ fontSize: 10, color: 'var(--gray)' }}>次</span>
                </span>
                <span style={{ width: 30, textAlign: 'center' }}>
                  {set.setType === 'warmup' ? (
                    <Tag color="green" style={{ fontSize: 9, margin: 0, padding: '0 4px' }}>热身</Tag>
                  ) : (
                    <span style={{ fontSize: 9, color: 'var(--gray)' }}>正式</span>
                  )}
                </span>
              </div>
            ))}

            {/* Exercise summary */}
            {(exVolume > 0 || exCal) && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--primary-bg)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>容量: {exVolume.toLocaleString()}kg</span>
                {bestSet && (
                  <span style={{ color: 'var(--gray)' }}>最佳: {bestSet.weight}kg × {bestSet.reps}次</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
