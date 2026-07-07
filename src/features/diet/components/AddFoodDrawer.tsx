import { useState, useEffect, useCallback } from 'react';
import { Drawer, Input, Tag, Button, InputNumber, Empty, message, Spin } from 'antd';
import { SearchOutlined, RobotOutlined } from '@ant-design/icons';
import type { FoodItem, MealType } from '../../../core/types';
import { db } from '../../../core/db';
import { getBuiltInFoods, loadCfcdFoods } from '../data/builtInFoods';
import { identifyFood, getAIConfig, getOfflineDietAdvice } from '../../../core/services/ai';

const mealLabels: Record<MealType, string> = {
  breakfast: '早餐',
  morning_snack: '上午加餐',
  lunch: '午餐',
  afternoon_snack: '下午加餐',
  dinner: '晚餐',
  evening_snack: '晚间加餐',
};

const categoryOptions = ['全部', '主食点心', '畜肉', '禽肉', '鱼虾蟹贝', '蛋类', '乳类', '谷类', '薯类淀粉', '干豆类', '蔬菜', '水果', '坚果种子', '菌藻', '油脂', '其他'];

const categoryIcons: Record<string, string> = {
  '主食点心': '🥟', '畜肉': '🥩', '禽肉': '🍗', '鱼虾蟹贝': '🐟', '蛋类': '🥚',
  '乳类': '🥛', '谷类': '🍚', '薯类淀粉': '🥔', '干豆类': '🫘',
  '蔬菜': '🥦', '水果': '🍎', '坚果种子': '🥜', '菌藻': '🍄',
  '油脂': '🫒', '其他': '🍽️',
};

interface AddFoodDrawerProps {
  open: boolean;
  mealType: MealType;
  onClose: () => void;
  onSelectFood: (food: FoodItem, amountGrams: number) => void;
}

