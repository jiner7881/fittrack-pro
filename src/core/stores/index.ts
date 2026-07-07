import { create } from 'zustand';
import type {
  Exercise,
  ExerciseFilter,
  WorkoutPlan,
  WorkoutLog,
  DailyDiet,
  MealEntry,
  BodyMeasurement,
  UserProfile,
  HuaweiHealthConfig,
  MuscleGroupBalance,
  TrainingLevel,
  FitnessGoal,
  ActivityLevel,
} from '../types';
import { db } from '../db';

// ============================================================
// User Store
// ============================================================

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  loadProfile: () => Promise<void>;
  updateProfile: (partial: Partial<UserProfile>) => Promise<void>;
  updateTrainingLevel: (level: TrainingLevel) => Promise<void>;
  updateFitnessGoal: (goal: FitnessGoal) => Promise<void>;
  updateActivityLevel: (level: ActivityLevel) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  loading: true,

  loadProfile: async () => {
    const profile = await db.userProfile.get('default');
    if (profile) set({ profile, loading: false });
  },

  updateProfile: async (partial) => {
    const existing = get().profile;
    if (!existing) return;
    const updated = { ...existing, ...partial, updatedAt: Date.now() };
    await db.userProfile.put(updated);
    set({ profile: updated });
  },

  updateTrainingLevel: async (level) => {
    await get().updateProfile({ trainingLevel: level });
  },

  updateFitnessGoal: async (goal) => {
    await get().updateProfile({ fitnessGoal: goal });
  },

  updateActivityLevel: async (level) => {
    await get().updateProfile({ activityLevel: level });
  },
}));

// ============================================================
// Exercise Store
// ============================================================

interface ExerciseState {
  exercises: Exercise[];
  filteredExercises: Exercise[];
  filter: ExerciseFilter;
  loading: boolean;
  loadExercises: () => Promise<void>;
  setFilter: (filter: ExerciseFilter) => void;
  applyFilter: () => void;
  addExercise: (exercise: Exercise) => Promise<void>;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: [],
  filteredExercises: [],
  filter: {},
  loading: true,

  loadExercises: async () => {
    const exercises = await db.exercises.toArray();
    set({ exercises, filteredExercises: exercises, loading: false });
  },

  setFilter: (filter) => {
    set({ filter });
    get().applyFilter();
  },

  applyFilter: () => {
    const { exercises, filter } = get();
    let result = [...exercises];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.nameEn && e.nameEn.toLowerCase().includes(q))
      );
    }
    if (filter.muscleGroup) {
      result = result.filter((e) =>
        e.muscles.some((m) => m.muscle === filter.muscleGroup && m.isPrimary)
      );
    }
    if (filter.category) {
      result = result.filter((e) => e.category === filter.category);
    }
    if (filter.equipment) {
      result = result.filter((e) => e.equipment.includes(filter.equipment!));
    }
    if (filter.source) {
      result = result.filter((e) => e.source === filter.source);
    }

    set({ filteredExercises: result });
  },

  addExercise: async (exercise) => {
    await db.exercises.put(exercise);
    const exercises = await db.exercises.toArray();
    set({ exercises, filteredExercises: exercises });
    get().applyFilter();
  },
}));

// ============================================================
// Workout Store
// ============================================================

interface WorkoutState {
  plans: WorkoutPlan[];
  recentLogs: WorkoutLog[];
  loading: boolean;
  loadPlans: () => Promise<void>;
  loadRecentLogs: (limit?: number) => Promise<void>;
  addPlan: (plan: WorkoutPlan) => Promise<void>;
  addLog: (log: WorkoutLog) => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  plans: [],
  recentLogs: [],
  loading: true,

  loadPlans: async () => {
    const plans = await db.workoutPlans.toArray();
    set({ plans, loading: false });
  },

  loadRecentLogs: async (limit = 20) => {
    const recentLogs = await db.workoutLogs
      .orderBy('createdAt')
      .reverse()
      .limit(limit)
      .toArray();
    set({ recentLogs });
  },

