import { useState, useEffect } from 'react';
import { Button, Tag, Drawer, Modal } from 'antd';
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import { useWorkoutStore } from '../../core/stores';
import { db } from '../../core/db';
import type { WorkoutPlan } from '../../core/types';
import PlanDetail from './components/PlanDetail';
import CreatePlanForm from './components/CreatePlanForm';
import WorkoutActiveScreen from './components/WorkoutActiveScreen';
import { useWorkoutSessionStore } from '../../core/stores/workoutSession';
import type { ExerciseLog } from '../../core/types';
import { v4 as uuid } from 'uuid';

export default function TrainingPage() {
  const { plans, loading, loadPlans, addPlan } = useWorkoutStore();
  const { session, isDrawerOpen } = useWorkoutSessionStore();
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            />
          ))
        )}

        {todayPlans.length === 0 && (
          <Button type="primary" block onClick={() => setCreateOpen(true)} style={{ marginTop: 8 }}>
            <PlusOutlined /> 快速开始训练
          </Button>
        )}
      </div>

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
            await addPlan(plan);
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
  showDate,
}: {
  plan: WorkoutPlan;
  muscleColors: Record<string, string>;
  onView: () => void;
  onStart?: () => void;
  showDate?: boolean;
}) {
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
        background: 'var(--gray-bg)',
        borderRadius: 10,
        marginBottom: 8,
        cursor: 'pointer',
      }}
      onClick={onView}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 10,
        background: muscleColors[primaryMuscle] || 'var(--primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        color: 'white',
      }}>
        {emoji}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{plan.name}</div>
        <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
          {plan.exercises.length}个动作 · {totalWorkingSets}组
          {totalWarmupSets > 0 && ` · 热身${totalWarmupSets}组`}
          {plan.cooldownExercises.length > 0 && ` · 拉伸${plan.cooldownExercises.length}`}
          {showDate && plan.scheduledDate && ` · ${formatDate(plan.scheduledDate)}`}
        </div>
      </div>
      {onStart && (
        <Button type="primary" size="small" onClick={(e) => { e.stopPropagation(); onStart(); }}>
          开始
        </Button>
      )}
    </div>
  );
}
