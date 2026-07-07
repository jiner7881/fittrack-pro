import { create } from 'zustand';
import type { ExerciseSetLog, ExerciseLog, WorkoutLog } from '../types';
import { db } from '../db';
import { v4 as uuid } from 'uuid';

// ---- Workout Session State ----

export interface WorkoutSession {
  planId?: string;
  planName?: string;
  exercises: ExerciseLog[];
  currentExerciseIndex: number;
  startTime: number;
  timerSeconds: number;      // rest timer
  timerRunning: boolean;
}

interface WorkoutSessionState {
  session: WorkoutSession | null;
  isDrawerOpen: boolean;

  // Session management
  startSession: (planId?: string, planName?: string, exercises?: ExerciseLog[]) => void;
  endSession: () => Promise<WorkoutLog | null>;
  cancelSession: () => void;

  // Set operations
  updateSet: (exerciseIndex: number, setIndex: number, partial: Partial<ExerciseSetLog>) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;

  // Navigation
  setCurrentExercise: (index: number) => void;
  nextExercise: () => void;
  prevExercise: () => void;

  // Timer
  setTimerSeconds: (seconds: number) => void;
  setTimerRunning: (running: boolean) => void;
  adjustTimer: (delta: number) => void;

  // Drawer
  setIsDrawerOpen: (open: boolean) => void;
}

export const useWorkoutSessionStore = create<WorkoutSessionState>((set, get) => ({
  session: null,
  isDrawerOpen: false,

  startSession: (planId, planName, exercises) => {
    const session: WorkoutSession = {
      planId,
      planName,
      exercises: exercises || [],
      currentExerciseIndex: 0,
      startTime: Date.now(),
      timerSeconds: 90,
      timerRunning: false,
    };
    set({ session, isDrawerOpen: true });
  },

  endSession: async () => {
    const { session } = get();
    if (!session) return null;

    const now = Date.now();
    let totalVolume = 0;
    session.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.isCompleted && s.weight && s.reps) {
          totalVolume += s.weight * s.reps;
        }
      });
    });

    const log: WorkoutLog = {
      id: uuid(),
      planId: session.planId,
      planName: session.planName,
      exercises: session.exercises,
      startTime: session.startTime,
      endTime: now,
      totalDuration: Math.round((now - session.startTime) / 1000),
      totalVolume,
      createdAt: now,
    };

    await db.workoutLogs.put(log);
    set({ session: null, isDrawerOpen: false });
    return log;
  },

  cancelSession: () => {
    set({ session: null, isDrawerOpen: false });
  },

  updateSet: (exerciseIndex, setIndex, partial) => {
    const { session } = get();
    if (!session) return;
    const exercises = [...session.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];
    sets[setIndex] = { ...sets[setIndex], ...partial };
    exercise.sets = sets;
    exercises[exerciseIndex] = exercise;
    set({ session: { ...session, exercises } });
  },

  addSet: (exerciseIndex) => {
    const { session } = get();
    if (!session) return;
    const exercises = [...session.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: ExerciseSetLog = {
      setNumber: exercise.sets.length + 1,
      setType: 'working',
      weight: lastSet?.weight ?? null,
      reps: null,
      isCompleted: false,
    };
    exercise.sets = [...exercise.sets, newSet];
    exercises[exerciseIndex] = exercise;
    set({ session: { ...session, exercises } });
  },

  removeSet: (exerciseIndex, setIndex) => {
    const { session } = get();
    if (!session) return;
    const exercises = [...session.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    exercise.sets = exercise.sets.filter((_, i) => i !== setIndex);
    exercise.sets = exercise.sets.map((s, i) => ({ ...s, setNumber: i + 1 }));
    exercises[exerciseIndex] = exercise;
    set({ session: { ...session, exercises } });
  },

  setCurrentExercise: (index) => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, currentExerciseIndex: index } });
  },

  nextExercise: () => {
    const { session } = get();
    if (!session) return;
    const next = Math.min(session.currentExerciseIndex + 1, session.exercises.length - 1);
    set({ session: { ...session, currentExerciseIndex: next, timerSeconds: 90, timerRunning: false } });
  },

  prevExercise: () => {
    const { session } = get();
    if (!session) return;
    const prev = Math.max(session.currentExerciseIndex - 1, 0);
    set({ session: { ...session, currentExerciseIndex: prev, timerSeconds: 90, timerRunning: false } });
  },

  setTimerSeconds: (seconds) => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, timerSeconds: seconds } });
  },

  setTimerRunning: (running) => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, timerRunning: running } });
  },

  adjustTimer: (delta) => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, timerSeconds: Math.max(0, session.timerSeconds + delta) } });
  },

  setIsDrawerOpen: (open) => {
    set({ isDrawerOpen: open });
  },
}));
