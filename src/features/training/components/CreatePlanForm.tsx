import { useState, useEffect } from 'react';
import { Button, Input, Select, Space, Card, Tag } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { db } from '../../../core/db';
import type { WorkoutPlan, PlanExercise, Exercise } from '../../../core/types';
import { v4 as uuid } from 'uuid';

interface Props {
  onSave: (plan: WorkoutPlan) => Promise<void>;
  onCancel: () => void;
}

export default function CreatePlanForm({ onSave, onCancel }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [exerciseItems, setExerciseItems] = useState<ExerciseItem[]>([
    { exerciseId: '', targetSets: 4, targetReps: '8-12', restSeconds: 90 },
  ]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    db.exercises.toArray().then(setAllExercises);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;

    const exercises: PlanExercise[] = exerciseItems
      .filter((item) => item.exerciseId)
      .map((item, i) => ({
        exerciseId: item.exerciseId,
        order: i + 1,
        targetSets: item.targetSets,
        targetReps: item.targetReps,
        setType: 'working' as const,
        restSeconds: item.restSeconds,
      }));

    const plan: WorkoutPlan = {
      id: uuid(),
      name: name.trim(),
      description: description.trim() || undefined,
      exercises,
      warmupExercises: [],
      cooldownExercises: [],
      scheduledDate,
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await onSave(plan);
  };

  const addExerciseItem = () => {
    setExerciseItems([
      ...exerciseItems,
      { exerciseId: '', targetSets: 4, targetReps: '8-12', restSeconds: 90 },
    ]);
  };

  const removeExerciseItem = (index: number) => {
    setExerciseItems(exerciseItems.filter((_, i) => i !== index));
  };

  const updateExerciseItem = (index: number, field: keyof ExerciseItem, value: string | number) => {
    const items = [...exerciseItems];
    items[index] = { ...items[index], [field]: value };
    setExerciseItems(items);
  };

  const exerciseOptions = allExercises.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>计划名称</label>
        <Input
          placeholder="如：胸部训练日"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>描述（可选）</label>
        <Input.TextArea
          placeholder="简要描述训练重点"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>计划日期</label>
        <Input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>训练动作</label>
          <Button type="link" size="small" icon={<PlusOutlined />} onClick={addExerciseItem}>
            添加动作
          </Button>
        </div>

        {exerciseItems.map((item, index) => (
          <div
            key={index}
            style={{
              background: 'var(--gray-bg)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Tag color="blue">动作 {index + 1}</Tag>
              {exerciseItems.length > 1 && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeExerciseItem(index)}
                />
              )}
            </div>

            <Select
              placeholder="选择动作"
              value={item.exerciseId || undefined}
              onChange={(val) => updateExerciseItem(index, 'exerciseId', val)}
              options={exerciseOptions}
              showSearch
              optionFilterProp="label"
              style={{ width: '100%', marginBottom: 8 }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--gray)' }}>组数</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={item.targetSets}
                  onChange={(e) => updateExerciseItem(index, 'targetSets', parseInt(e.target.value) || 3)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--gray)' }}>次数</label>
                <Input
                  value={item.targetReps}
                  onChange={(e) => updateExerciseItem(index, 'targetReps', e.target.value)}
                  placeholder="8-12"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--gray)' }}>休息(秒)</label>
                <Input
                  type="number"
                  min={30}
                  step={10}
                  value={item.restSeconds}
                  onChange={(e) => updateExerciseItem(index, 'restSeconds', parseInt(e.target.value) || 90)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Button style={{ flex: 1 }} onClick={onCancel}>取消</Button>
        <Button type="primary" style={{ flex: 1 }} onClick={handleSave} disabled={!name.trim()}>
          保存计划
        </Button>
      </div>
    </div>
  );
}

interface ExerciseItem {
  exerciseId: string;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
}
