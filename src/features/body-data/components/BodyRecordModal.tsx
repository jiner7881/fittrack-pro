import { useState } from 'react';
import { Modal, Form, InputNumber, Segmented, Input, message } from 'antd';
import type { BodyMeasurement } from '../../../core/types';
import { v4 as uuid } from 'uuid';

interface BodyRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (measurement: BodyMeasurement) => void;
  initialData?: BodyMeasurement;
}

const dataSourceOptions = [
  { label: '手动录入', value: 'manual' as const },
  { label: '华为体脂秤', value: 'huawei_scale' as const },
  { label: '华为手表', value: 'huawei_watch' as const },
];

export default function BodyRecordModal({ open, onClose, onSave, initialData }: BodyRecordModalProps) {
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState<BodyMeasurement['dataSource']>('manual');
  const [activeSection, setActiveSection] = useState<'basic' | 'circumference'>('basic');

  const handleSave = () => {
    const values = form.getFieldsValue();
    const now = new Date();
    const measurement: BodyMeasurement = {
      id: initialData?.id || uuid(),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      bodyWeight: values.bodyWeight ?? undefined,
      bodyFatRate: values.bodyFatRate ?? undefined,
      muscleMass: values.muscleMass ?? undefined,
      bmi: values.bmi ?? undefined,
      basalMetabolism: values.basalMetabolism ?? undefined,
      boneMass: values.boneMass ?? undefined,
      visceralFatLevel: values.visceralFatLevel ?? undefined,
      bodyFat: values.bodyFat ?? undefined,
      waistCircumference: values.waistCircumference ?? undefined,
      chestCircumference: values.chestCircumference ?? undefined,
      leftArmCircumference: values.leftArmCircumference ?? undefined,
      rightArmCircumference: values.rightArmCircumference ?? undefined,
      leftThighCircumference: values.leftThighCircumference ?? undefined,
      rightThighCircumference: values.rightThighCircumference ?? undefined,
      hipCircumference: values.hipCircumference ?? undefined,
      dataSource,
      notes: values.notes,
      createdAt: initialData?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    onSave(measurement);
    form.resetFields();
    setDataSource('manual');
    setActiveSection('basic');
    message.success('记录已保存');
  };

  return (
    <Modal
      title="记录身体数据"
      open={open}
      onOk={handleSave}
      onCancel={() => { form.resetFields(); onClose(); }}
      okText="保存"
      cancelText="取消"
      style={{ top: 20, maxWidth: 400, margin: '0 auto' }}
      styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>数据来源</div>
        <Segmented
          options={dataSourceOptions}
          value={dataSource}
          onChange={(v) => setDataSource(v as BodyMeasurement['dataSource'])}
          size="small"
          block
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Segmented
          options={[
            { label: '基本数据', value: 'basic' },
            { label: '体围数据', value: 'circumference' },
          ]}
          value={activeSection}
          onChange={(v) => setActiveSection(v as 'basic' | 'circumference')}
          size="small"
          block
        />
      </div>
      <Form form={form} layout="vertical" size="small" initialValues={initialData}>
        {activeSection === 'basic' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item label="体重(kg)" name="bodyWeight">
              <InputNumber min={20} max={300} step={0.1} style={{ width: '100%' }} placeholder="75.0" />
            </Form.Item>
            <Form.Item label="体脂率(%)" name="bodyFatRate">
              <InputNumber min={3} max={60} step={0.1} style={{ width: '100%' }} placeholder="18.5" />
            </Form.Item>
            <Form.Item label="肌肉量(kg)" name="muscleMass">
              <InputNumber min={10} max={100} step={0.1} style={{ width: '100%' }} placeholder="34.0" />
            </Form.Item>
            <Form.Item label="BMI" name="bmi">
              <InputNumber min={10} max={50} step={0.1} style={{ width: '100%' }} placeholder="23.6" />
            </Form.Item>
            <Form.Item label="基础代谢(kcal)" name="basalMetabolism">
              <InputNumber min={800} max={4000} step={10} style={{ width: '100%' }} placeholder="1700" />
            </Form.Item>
            <Form.Item label="骨量(kg)" name="boneMass">
              <InputNumber min={1} max={10} step={0.1} style={{ width: '100%' }} placeholder="3.2" />
            </Form.Item>
            <Form.Item label="内脏脂肪等级" name="visceralFatLevel">
              <InputNumber min={1} max={30} step={1} style={{ width: '100%' }} placeholder="8" />
            </Form.Item>
            <Form.Item label="体脂量(kg)" name="bodyFat">
              <InputNumber min={1} max={100} step={0.1} style={{ width: '100%' }} placeholder="14.0" />
            </Form.Item>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Form.Item label="腰围(cm)" name="waistCircumference">
              <InputNumber min={40} max={200} step={0.1} style={{ width: '100%' }} placeholder="82.0" />
            </Form.Item>
            <Form.Item label="胸围(cm)" name="chestCircumference">
              <InputNumber min={50} max={200} step={0.1} style={{ width: '100%' }} placeholder="98.0" />
            </Form.Item>
            <Form.Item label="左臂围(cm)" name="leftArmCircumference">
              <InputNumber min={15} max={80} step={0.1} style={{ width: '100%' }} placeholder="34.0" />
            </Form.Item>
            <Form.Item label="右臂围(cm)" name="rightArmCircumference">
              <InputNumber min={15} max={80} step={0.1} style={{ width: '100%' }} placeholder="34.5" />
            </Form.Item>
            <Form.Item label="左腿围(cm)" name="leftThighCircumference">
              <InputNumber min={30} max={100} step={0.1} style={{ width: '100%' }} placeholder="56.0" />
            </Form.Item>
            <Form.Item label="右腿围(cm)" name="rightThighCircumference">
              <InputNumber min={30} max={100} step={0.1} style={{ width: '100%' }} placeholder="56.5" />
            </Form.Item>
            <Form.Item label="臀围(cm)" name="hipCircumference">
              <InputNumber min={50} max={150} step={0.1} style={{ width: '100%' }} placeholder="95.0" />
            </Form.Item>
            <Form.Item label="左小腿围(cm)" name="leftCalfCircumference">
              <InputNumber min={20} max={60} step={0.1} style={{ width: '100%' }} placeholder="37.0" />
            </Form.Item>
            <Form.Item label="右小腿围(cm)" name="rightCalfCircumference">
              <InputNumber min={20} max={60} step={0.1} style={{ width: '100%' }} placeholder="37.5" />
            </Form.Item>
          </div>
        )}
        <Form.Item label="备注" name="notes">
          <Input.TextArea rows={2} placeholder="可选备注..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
