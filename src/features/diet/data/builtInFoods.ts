import type { FoodItem } from '../../../core/types';
import { dishFoods } from './dishFoods';

// 26 common foods with English names, serving descriptions & portion options
const commonFoods: FoodItem[] = [
  { id: 'food-common-001', name: '鸡胸肉（煮）', nameEn: 'Chicken Breast (Boiled)', caloriesPer100g: 133, proteinPer100g: 29, carbsPer100g: 0.4, fatPer100g: 2.5, servingSize: 150, servingDescription: '1块', category: '禽肉', source: 'built_in', createdAt: 0, portionOptions: [{ label: '块(大)', gramsPerUnit: 200 }, { label: '块(中)', gramsPerUnit: 150 }, { label: '块(小)', gramsPerUnit: 100 }] },
  { id: 'food-common-002', name: '鸡蛋（全）', nameEn: 'Whole Egg', caloriesPer100g: 143, proteinPer100g: 12.6, carbsPer100g: 0.7, fatPer100g: 9.5, servingSize: 50, servingDescription: '1个', category: '蛋类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '个(大)', gramsPerUnit: 60 }, { label: '个(中)', gramsPerUnit: 50 }, { label: '个(小)', gramsPerUnit: 40 }] },
  { id: 'food-common-003', name: '蛋白', nameEn: 'Egg White', caloriesPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2, servingSize: 33, servingDescription: '1个', category: '蛋类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '个(大)', gramsPerUnit: 40 }, { label: '个(中)', gramsPerUnit: 33 }, { label: '个(小)', gramsPerUnit: 25 }] },
  { id: 'food-common-004', name: '瘦牛肉', nameEn: 'Lean Beef', caloriesPer100g: 125, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 4, servingSize: 150, servingDescription: '1份', category: '畜肉', source: 'built_in', createdAt: 0, portionOptions: [{ label: '份(大)', gramsPerUnit: 200 }, { label: '份(中)', gramsPerUnit: 150 }, { label: '份(小)', gramsPerUnit: 100 }] },
  { id: 'food-common-005', name: '鲈鱼（清蒸）', nameEn: 'Steamed Sea Bass', caloriesPer100g: 105, proteinPer100g: 19.3, carbsPer100g: 0, fatPer100g: 3.3, servingSize: 200, servingDescription: '1条', category: '鱼虾蟹贝', source: 'built_in', createdAt: 0, portionOptions: [{ label: '条(大)', gramsPerUnit: 350 }, { label: '条(中)', gramsPerUnit: 200 }, { label: '条(小)', gramsPerUnit: 150 }] },
  { id: 'food-common-006', name: '虾仁', nameEn: 'Shrimp', caloriesPer100g: 87, proteinPer100g: 18.6, carbsPer100g: 0.5, fatPer100g: 1.2, servingSize: 100, servingDescription: '1份', category: '鱼虾蟹贝', source: 'built_in', createdAt: 0, portionOptions: [{ label: '份(大)', gramsPerUnit: 150 }, { label: '份(中)', gramsPerUnit: 100 }, { label: '份(小)', gramsPerUnit: 60 }] },
  { id: 'food-common-007', name: '豆腐', nameEn: 'Tofu', caloriesPer100g: 81, proteinPer100g: 8.1, carbsPer100g: 4.2, fatPer100g: 3.7, servingSize: 150, servingDescription: '1块', category: '干豆类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '块(大)', gramsPerUnit: 200 }, { label: '块(中)', gramsPerUnit: 150 }, { label: '块(小)', gramsPerUnit: 100 }] },
  { id: 'food-common-008', name: '乳清蛋白粉', nameEn: 'Whey Protein', caloriesPer100g: 400, proteinPer100g: 75, carbsPer100g: 10, fatPer100g: 5, servingSize: 30, servingDescription: '1勺', category: '其他', source: 'built_in', createdAt: 0, portionOptions: [{ label: '勺(满)', gramsPerUnit: 35 }, { label: '勺(平)', gramsPerUnit: 30 }, { label: '勺(少)', gramsPerUnit: 20 }] },
  { id: 'food-common-009', name: '白米饭', nameEn: 'White Rice', caloriesPer100g: 116, proteinPer100g: 2.6, carbsPer100g: 25.6, fatPer100g: 0.3, servingSize: 200, servingDescription: '1碗', category: '谷类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '碗(大)', gramsPerUnit: 300 }, { label: '碗(中)', gramsPerUnit: 200 }, { label: '碗(小)', gramsPerUnit: 130 }] },
  { id: 'food-common-010', name: '糙米饭', nameEn: 'Brown Rice', caloriesPer100g: 115, proteinPer100g: 2.8, carbsPer100g: 24, fatPer100g: 0.9, servingSize: 150, servingDescription: '1碗', category: '谷类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '碗(大)', gramsPerUnit: 300 }, { label: '碗(中)', gramsPerUnit: 200 }, { label: '碗(小)', gramsPerUnit: 130 }] },
  { id: 'food-common-011', name: '红薯', nameEn: 'Sweet Potato', caloriesPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20.1, fatPer100g: 0.1, servingSize: 200, servingDescription: '1个', category: '薯类淀粉', source: 'built_in', createdAt: 0, portionOptions: [{ label: '个(大)', gramsPerUnit: 300 }, { label: '个(中)', gramsPerUnit: 200 }, { label: '个(小)', gramsPerUnit: 130 }] },
  { id: 'food-common-012', name: '燕麦片', nameEn: 'Oatmeal', caloriesPer100g: 379, proteinPer100g: 13.2, carbsPer100g: 67.7, fatPer100g: 6.5, servingSize: 40, servingDescription: '1份', category: '谷类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '份(大)', gramsPerUnit: 60 }, { label: '份(中)', gramsPerUnit: 40 }, { label: '份(小)', gramsPerUnit: 25 }] },
  { id: 'food-common-013', name: '全麦面包', nameEn: 'Whole Wheat Bread', caloriesPer100g: 247, proteinPer100g: 8.5, carbsPer100g: 41.3, fatPer100g: 3.4, servingSize: 30, servingDescription: '1片', category: '谷类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '片(厚)', gramsPerUnit: 40 }, { label: '片(中)', gramsPerUnit: 30 }, { label: '片(薄)', gramsPerUnit: 20 }] },
  { id: 'food-common-014', name: '面条（煮）', nameEn: 'Noodles (Boiled)', caloriesPer100g: 110, proteinPer100g: 3.5, carbsPer100g: 23, fatPer100g: 0.5, servingSize: 200, servingDescription: '1碗', category: '谷类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '碗(大)', gramsPerUnit: 300 }, { label: '碗(中)', gramsPerUnit: 200 }, { label: '碗(小)', gramsPerUnit: 130 }] },
  { id: 'food-common-015', name: '香蕉', nameEn: 'Banana', caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 22.8, fatPer100g: 0.3, servingSize: 120, servingDescription: '1根', category: '水果', source: 'built_in', createdAt: 0, portionOptions: [{ label: '根(大)', gramsPerUnit: 150 }, { label: '根(中)', gramsPerUnit: 120 }, { label: '根(小)', gramsPerUnit: 90 }] },
  { id: 'food-common-016', name: '苹果', nameEn: 'Apple', caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 13.8, fatPer100g: 0.2, servingSize: 200, servingDescription: '1个', category: '水果', source: 'built_in', createdAt: 0, portionOptions: [{ label: '个(大)', gramsPerUnit: 280 }, { label: '个(中)', gramsPerUnit: 200 }, { label: '个(小)', gramsPerUnit: 140 }] },
  { id: 'food-common-017', name: '西兰花（炒）', nameEn: 'Broccoli (Stir-fried)', caloriesPer100g: 35, proteinPer100g: 2.8, carbsPer100g: 5, fatPer100g: 0.4, servingSize: 150, servingDescription: '1份', category: '蔬菜', source: 'built_in', createdAt: 0, portionOptions: [{ label: '份(大)', gramsPerUnit: 200 }, { label: '份(中)', gramsPerUnit: 150 }, { label: '份(小)', gramsPerUnit: 80 }] },
  { id: 'food-common-018', name: '菠菜', nameEn: 'Spinach', caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, servingSize: 100, servingDescription: '1份', category: '蔬菜', source: 'built_in', createdAt: 0, portionOptions: [{ label: '份(大)', gramsPerUnit: 150 }, { label: '份(中)', gramsPerUnit: 100 }, { label: '份(小)', gramsPerUnit: 60 }] },
  { id: 'food-common-019', name: '番茄', nameEn: 'Tomato', caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, servingSize: 150, servingDescription: '1个', category: '蔬菜', source: 'built_in', createdAt: 0, portionOptions: [{ label: '个(大)', gramsPerUnit: 200 }, { label: '个(中)', gramsPerUnit: 150 }, { label: '个(小)', gramsPerUnit: 100 }] },
  { id: 'food-common-020', name: '杏仁', nameEn: 'Almonds', caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50, servingSize: 25, servingDescription: '1小把', category: '坚果种子', source: 'built_in', createdAt: 0, portionOptions: [{ label: '把(大)', gramsPerUnit: 35 }, { label: '把(小)', gramsPerUnit: 20 }, { label: '粒', gramsPerUnit: 1.2 }] },
  { id: 'food-common-021', name: '牛油果', nameEn: 'Avocado', caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 8.5, fatPer100g: 14.7, servingSize: 80, servingDescription: '半个', category: '水果', source: 'built_in', createdAt: 0, portionOptions: [{ label: '个(大)', gramsPerUnit: 200 }, { label: '个(中)', gramsPerUnit: 150 }, { label: '半个', gramsPerUnit: 80 }] },
  { id: 'food-common-022', name: '花生酱', nameEn: 'Peanut Butter', caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50, servingSize: 15, servingDescription: '1勺', category: '坚果种子', source: 'built_in', createdAt: 0, portionOptions: [{ label: '勺(满)', gramsPerUnit: 20 }, { label: '勺(平)', gramsPerUnit: 15 }, { label: '勺(薄)', gramsPerUnit: 10 }] },
  { id: 'food-common-023', name: '白粥', nameEn: 'Rice Porridge', caloriesPer100g: 46, proteinPer100g: 0.8, carbsPer100g: 9.8, fatPer100g: 0.1, servingSize: 200, servingDescription: '1碗', category: '谷类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '碗(大)', gramsPerUnit: 300 }, { label: '碗(中)', gramsPerUnit: 200 }, { label: '碗(小)', gramsPerUnit: 130 }] },
  { id: 'food-common-024', name: '紫菜蛋花汤', nameEn: 'Seaweed Egg Soup', caloriesPer100g: 22, proteinPer100g: 1.5, carbsPer100g: 1.8, fatPer100g: 0.8, servingSize: 250, servingDescription: '1碗', category: '菌藻', source: 'built_in', createdAt: 0, portionOptions: [{ label: '碗(大)', gramsPerUnit: 350 }, { label: '碗(中)', gramsPerUnit: 250 }, { label: '碗(小)', gramsPerUnit: 180 }] },
  { id: 'food-common-025', name: '牛奶', nameEn: 'Milk', caloriesPer100g: 54, proteinPer100g: 3.3, carbsPer100g: 5, fatPer100g: 2.1, servingSize: 250, servingDescription: '1杯', category: '乳类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '杯(大)', gramsPerUnit: 350 }, { label: '杯(中)', gramsPerUnit: 250 }, { label: '杯(小)', gramsPerUnit: 180 }] },
  { id: 'food-common-026', name: '豆浆', nameEn: 'Soy Milk', caloriesPer100g: 33, proteinPer100g: 3, carbsPer100g: 1.2, fatPer100g: 1.5, servingSize: 250, servingDescription: '1杯', category: '干豆类', source: 'built_in', createdAt: 0, portionOptions: [{ label: '杯(大)', gramsPerUnit: 350 }, { label: '杯(中)', gramsPerUnit: 250 }, { label: '杯(小)', gramsPerUnit: 180 }] },
];

export { commonFoods };

// Dynamic loader: fetches comprehensive food data from JSON on demand
let _cfcdCache: FoodItem[] | null = null;

export async function loadCfcdFoods(): Promise<FoodItem[]> {
  if (_cfcdCache) return _cfcdCache;
  try {
    const resp = await fetch('/food-data.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _cfcdCache = await resp.json() as FoodItem[];
    return _cfcdCache;
  } catch {
    console.warn('Failed to load food-data.json, using common foods only');
    return [];
  }
}

// Load all built-in foods into IndexedDB (called once on app init)
export async function loadBuiltInFoods(): Promise<void> {
  const { db } = await import('../../../core/db');
  const count = await db.foodItems.where('source').equals('built_in').count();
  if (count > 0) return;
  
  const now = Date.now();
  // First insert common foods + dish foods
  const commonWithTimestamp = commonFoods.map(f => ({ ...f, createdAt: now }));
  const dishWithTimestamp = dishFoods.map(f => ({ ...f, createdAt: now }));
  await db.foodItems.bulkPut([...commonWithTimestamp, ...dishWithTimestamp]);
  
  // Then load comprehensive data lazily
  const cfcdData = await loadCfcdFoods();
  if (cfcdData.length > 0) {
    const cfcdWithTimestamp = cfcdData.map(f => ({ ...f, createdAt: now }));
    await db.foodItems.bulkPut(cfcdWithTimestamp);
  }
}

// Get all built-in foods (common + dish + loaded cfcd)
export function getBuiltInFoods(): FoodItem[] {
  if (_cfcdCache) return [...commonFoods, ...dishFoods, ..._cfcdCache];
  return [...commonFoods, ...dishFoods];
}