export default function AddFoodDrawer({ open, mealType, onClose, onSelectFood }: AddFoodDrawerProps) {
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [filtered, setFiltered] = useState<FoodItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [portionUnit, setPortionUnit] = useState<string>('g'); // 'g' for grams, or portion label
  const [portionQty, setPortionQty] = useState<number>(1);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<FoodItem[]>([]);

  // Load foods from DB on open
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const foods = await db.foodItems.toArray();
      if (foods.length > 0) {
        setAllFoods(foods);
      } else {
        // Fallback: load common foods + fetch comprehensive data
        const cfcd = await loadCfcdFoods();
        const all = [...getBuiltInFoods(), ...cfcd];
        setAllFoods(all);
      }
    };
    load();
  }, [open]);

  // Filter logic
  useEffect(() => {
    let result = [...allFoods];
    const isDefaultView = category === '全部' && !search.trim();
    
    if (category !== '全部') {
      result = result.filter((f) => f.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.nameEn && f.nameEn.toLowerCase().includes(q))
      );
    }
    
    // Default view (no filter, no search): show common foods + dish foods (not the full 1630 raw ingredients)
    if (isDefaultView) {
      const curated = result.filter(f => f.id.startsWith('food-common-') || f.id.startsWith('food-dish-'));
      if (curated.length > 0) {
        result = curated;
      }
      // If no curated foods available, show all but limit to 50
      if (result.length === 0) {
        result = allFoods.slice(0, 50);
      }
    }
    
    setFiltered(result);
  }, [search, category, allFoods]);

  // Reset state on close
  const handleClose = () => {
    setSearch('');
    setCategory('全部');
    setSelectedFood(null);
    setAmount(100);
    setPortionUnit('g');
    setPortionQty(1);
    setAiInput('');
    setAiResults([]);
    setAiLoading(false);
    onClose();
  };

  const handleSelectFood = useCallback((food: FoodItem) => {
    setSelectedFood(food);
    // Default to first portion option if available, otherwise grams
    if (food.portionOptions && food.portionOptions.length > 0) {
      const first = food.portionOptions[0];
      setPortionUnit(first.label);
      setPortionQty(1);
      setAmount(first.gramsPerUnit);
    } else {
      setPortionUnit('g');
      setPortionQty(1);
      setAmount(food.servingSize || 100);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedFood || amount <= 0) return;
    onSelectFood(selectedFood, amount);
    // Reset for next pick
    setSelectedFood(null);
    setAmount(100);
  }, [selectedFood, amount, onSelectFood]);

  // AI food identification
  const handleAIIdentify = useCallback(async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiResults([]);
    try {
      const config = getAIConfig();
      if (!config.enabled || !config.apiKey) {
        // Offline fallback: search in existing foods
        const q = aiInput.toLowerCase();
        const matches = allFoods.filter(f =>
          f.name.toLowerCase().includes(q) || (f.nameEn && f.nameEn.toLowerCase().includes(q))
        ).slice(0, 5);
        if (matches.length > 0) {
          setAiResults(matches);
          message.info('AI 未启用，已从食物库匹配相关结果');
        } else {
          message.warning('AI 未启用，且食物库中未找到匹配项');
        }
        setAiLoading(false);
        return;
      }

      const resp = await identifyFood(aiInput);
      if (resp.error) {
        message.error(resp.error);
        setAiLoading(false);
        return;
      }

      // Parse JSON from AI response
      try {
        // Extract JSON array from response (may have markdown code block)
        const jsonMatch = resp.content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          message.error('AI 返回格式异常，请重试');
          setAiLoading(false);
          return;
        }
        const items = JSON.parse(jsonMatch[0]) as Array<{
          name: string;
          caloriesPer100g: number;
          proteinPer100g: number;
          carbsPer100g: number;
          fatPer100g: number;
        }>;

        const aiFoods: FoodItem[] = items.map((item, idx) => ({
          id: `ai-${Date.now()}-${idx}`,
          name: item.name,
          caloriesPer100g: Math.round(item.caloriesPer100g),
          proteinPer100g: Math.round(item.proteinPer100g * 10) / 10,
          carbsPer100g: Math.round(item.carbsPer100g * 10) / 10,
          fatPer100g: Math.round(item.fatPer100g * 10) / 10,
          servingSize: 100,
          category: '其他',
          source: 'ai' as const,
          createdAt: Date.now(),
        }));
        setAiResults(aiFoods);
      } catch {
        message.error('AI 返回数据解析失败，请重试');
      }
    } catch (err: any) {
      message.error(`AI 识别失败: ${err.message}`);
    }
    setAiLoading(false);
  }, [aiInput, allFoods]);

  const currentMealLabel = mealLabels[mealType] || mealType;

  return (
    <Drawer
      title={`添加${currentMealLabel}`}
      placement="right"
      styles={{ wrapper: { width: '100%' }, body: { padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100% - 55px)' } }}
      open={open}
      onClose={handleClose}
    >
      {/* Search */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索食物名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>

      {/* AI Food Identification */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', background: 'var(--primary-bg, #f0f5ff)' }}>
        <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 6 }}>
          <RobotOutlined style={{ marginRight: 4 }} />AI 智能识别
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="描述食物，如：一碗牛肉面、一根香蕉..."
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onPressEnter={handleAIIdentify}
            style={{ flex: 1, borderRadius: 8, fontSize: 13 }}
            size="small"
          />
          <Button
            type="primary"
            size="small"
            icon={<RobotOutlined />}
            loading={aiLoading}
            onClick={handleAIIdentify}
            style={{ borderRadius: 8 }}
          >
            识别
          </Button>
        </div>
        {aiResults.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {aiResults.map((food) => (
              <div
                key={food.id}
                onClick={() => handleSelectFood(food)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0', cursor: 'pointer', gap: 10,
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 6, background: 'var(--gray-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>
                  {food.source === 'ai' ? '🤖' : categoryIcons[food.category || '其他'] || '🍽️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{food.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray)' }}>
                    {food.caloriesPer100g} kcal · 蛋白{food.proteinPer100g}g · 碳水{food.carbsPer100g}g · 脂肪{food.fatPer100g}g
                  </div>
                </div>
                <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>选入</Tag>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Tags */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {categoryOptions.map((cat) => (
          <Tag
            key={cat}
            color={category === cat ? 'var(--primary)' : undefined}
            style={{
              cursor: 'pointer',
              margin: 0,
              borderRadius: 12,
              background: category === cat ? 'var(--primary)' : 'var(--gray-bg)',
              color: category === cat ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              fontSize: 12,
            }}
            onClick={() => setCategory(cat)}
          >
            {cat === '全部' ? '全部' : `${categoryIcons[cat] || ''} ${cat}`}
          </Tag>
        ))}
      </div>

      {/* Food List or Selected Detail */}
      {selectedFood ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div style={{ background: 'var(--white)', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedFood.name}</div>
            {selectedFood.nameEn && <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12 }}>{selectedFood.nameEn}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              <div style={{ background: 'var(--orange-bg)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--orange)' }}>{selectedFood.caloriesPer100g}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>kcal/100g</div>
              </div>
              <div style={{ background: 'var(--primary-bg)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{selectedFood.proteinPer100g}g</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>蛋白质/100g</div>
              </div>
              <div style={{ background: 'var(--green-bg)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{selectedFood.carbsPer100g}g</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>碳水/100g</div>
              </div>
              <div style={{ background: 'var(--red-bg)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{selectedFood.fatPer100g}g</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>脂肪/100g</div>
              </div>
            </div>

            {/* Amount Input */}
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>摄入量</div>
              
              {selectedFood.portionOptions && selectedFood.portionOptions.length > 0 ? (
                /* Portion-based input: unit selector + quantity */
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    {selectedFood.portionOptions.map((p) => (
                      <Tag
                        key={p.label}
                        color={portionUnit === p.label ? 'var(--primary)' : undefined}
                        style={{
                          cursor: 'pointer', margin: 0, borderRadius: 16,
                          background: portionUnit === p.label ? 'var(--primary)' : 'var(--gray-bg)',
                          color: portionUnit === p.label ? '#fff' : 'var(--text-secondary)',
                          border: 'none', fontSize: 13, padding: '4px 12px',
                        }}
                        onClick={() => {
                          setPortionUnit(p.label);
                          setAmount(p.gramsPerUnit * portionQty);
                        }}
                      >
                        {p.label}({p.gramsPerUnit}g)
                      </Tag>
                    ))}
                    <Tag
                      color={portionUnit === 'g' ? 'var(--primary)' : undefined}
                      style={{
                        cursor: 'pointer', margin: 0, borderRadius: 16,
                        background: portionUnit === 'g' ? 'var(--primary)' : 'var(--gray-bg)',
                        color: portionUnit === 'g' ? '#fff' : 'var(--text-secondary)',
                        border: 'none', fontSize: 13, padding: '4px 12px',
                      }}
                      onClick={() => {
                        setPortionUnit('g');
                        setAmount(100);
                        setPortionQty(1);
                      }}
                    >
                      自定义克数
                    </Tag>
                  </div>
                  
                  {portionUnit !== 'g' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <InputNumber
                        value={portionQty}
                        onChange={(v) => {
                          const qty = v || 0;
                          setPortionQty(qty);
                          const portion = selectedFood.portionOptions!.find(p => p.label === portionUnit);
                          setAmount(portion ? portion.gramsPerUnit * qty : 0);
                        }}
                        min={0.5}
                        max={99}
                        step={0.5}
                        style={{ width: 90 }}
                      />
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        {portionUnit} ≈ {amount}g
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <InputNumber
                        value={amount}
                        onChange={(v) => setAmount(v || 0)}
                        min={1}
                        max={5000}
                        style={{ flex: 1 }}
                        addonAfter="克"
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* Default: simple gram input with serving shortcut */
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <InputNumber
                    value={amount}
                    onChange={(v) => setAmount(v || 0)}
                    min={1}
                    max={5000}
                    style={{ flex: 1 }}
                    addonAfter="克"
                  />
                  {selectedFood.servingDescription && (
                    <Button
                      size="small"
                      onClick={() => setAmount(selectedFood.servingSize || 100)}
                    >
                      {selectedFood.servingDescription}({selectedFood.servingSize}g)
                    </Button>
                  )}
                </div>
              )}

              {/* Preview */}
              {amount > 0 && (
                <div style={{ marginTop: 12, background: 'var(--gray-bg)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 6 }}>预估摄入</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ fontWeight: 600, color: 'var(--orange)' }}>
                      {Math.round(selectedFood.caloriesPer100g * amount / 100)} kcal
                    </span>
                    <span>蛋白 {Math.round(selectedFood.proteinPer100g * amount / 10) / 10}g</span>
                    <span>碳水 {Math.round(selectedFood.carbsPer100g * amount / 10) / 10}g</span>
                    <span>脂肪 {Math.round(selectedFood.fatPer100g * amount / 10) / 10}g</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button style={{ flex: 1 }} onClick={() => setSelectedFood(null)}>返回</Button>
              <Button type="primary" style={{ flex: 2 }} onClick={handleConfirm} disabled={amount <= 0}>
                确认添加
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
          {filtered.length === 0 ? (
            <Empty description="没有找到匹配的食物" style={{ marginTop: 40 }} />
          ) : (
            filtered.map((food) => (
              <div
                key={food.id}
                onClick={() => handleSelectFood(food)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid #f5f5f5',
                  cursor: 'pointer',
                  gap: 12,
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 8, background: 'var(--gray-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {categoryIcons[food.category || '其他'] || '🍽️'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{food.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)' }}>
                    {food.portionOptions && food.portionOptions.length > 0
                      ? food.portionOptions.slice(0, 3).map(p => `${p.label}(${p.gramsPerUnit}g)`).join(' · ')
                      : food.servingDescription ? `${food.servingDescription} ${food.servingSize}g` : '100g'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--orange)' }}>{food.caloriesPer100g} kcal</div>
                  <div style={{ fontSize: 11, color: 'var(--gray)' }}>蛋白 {food.proteinPer100g}g</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Drawer>
  );
}
