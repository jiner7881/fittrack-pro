import { useState, useEffect, useCallback } from 'react';
import { Input, Tag, Drawer, Button, Space, Divider, message, Spin, Select, Modal } from 'antd';
import { SearchOutlined, RobotOutlined, CloseOutlined, PlusOutlined, LinkOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useExerciseStore } from '../../core/stores';
import { loadBuiltInExercises } from '../exercises/data/builtInExercises';
import { getExerciseRecommendation, getAIConfig, getOfflineExerciseRecommendation } from '../../core/services/ai';
import type { Exercise, MuscleGroup, ExerciseCategory, EquipmentType } from '../../core/types';
import { db } from '../../core/db';
import { v4 as uuid } from 'uuid';
import { parseBilibiliUrl, isBilibiliUrl, getVideoEmbedUrl, getVideoSourceName } from '../../core/utils/videoUtils';

const muscleGroupLabels: Record<string, string> = {
  all: '全部',
  chest: '胸部',
  back: '背部',
  shoulder: '肩部',
  arm: '手臂',
  core: '核心',
  leg: '腿部',
};

const equipmentLabels: Record<string, string> = {
  barbell: '杠铃',
  dumbbell: '哑铃',
  cable: '绳索',
  machine: '固定器械',
  bodyweight: '自重',
  kettlebell: '壶铃',
  band: '弹力带',
  other: '其他',
};

const categoryLabels: Record<string, string> = {
  compound: '复合动作',
  isolation: '孤立动作',
  cardio: '有氧',
  flexibility: '柔韧/拉伸',
  warmup: '热身',
};

export default function ExercisePage() {
  const { exercises, filteredExercises, filter, loading, loadExercises, setFilter, addExercise } = useExerciseStore();
  const [activeFilter, setActiveFilter] = useState('all');
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

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

  const handleCreateFromVideo = useCallback((videoUrl: string) => {
    setCreateOpen(true);
    // Pre-fill video URL in the form by passing it as state
  }, []);

  const displayExercises = filteredExercises.length > 0 || filter.search || filter.muscleGroup
    ? filteredExercises
    : exercises;

  return (
    <div className="page active" id="page-exercises">
      <div className="page-header">
        <h1>动作库</h1>
        <div className="subtitle">{exercises.length} 个动作 · 内置 + 自建 + 视频</div>
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

        {/* Create buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button
            icon={<PlusOutlined />}
            block
            onClick={() => setCreateOpen(true)}
            style={{ borderRadius: 10 }}
          >
            自建动作
          </Button>
          <Button
            icon={<LinkOutlined />}
            block
            onClick={() => {
              // Prompt for video URL using a simple approach
              const url = prompt('请输入视频链接（支持B站、YouTube）：');
              if (url) {
                setCreateOpen(true);
                // Store URL for the form
                sessionStorage.setItem('_fittrack_video_url', url);
              }
            }}
            style={{ borderRadius: 10 }}
          >
            从视频创建
          </Button>
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

      {/* Create Exercise Modal */}
      <CreateExerciseDrawer
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          sessionStorage.removeItem('_fittrack_video_url');
        }}
        onSave={async (exercise) => {
          await addExercise(exercise);
          await loadExercises();
          message.success(`动作 "${exercise.name}" 已添加`);
          setCreateOpen(false);
          sessionStorage.removeItem('_fittrack_video_url');
        }}
      />
    </div>
  );
}

// ---- Exercise List Item ----

