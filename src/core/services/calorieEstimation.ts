// ============================================================
// FitTrack Pro - Calorie Burn Estimation Model
// Multi-factor model: MET × duration × bodyweight × muscle group × intensity
// ============================================================

import type { ExerciseLog, MuscleGroup, ExerciseSetLog } from '../types';
import { db } from '../db';

// ---- MET Values by Muscle Group & Exercise Type ----
// MET (Metabolic Equivalent of Task): ratio of work metabolic rate to resting metabolic rate
// Based on ACSM (American College of Sports Medicine) guidelines, adapted for resistance training

// Compound exercises (multi-joint) have higher MET than isolation (single-joint)
// Larger muscle groups (legs, back) burn more than smaller ones (arms, shoulders)

interface METProfile {
  compound: number;   // 复合动作 MET
  isolation: number;  // 孤立动作 MET
  cardio: number;     // 有氧 MET
  warmup: number;     // 热身 MET
}

const MUSCLE_MET: Record<string, METProfile> = {
  leg:          { compound: 6.0, isolation: 4.0, cardio: 7.0, warmup: 3.5 },  // 腿部最大肌群
  back:         { compound: 5.5, isolation: 3.5, cardio: 5.0, warmup: 3.0 },  // 背部大肌群
  chest:        { compound: 5.0, isolation: 3.5, cardio: 4.5, warmup: 3.0 },  // 胸部
  shoulder:     { compound: 4.5, isolation: 3.0, cardio: 4.0, warmup: 2.5 },  // 肩部
  core:         { compound: 4.5, isolation: 3.0, cardio: 5.5, warmup: 2.5 },  // 核心
  arm:          { compound: 3.5, isolation: 2.5, cardio: 3.0, warmup: 2.0 },  // 手臂较小肌群
  full_body:    { compound: 6.5, isolation: 4.0, cardio: 8.0, warmup: 3.5 },  // 全身
};

const DEFAULT_MET: METProfile = { compound: 4.5, isolation: 3.0, cardio: 5.0, warmup: 2.5 };

// ---- Intensity Multiplier based on rep range ----
// Lower reps (heavy weight, 1-5) = higher intensity per rep but fewer reps
// Moderate reps (8-12) = moderate intensity, hypertrophy range
// Higher reps (15+) = endurance, lower per-rep intensity

function getIntensityMultiplier(avgReps: number): number {
  if (avgReps <= 3) return 1.30;   // 极大重量，神经驱动强
  if (avgReps <= 5) return 1.20;   // 大重量，高强度
  if (avgReps <= 8) return 1.10;   // 中大重量
  if (avgReps <= 12) return 1.00;  // 标准增肌范围（基准）
  if (avgReps <= 15) return 0.90;  // 中等重量
  if (avgReps <= 20) return 0.80;  // 轻重量耐力
  return 0.70;                      // 极轻重量耐力
}

// ---- Volume-based calorie adjustment ----
// Heavier loads = more mechanical work = more calories
// Baseline: 1 kcal per 50kg of volume (weight × reps) as rough guide

function getVolumeCalories(totalVolumeKg: number): number {
  // Each 50kg of volume ≈ 1 kcal of mechanical work
  return totalVolumeKg / 50;
}

// ---- Estimate calories for a single exercise ----

export interface ExerciseCalorieEstimate {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup | 'unknown';
  exerciseType: 'compound' | 'isolation' | 'cardio' | 'warmup';
  completedSets: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  metCalories: number;         // MET-based calorie estimate
  volumeCalories: number;      // Volume-based calorie estimate
  estimatedCalories: number;   // Final blended estimate
  setDurationMinutes: number;  // Estimated active time for this exercise
}

