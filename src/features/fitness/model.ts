export type Routine = { id: string; time: string; title: string; entries: string[] };
export type Exercise = { id: string; name: string; sets: number; reps: string; load: string };
export type ExercisePerformance = { reps: string; load: string; note?: string };
export type Profile = { name: string; waterGoal: number; bottleMl: number; targetKg: number | null };
export type Weekday = "0" | "1" | "2" | "3" | "4" | "5" | "6";
export type WorkoutKind = "strength" | "cardio" | "rest";
export type WorkoutDayPlan = { title: string; kind: WorkoutKind; exercises: Exercise[]; time?: string };
export type WeeklyWorkouts = Record<Weekday, WorkoutDayPlan>;
export type Day = {
  routine: Routine[];
  exercises: Exercise[];
  completed: string[];
  exerciseCompleted: string[];
  exerciseLogs?: Record<string, ExercisePerformance>;
  waterMl: number;
  waterGoal: number;
};
export type FitnessData = {
  version: 1;
  profile: Profile;
  routine: Routine[];
  exercises: Exercise[];
  weeklyWorkouts?: WeeklyWorkouts;
  days: Record<string, Day>;
  weights: { date: string; kg: number }[];
};

export type WeeklySummary = {
  start: string;
  end: string;
  workoutsDone: number;
  workoutsPlanned: number;
  routinePercent: number;
  averageWaterMl: number;
  weightChange: number | null;
};
export type Achievement = { id: string; title: string; detail: string };