function ExerciseListItem({ exercise, onClick }: { exercise: Exercise; onClick: () => void }) {
  const primaryMuscle = exercise.muscles.find((m) => m.isPrimary);
  const secondaryMuscles = exercise.muscles.filter((m) => !m.isPrimary);
  const hasVideo = !!exercise.videoUrl;

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
        background: hasVideo ? 'linear-gradient(135deg, #FB7299, #FC9DB5)' : 'var(--gray-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: hasVideo ? 20 : 26,
        flexShrink: 0,
        position: 'relative',
      }}>
        {hasVideo ? '▶' : '🏋️'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {exercise.name}
          {exercise.source === 'user_created' && <Tag color="purple" style={{ fontSize: 9, margin: 0 }}>自建</Tag>}
          {hasVideo && <Tag color="magenta" style={{ fontSize: 9, margin: 0 }}>视频</Tag>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
          {exercise.equipment.map((e) => equipmentLabels[e] || e).join(' · ')} · {categoryLabels[exercise.category] || exercise.category}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {primaryMuscle && (
            <Tag color="blue">{primaryMuscle.subMuscle || muscleGroupLabels[primaryMuscle.muscle]}</Tag>
          )}
          {secondaryMuscles.slice(0, 2).map((m, i) => (
            <Tag key={i} color="orange">{m.subMuscle || muscleGroupLabels[m.muscle]}</Tag>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Exercise Detail ----

function ExerciseDetail({ exercise }: { exercise: Exercise }) {
  const primaryMuscle = exercise.muscles.find((m) => m.isPrimary);
  const secondaryMuscles = exercise.muscles.filter((m) => !m.isPrimary);
  const videoEmbedUrl = exercise.videoUrl ? getVideoEmbedUrl(exercise.videoUrl) : null;

  return (
    <div>
      {exercise.nameEn && (
        <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16 }}>
          {exercise.nameEn} · {exercise.source === 'built_in' ? '内置库' : exercise.source === 'ai_generated' ? 'AI推荐' : exercise.source === 'user_created' ? '自建动作' : '自定义'}
        </div>
      )}

      {/* Video Player */}
      {videoEmbedUrl && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <PlayCircleOutlined />
            动作演示 · {getVideoSourceName(exercise.videoUrl || '')}
          </div>
          <div style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '56.25%', // 16:9
            borderRadius: 10,
            overflow: 'hidden',
            background: '#000',
          }}>
            <iframe
              src={videoEmbedUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Equipment */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>
          🏋️ 使用器械
        </div>
        <Space wrap>
          {exercise.equipment.map((eq) => (
            <Tag key={eq} color="blue">{equipmentLabels[eq] || eq}</Tag>
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

      {/* Tips */}
      {exercise.tips && exercise.tips.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>
            💡 训练要点
          </div>
          <div style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: 12 }}>
            {exercise.tips.map((tip, i) => (
              <div key={i} style={{ color: 'var(--primary)', fontSize: 13, lineHeight: 1.5 }}>
                • {tip}
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

// ---- Create Exercise Drawer ----

function CreateExerciseDrawer({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (exercise: Exercise) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('compound');
  const [equipment, setEquipment] = useState<EquipmentType[]>(['dumbbell']);
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('chest');
  const [primarySubMuscle, setPrimarySubMuscle] = useState('');
  const [secondaryMuscles, setSecondaryMuscles] = useState<string>('');
  const [steps, setSteps] = useState('');
  const [risks, setRisks] = useState('');
  const [tips, setTipsText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [beginnerSets, setBeginnerSets] = useState(3);
  const [intermediateSets, setIntermediateSets] = useState(4);
  const [advancedSets, setAdvancedSets] = useState(5);
  const [targetReps, setTargetReps] = useState('8-12');
  const [saving, setSaving] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);

  // Load video URL from sessionStorage on mount
  useEffect(() => {
    if (open) {
      const savedUrl = sessionStorage.getItem('_fittrack_video_url');
      if (savedUrl) {
        setVideoUrl(savedUrl);
        // Try to auto-parse video info
        handleParseVideo(savedUrl);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form on close
  const handleClose = () => {
    setName(''); setNameEn(''); setCategory('compound');
    setEquipment(['dumbbell']); setPrimaryMuscle('chest');
    setPrimarySubMuscle(''); setSecondaryMuscles('');
    setSteps(''); setRisks(''); setTipsText('');
    setVideoUrl(''); setBeginnerSets(3); setIntermediateSets(4);
    setAdvancedSets(5); setTargetReps('8-12');
    setAiParsing(false); setSaving(false);
    onClose();
  };

  const handleParseVideo = async (url: string) => {
    if (!url) return;
    setAiParsing(true);

    // Extract video title and info using AI
    const config = getAIConfig();
    const bilibiliInfo = parseBilibiliUrl(url);

    // Build a prompt for AI to extract exercise info from video
    let videoContext = '';
    if (bilibiliInfo) {
      videoContext = `用户从B站导入了一个健身视频链接（BV号：${bilibiliInfo.bvid}）。视频链接：${url}`;
    } else {
      videoContext = `用户输入了一个健身视频链接：${url}`;
    }

    if (config.enabled && config.apiKey) {
      try {
        // Use AI to parse video info
        const apiUrl = `${config.baseUrl}/chat/completions`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: 'system',
                content: '你是一个健身动作分析助手。用户会给你一个健身视频链接，请你根据链接中的信息（如标题、描述等），推断出视频展示的健身动作，并以JSON格式返回动作信息。如果无法确定，就根据视频标题猜测。回复必须是纯JSON，不要有其他文字。',
              },
              {
                role: 'user',
                content: `${videoContext}\n\n请根据视频标题和描述，提取一个健身动作的信息，返回JSON格式：\n{"name":"动作中文名","nameEn":"英文名","category":"compound或isolation","primaryMuscle":"chest/back/shoulder/arm/leg/core","primarySubMuscle":"具体肌肉如胸大肌中部","secondaryMuscles":"辅助肌肉，逗号分隔","steps":"动作步骤，每步一行","risks":"风险提示，每条一行","tips":"训练要点，每条一行","equipment":["dumbbell"]}\n\n可选equipment: barbell,dumbbell,cable,machine,bodyweight,kettlebell,band,other\n可选category: compound,isolation,cardio,flexibility,warmup`,
              },
            ],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '';
          // Try to extract JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.name) setName(parsed.name);
            if (parsed.nameEn) setNameEn(parsed.nameEn);
            if (parsed.category) setCategory(parsed.category as ExerciseCategory);
            if (parsed.primaryMuscle) setPrimaryMuscle(parsed.primaryMuscle as MuscleGroup);
            if (parsed.primarySubMuscle) setPrimarySubMuscle(parsed.primarySubMuscle);
            if (parsed.secondaryMuscles) setSecondaryMuscles(parsed.secondaryMuscles);
            if (parsed.steps) setSteps(parsed.steps);
            if (parsed.risks) setRisks(parsed.risks);
            if (parsed.tips) setTipsText(parsed.tips);
            if (parsed.equipment && Array.isArray(parsed.equipment)) setEquipment(parsed.equipment);
            message.success('AI 已从视频提取动作信息，请检查并修改');
          }
        }
      } catch (err) {
        message.info('AI 解析失败，请手动填写信息');
      }
    } else {
      // No AI - try basic URL title parsing
      if (bilibiliInfo) {
        message.info('已识别B站视频，请手动填写动作信息。配置AI后可自动提取。');
      }
    }
    setAiParsing(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      message.warning('请输入动作名称');
      return;
    }

    setSaving(true);
    const now = Date.now();

    const exercise: Exercise = {
      id: `user-${uuid().slice(0, 8)}`,
      name: name.trim(),
      nameEn: nameEn.trim() || undefined,
      category,
      equipment,
      muscles: [
        { muscle: primaryMuscle, subMuscle: primarySubMuscle || undefined, isPrimary: true },
        ...secondaryMuscles.split(/[,，、]/).filter(Boolean).map((m) => ({
          muscle: primaryMuscle, // Simplified - user can specify exact muscle
          subMuscle: m.trim() || undefined,
          isPrimary: false as const,
        })),
      ],
      steps: steps.split('\n').filter(Boolean).map((s, i) => ({
        order: i + 1,
        instruction: s.trim(),
      })),
      risks: risks.split('\n').filter(Boolean).map((s) => ({
        level: 'medium' as const,
        description: s.trim(),
      })),
      tips: tips.split('\n').filter(Boolean).length > 0
        ? tips.split('\n').filter(Boolean).map((s) => s.trim())
        : undefined,
      videoUrl: videoUrl.trim() || undefined,
      source: 'user_created',
      recommendedSets: {
        beginner: beginnerSets,
        intermediate: intermediateSets,
        advanced: advancedSets,
      },
      recommendedReps: targetReps,
      createdAt: now,
      updatedAt: now,
    };

    await onSave(exercise);
    setSaving(false);
  };

  return (
    <Drawer
      title="创建动作"
      placement="bottom"
      styles={{ wrapper: { height: '90%' }, body: { padding: '16px 20px', overflowY: 'auto' } }}
      open={open}
      onClose={handleClose}
      extra={
        <Button type="primary" loading={saving} onClick={handleSave}>
          保存
        </Button>
      }
    >
      {/* Video URL Input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <LinkOutlined style={{ color: 'var(--primary)' }} />
          视频链接（支持B站、YouTube）
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="https://www.bilibili.com/video/BV..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            style={{ flex: 1, borderRadius: 8 }}
          />
          <Button
            type="primary"
            loading={aiParsing}
            onClick={() => handleParseVideo(videoUrl)}
            style={{ borderRadius: 8 }}
          >
            {aiParsing ? '解析中' : '解析'}
          </Button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>
          粘贴链接后点击"解析"，AI将自动提取动作信息；也可直接手动填写
        </div>
      </div>

      {/* Name */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>动作名称 *</div>
        <Input placeholder="如：杠铃卧推" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>英文名</div>
        <Input placeholder="Barbell Bench Press" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
      </div>

      {/* Category & Equipment */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>动作类型</div>
          <Select value={category} onChange={setCategory} style={{ width: '100%' }} options={
            Object.entries(categoryLabels).map(([k, v]) => ({ value: k, label: v }))
          } />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>器械</div>
          <Select
            mode="multiple"
            value={equipment}
            onChange={(v) => setEquipment(v)}
            style={{ width: '100%' }}
            options={Object.entries(equipmentLabels).map(([k, v]) => ({ value: k, label: v }))}
          />
        </div>
      </div>

      {/* Muscles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>主练部位</div>
          <Select value={primaryMuscle} onChange={setPrimaryMuscle} style={{ width: '100%' }} options={
            Object.entries(muscleGroupLabels).filter(([k]) => k !== 'all').map(([k, v]) => ({ value: k, label: v }))
          } />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>具体肌肉</div>
          <Input placeholder="如：胸大肌中部" value={primarySubMuscle} onChange={(e) => setPrimarySubMuscle(e.target.value)} />
        </div>
      </div>

      {/* Secondary muscles */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>辅助肌肉（逗号分隔）</div>
        <Input placeholder="前束, 肱三头肌" value={secondaryMuscles} onChange={(e) => setSecondaryMuscles(e.target.value)} />
      </div>

      {/* Steps */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>动作步骤（每行一步）</div>
        <Input.TextArea
          placeholder={"仰卧在卧推凳上\\n双手正握杠铃\\n控制下放至胸口\\n发力上推至手臂伸直"}
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          rows={4}
          style={{ borderRadius: 8 }}
        />
      </div>

      {/* Risks */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>风险提示（每行一条，可选）</div>
        <Input.TextArea
          placeholder={"大重量必须有保护\\n肩部有伤者建议用哑铃替代"}
          value={risks}
          onChange={(e) => setRisks(e.target.value)}
          rows={2}
          style={{ borderRadius: 8 }}
        />
      </div>

      {/* Tips */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>训练要点（每行一条，可选）</div>
        <Input.TextArea
          placeholder={"下放速度不宜过快\\n顶峰收缩停顿1秒"}
          value={tips}
          onChange={(e) => setTipsText(e.target.value)}
          rows={2}
          style={{ borderRadius: 8 }}
        />
      </div>

      {/* Recommended Sets */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>推荐组数</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: '新手', value: beginnerSets, setter: setBeginnerSets },
            { label: '中级', value: intermediateSets, setter: setIntermediateSets },
            { label: '高级', value: advancedSets, setter: setAdvancedSets },
          ].map((item) => (
            <div key={item.label} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 4 }}>{item.label}</div>
              <Input
                type="number"
                min={1}
                max={10}
                value={item.value}
                onChange={(e) => item.setter(parseInt(e.target.value) || 3)}
                style={{ textAlign: 'center' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Target Reps */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>推荐次数</div>
        <Input placeholder="8-12" value={targetReps} onChange={(e) => setTargetReps(e.target.value)} />
      </div>
    </Drawer>
  );
}
