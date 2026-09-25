import type { NavigationItem } from "@/types/navigation";

export type DailyRoutineItem = {
  id: string;
  time: string;
  title: string;
  entries: string[];
  completed: boolean;
};

export type WaterSummary = {
  consumedMl: number;
  goalMl: number;
};

export type WorkoutSummary = {
  label: string;
  routineItemId: DailyRoutineItem["id"];
};

export type WeightSummary = {
  lastKg: number;
};

export type TodayDashboard = {
  water: WaterSummary;
  workout: WorkoutSummary;
  weight: WeightSummary;
  routine: DailyRoutineItem[];
  navigation: NavigationItem[];
};