  addPlan: async (plan) => {
    await db.workoutPlans.put(plan);
    const plans = await db.workoutPlans.toArray();
    set({ plans });
  },

  addLog: async (log) => {
    await db.workoutLogs.put(log);
  },
}));

// ============================================================
// Diet Store
// ============================================================

interface DietState {
  dailyDiet: DailyDiet | null;
  todayMeals: MealEntry[];
  loading: boolean;
  loadTodayDiet: () => Promise<void>;
  addMealEntry: (entry: MealEntry) => Promise<void>;
  removeMealEntry: (id: string) => Promise<void>;
}

export const useDietStore = create<DietState>((set, get) => ({
  dailyDiet: null,
  todayMeals: [],
  loading: true,

  loadTodayDiet: async () => {
    const today = new Date().toISOString().slice(0, 10);
    const entries = await db.mealEntries
      .where('date')
      .equals(today)
      .toArray();
    const totalCalories = entries.reduce((s, e) => s + e.calories, 0);
    const totalProtein = entries.reduce((s, e) => s + e.protein, 0);
    const totalCarbs = entries.reduce((s, e) => s + e.carbs, 0);
    const totalFat = entries.reduce((s, e) => s + e.fat, 0);

    set({
      todayMeals: entries,
      dailyDiet: {
        id: today,
        date: today,
        meals: entries,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      loading: false,
    });
  },

  addMealEntry: async (entry) => {
    await db.mealEntries.put(entry);
    await get().loadTodayDiet();
  },

  removeMealEntry: async (id) => {
    await db.mealEntries.delete(id);
    await get().loadTodayDiet();
  },
}));

// ============================================================
// Body Data Store
// ============================================================

interface BodyDataState {
  latestMeasurement: BodyMeasurement | null;
  measurements: BodyMeasurement[];
  huaweiConfig: HuaweiHealthConfig | null;
  loading: boolean;
  loadLatest: () => Promise<void>;
  loadMeasurements: (limit?: number) => Promise<void>;
  addMeasurement: (m: BodyMeasurement) => Promise<void>;
  loadHuaweiConfig: () => Promise<void>;
  updateHuaweiConfig: (config: Partial<HuaweiHealthConfig>) => Promise<void>;
}

export const useBodyDataStore = create<BodyDataState>((set, get) => ({
  latestMeasurement: null,
  measurements: [],
  huaweiConfig: null,
  loading: true,

  loadLatest: async () => {
    const all = await db.bodyMeasurements
      .orderBy('date')
      .reverse()
      .limit(1)
      .toArray();
    set({ latestMeasurement: all[0] || null });
  },

  loadMeasurements: async (limit = 90) => {
    const measurements = await db.bodyMeasurements
      .orderBy('date')
      .reverse()
      .limit(limit)
      .toArray();
    set({ measurements, loading: false });
  },

  addMeasurement: async (m) => {
    await db.bodyMeasurements.put(m);
    await get().loadLatest();
    await get().loadMeasurements();
  },

  loadHuaweiConfig: async () => {
    const configs = await db.huaweiHealthConfig.toArray();
    set({ huaweiConfig: configs[0] || null });
  },

  updateHuaweiConfig: async (partial) => {
    const existing = get().huaweiConfig;
    const id = existing?.id || 'default';
    const updated = { ...existing, ...partial, id } as HuaweiHealthConfig;
    await db.huaweiHealthConfig.put(updated);
    set({ huaweiConfig: updated });
  },
}));

// ============================================================
// Analytics Store (computed from other stores)
// ============================================================

interface AnalyticsState {
  muscleBalance: MuscleGroupBalance[];
  weeklyStats: {
    trainingDays: number;
    totalVolume: number;
    totalCaloriesBurned: number;
    totalSets: number;
  } | null;
}

export const useAnalyticsStore = create<AnalyticsState>(() => ({
  muscleBalance: [],
  weeklyStats: null,
}));
