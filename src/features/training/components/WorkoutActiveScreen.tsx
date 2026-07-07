import { useEffect, useRef, useCallback } from 'react';
import { Button, Tag, Modal } from 'antd';
import {
  CloseOutlined,
  ForwardOutlined,
  AudioOutlined,
  CheckOutlined,
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useWorkoutSessionStore } from '../../../core/stores/workoutSession';
import type { ExerciseSetLog } from '../../../core/types';

export default function WorkoutActiveScreen() {
  const {
    session,
    endSession,
    cancelSession,
    updateSet,
    addSet,
    nextExercise,
    prevExercise,
    setCurrentExercise,
    setTimerSeconds,
    setTimerRunning,
    adjustTimer,
  } = useWorkoutSessionStore();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer tick
  useEffect(() => {
    if (session?.timerRunning) {
      timerRef.current = setInterval(() => {
        const s = useWorkoutSessionStore.getState().session;
        if (s && s.timerSeconds > 0) {
          setTimerSeconds(s.timerSeconds - 1);
        } else {
          setTimerRunning(false);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.timerRunning, setTimerSeconds, setTimerRunning]);

  if (!session) return null;

  const currentEx = session.exercises[session.currentExerciseIndex];
  const completedExercises = session.exercises.filter((ex) =>
    ex.sets.length > 0 && ex.sets.every((s) => s.isCompleted)
  ).length;
  const totalExercises = session.exercises.length;
  const progressPercent = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  // Timer display
  const minutes = Math.floor(session.timerSeconds / 60).toString().padStart(2, '0');
  const seconds = (session.timerSeconds % 60).toString().padStart(2, '0');

  // Elapsed time
  const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;

  const handleToggleSet = useCallback((setIndex: number) => {
    if (!currentEx) return;
    const set = currentEx.sets[setIndex];
    const isNowCompleted = !set.isCompleted;
    updateSet(session.currentExerciseIndex, setIndex, {
      isCompleted: isNowCompleted,
      completedAt: isNowCompleted ? Date.now() : undefined,
    });
    if (isNowCompleted) {
      setTimerRunning(true);
      setTimerSeconds(90);
    }
  }, [currentEx, session?.currentExerciseIndex, updateSet, setTimerRunning, setTimerSeconds]);

  const handleFinish = useCallback(async () => {
    Modal.confirm({
      title: '完成训练',
      content: '确定结束本次训练吗？',
      okText: '完成',
      cancelText: '继续训练',
      onOk: async () => {
        const log = await endSession();
        if (log) {
          Modal.success({
            title: '训练完成！',
            content: (
              <div>
                <div>训练时长：{Math.floor((log.totalDuration || 0) / 60)}分钟</div>
                <div>总容量：{log.totalVolume?.toLocaleString() || 0}kg</div>
                <div>完成动作：{log.exercises.length}个</div>
                <div>消耗热量：约{log.estimatedCalories || 0}kcal</div>
              </div>
            ),
          });
        }
      },
    });
  }, [endSession]);

  const handleCancel = useCallback(() => {
    Modal.confirm({
      title: '放弃训练',
      content: '确定放弃本次训练吗？记录将不会保存。',
      okText: '放弃',
      okType: 'danger',
      cancelText: '继续训练',
      onOk: cancelSession,
    });
  }, [cancelSession]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'var(--white)',
      zIndex: 300,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #eee',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>
          {session.planName || '自由训练'} · 进行中
        </span>
        <Button type="text" icon={<CloseOutlined />} onClick={handleCancel} />
      </div>

      {/* Progress bar */}
      <div style={{ padding: '10px 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--gray)' }}>训练进度</span>
        <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'var(--primary)',
            borderRadius: 3,
            transition: 'width 0.5s',
          }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
          {completedExercises}/{totalExercises}
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>
        {/* Rest Timer */}
        <div style={{ textAlign: 'center', padding: '20px 20px 10px' }}>
          <div style={{ fontSize: 12, color: 'var(--gray)' }}>
            组间休息 · 已训练 {elapsedMin}:{elapsedSec.toString().padStart(2, '0')}
          </div>
          <div style={{
            fontSize: 56,
            fontWeight: 800,
            color: session.timerSeconds <= 10 ? 'var(--red)' : 'var(--primary)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'monospace',
          }}>
            {minutes}:{seconds}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
            <Button size="small" onClick={() => adjustTimer(-10)}>-10s</Button>
            <Button
              type="primary"
              size="small"
              onClick={() => setTimerRunning(!session.timerRunning)}
            >
              {session.timerRunning ? '暂停' : session.timerSeconds > 0 ? '继续' : '开始计时'}
            </Button>
            <Button size="small" onClick={() => adjustTimer(10)}>+10s</Button>
          </div>
        </div>

        {/* All exercises */}
        {session.exercises.map((exercise, exIndex) => {
          const isCurrent = exIndex === session.currentExerciseIndex;
          const isCompleted = exercise.sets.length > 0 && exercise.sets.every((s) => s.isCompleted);
          const completedSets = exercise.sets.filter((s) => s.isCompleted).length;
          const isUpcoming = exIndex > session.currentExerciseIndex;
          const isPast = exIndex < session.currentExerciseIndex;

          return (
            <div
              key={exIndex}
              onClick={() => !isCurrent && setCurrentExercise(exIndex)}
              style={{
                margin: '0 20px 14px',
                padding: '14px',
                background: isCurrent ? 'var(--white)' : isPast ? '#FAFAFA' : '#FAFAFA',
                border: isCurrent ? '2px solid var(--primary)' : '1px solid #f0f0f0',
                borderRadius: 10,
                opacity: isUpcoming ? 0.5 : 1,
                cursor: isCurrent ? 'default' : 'pointer',
              }}
            >
              {/* Exercise header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {isCurrent && <span style={{ color: 'var(--primary)' }}>▶</span>}
                <span style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? 'var(--primary)' : 'var(--dark)' }}>
                  {exIndex + 1}. {exercise.exerciseName}
                </span>
                <Tag color="blue" style={{ fontSize: 10 }}>{exercise.sets.length}组</Tag>
                {isCompleted && (
                  <Tag color="success" style={{ fontSize: 10, marginLeft: 'auto' }}>✓ 已完成</Tag>
                )}
                {!isCompleted && isCurrent && completedSets > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 600, marginLeft: 'auto' }}>
                    进行中 {completedSets}/{exercise.sets.length}
                  </span>
                )}
              </div>

              {/* Table header */}
              {(isCurrent || isPast) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 6px', borderBottom: '1px solid #eee', marginBottom: 4 }}>
                  <span style={{ width: 28, fontSize: 11, fontWeight: 600, color: 'var(--gray)' }}>组</span>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--gray)', textAlign: 'center' }}>重量</span>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: 'var(--gray)', textAlign: 'center' }}>次数</span>
                  <span style={{ width: 36, fontSize: 11, fontWeight: 600, color: 'var(--gray)', textAlign: 'center' }}>类型</span>
                  <span style={{ width: 28 }}></span>
                </div>
              )}

              {/* Sets */}
              {exercise.sets.map((set, setIndex) => {
                const isSetCurrent = isCurrent && !set.isCompleted && setIndex === exercise.sets.findIndex((s) => !s.isCompleted);

                return (
                  <SetRow
                    key={setIndex}
                    set={set}
                    isCurrent={isCurrent}
                    isSetCurrent={isSetCurrent}
                    onWeightChange={(val) => updateSet(exIndex, setIndex, { weight: val })}
                    onRepsChange={(val) => updateSet(exIndex, setIndex, { reps: val })}
                    onToggle={() => handleToggleSet(setIndex)}
                  />
                );
              })}

              {/* Add set button (only for current exercise) */}
              {isCurrent && (
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addSet(exIndex)}
                  style={{ width: '100%', marginTop: 6 }}
                >
                  添加一组
                </Button>
              )}

              {/* Exercise summary */}
              {isPast && isCompleted && (() => {
                const totalVol = exercise.sets.reduce((sum, s) => sum + (s.weight && s.reps ? s.weight * s.reps : 0), 0);
                const bestSet = exercise.sets.reduce((best, s) =>
                  (s.weight || 0) > (best?.weight || 0) ? s : best, exercise.sets[0]);
                return (
                  <div style={{ marginTop: 6, padding: '6px 10px', background: 'var(--primary-bg)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>总容量: {totalVol.toLocaleString()}kg</span>
                    <span style={{ color: 'var(--gray)' }}>最佳: {bestSet?.weight}kg × {bestSet?.reps}次</span>
                  </div>
                );
              })()}
            </div>
          );
        })}

        {/* Navigation between exercises */}
        <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginTop: 8 }}>
          <Button
            icon={<LeftOutlined />}
            onClick={prevExercise}
            disabled={session.currentExerciseIndex === 0}
            style={{ flex: 1 }}
          >
            上一个
          </Button>
          <Button
            type="default"
            onClick={nextExercise}
            disabled={session.currentExerciseIndex >= session.exercises.length - 1}
            style={{ flex: 1 }}
          >
            下一个 <RightOutlined />
          </Button>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', display: 'flex', gap: 10 }}>
        <Button icon={<ForwardOutlined />} style={{ flex: 1 }}>跳过</Button>
        <Button icon={<AudioOutlined />} style={{ flex: 1, color: 'var(--primary)' }}>语音</Button>
        <Button type="primary" style={{ flex: 1, background: 'var(--green)' }} onClick={handleFinish}>
          完成训练
        </Button>
      </div>
    </div>
  );
}

