import { useState, useEffect, useCallback } from 'react';
import { Input, Tag, Drawer, Button, Space, Divider, message, Spin } from 'antd';
import { SearchOutlined, RobotOutlined, CloseOutlined } from '@ant-design/icons';
import { useExerciseStore } from '../../core/stores';
import { loadBuiltInExercises } from '../exercises/data/builtInExercises';
import { getExerciseRecommendation, getAIConfig, getOfflineExerciseRecommendation } from '../../core/services/ai';
import type { Exercise, MuscleGroup } from '../../core/types';

const muscleGroupLabels: Record<string, string> = {
  all: '全部',
  chest: '胸部',
  back: '背部',
  shoulder: '肩部',
  arm: '手臂',
  core: '核心',
  leg: '腿部',
};

export default function ExercisePage() {
  const { exercises, filteredExercises, filter, loading, loadExercises, setFilter } = useExerciseStore();
  const [activeFilter, setActiveFilter] = useState('all');
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState('');

  // Load built-in exercises on first render
  useEffect(() => {
    const init = async () => {
      await loadExercises();
      // If no exercises in DB, load built-in data
      if (exercises.length === 0) {
        await loadBuiltInExercises();
        await loadExercises();
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = useCallback((group: string) => {
    setActiveFilter(group);
    if (group === 'all') {
      setFilter({ ...filter, muscleGroup: undefined });
    } else {
      setFilter({ ...filter, muscleGroup: group as MuscleGroup });
    }
  }, [filter, setFilter]);

  const handleSearch = useCallback((value: string) => {
    setFilter({ ...filter, search: value || undefined });
  }, [filter, setFilter]);

  const handleAIRecommend = useCallback(async () => {
    setAiDrawerOpen(true);
    setAiLoading(true);
    setAiContent('');

    const goalMap: Record<string, string> = {
      muscle_gain: '增肌', fat_loss: '减脂', body_recomposition: '塑形', endurance: '耐力', flexibility: '柔韧',
    };
    const levelMap: Record<string, string> = {
      beginner: '初学', intermediate: '中级', advanced: '高级',
    };
    const targetMuscle = filter.muscleGroup ? muscleGroupLabels[filter.muscleGroup] : undefined;

    const config = getAIConfig();
    const goal = goalMap['muscle_gain'] || '增肌'; // default
    const level = levelMap['intermediate'] || '中级'; // default

    if (!config.enabled || !config.apiKey) {
      const offline = getOfflineExerciseRecommendation({ goal, level, targetMuscle });
      setAiContent(offline);
      setAiLoading(false);
      return;
    }

    try {
      const resp = await getExerciseRecommendation({
        goal, level, targetMuscle,
        currentPlan: filter.muscleGroup ? `正在浏览${muscleGroupLabels[filter.muscleGroup]}动作` : undefined,
      });
      if (resp.error) {
        setAiContent(`获取 AI 推荐失败：${resp.error}\n\n${getOfflineExerciseRecommendation({ goal, level, targetMuscle })}`);
      } else {
        setAiContent(resp.content);
      }
    } catch (err: any) {
      setAiContent(`AI 服务异常：${err.message}\n\n${getOfflineExerciseRecommendation({ goal, level, targetMuscle })}`);
    }
    setAiLoading(false);
  }, [filter.muscleGroup]);

  const showDetail = useCallback((exercise: Exercise) => {
    setDetailExercise(exercise);
    setDrawerOpen(true);
  }, []);

  const displayExercises = filteredExercises.length > 0 || filter.search || filter.muscleGroup
    ? filteredExercises
    : exercises;

  return (
    <div className="page active" id="page-exercises">
      <div className="page-header">
        <h1>动作库</h1>
        <div className="subtitle">{exercises.length}+ 动作 · 内置库 + AI推荐</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--gray)' }} />}
            placeholder="搜索动作、肌肉群、器械..."
            allowClear
            onChange={(e) => handleSearch(e.target.value)}
            style={{ flex: 1, borderRadius: 10 }}
          />
          <Button
            type="primary"
            icon={<RobotOutlined />}
            size="small"
            onClick={handleAIRecommend}
          >
            AI推荐
          </Button>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, paddingTop: 4 }}>
          {Object.entries(muscleGroupLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleFilterChange(key)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 13,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: 'none',
                background: activeFilter === key ? 'var(--primary)' : 'var(--gray-bg)',
                color: activeFilter === key ? 'white' : 'var(--gray)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>加载中...</div>
        ) : (
          displayExercises.map((exercise) => (
            <ExerciseListItem
              key={exercise.id}
              exercise={exercise}
              onClick={() => showDetail(exercise)}
            />
          ))
        )}

        {!loading && displayExercises.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
            未找到匹配的动作
          </div>
        )}
      </div>

      {/* Exercise Detail Drawer */}
      <Drawer
        title={detailExercise?.name}
        placement="bottom"
        styles={{ wrapper: { height: '85%' }, body: { padding: '16px 20px' } }}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {detailExercise && <ExerciseDetail exercise={detailExercise} />}
      </Drawer>

      {/* AI Recommendation Drawer */}
      <Drawer
        title={<span><RobotOutlined style={{ marginRight: 8, color: 'var(--primary)' }} />AI 动作推荐</span>}
        placement="bottom"
        styles={{ wrapper: { height: '70%' }, body: { padding: '16px 20px' } }}
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        extra={<Button type="text" icon={<CloseOutlined />} onClick={() => setAiDrawerOpen(false)} />}
      >
        {aiLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <div style={{ marginTop: 12, color: 'var(--gray)' }}>AI 正在为你生成推荐...</div>
          </div>
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14 }}>
            {aiContent}
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ---- Sub-components ----

function ExerciseListItem({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const primaryMuscle = exercise.muscles.find((m) => m.isPrimary);
  const secondaryMuscles = exercise.muscles.filter((m) => !m.isPrimary);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
      }}
    >
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 10,
        background: 'var(--gray-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        flexShrink: 0,
      }}>
        🏋️
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{exercise.name}</div>
        <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
          {exercise.equipment.join(' · ')} · {exercise.recommendedSets.intermediate}组推荐
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {primaryMuscle && (
            <Tag color="blue">{primaryMuscle.subMuscle || muscleGroupLabels[primaryMuscle.muscle]}</Tag>
          )}
          {secondaryMuscles.map((m, i) => (
            <Tag key={i} color="orange">{m.subMuscle || muscleGroupLabels[m.muscle]}</Tag>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const primaryMuscle = exercise.muscles.find((m) => m.isPrimary);
  const secondaryMuscles = exercise.muscles.filter((m) => !m.isPrimary);

  return (
    <div>
      {exercise.nameEn && (
        <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16 }}>
          {exercise.nameEn} · {exercise.source === 'built_in' ? '内置库' : exercise.source === 'ai_generated' ? 'AI推荐' : '自定义'}
        </div>
      )}

      {/* Equipment */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>
          🏋️ 使用器械
        </div>
        <Space wrap>
          {exercise.equipment.map((eq) => (
            <Tag key={eq} color="blue">{eq}</Tag>
          ))}
        </Space>
      </div>

      {/* Muscles */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>
          💪 目标肌肉
        </div>
        <Space wrap>
          {primaryMuscle && (
            <Tag color="blue" style={{ fontWeight: 700 }}>
              ⭐ {primaryMuscle.subMuscle || muscleGroupLabels[primaryMuscle.muscle]}（主练）
            </Tag>
          )}
          {secondaryMuscles.map((m, i) => (
            <Tag key={i} color="orange">
              {m.subMuscle || muscleGroupLabels[m.muscle]}（辅助）
            </Tag>
          ))}
        </Space>
      </div>

      {/* Steps */}
      {exercise.steps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>
            📝 动作步骤
          </div>
          {exercise.steps.map((step) => (
            <div key={step.order} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {step.order}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, paddingTop: 2 }}>
                {step.instruction}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Risks */}
      {exercise.risks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>
            ⚠️ 风险提示
          </div>
          <div style={{ background: 'var(--red-bg)', borderRadius: 8, padding: 12 }}>
            {exercise.risks.map((risk, i) => (
              <div key={i} style={{ color: 'var(--red)', fontSize: 13, lineHeight: 1.5 }}>
                • {risk.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Sets */}
      <Divider />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>
        📈 推荐组数
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { label: '新手', sets: exercise.recommendedSets.beginner },
          { label: '中级', sets: exercise.recommendedSets.intermediate, highlight: true },
          { label: '高级', sets: exercise.recommendedSets.advanced },
        ].map((level) => (
          <div
            key={level.label}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: 10,
              background: 'var(--white)',
              borderRadius: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: level.highlight ? '2px solid var(--primary)' : 'none',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>{level.sets}</div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
              {level.label}{level.highlight ? ' ✓' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
