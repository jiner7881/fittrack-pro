import { createContext, useContext } from 'react';
import type { Exercise } from '../types';

// ---- Navigation Context ----

export interface NavigationContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const NavigationContext = createContext<NavigationContextType>({
  activeTab: 'home',
  setActiveTab: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

// ---- Exercise Detail Context ----

export interface ExerciseDetailContextType {
  visible: boolean;
  exercise: Exercise | null;
  show: (exercise: Exercise) => void;
  hide: () => void;
}

export const ExerciseDetailContext = createContext<ExerciseDetailContextType>({
  visible: false,
  exercise: null,
  show: () => {},
  hide: () => {},
});

export const useExerciseDetail = () => useContext(ExerciseDetailContext);
