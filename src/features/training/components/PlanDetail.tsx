import type { WorkoutPlan } from '../../../core/types';
import { db } from '../../../core/db';
import { useState, useEffect } from 'react';

interface Props {
  plan: WorkoutPlan;
}

export default function PlanDetail({ plan }: Props) {
  const [exerciseNames, setExerciseNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadNames = async () => {
      const ids = [
        ...plan.warmupExercises.map((e) => e.exerciseId),
        ...plan.exercises.map((e) => e.exerciseId),
        ...plan.cooldownExercises.map((e) => e.exerciseId),
      ];
      const docs = await db.exercises.bulkGet(ids);
      const map: Record<string, string> = {};
      docs.forEach((doc, i) => {
        if (doc) map[ids[i]] = doc.name;
      });
      setExerciseNames(map);
    };
    loadNames();
  }, [plan]);

  return (
    <div>
      {plan.description && (
        <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16, lineHeight: 1.5 }}>
          {plan.description}
        </div>
      )}

      {/* Warmup */}
      {plan.warmupExercises.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            🌱 热身
          </div>
          {plan.warmupExercises.map((pe, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'var(--green-bg)', borderRadius: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{exerciseNames[pe.exerciseId] || pe.exerciseId}</div>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>{pe.targetSets}组 × {pe.targetReps}次</div>
            </div>
          ))}
        </div>
      )}

      {/* Main exercises */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          💪 正式训练
        </div>
        {plan.exercises.map((pe, i) => (
          <div key={i} style={{ padding: '10px 12px', background: 'var(--gray-bg)', borderRadius: 8, marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {i + 1}. {exerciseNames[pe.exerciseId] || pe.exerciseId}
              </div>
              <span style={{ fontSize: 11, color: 'var(--gray)', background: 'var(--primary-bg)', padding: '2px 8px', borderRadius: 10 }}>
                {pe.setType === 'warmup' ? '热身' : '正式'}组
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
              {pe.targetSets}组 × {pe.targetReps}次 · 休息{pe.restSeconds}秒
            </div>
            {pe.notes && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 2, fontStyle: 'italic' }}>
                {pe.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cooldown */}
      {plan.cooldownExercises.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#8E44AD', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            🧘 拉伸放松
          </div>
          {plan.cooldownExercises.map((pe, i) => (
            <div key={i} style={{ padding: '8px 12px', background: '#F5EEF8', borderRadius: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{exerciseNames[pe.exerciseId] || pe.exerciseId}</div>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>{pe.targetSets}组 × {pe.targetReps}次</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
