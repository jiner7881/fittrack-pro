import { useState, useEffect } from 'react';
import { Segmented, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useBodyDataStore } from '../../core/stores';
import type { BodyMeasurement } from '../../core/types';
import BodyRecordModal from './components/BodyRecordModal';
import BodyTrendChart from './components/BodyTrendChart';
import HuaweiHealthPanel from './components/HuaweiHealthPanel';

type MetricKey = 'bodyWeight' | 'bodyFatRate' | 'muscleMass' | 'bmi' | 'waistCircumference' | 'basalMetabolism';

const metricOptions: { label: string; value: MetricKey }[] = [
  { label: '体重', value: 'bodyWeight' },
  { label: '体脂率', value: 'bodyFatRate' },
  { label: '肌肉量', value: 'muscleMass' },
  { label: 'BMI', value: 'bmi' },
  { label: '腰围', value: 'waistCircumference' },
  { label: '基础代谢', value: 'basalMetabolism' },
];

const periodOptions = [
  { label: '7天', value: 7 },
  { label: '30天', value: 30 },
  { label: '90天', value: 90 },
  { label: '1年', value: 365 },
];

export default function BodyDataPage() {
  const { latestMeasurement, measurements, loading, loadLatest, loadMeasurements, addMeasurement, loadHuaweiConfig } = useBodyDataStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('bodyWeight');
  const [activePeriod, setActivePeriod] = useState(30);
  const [showHuawei, setShowHuawei] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadLatest();
      await loadMeasurements();
      await loadHuaweiConfig();
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (m: BodyMeasurement) => {
    await addMeasurement(m);
    setModalOpen(false);
  };

  const latest = latestMeasurement;

  return (
    <div className="page active" id="page-body-data">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1>身体数据</h1>
            <div className="subtitle">{new Date().toLocaleDateString('zh-CN')}</div>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => setModalOpen(true)}
          >
            记录
          </Button>
        </div>
      </div>

      {/* Latest Measurement Cards */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: '体重', value: latest?.bodyWeight, unit: 'kg', icon: '⚖️', color: '#2E86C1' },
            { label: '体脂率', value: latest?.bodyFatRate, unit: '%', icon: '📊', color: '#E67E22' },
            { label: '肌肉量', value: latest?.muscleMass, unit: 'kg', icon: '💪', color: '#27AE60' },
            { label: 'BMI', value: latest?.bmi, unit: '', icon: '📐', color: '#8E44AD' },
          ].map((item) => (
            <div key={item.label} style={{ background: 'var(--white)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ fontSize: 12, color: 'var(--gray)' }}>{item.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: item.color }}>
                {item.value != null ? item.value : '--'}
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--gray)', marginLeft: 2 }}>{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Extra Stats Row */}
      {latest && (latest.basalMetabolism || latest.waistCircumference || latest.visceralFatLevel || latest.boneMass) && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ background: 'var(--white)', borderRadius: 12, padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-around' }}>
            {latest.basalMetabolism != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{latest.basalMetabolism}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>基础代谢</div>
              </div>
            )}
            {latest.waistCircumference != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{latest.waistCircumference}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>腰围cm</div>
              </div>
            )}
            {latest.visceralFatLevel != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{latest.visceralFatLevel}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>内脏脂肪</div>
              </div>
            )}
            {latest.boneMass != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{latest.boneMass}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>骨量kg</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>趋势分析</span>
          </div>
          <div style={{ marginBottom: 8, overflowX: 'auto' }}>
            <Segmented
              options={metricOptions}
              value={activeMetric}
              onChange={(v) => setActiveMetric(v as MetricKey)}
              size="small"
            />
          </div>
          <div style={{ marginBottom: 6 }}>
            <Segmented
              options={periodOptions}
              value={activePeriod}
              onChange={(v) => setActivePeriod(v as number)}
              size="small"
            />
          </div>
          <BodyTrendChart measurements={measurements} metric={activeMetric} days={activePeriod} />
        </div>
      </div>

      {/* Measurement History */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>历史记录</div>
          {measurements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray)', fontSize: 13 }}>
              暂无记录，点击上方"记录"按钮开始
            </div>
          ) : (
            measurements.slice(0, 10).map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {m.date} {m.time && <span style={{ color: 'var(--gray)', fontWeight: 400 }}>{m.time}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>
                    {m.dataSource === 'manual' ? '手动' : m.dataSource === 'huawei_scale' ? '体脂秤' : m.dataSource === 'huawei_watch' ? '手表' : '其他'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  {m.bodyWeight != null && <span>⚖️ {m.bodyWeight}kg</span>}
                  {m.bodyFatRate != null && <span>📊 {m.bodyFatRate}%</span>}
                  {m.muscleMass != null && <span>💪 {m.muscleMass}kg</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Huawei Health Connect */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          onClick={() => setShowHuawei(!showHuawei)}
          style={{ background: 'var(--white)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⌚</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>华为健康连接</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--gray)' }}>{showHuawei ? '收起 ↑' : '展开 ↓'}</span>
        </div>
        {showHuawei && (
          <div style={{ marginTop: 8 }}>
            <HuaweiHealthPanel />
          </div>
        )}
      </div>

      {/* Record Modal */}
      <BodyRecordModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
