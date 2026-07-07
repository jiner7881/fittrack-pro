import Dexie, { type EntityTable } from 'dexie';
import type {
  Exercise,
  WorkoutPlan,
  WorkoutLog,
  FoodItem,
  MealEntry,
  BodyMeasurement,
  HuaweiHealthConfig,
  UserProfile,
} from '../types';

// ---- Database Definition ----

class FitTrackDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  workoutPlans!: EntityTable<WorkoutPlan, 'id'>;
  workoutLogs!: EntityTable<WorkoutLog, 'id'>;
  foodItems!: EntityTable<FoodItem, 'id'>;
  mealEntries!: EntityTable<MealEntry, 'id'>;
  bodyMeasurements!: EntityTable<BodyMeasurement, 'id'>;
  huaweiHealthConfig!: EntityTable<HuaweiHealthConfig, 'id'>;
  userProfile!: EntityTable<UserProfile, 'id'>;

  constructor() {
    super('FitTrackProDB');

    this.version(2).stores({
      exercises: 'id, category, source, *muscles.muscle, *equipment',
      workoutPlans: 'id, scheduledDate, weekDay, isTemplate',
      workoutLogs: 'id, planId, startTime, createdAt',
      foodItems: 'id, source, category',
      mealEntries: 'id, mealType, date, recordedAt',
      bodyMeasurements: 'id, date, dataSource, createdAt',
      huaweiHealthConfig: 'id',
      userProfile: 'id',
    });

    this.version(3).stores({
      exercises: 'id, category, source, *muscles.muscle, *equipment',
      workoutPlans: 'id, scheduledDate, weekDay, isTemplate',
      workoutLogs: 'id, planId, startTime, createdAt',
      foodItems: 'id, source, category',
      mealEntries: 'id, mealType, date, recordedAt',
      bodyMeasurements: 'id, date, dataSource, createdAt',
      huaweiHealthConfig: 'id',
      userProfile: 'id',
    }).upgrade(tx => {
      // Clear corrupted food data so it gets re-seeded with fixed values
      return tx.table('foodItems').clear();
    });

    this.version(4).stores({
      exercises: 'id, category, source, *muscles.muscle, *equipment',
      workoutPlans: 'id, scheduledDate, weekDay, isTemplate',
      workoutLogs: 'id, planId, startTime, createdAt',
      foodItems: 'id, source, category',
      mealEntries: 'id, mealType, date, recordedAt',
      bodyMeasurements: 'id, date, dataSource, createdAt',
      huaweiHealthConfig: 'id',
      userProfile: 'id',
    }).upgrade(tx => {
      // Clear food data to re-seed with new dish foods (包子, 饺子, etc.)
      return tx.table('foodItems').clear();
    });

    this.version(5).stores({
      exercises: 'id, category, source, *muscles.muscle, *equipment',
      workoutPlans: 'id, scheduledDate, weekDay, isTemplate',
      workoutLogs: 'id, planId, startTime, createdAt',
      foodItems: 'id, source, category',
      mealEntries: 'id, mealType, date, recordedAt',
      bodyMeasurements: 'id, date, dataSource, createdAt',
      huaweiHealthConfig: 'id',
      userProfile: 'id',
    }).upgrade(tx => {
      // Re-seed food data with portionOptions support
      return tx.table('foodItems').clear();
    });
  }
}

export const db = new FitTrackDB();

// ---- Helper: ensure default user profile exists ----

const DEFAULT_USER_ID = 'default';