async function getExerciseType(
  exerciseId: string
): Promise<{ primaryMuscle: MuscleGroup; exerciseType: 'compound' | 'isolation' | 'cardio' | 'warmup' }> {
  try {
    const exercise = await db.exercises.get(exerciseId);
    if (exercise) {
      const primary = exercise.muscles.find((m) => m.isPrimary);
      return {
        primaryMuscle: primary?.muscle || 'full_body',
        exerciseType: exercise.category === 'flexibility' || exercise.category === 'warmup'
          ? 'warmup'
          : exercise.category === 'cardio'
            ? 'cardio'
            : exercise.category,
      };
    }
  } catch {
    // Exercise not found in DB
  }

  // Fallback: guess from exercise name
  const name = exerciseId.toLowerCase();
  if (name.includes('squat') || name.includes('deadlift') || name.includes('press') ||
      name.includes('row') || name.includes('bench')) {
    return { primaryMuscle: 'full_body', exerciseType: 'compound' };
  }
  if (name.includes('curl') || name.includes('raise') || name.includes('fly') ||
      name.includes('extension') || name.includes('calf')) {
    return { primaryMuscle: 'arm', exerciseType: 'isolation' };
  }
  if (name.includes('pushup') || name.includes('pullup')) {
    return { primaryMuscle: 'chest', exerciseType: 'compound' };
  }
  return { primaryMuscle: 'full_body', exerciseType: 'compound' };
}

export async function estimateExerciseCalories(
  exerciseLog: ExerciseLog,
  userWeightKg: number = 70
): Promise<ExerciseCalorieEstimate> {
  const { exerciseId, exerciseName, sets } = exerciseLog;

  const completedSets = sets.filter((s) => s.isCompleted);
  const totalReps = completedSets.reduce((sum, s) => sum + (s.reps || 0), 0);
  const totalVolumeKg = completedSets.reduce(
    (sum, s) => sum + (s.weight && s.reps ? s.weight * s.reps : 0), 0
  );

  // Get exercise type info
  const { primaryMuscle, exerciseType } = await getExerciseType(exerciseId);

  // Estimate active time per set
  // - Working set: ~45 seconds per set (time under tension)
  // - Warmup set: ~30 seconds per set
  // - Rest between sets is accounted separately in the MET model
  const avgSetDurationMin = exerciseType === 'warmup' ? 0.5 : 0.75;
  const activeSetMinutes = completedSets.length * avgSetDurationMin;

  // Rest time: use average rest between sets
  // Default: 90s for working, 30s for warmup
  const avgRestSeconds = exerciseType === 'warmup' ? 30 : 90;
  const restMinutes = Math.max(0, completedSets.length - 1) * (avgRestSeconds / 60);
  const totalExerciseMinutes = activeSetMinutes + restMinutes;

  // MET calculation
  const metProfile = MUSCLE_MET[primaryMuscle] || DEFAULT_MET;
  const metValue = metProfile[exerciseType] || metProfile.compound;

  // Intensity multiplier from rep range
  const avgRepsPerSet = completedSets.length > 0 ? totalReps / completedSets.length : 10;
  const intensityMultiplier = getIntensityMultiplier(avgRepsPerSet);

  // MET-based calories: MET × weight(kg) × time(hours) × intensity
  const metCalories = metValue * userWeightKg * (totalExerciseMinutes / 60) * intensityMultiplier;

  // Volume-based calories
  const volumeCalories = getVolumeCalories(totalVolumeKg);

  // Blend: 70% MET-based + 30% volume-based
  // MET captures the metabolic cost well; volume captures the mechanical work
  const estimatedCalories = Math.round(metCalories * 0.7 + volumeCalories * 0.3);

  return {
    exerciseId,
    exerciseName,
    primaryMuscle,
    exerciseType,
    completedSets: completedSets.length,
    totalSets: sets.length,
    totalReps,
    totalVolumeKg,
    metCalories: Math.round(metCalories),
    volumeCalories: Math.round(volumeCalories),
    estimatedCalories: Math.max(estimatedCalories, 1), // minimum 1 kcal per exercise
    setDurationMinutes: Math.round(totalExerciseMinutes * 10) / 10,
  };
}

// ---- Estimate total workout calories ----

