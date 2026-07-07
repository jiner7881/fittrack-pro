import { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, Switch, Button, message, Drawer } from 'antd';
import { useUserStore, useBodyDataStore } from '../../core/stores';
import type { Gender, TrainingLevel, FitnessGoal, ActivityLevel } from '../../core/types';
import { db } from '../../core/db';
import { getAIConfig, setAIConfig } from '../../core/services/ai';

const trainingLevelMap: Record<TrainingLevel, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};

const fitnessGoalMap: Record<FitnessGoal, string> = {
  muscle_gain: '增肌',
  fat_loss: '减脂',
  recomposition: '增肌减脂',
  endurance: '耐力',
  general: '综合健康',
};

const activityLevelMap: Record<ActivityLevel, string> = {
  sedentary: '久坐',
  light: '轻度活动',
  moderate: '中度活动',
  active: '高度活动',
  very_active: '极高活动',
};

export default function ProfilePage() {
  const { profile, loadProfile, updateProfile } = useUserStore();
  const { huaweiConfig, loadHuaweiConfig, updateHuaweiConfig } = useBodyDataStore();
  const [editOpen, setEditOpen] = useState(false);
  const [huaweiOpen, setHuaweiOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadProfile();
    loadHuaweiConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditOpen = () => {
    if (profile) {
      form.setFieldsValue({
        nickname: profile.nickname,
        gender: profile.gender,
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        trainingLevel: profile.trainingLevel,
        fitnessGoal: profile.fitnessGoal,
        activityLevel: profile.activityLevel,
      });
    }
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    const values = form.getFieldsValue();
    // Calculate BMR using Mifflin-St Jeor
    let bmr = profile?.bmr;
    if (values.height && values.weight && values.age) {
      if (values.gender === 'male') {
        bmr = Math.round(10 * values.weight + 6.25 * values.height - 5 * values.age + 5);
      } else {
        bmr = Math.round(10 * values.weight + 6.25 * values.height - 5 * values.age - 161);
      }
    }
    // Calculate TDEE
    const activityMultiplier: Record<ActivityLevel, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
    };
    const tdee = bmr ? Math.round(bmr * (activityMultiplier[(values.activityLevel as ActivityLevel) || 'moderate'] || 1.55)) : undefined;
    // Macro splits based on goal
    const macroSplitMap: Record<FitnessGoal, { proteinRatio: number; carbsRatio: number; fatRatio: number }> = {
      muscle_gain: { proteinRatio: 0.3, carbsRatio: 0.45, fatRatio: 0.25 },
      fat_loss: { proteinRatio: 0.35, carbsRatio: 0.35, fatRatio: 0.3 },
      recomposition: { proteinRatio: 0.35, carbsRatio: 0.4, fatRatio: 0.25 },
      endurance: { proteinRatio: 0.25, carbsRatio: 0.5, fatRatio: 0.25 },
      general: { proteinRatio: 0.3, carbsRatio: 0.4, fatRatio: 0.3 },
    };
    const macroSplit = macroSplitMap[(values.fitnessGoal as FitnessGoal) || 'general'];

    await updateProfile({
      ...values,
      bmr,
      bmrSource: 'formula',
      tdee,
      macroSplit,
      dailyCalorieTarget: tdee ? (values.fitnessGoal === 'fat_loss' ? tdee - 500 : values.fitnessGoal === 'muscle_gain' ? tdee + 300 : tdee) : undefined,
    });
    setEditOpen(false);
    message.success('个人信息已更新');
  };

  const handleExport = async () => {
    try {
      const data = {
        profile: await db.userProfile.toArray(),
        exercises: await db.exercises.toArray(),
        workoutPlans: await db.workoutPlans.toArray(),
        workoutLogs: await db.workoutLogs.toArray(),
        foodItems: await db.foodItems.toArray(),
        mealEntries: await db.mealEntries.toArray(),
        bodyMeasurements: await db.bodyMeasurements.toArray(),
        huaweiHealthConfig: await db.huaweiHealthConfig.toArray(),
        exportDate: new Date().toISOString(),
        version: '0.1.0',
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fittrack-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('数据已导出');
    } catch {
      message.error('导出失败');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        // Import each table
        if (data.userProfile) await db.userProfile.bulkPut(data.userProfile);
        if (data.exercises) await db.exercises.bulkPut(data.exercises);
        if (data.workoutPlans) await db.workoutPlans.bulkPut(data.workoutPlans);
        if (data.workoutLogs) await db.workoutLogs.bulkPut(data.workoutLogs);
        if (data.foodItems) await db.foodItems.bulkPut(data.foodItems);
        if (data.mealEntries) await db.mealEntries.bulkPut(data.mealEntries);
        if (data.bodyMeasurements) await db.bodyMeasurements.bulkPut(data.bodyMeasurements);
        if (data.huaweiHealthConfig) await db.huaweiHealthConfig.bulkPut(data.huaweiHealthConfig);
        await loadProfile();
        message.success('数据已导入，请刷新页面');
      } catch {
        message.error('导入失败，文件格式不正确');
      }
    };
    input.click();
  };

  const genderLabel = (g?: Gender) => g === 'male' ? '男' : g === 'female' ? '女' : g === 'other' ? '其他' : '未设置';

  return (
    <div className="page active" id="page-profile">
      {/* Header Card */}
      <div style={{ background: 'linear-gradient(135deg, #1A5276, #2E86C1)', color: 'white', padding: 20, textAlign: 'center', borderRadius: '0 0 20px 20px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 10px' }}>
          👤
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{profile?.nickname || '用户'}</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
          目标：{profile?.fitnessGoal ? fitnessGoalMap[profile.fitnessGoal] : '未设置'} · {profile?.trainingLevel ? trainingLevelMap[profile.trainingLevel] : '未设置'}训练者
        </div>
        {profile?.bmr && (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            BMR: {profile.bmr} kcal · TDEE: {profile.tdee || '--'} kcal
          </div>
        )}
      </div>

      {/* Personal Info */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase' }}>个人信息</span>
          <span style={{ fontSize: 12, color: 'var(--primary-light)', cursor: 'pointer' }} onClick={handleEditOpen}>编辑</span>
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {[
            { icon: '👤', label: '性别', value: genderLabel(profile?.gender) },
            { icon: '🎂', label: '年龄', value: profile?.age ? `${profile.age}岁` : '未设置' },
            { icon: '📏', label: '身高', value: profile?.height ? `${profile.height}cm` : '未设置' },
            { icon: '⚖', label: '体重', value: profile?.weight ? `${profile.weight}kg` : '未设置' },
            { icon: '🎯', label: '训练水平', value: profile?.trainingLevel ? trainingLevelMap[profile.trainingLevel] : '未设置' },
            { icon: '🏃', label: '活动量', value: profile?.activityLevel ? activityLevelMap[profile.activityLevel] : '未设置' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f5f5f5' }}>
              <span style={{ fontSize: 16, marginRight: 12, width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
              <span style={{ fontSize: 13, color: 'var(--gray)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Measurement Reminder */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray)', marginBottom: 8, textTransform: 'uppercase' }}>提醒设置</div>
        <div style={{ background: 'var(--white)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
            <span style={{ fontSize: 18, marginRight: 12 }}>⏰</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>每日测量提醒</div>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>{profile?.measurementReminder?.time || '07:00'}</div>
            </div>
            <Switch
              size="small"
              checked={profile?.measurementReminder?.enabled ?? true}
              onChange={(checked) => updateProfile({
                measurementReminder: { enabled: checked, time: profile?.measurementReminder?.time || '07:00' },
              })}
            />
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray)', marginBottom: 8, textTransform: 'uppercase' }}>数据管理</div>
        <div style={{ background: 'var(--white)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div
            onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18, marginRight: 12 }}>📤</span>
            <span style={{ flex: 1, fontSize: 14 }}>导出数据</span>
            <span style={{ fontSize: 13, color: 'var(--gray)', marginRight: 6 }}>JSON</span>
          </div>
          <div
            onClick={handleImport}
            style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18, marginRight: 12 }}>📥</span>
            <span style={{ flex: 1, fontSize: 14 }}>导入数据</span>
            <span style={{ fontSize: 13, color: 'var(--gray)', marginRight: 6 }}>从备份恢复</span>
          </div>
          <div
            onClick={() => setHuaweiOpen(true)}
            style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18, marginRight: 12 }}>⌚</span>
            <span style={{ flex: 1, fontSize: 14 }}>华为健康</span>
            <span style={{ fontSize: 13, color: huaweiConfig?.isConnected ? 'var(--green)' : 'var(--gray)', marginRight: 6 }}>
              {huaweiConfig?.isConnected ? '已连接' : '未连接'}
            </span>
          </div>
          <div
            onClick={() => setAiOpen(true)}
            style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18, marginRight: 12 }}>🤖</span>
            <span style={{ flex: 1, fontSize: 14 }}>AI 助手配置</span>
            <span style={{ fontSize: 13, color: getAIConfig().enabled ? 'var(--green)' : 'var(--gray)', marginRight: 6 }}>
              {getAIConfig().enabled ? '已启用' : '未启用'}
            </span>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div style={{ padding: '16px 16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--gray)' }}>FitTrack Pro v0.1.0</div>
        <div style={{ fontSize: 11, color: '#ccc', marginTop: 2 }}>数据存储于本地 · 支持导出备份</div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        title="编辑个人信息"
        open={editOpen}
        onOk={handleEditSave}
        onCancel={() => setEditOpen(false)}
        okText="保存"
        cancelText="取消"
        style={{ top: 20, maxWidth: 400, margin: '0 auto' }}
        styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item label="昵称" name="nickname">
            <Input placeholder="输入昵称" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item label="性别" name="gender">
              <Select placeholder="选择性别">
                <Select.Option value="male">男</Select.Option>
                <Select.Option value="female">女</Select.Option>
                <Select.Option value="other">其他</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="年龄" name="age">
              <InputNumber min={10} max={100} style={{ width: '100%' }} placeholder="年龄" />
            </Form.Item>
            <Form.Item label="身高(cm)" name="height">
              <InputNumber min={100} max={250} step={0.5} style={{ width: '100%' }} placeholder="178" />
            </Form.Item>
            <Form.Item label="体重(kg)" name="weight">
              <InputNumber min={30} max={250} step={0.1} style={{ width: '100%' }} placeholder="75" />
            </Form.Item>
          </div>
          <Form.Item label="训练水平" name="trainingLevel">
            <Select>
              {Object.entries(trainingLevelMap).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="健身目标" name="fitnessGoal">
            <Select>
              {Object.entries(fitnessGoalMap).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="活动量" name="activityLevel">
            <Select>
              {Object.entries(activityLevelMap).map(([k, v]) => (
                <Select.Option key={k} value={k}>{v}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Huawei Health Drawer */}
      <Drawer
        title="华为健康连接"
        placement="right"
        width="100%"
        open={huaweiOpen}
        onClose={() => setHuaweiOpen(false)}
      >
        <HuaweiHealthSettings />
      </Drawer>

      {/* AI Config Drawer */}
      <AISettingsDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

// Inline Huawei Health Settings for the drawer
function HuaweiHealthSettings() {
  const { huaweiConfig, updateHuaweiConfig } = useBodyDataStore();
  const [connecting, setConnecting] = useState(false);

  const isConnected = huaweiConfig?.isConnected ?? false;

  const handleConnect = async () => {
    setConnecting(true);
    // Simulate OAuth - production would redirect to Huawei OAuth URL
    setTimeout(async () => {
      await updateHuaweiConfig({
        id: 'default',
        isConnected: true,
        accessToken: 'simulated_token',
        refreshToken: 'simulated_refresh',
        tokenExpiresAt: Date.now() + 86400000,
        syncScope: { weight: true, heartRate: true, steps: true, sleep: true },
        syncStrategy: 'auto_daily',
        authorizedAt: Date.now(),
        lastSyncAt: Date.now(),
      });
      setConnecting(false);
      message.success('华为健康已连接');
    }, 1500);
  };

  const handleDisconnect = async () => {
    await updateHuaweiConfig({
      id: 'default',
      isConnected: false,
      accessToken: undefined,
      refreshToken: undefined,
      tokenExpiresAt: undefined,
      syncScope: { weight: false, heartRate: false, steps: false, sleep: false },
      syncStrategy: 'manual',
    });
    message.info('已断开连接');
  };

  const handleToggleSync = async (scope: 'weight' | 'heartRate' | 'steps' | 'sleep', checked: boolean) => {
    if (!huaweiConfig) return;
    const newScope = { ...huaweiConfig.syncScope, [scope]: checked };
    await updateHuaweiConfig({ syncScope: newScope });
  };

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⌚</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>华为健康</div>
        <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>Health Service Kit 云侧 REST API</div>
      </div>

      {!isConnected ? (
        <div style={{ padding: '0 16px' }}>
          <div style={{ background: 'var(--gray-bg)', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 13, lineHeight: 1.8 }}>
            连接华为健康后可同步以下数据：
            <br />· 体脂秤：体重、体脂率、肌肉量、BMI、基础代谢
            <br />· 手表：心率、步数、睡眠、血氧
            <br />
            <br />需要华为开发者账号授权（企业开发者可获取心率、血氧等高级数据）
          </div>
          <Button type="primary" block size="large" loading={connecting} onClick={handleConnect}>
            连接华为健康
          </Button>
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          <div style={{ background: 'var(--green-bg)', borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>已连接</span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>同步数据类型</div>
            {[
              { key: 'weight' as const, label: '体重 & 体脂', icon: '⚖️' },
              { key: 'heartRate' as const, label: '心率', icon: '❤️' },
              { key: 'steps' as const, label: '步数', icon: '🚶' },
              { key: 'sleep' as const, label: '睡眠', icon: '😴' },
            ].map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 14 }}>{item.icon} {item.label}</span>
                <Switch
                  size="small"
                  checked={huaweiConfig?.syncScope?.[item.key] ?? false}
                  onChange={(v) => handleToggleSync(item.key, v)}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>同步策略</div>
            {[
              { value: 'auto_daily', label: '每天自动同步', desc: '早上7点' },
              { value: 'on_app_open', label: '打开时同步', desc: '每次启动' },
              { value: 'manual', label: '手动同步', desc: '手动触发' },
            ].map((opt) => (
              <div
                key={opt.value}
                onClick={() => updateHuaweiConfig({ syncStrategy: opt.value as any })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', margin: '4px 0', borderRadius: 8,
                  background: huaweiConfig?.syncStrategy === opt.value ? 'var(--primary-bg)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray)' }}>{opt.desc}</div>
                </div>
                {huaweiConfig?.syncStrategy === opt.value && <span style={{ color: 'var(--primary)', fontSize: 12 }}>●</span>}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 16 }}>
            上次同步: {huaweiConfig?.lastSyncAt ? new Date(huaweiConfig.lastSyncAt).toLocaleString('zh-CN') : '无'}
          </div>

          <Button danger block onClick={handleDisconnect}>断开连接</Button>
        </div>
      )}
    </div>
  );
}

// AI Settings Drawer Component
function AISettingsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const config = getAIConfig();
  const [enabled, setEnabled] = useState(config.enabled);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [model, setModel] = useState(config.model);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  const handleSave = () => {
    setAIConfig({ enabled, apiKey, baseUrl, model });
    message.success('AI 配置已保存');
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult('');
    // Temporarily save config for test
    setAIConfig({ enabled: true, apiKey, baseUrl, model });
    try {
      const { getExerciseRecommendation } = await import('../../core/services/ai');
      const resp = await getExerciseRecommendation({ goal: '增肌', level: '中级', targetMuscle: '胸部' });
      if (resp.error) {
        setTestResult(`失败: ${resp.error}`);
      } else {
        setTestResult('连接成功！AI 已就绪');
      }
    } catch (err: any) {
      setTestResult(`错误: ${err.message}`);
    }
    setTesting(false);
  };

  return (
    <Drawer
      title="AI 助手配置"
      placement="right"
      width="100%"
      open={open}
      onClose={onClose}
      extra={<Button type="primary" onClick={handleSave}>保存</Button>}
    >
      <div style={{ padding: '0 4px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>启用 AI 助手</div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>
                开启后可获得个性化训练和饮食建议
              </div>
            </div>
            <Switch checked={enabled} onChange={setEnabled} />
          </div>
        </div>

        {enabled && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>API 地址</div>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>
                支持任何 OpenAI 兼容 API（如 DeepSeek、通义千问等）
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>API Key</div>
              <Input.Password
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>
                Key 仅保存在本地浏览器中，不会上传
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>模型名称</div>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
              />
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>
                推荐：gpt-4o-mini、deepseek-chat、qwen-turbo 等
              </div>
            </div>

            <Button block loading={testing} onClick={handleTest} style={{ marginBottom: 12 }}>
              测试连接
            </Button>

            {testResult && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12,
                background: testResult.includes('成功') ? '#f0fff0' : '#fff0f0',
                color: testResult.includes('成功') ? '#2d7d2d' : '#d32f2f',
                marginBottom: 12,
              }}>
                {testResult}
              </div>
            )}

            <div style={{ background: 'var(--gray-bg)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--gray)' }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>AI 功能说明：</div>
              <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                <li>训练推荐：根据目标和水平推荐动作</li>
                <li>饮食建议：分析摄入数据给出调整方案</li>
                <li>身体分析：基于趋势数据生成报告</li>
                <li>食物识别：描述食物获取营养信息</li>
              </ul>
            </div>
          </>
        )}

        {!enabled && (
          <div style={{ background: 'var(--gray-bg)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.8 }}>
              未启用 AI 时，仍可使用离线规则获取基本建议。<br />
              配置 API Key 后可获得更精准的个性化推荐。
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
