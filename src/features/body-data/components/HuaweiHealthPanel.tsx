import { useState } from 'react';
import { Button, Switch, Tag, message } from 'antd';
import { useBodyDataStore } from '../../../core/stores';

export default function HuaweiHealthPanel() {
  const { huaweiConfig, updateHuaweiConfig } = useBodyDataStore();
  const [connecting, setConnecting] = useState(false);

  const isConnected = huaweiConfig?.isConnected ?? false;

  const handleConnect = async () => {
    setConnecting(true);
    // Simulate OAuth flow - in production this would redirect to Huawei OAuth
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

  const handleSyncStrategy = async (strategy: 'auto_daily' | 'manual' | 'on_app_open') => {
    await updateHuaweiConfig({ syncStrategy: strategy });
  };

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>⌚</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>华为健康</div>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>Health Service Kit</div>
            </div>
          </div>
          {isConnected ? (
            <Tag color="green">已连接</Tag>
          ) : (
            <Button type="primary" size="small" loading={connecting} onClick={handleConnect}>
              连接
            </Button>
          )}
        </div>

        {isConnected && (
          <>
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>同步数据类型</div>
              {[
                { key: 'weight' as const, label: '体重 & 体脂', icon: '⚖️' },
                { key: 'heartRate' as const, label: '心率', icon: '❤️' },
                { key: 'steps' as const, label: '步数', icon: '🚶' },
                { key: 'sleep' as const, label: '睡眠', icon: '😴' },
              ].map((item) => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ fontSize: 13 }}>{item.icon} {item.label}</span>
                  <Switch
                    size="small"
                    checked={huaweiConfig?.syncScope?.[item.key] ?? false}
                    onChange={(v) => handleToggleSync(item.key, v)}
                  />
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>同步策略</div>
              {[
                { value: 'auto_daily' as const, label: '每天自动同步', desc: '每天早上7点自动同步' },
                { value: 'on_app_open' as const, label: '打开时同步', desc: '每次打开应用同步' },
                { value: 'manual' as const, label: '手动同步', desc: '需要手动触发' },
              ].map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => handleSyncStrategy(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', margin: '4px 0', borderRadius: 8,
                    background: huaweiConfig?.syncStrategy === opt.value ? 'var(--primary-bg)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.2s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray)' }}>{opt.desc}</div>
                  </div>
                  {huaweiConfig?.syncStrategy === opt.value && (
                    <Tag color="blue" style={{ margin: 0 }}>当前</Tag>
                  )}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: 'var(--gray)', marginBottom: 8 }}>
              上次同步: {huaweiConfig?.lastSyncAt ? new Date(huaweiConfig.lastSyncAt).toLocaleString('zh-CN') : '无'}
            </div>

            <Button danger size="small" block onClick={handleDisconnect}>断开连接</Button>
          </>
        )}

        {!isConnected && (
          <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6 }}>
            连接华为健康后可同步体脂秤、手表数据，包括体重、体脂率、心率、步数、睡眠等指标。
            <br />使用 Health Service Kit 云侧 REST API，需华为开发者账号授权。
          </div>
        )}
      </div>
    </div>
  );
}
