import { useState, useEffect, useCallback } from 'react';
import { Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useDietStore } from '../../core/stores';
import type { MealType, MealEntry, FoodItem } from '../../core/types';
import { v4 as uuid } from 'uuid';
import AddFoodDrawer from './components/AddFoodDrawer';

const mealConfig: { type: MealType; label: string; emoji: string }[] = [
  { type: 'breakfast', label: '早餐', emoji: '☀' },
  { type: 'morning_snack', label: '上午加餐', emoji: '🌞' },
  { type: 'lunch', label: '午餐', emoji: '🌤' },
  { type: 'afternoon_snack', label: '下午加餐', emoji: '⛅' },
  { type: 'dinner', label: '晚餐', emoji: '🌙' },
  { type: 'evening_snack', label: '晚间加餐', emoji: '🌑' },
];

export default function DietPage() {
  const { todayMeals, dailyDiet, loading, loadTodayDiet, addMealEntry, removeMealEntry } = useDietStore();
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');

  useEffect(() => {
    loadTodayDiet();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getMealEntries = (type: MealType) => todayMeals.filter((m) => m.mealType === type);
  const getMealCalories = (type: MealType) => getMealEntries(type).reduce((s, m) => s + m.calories, 0);

  const handleAddFood = (type: MealType) => {
    setActiveMealType(type);
    setAddDrawerOpen(true);
  };

  const handleSelectFood = useCallback(async (food: FoodItem, amountGrams: number) => {
    const ratio = amountGrams / 100;
    const today = new Date().toISOString().slice(0, 10);
    const entry: MealEntry = {
      id: uuid(),
      date: today,
      mealType: activeMealType,
      foodId: food.id,
      foodName: food.name,
      amountGrams,
      calories: Math.round(food.caloriesPer100g * ratio),
      protein: Math.round(food.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(food.carbsPer100g * ratio * 10) / 10,
      fat: Math.round(food.fatPer100g * ratio * 10) / 10,
      recordedAt: Date.now(),
    };
    await addMealEntry(entry);
    setAddDrawerOpen(false);
  }, [activeMealType, addMealEntry]);

  const handleRemove = async (id: string) => {
    await removeMealEntry(id);
  };

  return (
    <div className="page active" id="page-diet">
      <div className="page-header">
        <h1>饮食记录</h1>
        <div className="subtitle">{new Date().toLocaleDateString('zh-CN')}</div>
      </div>

      <div className="card" style={{ margin: '0 16px 12px', padding: 16, background: 'var(--white)', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {mealConfig.map(({ type, label, emoji }) => {
          const entries = getMealEntries(type);
          const totalCal = getMealCalories(type);

          return (
            <div key={type} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{emoji} {label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--gray)' }}>
                    {totalCal > 0 ? `${totalCal} kcal` : '未记录'}
                  </span>
                  <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => handleAddFood(type)} />
                </div>
              </div>

              {entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--gray)', fontSize: 13 }}>
                  点击 + 添加{label}记录
                </div>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f5f5', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--gray-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      🍽️
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{entry.foodName}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray)' }}>{entry.amountGrams}g</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--orange)' }}>{entry.calories} kcal</div>
                    <Button type="text" size="small" danger onClick={() => handleRemove(entry.id)} style={{ marginLeft: 4 }}>×</Button>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* Daily Summary */}
      <div className="card" style={{ margin: '0 16px 20px', background: 'linear-gradient(135deg, #27AE60, #2ECC71)', color: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>今日摄入汇总</div>
        <div style={{ fontSize: 28, fontWeight: 800 }}>
          {dailyDiet?.totalCalories?.toLocaleString() || 0} <span style={{ fontSize: 14, opacity: 0.7 }}>kcal</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{dailyDiet?.totalProtein?.toFixed(0) || 0}g</div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>蛋白质</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{dailyDiet?.totalCarbs?.toFixed(0) || 0}g</div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>碳水</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{dailyDiet?.totalFat?.toFixed(0) || 0}g</div>
            <div style={{ fontSize: 10, opacity: 0.75 }}>脂肪</div>
          </div>
        </div>
      </div>

      {/* Add Food Drawer */}
      <AddFoodDrawer
        open={addDrawerOpen}
        mealType={activeMealType}
        onClose={() => setAddDrawerOpen(false)}
        onSelectFood={handleSelectFood}
      />
    </div>
  );
}