// ---- Set Row ----

function SetRow({
  set,
  isCurrent,
  isSetCurrent,
  onWeightChange,
  onRepsChange,
  onToggle,
}: {
  set: ExerciseSetLog;
  isCurrent: boolean;
  isSetCurrent: boolean;
  onWeightChange: (val: number | null) => void;
  onRepsChange: (val: number | null) => void;
  onToggle: () => void;
}) {
  const isDone = set.isCompleted;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 0',
      borderBottom: '1px solid #f5f5f5',
      background: isSetCurrent ? 'var(--primary-bg)' : set.setType === 'warmup' && !isDone && isCurrent ? 'var(--green-bg)' : 'transparent',
      borderRadius: isSetCurrent || (set.setType === 'warmup' && !isDone && isCurrent) ? 8 : 0,
      paddingLeft: isSetCurrent || (set.setType === 'warmup' && !isDone && isCurrent) ? 6 : 0,
      paddingRight: isSetCurrent || (set.setType === 'warmup' && !isDone && isCurrent) ? 6 : 0,
      opacity: isDone ? 0.7 : 1,
    }}>
      <span style={{ width: 28, fontSize: 13, fontWeight: 600, color: isSetCurrent ? 'var(--primary)' : 'var(--gray)' }}>
        {set.setNumber}
      </span>

      {isCurrent && !isDone ? (
        // Editable inputs
        <>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <input
              type="number"
              value={set.weight ?? ''}
              onChange={(e) => onWeightChange(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="kg"
              style={{
                width: 60,
                padding: '4px 6px',
                border: isSetCurrent ? '1.5px solid var(--primary)' : '1px solid #ddd',
                borderRadius: 4,
                fontSize: 14,
                textAlign: 'center',
                outline: 'none',
                fontWeight: isSetCurrent ? 700 : 400,
              }}
            />
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <input
              type="number"
              value={set.reps ?? ''}
              onChange={(e) => onRepsChange(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="次"
              style={{
                width: 48,
                padding: '4px 6px',
                border: isSetCurrent ? '1.5px solid var(--primary)' : '1px solid #ddd',
                borderRadius: 4,
                fontSize: 14,
                textAlign: 'center',
                outline: 'none',
                fontWeight: isSetCurrent ? 700 : 400,
              }}
            />
          </div>
        </>
      ) : (
        // Read-only display
        <>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
            {set.weight ?? '-'} <span style={{ fontSize: 11, color: 'var(--gray)' }}>kg</span>
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
            {set.reps ?? '-'} <span style={{ fontSize: 11, color: 'var(--gray)' }}>次</span>
          </div>
        </>
      )}

      <span style={{ width: 36, textAlign: 'center' }}>
        {set.setType === 'warmup' ? (
          <Tag color="green" style={{ fontSize: 9, margin: 0, padding: '0 4px' }}>热身</Tag>
        ) : (
          <span style={{ fontSize: 9, color: 'var(--gray)' }}>正式</span>
        )}
      </span>

      <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
        {isDone ? (
          <div style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--green)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}>✓</div>
        ) : isCurrent ? (
          <div
            onClick={onToggle}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: isSetCurrent ? '2.5px solid var(--primary)' : '2px solid #ddd',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #eee' }} />
        )}
      </div>
    </div>
  );
}