export interface WorkoutCalorieEstimate {
  totalCalories: number;
  exerciseBreakdown: ExerciseCalorieEstimate[];
  activeMinutes: number;
  restMinutes: number;
}

export async function estimateWorkoutCalories(
  exercises: ExerciseLog[],
  totalDurationSeconds: number,
  userWeightKg: number = 70
): Promise<WorkoutCalorieEstimate> {
  const exerciseBreakdown: ExerciseCalorieEstimate[] = [];

  for (const exercise of exercises) {
    const est = await estimateExerciseCalories(exercise, userWeightKg);
    exerciseBreakdown.push(est);
  }

  const totalCalories = exerciseBreakdown.reduce((sum, e) => sum + e.estimatedCalories, 0);

  // Estimate active vs rest time
  const totalActiveMinutes = exerciseBreakdown.reduce(
    (sum, e) => sum + e.setDurationMinutes * 0.6, // 60% is active
    0
  );
  const totalDurationMinutes = totalDurationSeconds / 60;
  const restMinutes = Math.max(0, totalDurationMinutes - totalActiveMinutes);

  return {
    totalCalories,
    exerciseBreakdown,
    activeMinutes: Math.round(totalActiveMinutes),
    restMinutes: Math.round(restMinutes),
  };
}

// ---- Quick estimate without DB lookup (for session end) ----

export function quickEstimateCalories(
  exercises: ExerciseLog[],
  totalDurationSeconds: number,
  userWeightKg: number = 70
): number {
  let totalCalories = 0;

  for (const exercise of exercises) {
    const completedSets = exercise.sets.filter((s) => s.isCompleted);
    if (completedSets.length === 0) continue;

    const totalReps = completedSets.reduce((sum, s) => sum + (s.reps || 0), 0);
    const totalVolumeKg = completedSets.reduce(
      (sum, s) => sum + (s.weight && s.reps ? s.weight * s.reps : 0), 0
    );

    // Guess muscle group from exercise name
    const name = exercise.exerciseName;
    let muscleKey = 'full_body';
    if (/腿|深蹲|硬拉|腿举|腿弯|腿屈|小腿/.test(name)) muscleKey = 'leg';
    else if (/背|引体|划船|下拉/.test(name)) muscleKey = 'back';
    else if (/胸|卧推|飞鸟|夹胸/.test(name)) muscleKey = 'chest';
    else if (/肩|推举|侧平|前平|面拉/.test(name)) muscleKey = 'shoulder';
    else if (/腹|核心|卷腹|平板/.test(name)) muscleKey = 'core';
    else if (/臂|弯举|屈伸|二头|三头/.test(name)) muscleKey = 'arm';

    const metProfile = MUSCLE_MET[muscleKey] || DEFAULT_MET;

    // Determine type
    let exType: 'compound' | 'isolation' | 'warmup' = 'compound';
    if (/弯举|侧平|飞鸟|前平|屈伸|夹胸|提踵/.test(name)) exType = 'isolation';
    const isWarmup = completedSets.every((s) => s.setType === 'warmup');
    if (isWarmup) exType = 'warmup';

    const metValue = metProfile[exType];
    const avgReps = totalReps / completedSets.length;
    const intensityMultiplier = getIntensityMultiplier(avgReps);

    // Duration estimate
    const setDurationMin = exType === 'warmup' ? 0.5 : 0.75;
    const avgRestSec = exType === 'warmup' ? 30 : 90;
    const exerciseMinutes = completedSets.length * setDurationMin +
      Math.max(0, completedSets.length - 1) * (avgRestSec / 60);

    const metCal = metValue * userWeightKg * (exerciseMinutes / 60) * intensityMultiplier;
    const volCal = totalVolumeKg / 50;

    totalCalories += metCal * 0.7 + volCal * 0.3;
  }

  // Additional calorie burn from EPOC (Excess Post-exercise Oxygen Consumption)
  // Estimated at ~6-15% of total for resistance training
  const epocBonus = totalCalories * 0.1;

  return Math.round(totalCalories + epocBonus);
}
