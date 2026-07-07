// ============================================================
// FitTrack Pro - Core Type Definitions
// Based on Technical Architecture Design v1.0
// ============================================================

// ---- Enums ----

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulder' | 'arm'
  | 'core' | 'leg' | 'full_body';

export type ExerciseCategory =
  | 'compound'    // 复合动作
  | 'isolation'   // 孤立动作
  | 'cardio'      // 有氧
  | 'flexibility' // 柔韧/拉伸
  | 'warmup';     // 热身

export type EquipmentType =
  | 'barbell' | 'dumbbell' | 'cable' | 'machine'
  | 'bodyweight' | 'kettlebell' | 'band' | 'other';

export type SetType = 'warmup' | 'working';

export type MealType =
  | 'breakfast' | 'morning_snack' | 'lunch'
  | 'afternoon_snack' | 'dinner' | 'evening_snack';

export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';

export type FitnessGoal = 'muscle_gain' | 'fat_loss' | 'recomposition' | 'endurance' | 'general';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type Gender = 'male' | 'female' | 'other';

// ---- Exercise ----

export interface MuscleEngagement {
  muscle: MuscleGroup;
  subMuscle?: string;      // e.g. "前束", "中束", "外侧"
  isPrimary: boolean;
}

export interface ExerciseStep {
  order: number;
  instruction: string;
}

export interface ExerciseRisk {
  level: 'low' | 'medium' | 'high';
  description: string;
}

export interface Exercise {
  id: string;
  name: string;
  nameEn?: string;
  category: ExerciseCategory;
  equipment: EquipmentType[];
  muscles: MuscleEngagement[];
  steps: ExerciseStep[];
  risks: ExerciseRisk[];
  tips?: string[];
  videoUrl?: string;
  imageUrl?: string;
  source: 'built_in' | 'ai_generated' | 'user_created';
  recommendedSets: {
    beginner: number;
    intermediate: number;
    advanced: number;
  };
  recommendedReps: string; // e.g. "8-12"
  createdAt: number;
  updatedAt: number;
}

export interface ExerciseFilter {
  search?: string;
  muscleGroup?: MuscleGroup;
  category?: ExerciseCategory;
  equipment?: EquipmentType;
  source?: Exercise['source'];
}

// ---- Workout Plan ----

export interface PlanExercise {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps: string;
  setType: SetType;
  restSeconds: number;
  notes?: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string;
  exercises: PlanExercise[];
  warmupExercises: PlanExercise[];
  cooldownExercises: PlanExercise[];
  scheduledDate?: string;     // ISO date
  weekDay?: number;           // 0-6, for weekly template
  isTemplate: boolean;
  lastCompletedAt?: number;   // timestamp of last completed workout
  createdAt: number;
  updatedAt: number;
}

// ---- Workout Log ----

export interface ExerciseSetLog {
  setNumber: number;
  setType: SetType;
  weight: number | null;
  reps: number | null;
  duration?: number;          // seconds, for timed exercises
  isCompleted: boolean;
  completedAt?: number;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;      // snapshot
  sets: ExerciseSetLog[];
  order: number;
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  planId?: string;
  planName?: string;
  exercises: ExerciseLog[];
  startTime: number;
  endTime?: number;
  totalDuration?: number;    // seconds
  totalVolume?: number;      // kg
  estimatedCalories?: number;
  notes?: string;
  createdAt: number;
}

// ---- Diet ----

export interface PortionOption {
  label: string;            // e.g. "个", "大根", "根(中)", "小根", "碗", "块", "片", "勺"
  gramsPerUnit: number;     // estimated grams per 1 unit
}

export interface FoodItem {
  id: string;
  name: string;
  nameEn?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSize?: number;      // grams
  servingDescription?: string;
  portionOptions?: PortionOption[];  // multiple unit choices with weight estimates
  category?: string;
  source: 'built_in' | 'api' | 'user_created' | 'ai';
  createdAt: number;
}

export interface MealEntry {
  id: string;
  date: string;               // YYYY-MM-DD, for Dexie index query
  mealType: MealType;
  foodId: string;
  foodName: string;           // snapshot
  amountGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photoUrl?: string;
  recordedAt: number;
}

export interface DailyDiet {
  id: string;
  date: string;               // YYYY-MM-DD
  meals: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  waterIntake?: number;       // ml
  createdAt: number;
  updatedAt: number;
}

// ---- Body Data ----

export interface BodyMeasurement {
  id: string;
  date: string;               // YYYY-MM-DD
  time?: string;              // HH:mm
  bodyWeight?: number;
  bodyFatRate?: number;
  muscleMass?: number;
  bmi?: number;
  basalMetabolism?: number;
  boneMass?: number;
  visceralFatLevel?: number;
  bodyFat?: number;           // kg
  // Circumferences
  waistCircumference?: number;
  chestCircumference?: number;
  leftArmCircumference?: number;
  rightArmCircumference?: number;
  leftThighCircumference?: number;
  rightThighCircumference?: number;
  hipCircumference?: number;
  leftCalfCircumference?: number;
  rightCalfCircumference?: number;
  // Photos
  frontPhotoUrl?: string;
  sidePhotoUrl?: string;
  backPhotoUrl?: string;
  // Meta
  dataSource: 'manual' | 'huawei_scale' | 'huawei_watch' | 'other_device';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface HuaweiHealthConfig {
  id?: string;
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  lastSyncAt?: number;
  syncScope: {
    weight: boolean;
    heartRate: boolean;
    steps: boolean;
    sleep: boolean;
  };
  syncStrategy: 'auto_daily' | 'manual' | 'on_app_open';
  authorizedAt?: number;
}

// ---- User Profile ----

export interface UserProfile {
  id: string;
  nickname?: string;
  gender?: Gender;
  age?: number;
  height?: number;            // cm
  weight?: number;            // kg
  trainingLevel: TrainingLevel;
  fitnessGoal: FitnessGoal;
  activityLevel: ActivityLevel;
  // Calculated
  bmr?: number;               // kcal, can be overridden
  bmrSource?: 'formula' | 'huawei' | 'manual';
  tdee?: number;
  dailyCalorieTarget?: number;
  macroSplit?: {
    proteinRatio: number;     // 0-1
    carbsRatio: number;
    fatRatio: number;
  };
  measurementReminder?: {
    enabled: boolean;
    time: string;             // HH:mm
  };
  createdAt: number;
  updatedAt: number;
}

// ---- Analytics ----

export type TimeRangePreset = '1_week' | '1_month' | '3_months' | '1_year' | 'custom';

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface MuscleGroupBalance {
  muscleGroup: MuscleGroup;
  weeklySets: number;
  weeklyVolume: number;
  recoveryPercent: number;   // 0-100
  lastTrainedAt?: number;
}
