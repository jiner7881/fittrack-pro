// AI Service Layer for FitTrack Pro
// Supports OpenAI-compatible API endpoints with offline fallback

export interface AIServiceConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  error?: string;
  fromCache?: boolean;
}

const DEFAULT_CONFIG: AIServiceConfig = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  enabled: false,
};

// Persist config in localStorage
const CONFIG_KEY = 'fittrack-ai-config';

export function getAIConfig(): AIServiceConfig {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function setAIConfig(config: Partial<AIServiceConfig>): void {
  const current = getAIConfig();
  const merged = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
}

// Core chat completion call (OpenAI-compatible)
async function chatCompletion(
  messages: AIMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<AIResponse> {
  const config = getAIConfig();

  if (!config.enabled || !config.apiKey) {
    return { content: '', error: 'AI 功能未启用，请在设置中配置 API Key' };
  }

  try {
    const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1500,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return { content: '', error: `API 请求失败 (${resp.status}): ${errText.slice(0, 200)}` };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    return { content };
  } catch (err: any) {
    return { content: '', error: `网络错误: ${err.message}` };
  }
}

// ---- System Prompts ----

const EXERCISE_SYSTEM_PROMPT = `你是 FitTrack Pro 的健身 AI 助手，专注于力量训练指导。你的任务是根据用户的训练水平、健身目标和可用器械，推荐合适的训练动作、组数、次数和休息时间。

回复格式要求：
- 用简洁的中文回复
- 每个推荐动作包含：动作名、目标肌群、建议组数、每组次数、休息时间
- 如果用户已有训练计划，给出优化建议
- 注意区分热身组和正式组`;

const DIET_SYSTEM_PROMPT = `你是 FitTrack Pro 的营养 AI 助手，专注于增肌减脂饮食指导。你的任务是根据用户的饮食记录、健身目标和身体数据，给出饮食调整建议。

回复格式要求：
- 用简洁的中文回复
- 给出具体的食物推荐和份量
- 注意蛋白质、碳水、脂肪的合理配比
- 考虑用户的中国饮食习惯`;

const BODY_SYSTEM_PROMPT = `你是 FitTrack Pro 的健康分析 AI 助手。你的任务是根据用户的身体数据趋势（体重、体脂率、肌肉量等），分析身体变化趋势并给出建议。

回复格式要求：
- 用简洁的中文回复
- 分析数据趋势（上升/下降/平稳）
- 给出可能的改善方向
- 如有异常数据，提醒关注`;

const FOOD_SYSTEM_PROMPT = `你是 FitTrack Pro 的食物识别 AI 助手。你的任务是根据用户描述的食物，识别食物名称并估算营养成分（每100g的热量、蛋白质、碳水、脂肪）。

回复格式要求（严格 JSON）：
[{"name":"食物名","caloriesPer100g":数字,"proteinPer100g":数字,"carbsPer100g":数字,"fatPer100g":数字}]
- 只返回 JSON 数组，不要其他文字
- 数值为每100g含量
- 热量单位 kcal`;

// ---- Public AI Functions ----

export async function getExerciseRecommendation(context: {
  goal: string;
  level: string;
  targetMuscle?: string;
  availableEquipment?: string[];
  currentPlan?: string;
}): Promise<AIResponse> {
  const userMsg = [
    `我的健身目标：${context.goal}`,
    `训练水平：${context.level}`,
    context.targetMuscle ? `目标肌群：${context.targetMuscle}` : '',
    context.availableEquipment?.length ? `可用器械：${context.availableEquipment.join('、')}` : '',
    context.currentPlan ? `当前计划：${context.currentPlan}` : '',
  ].filter(Boolean).join('\n');

  return chatCompletion([
    { role: 'system', content: EXERCISE_SYSTEM_PROMPT },
    { role: 'user', content: userMsg },
  ]);
}

export async function getDietAdvice(context: {
  goal: string;
  todayCalories: number;
  targetCalories: number;
  todayProtein: number;
  targetProtein: number;
  todayCarbs: number;
  targetCarbs: number;
  todayFat: number;
  targetFat: number;
  mealType?: string;
}): Promise<AIResponse> {
  const userMsg = [
    `我的健身目标：${context.goal}`,
    `今日摄入：${context.todayCalories} kcal（目标 ${context.targetCalories} kcal）`,
    `蛋白质：${context.todayProtein}g / ${context.targetProtein}g`,
    `碳水：${context.todayCarbs}g / ${context.targetCarbs}g`,
    `脂肪：${context.todayFat}g / ${context.targetFat}g`,
    context.mealType ? `当前餐次：${context.mealType}` : '',
    '请给出饮食建议和推荐食物',
  ].filter(Boolean).join('\n');

  return chatCompletion([
    { role: 'system', content: DIET_SYSTEM_PROMPT },
    { role: 'user', content: userMsg },
  ]);
}

export async function getBodyAnalysis(context: {
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  bmi?: number;
  trend?: string;
  goal: string;
}): Promise<AIResponse> {
  const userMsg = [
    `我的健身目标：${context.goal}`,
    context.weight ? `当前体重：${context.weight}kg` : '',
    context.bodyFat ? `体脂率：${context.bodyFat}%` : '',
    context.muscleMass ? `肌肉量：${context.muscleMass}kg` : '',
    context.bmi ? `BMI：${context.bmi}` : '',
    context.trend ? `近期趋势：${context.trend}` : '',
    '请分析我的身体数据并给出建议',
  ].filter(Boolean).join('\n');

  return chatCompletion([
    { role: 'system', content: BODY_SYSTEM_PROMPT },
    { role: 'user', content: userMsg },
  ]);
}

export async function identifyFood(description: string): Promise<AIResponse> {
  return chatCompletion([
    { role: 'system', content: FOOD_SYSTEM_PROMPT },
    { role: 'user', content: `请识别以下食物并估算营养成分：${description}` },
  ], { temperature: 0.3, maxTokens: 500 });
}

// ---- Offline Fallback Rules ----

export function getOfflineExerciseRecommendation(context: {
  goal: string;
  level: string;
  targetMuscle?: string;
}): string {
  const { goal, level, targetMuscle } = context;
  const levelSets = { beginner: 3, intermediate: 4, advanced: 5 }[level] || 3;
  const levelReps = { beginner: '12-15', intermediate: '8-12', advanced: '6-8' }[level] || '10';

  let advice = `基于${goal === 'muscle_gain' ? '增肌' : goal === 'fat_loss' ? '减脂' : '塑形'}目标和${level === 'beginner' ? '初学' : level === 'intermediate' ? '中级' : '高级'}水平：\n\n`;

  if (targetMuscle) {
    advice += `建议${targetMuscle}训练：\n`;
    advice += `- 复合动作 ${levelSets} 组 × ${levelReps} 次\n`;
    advice += `- 孤立动作 ${levelSets - 1} 组 × ${levelReps} 次\n`;
    advice += `- 组间休息 ${level === 'beginner' ? '90' : level === 'intermediate' ? '60-90' : '45-60'} 秒\n`;
  }

  if (goal === 'fat_loss') {
    advice += `\n减脂建议：\n- 每组次数偏高（12-15次）\n- 组间休息偏短（45-60秒）\n- 训练后加20-30分钟有氧`;
  } else if (goal === 'muscle_gain') {
    advice += `\n增肌建议：\n- 逐步增加重量\n- 注重离心控制\n- 保证蛋白质摄入 1.6-2.2g/kg体重`;
  }

  advice += `\n\n（离线模式 - AI 功能需联网获取更详细建议）`;
  return advice;
}

export function getOfflineDietAdvice(context: {
  goal: string;
  todayCalories: number;
  targetCalories: number;
  todayProtein: number;
  targetProtein: number;
}): string {
  const deficit = context.targetCalories - context.todayCalories;
  const proteinDeficit = context.targetProtein - context.todayProtein;

  let advice = '';

  if (deficit > 300) {
    advice += `还需摄入约 ${deficit} kcal，建议：\n`;
    if (proteinDeficit > 20) {
      advice += `- 补充蛋白质：鸡胸肉/鸡蛋/鱼肉约 ${Math.round(proteinDeficit / 25 * 100)}g\n`;
    }
    advice += `- 补充碳水：米饭/红薯约 ${(deficit / 4 * 0.5).toFixed(0)}g 碳水\n`;
  } else if (deficit < -200) {
    advice += `今日摄入已超出目标 ${Math.abs(deficit)} kcal，建议：\n`;
    advice += `- 减少脂肪摄入\n`;
    advice += `- 增加有氧运动消耗\n`;
  } else {
    advice += `今日摄入接近目标，继续保持！\n`;
  }

  if (proteinDeficit > 30) {
    advice += `\n蛋白质摄入不足，还需约 ${proteinDeficit}g，优先选择瘦肉、鸡蛋、乳制品`;
  }

  advice += `\n\n（离线模式 - AI 功能需联网获取更详细建议）`;
  return advice;
}