export const WORKOUT_ID = "workout-gym";
export const WEEKDAYS: Weekday[] = ["1", "2", "3", "4", "5", "6", "0"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function dayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weekdayFromDateKey(key: string): Weekday {
  return String(new Date(`${key}T12:00:00`).getDay()) as Weekday;
}

export function defaultWeeklyWorkouts(): WeeklyWorkouts {
  return {
    "1": { title: "Treino A", kind: "strength", exercises: [] },
    "2": { title: "Treino B", kind: "strength", exercises: [] },
    "3": { title: "Treino C", kind: "strength", exercises: [] },
    "4": { title: "Treino D", kind: "strength", exercises: [] },
    "5": { title: "Treino E", kind: "strength", exercises: [] },
    "6": { title: "Cardio", kind: "cardio", exercises: [] },
    "0": { title: "Cardio", kind: "cardio", exercises: [] },
  };
}

export function upgradeFitnessData(data: FitnessData, date = new Date()): FitnessData {
  if (data.weeklyWorkouts) return data;
  const weeklyWorkouts = defaultWeeklyWorkouts();
  if (data.exercises.length) {
    const weekday = String(date.getDay()) as Weekday;
    weeklyWorkouts[weekday] = { ...weeklyWorkouts[weekday], exercises: data.exercises.map((exercise) => ({ ...exercise })) };
  }
  return { ...data, weeklyWorkouts };
}

function workoutTime(data: FitnessData): string {
  return data.routine.find((item) => item.id === WORKOUT_ID)?.time ?? "06:00";
}

export function workoutPlanForWeekday(data: FitnessData, weekday: Weekday): WorkoutDayPlan {
  const plan = data.weeklyWorkouts?.[weekday] ?? defaultWeeklyWorkouts()[weekday];
  return { ...plan, time: plan.time ?? workoutTime(data) };
}

export function workoutPlanForDate(data: FitnessData, key: string): WorkoutDayPlan {
  return workoutPlanForWeekday(data, weekdayFromDateKey(key));
}

export function workoutExerciseCount(data: FitnessData): number {
  return data.weeklyWorkouts
    ? Object.values(data.weeklyWorkouts).reduce((total, plan) => total + plan.exercises.length, 0)
    : data.exercises.length;
}

export function initialData(routine: Routine[]): FitnessData {
  return {
    version: 1,
    profile: { name: "Bryan", waterGoal: 3000, bottleMl: 800, targetKg: null },
    routine: routine.map(({ id, time, title, entries }) => ({ id, time, title, entries: [...entries] })),
    exercises: [],
    weeklyWorkouts: defaultWeeklyWorkouts(),
    days: {},
    weights: [],
  };
}

function routineForDate(data: FitnessData, key: string): Routine[] {
  const plan = workoutPlanForDate(data, key);
  if (plan.kind === "rest") return data.routine.filter((item) => item.id !== WORKOUT_ID);
  return data.routine.map((item) => item.id === WORKOUT_ID ? {
    ...item,
    time: plan.time ?? item.time,
    title: plan.title,
    entries: [plan.kind === "cardio" ? "Cardio" : `${plan.exercises.length} exercícios`],
  } : item).sort((a, b) => a.time.localeCompare(b.time));
}

export function getDay(data: FitnessData, key: string): Day {
  return data.days[key] ?? {
    routine: routineForDate(data, key),
    exercises: workoutPlanForDate(data, key).exercises,
    completed: [],
    exerciseCompleted: [],
    exerciseLogs: {},
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

export function recordExercisePerformance(data: FitnessData, key: string, exerciseId: string, performance: ExercisePerformance): FitnessData {
  return changeDay(data, key, (day) => ({
    ...day,
    exerciseCompleted: day.exerciseCompleted.includes(exerciseId) ? day.exerciseCompleted : [...day.exerciseCompleted, exerciseId],
    exerciseLogs: { ...day.exerciseLogs, [exerciseId]: performance },
  }));
}

export function exerciseHistory(data: FitnessData, exerciseId: string, before?: string) {
  return Object.entries(data.days)
    .filter(([date, day]) => (!before || date < before) && day.exerciseLogs?.[exerciseId])
    .map(([date, day]) => ({ date, ...day.exerciseLogs![exerciseId] }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function numericLoad(load: string): number | null {
  const match = load.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function isPersonalRecord(data: FitnessData, exerciseId: string, key: string, load: string): boolean {
  const current = numericLoad(load);
  if (current === null) return false;
  const previous = exerciseHistory(data, exerciseId, key).map((item) => numericLoad(item.load)).filter((value): value is number => value !== null);
  return previous.length > 0 && current > Math.max(...previous);
}

// Plan changes apply from today onward; older day snapshots remain intact.
export function changePlan(data: FitnessData, key: string, routine: Routine[], exercises?: Exercise[]): FitnessData {
  const sorted = [...routine].sort((a, b) => a.time.localeCompare(b.time));
  const dayRoutine = routineForDate({ ...data, routine: sorted }, key);
  const day = getDay(data, key);
  const dayExercises = exercises ?? day.exercises;
  return {
    ...data, routine: sorted, exercises: exercises ?? data.exercises,
    days: {
      ...data.days,
      [key]: {
        ...day, routine: dayRoutine, exercises: dayExercises,
        completed: day.completed.filter((id) => dayRoutine.some((item) => item.id === id)),
        exerciseCompleted: day.exerciseCompleted.filter((id) => dayExercises.some((item) => item.id === id)),
        exerciseLogs: Object.fromEntries(Object.entries(day.exerciseLogs ?? {}).filter(([id]) => dayExercises.some((item) => item.id === id))),
      },
    },
  };
}

export function changeWorkoutDay(data: FitnessData, key: string, weekday: Weekday, plan: WorkoutDayPlan): FitnessData {
  const current = upgradeFitnessData(data);
  const next = { ...current, weeklyWorkouts: { ...current.weeklyWorkouts!, [weekday]: plan } };
  if (weekdayFromDateKey(key) !== weekday) return next;
  const day = getDay(current, key);
  const routine = routineForDate(next, key);
  return {
    ...next,
    days: { ...next.days, [key]: {
      ...day,
      routine,
      exercises: plan.kind === "rest" ? [] : plan.exercises,
      completed: day.completed.filter((id) => routine.some((item) => item.id === id)),
      exerciseCompleted: day.exerciseCompleted.filter((id) => plan.exercises.some((exercise) => exercise.id === id)),
      exerciseLogs: Object.fromEntries(Object.entries(day.exerciseLogs ?? {}).filter(([id]) => plan.exercises.some((exercise) => exercise.id === id))),
    } },
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

export function weeklySummary(data: FitnessData, today: string): WeeklySummary {
  const endDate = new Date(`${today}T12:00:00`);
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - ((endDate.getDay() + 6) % 7));
  const keys: string[] = [];
  for (const cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) keys.push(dayKey(cursor));
  let completed = 0, routineTotal = 0, water = 0, recordedDays = 0, workoutsDone = 0, workoutsPlanned = 0;
  for (const key of keys) {
    const plan = workoutPlanForDate(data, key);
    if (plan.kind !== "rest") workoutsPlanned++;
    const day = data.days[key];
    if (!day) continue;
    completed += day.completed.length;
    routineTotal += day.routine.length;
    water += day.waterMl;
    recordedDays++;
    if (day.completed.includes(WORKOUT_ID)) workoutsDone++;
  }
  const weekWeights = data.weights.filter((item) => item.date >= dayKey(startDate) && item.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  return {
    start: dayKey(startDate), end: today,
    workoutsDone, workoutsPlanned,
    routinePercent: routineTotal ? Math.round(completed / routineTotal * 100) : 0,
    averageWaterMl: recordedDays ? Math.round(water / recordedDays) : 0,
    weightChange: weekWeights.length > 1 ? Number((weekWeights.at(-1)!.kg - weekWeights[0].kg).toFixed(2)) : null,
  };
}

export function achievements(data: FitnessData, today: string): Achievement[] {
  const workoutDays = Object.values(data.days).filter((day) => day.completed.includes(WORKOUT_ID)).length;
  const waterDays = Object.values(data.days).filter((day) => day.waterMl >= day.waterGoal).length;
  const hasPr = Object.entries(data.days).some(([date, day]) => Object.entries(day.exerciseLogs ?? {}).some(([id, log]) => isPersonalRecord(data, id, date, log.load)));
  const result: Achievement[] = [];
  if (workoutDays >= 1) result.push({ id: "first-workout", title: "Primeiro treino", detail: "O começo já ficou registrado." });
  if (workoutDays >= 10) result.push({ id: "ten-workouts", title: "10 treinos", detail: "Consistência ganhando forma." });
  if (streak(data, today) >= 7) result.push({ id: "week-streak", title: "Uma semana no ritmo", detail: "7 dias de rotina completa." });
  if (waterDays >= 7) result.push({ id: "water-week", title: "Hidratação constante", detail: "Meta de água alcançada em 7 dias." });
  if (hasPr) result.push({ id: "first-pr", title: "Nova marca", detail: "Seu primeiro recorde de carga." });
  return result;
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
    && text(item.id) && text(item.title, 80) && typeof item.time === "string" && TIME_PATTERN.test(item.time)
    && Array.isArray(item.entries) && item.entries.length <= 50 && item.entries.every((entry) => text(entry, 300))) && uniqueIds(value);
}
function exercises(value: unknown): value is Exercise[] {
  return Array.isArray(value) && value.length <= 100 && value.every((item) => record(item) && text(item.id)
    && text(item.name, 80) && numeric(item.sets, 1, 50) && Number.isInteger(item.sets) && text(item.reps, 40)
    && typeof item.load === "string" && item.load.length <= 60) && uniqueIds(value);
}
function performances(value: unknown, dayExercises: Exercise[]): value is Record<string, ExercisePerformance> {
  if (value === undefined) return true;
  if (!record(value) || Object.keys(value).length > 100) return false;
  return Object.entries(value).every(([id, item]) => dayExercises.some((exercise) => exercise.id === id) && record(item)
    && text(item.reps, 40) && typeof item.load === "string" && item.load.length <= 60
    && (item.note === undefined || (typeof item.note === "string" && item.note.length <= 200)));
}
function weeklyWorkouts(value: unknown): value is WeeklyWorkouts {
  if (!record(value) || Object.keys(value).length !== 7) return false;
  return WEEKDAYS.every((weekday) => {
    const plan = value[weekday];
    return record(plan) && text(plan.title, 80) && (plan.kind === "strength" || plan.kind === "cardio" || plan.kind === "rest")
      && (plan.time === undefined || (typeof plan.time === "string" && TIME_PATTERN.test(plan.time))) && exercises(plan.exercises);
  });
}

// Used for database data and user-imported backups. Never trust persisted shapes.
export function isFitnessData(value: unknown): value is FitnessData {
  if (!record(value) || value.version !== 1 || !record(value.profile)) return false;
  const p = value.profile;
  if (!text(p.name, 60) || !numeric(p.waterGoal, 200, 10000) || !Number.isInteger(p.waterGoal)
    || !numeric(p.bottleMl, 100, 3000) || !Number.isInteger(p.bottleMl)
    || !(p.targetKg === null || numeric(p.targetKg, 20, 500))) return false;
  if (!routines(value.routine) || value.routine.filter((item) => item.id === WORKOUT_ID).length !== 1 || !exercises(value.exercises)
    || !(value.weeklyWorkouts === undefined || weeklyWorkouts(value.weeklyWorkouts))) return false;
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
      || new Set(day.exerciseCompleted).size !== day.exerciseCompleted.length
      || !performances(day.exerciseLogs, dayExercises)) return false;
  }
  return Array.isArray(value.weights) && value.weights.length <= 36500 && value.weights.every((item) =>
    record(item) && validDate(item.date) && numeric(item.kg, 20, 500))
    && new Set(value.weights.map((item) => item.date)).size === value.weights.length;
}
