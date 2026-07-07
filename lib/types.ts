export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Legs"
  | "Shoulders"
  | "Arms"
  | "Core";

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Machine"
  | "Cable"
  | "Bodyweight";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  difficulty: Difficulty;
}

export interface SetEntry {
  id: string;
  weight: number; // kg
  reps: number;
  rpe?: number;
  completed: boolean;
  isPR?: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
  notes?: string;
}

export interface Workout {
  id: string;
  /** owner — every read filters on it, every write asserts it */
  userId: string;
  name: string;
  date: string; // ISO yyyy-mm-dd
  durationMin: number;
  exercises: WorkoutExercise[];
}

export interface PersonalRecord {
  exerciseId: string;
  weight: number;
  reps: number;
  e1rm: number;
  date: string;
}

export interface LastPerformance {
  date: string;
  sets: { weight: number; reps: number; rpe?: number }[];
}

export interface WeekPoint {
  weekStart: string;
  label: string;
  volume: number;
}

export interface E1rmPoint {
  date: string;
  label: string;
  e1rm: number;
  isPR: boolean;
}

export interface HeatmapDay {
  date: string;
  volume: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface MuscleShare {
  muscle: MuscleGroup;
  volume: number;
  share: number; // 0..1 of total
}

export interface LifetimeStats {
  workouts: number;
  volume: number;
  sets: number;
  prs: number;
  hours: number;
  favorites: { exercise: Exercise; sessions: number }[];
}

export interface TodayPlan {
  name: string;
  exercises: {
    exerciseId: string;
    targetSets: number;
    last?: LastPerformance;
  }[];
  estimatedMin: number;
}