export async function ensureDefaultUser(): Promise<void> {
  const existing = await db.userProfile.get(DEFAULT_USER_ID);
  if (!existing) {
    await db.userProfile.put({
      id: DEFAULT_USER_ID,
      trainingLevel: 'intermediate',
      fitnessGoal: 'recomposition',
      activityLevel: 'moderate',
      measurementReminder: { enabled: true, time: '07:00' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

// ---- Seed default plans ----

async function seedDefaultPlans(): Promise<void> {
  const count = await db.workoutPlans.count();
  if (count > 0) return;

  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

  const defaultPlans: WorkoutPlan[] = [
    {
      id: 'plan-chest',
      name: '胸部训练',
      description: '胸大肌全面训练，侧重中部和上部',
      warmupExercises: [
        { exerciseId: 'pushup', order: 1, targetSets: 1, targetReps: '15', setType: 'warmup', restSeconds: 30 },
      ],
      exercises: [
        { exerciseId: 'barbell-bench-press', order: 1, targetSets: 4, targetReps: '8-10', setType: 'working', restSeconds: 120 },
        { exerciseId: 'incline-dumbbell-press', order: 2, targetSets: 4, targetReps: '10-12', setType: 'working', restSeconds: 90 },
        { exerciseId: 'dumbbell-fly', order: 3, targetSets: 3, targetReps: '12-15', setType: 'working', restSeconds: 90 },
        { exerciseId: 'cable-crossover', order: 4, targetSets: 3, targetReps: '12-15', setType: 'working', restSeconds: 60 },
      ],
      cooldownExercises: [],
      scheduledDate: addDays(0),
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'plan-back',
      name: '背部训练',
      description: '背阔肌主导，兼顾厚度和宽度',
      warmupExercises: [],
      exercises: [
        { exerciseId: 'lat-pulldown', order: 1, targetSets: 4, targetReps: '10-12', setType: 'working', restSeconds: 90 },
        { exerciseId: 'barbell-row', order: 2, targetSets: 4, targetReps: '8-10', setType: 'working', restSeconds: 120 },
        { exerciseId: 'seated-cable-row', order: 3, targetSets: 3, targetReps: '10-12', setType: 'working', restSeconds: 90 },
      ],
      cooldownExercises: [],
      scheduledDate: addDays(2),
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'plan-leg',
      name: '腿部训练',
      description: '股四头肌和腘绳肌综合训练',
      warmupExercises: [],
      exercises: [
        { exerciseId: 'squat', order: 1, targetSets: 5, targetReps: '6-10', setType: 'working', restSeconds: 150 },
        { exerciseId: 'leg-press', order: 2, targetSets: 4, targetReps: '10-12', setType: 'working', restSeconds: 90 },
        { exerciseId: 'romanian-deadlift', order: 3, targetSets: 3, targetReps: '8-12', setType: 'working', restSeconds: 90 },
        { exerciseId: 'leg-curl', order: 4, targetSets: 3, targetReps: '10-12', setType: 'working', restSeconds: 60 },
        { exerciseId: 'calf-raise', order: 5, targetSets: 4, targetReps: '15-20', setType: 'working', restSeconds: 45 },
      ],
      cooldownExercises: [],
      scheduledDate: addDays(4),
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'plan-shoulder',
      name: '肩部训练',
      description: '前中后束全面刺激',
      warmupExercises: [],
      exercises: [
        { exerciseId: 'overhead-press', order: 1, targetSets: 4, targetReps: '6-10', setType: 'working', restSeconds: 120 },
        { exerciseId: 'lateral-raise', order: 2, targetSets: 4, targetReps: '12-15', setType: 'working', restSeconds: 60 },
        { exerciseId: 'front-raise', order: 3, targetSets: 3, targetReps: '12-15', setType: 'working', restSeconds: 60 },
        { exerciseId: 'face-pull', order: 4, targetSets: 3, targetReps: '15-20', setType: 'working', restSeconds: 60 },
      ],
      cooldownExercises: [],
      scheduledDate: addDays(6),
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  await db.workoutPlans.bulkPut(defaultPlans);
}

// ---- Seed built-in foods ----

async function seedBuiltInFoods(): Promise<void> {
  const count = await db.foodItems.where('source').equals('built_in').count();
  if (count > 0) return;
  // Dynamic import to reduce initial bundle size
  const { loadBuiltInFoods } = await import('../../features/diet/data/builtInFoods');
  await loadBuiltInFoods();
}

// ---- Initialize DB ----

export async function initDB(): Promise<void> {
  await ensureDefaultUser();
  await seedDefaultPlans();
  await seedBuiltInFoods();
}
