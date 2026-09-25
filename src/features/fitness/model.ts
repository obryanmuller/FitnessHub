export type Routine = { id: string; time: string; title: string; entries: string[] };
export type Exercise = { id: string; name: string; sets: number; reps: string; load: string };
export type Profile = { name: string; waterGoal: number; bottleMl: number; targetKg: number | null };
export type Day = {
  routine: Routine[];
  exercises: Exercise[];
  completed: string[];
  exerciseCompleted: string[];
  waterMl: number;
  waterGoal: number;
};
export type FitnessData = {
  version: 1;
  profile: Profile;
  routine: Routine[];
  exercises: Exercise[];
  days: Record<string, Day>;
  weights: { date: string; kg: number }[];
};

export const WORKOUT_ID = "workout-gym";

export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function initialData(routine: Routine[]): FitnessData {
  return {
    version: 1,
    profile: { name: "Bryan", waterGoal: 3000, bottleMl: 800, targetKg: null },
    routine: routine.map(({ id, time, title, entries }) => ({ id, time, title, entries: [...entries] })),
    exercises: [],
    days: {},
    weights: [],
  };
}

export function getDay(data: FitnessData, key: string): Day {
  return data.days[key] ?? {
    routine: data.routine,
    exercises: data.exercises,
    completed: [],
    exerciseCompleted: [],
    waterMl: 0,
    waterGoal: data.profile.waterGoal,
  };
}

export function changeDay(data: FitnessData, key: string, change: (day: Day) => Day): FitnessData {
  return { ...data, days: { ...data.days, [key]: change(getDay(data, key)) } };
}

export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

// Plan changes apply from today onward; older day snapshots remain intact.
export function changePlan(data: FitnessData, key: string, routine: Routine[], exercises = data.exercises): FitnessData {
  const sorted = [...routine].sort((a, b) => a.time.localeCompare(b.time));
  const day = getDay(data, key);
  return {
    ...data, routine: sorted, exercises,
    days: {
      ...data.days,
      [key]: {
        ...day, routine: sorted, exercises,
        completed: day.completed.filter((id) => sorted.some((item) => item.id === id)),
        exerciseCompleted: day.exerciseCompleted.filter((id) => exercises.some((item) => item.id === id)),
      },
    },
  };
}

export function streak(data: FitnessData, today: string): number {
  const cursor = new Date(`${today}T12:00:00`);
  const complete = (key: string) => {
    const day = data.days[key];
    return !!day && day.routine.length > 0 && day.routine.every((item) => day.completed.includes(item.id));
  };
  if (!complete(today)) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (complete(dayKey(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = 200): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const numeric = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const uniqueIds = (items: { id: string }[]) => new Set(items.map((item) => item.id)).size === items.length;
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && dayKey(date) === value;
}
function routines(value: unknown): value is Routine[] {
  return Array.isArray(value) && value.length <= 100 && value.every((item) => record(item)
    && text(item.id) && text(item.title, 80) && typeof item.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)
    && Array.isArray(item.entries) && item.entries.length <= 50 && item.entries.every((entry) => text(entry, 300))) && uniqueIds(value);
}
function exercises(value: unknown): value is Exercise[] {
  return Array.isArray(value) && value.length <= 100 && value.every((item) => record(item) && text(item.id)
    && text(item.name, 80) && numeric(item.sets, 1, 50) && Number.isInteger(item.sets) && text(item.reps, 40)
    && typeof item.load === "string" && item.load.length <= 60) && uniqueIds(value);
}

// Used for both local storage and user-imported backups. Never trust persisted shapes.
export function isFitnessData(value: unknown): value is FitnessData {
  if (!record(value) || value.version !== 1 || !record(value.profile)) return false;
  const p = value.profile;
  if (!text(p.name, 60) || !numeric(p.waterGoal, 200, 10000) || !Number.isInteger(p.waterGoal)
    || !numeric(p.bottleMl, 100, 3000) || !Number.isInteger(p.bottleMl)
    || !(p.targetKg === null || numeric(p.targetKg, 20, 500))) return false;
  if (!routines(value.routine) || value.routine.filter((item) => item.id === WORKOUT_ID).length !== 1 || !exercises(value.exercises)) return false;
  if (!record(value.days) || Object.keys(value.days).length > 36500) return false;
  for (const [date, day] of Object.entries(value.days)) {
    if (!validDate(date) || !record(day) || !routines(day.routine) || !exercises(day.exercises)
      || !numeric(day.waterMl, 0, 100000) || !numeric(day.waterGoal, 200, 10000)
      || !Array.isArray(day.completed) || !Array.isArray(day.exerciseCompleted)) return false;
    const dayRoutine = day.routine;
    const dayExercises = day.exercises;
    if (!day.completed.every((id) => dayRoutine.some((item) => item.id === id))
      || new Set(day.completed).size !== day.completed.length
      || !day.exerciseCompleted.every((id) => dayExercises.some((item) => item.id === id))
      || new Set(day.exerciseCompleted).size !== day.exerciseCompleted.length) return false;
  }
  return Array.isArray(value.weights) && value.weights.length <= 36500 && value.weights.every((item) =>
    record(item) && validDate(item.date) && numeric(item.kg, 20, 500))
    && new Set(value.weights.map((item) => item.date)).size === value.weights.length;
}
