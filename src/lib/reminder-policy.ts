import type { FitnessData } from "@/features/fitness/model";
import { getDay, workoutPlanForDate, WORKOUT_ID } from "@/features/fitness/model";

export type NotificationSettings = {
  meals: boolean; workout: boolean; water: boolean;
  waterStart?: string; waterEnd?: string; waterInterval?: number;
  quietEnabled?: boolean; quietStart?: string; quietEnd?: string;
};
export const defaultNotificationSettings = {
  meals: true, workout: true, water: false,
  waterStart: "08:00", waterEnd: "20:00", waterInterval: 120,
  quietEnabled: true, quietStart: "22:00", quietEnd: "07:00",
} satisfies Required<NotificationSettings>;
const validTime = (v: unknown): v is string => typeof v === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
export const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function normalizeNotificationSettings(settings: NotificationSettings): Required<NotificationSettings> {
  return { ...defaultNotificationSettings, ...settings };
}
export function isNotificationSettings(value: unknown): value is NotificationSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const s = value as NotificationSettings;
  if (typeof s.meals !== "boolean" || typeof s.workout !== "boolean" || typeof s.water !== "boolean") return false;
  for (const key of ["waterStart", "waterEnd", "quietStart", "quietEnd"] as const) if (s[key] !== undefined && !validTime(s[key])) return false;
  if (s.quietEnabled !== undefined && typeof s.quietEnabled !== "boolean") return false;
  if (s.waterInterval !== undefined && ![30, 60, 90, 120, 180, 240].includes(s.waterInterval)) return false;
  const n = normalizeNotificationSettings(s);
  return minutesOf(n.waterStart) < minutesOf(n.waterEnd) && (!n.quietEnabled || n.quietStart !== n.quietEnd);
}
export function inQuietHours(minutes: number, settings: Required<NotificationSettings>) {
  if (!settings.quietEnabled) return false;
  const start = minutesOf(settings.quietStart), end = minutesOf(settings.quietEnd);
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}
export type Reminder = { key: string; title: string; body: string; url: string };
export function scheduledReminders(data: FitnessData, preferences: NotificationSettings, date: string, minutes: number): Reminder[] {
  const settings = normalizeNotificationSettings(preferences);
  if (inQuietHours(minutes, settings)) return [];
  const day = getDay(data, date), plan = workoutPlanForDate(data, date);
  const result: Reminder[] = [];
  for (const item of day.routine) {
    const workout = item.id === WORKOUT_ID;
    if (day.completed.includes(item.id) || (workout && (plan.kind === "rest" || day.session))) continue;
    if (!(workout ? settings.workout : settings.meals)) continue;
    const scheduled = minutesOf(item.time);
    if (minutes < scheduled || minutes - scheduled >= 10) continue;
    result.push({
      key: date + ":routine:" + item.id + ":" + item.time,
      title: workout ? "Hora de " + plan.title : item.title,
      body: workout ? "Sua ficha está pronta. Vamos começar?" : "Sua refeição está prevista para agora.",
      url: workout ? "/#treinos" : "/#hoje",
    });
  }
  if (settings.water && day.waterMl < day.waterGoal) {
    const start = minutesOf(settings.waterStart), end = minutesOf(settings.waterEnd);
    const slot = Math.floor((minutes - start) / settings.waterInterval);
    const scheduled = start + slot * settings.waterInterval;
    if (slot >= 0 && scheduled <= end && minutes - scheduled < 10) result.push({
      key: date + ":water:" + scheduled, title: "Hora de beber água",
      body: "Faltam " + (day.waterGoal - day.waterMl).toLocaleString("pt-BR") + " ml para sua meta de hoje.", url: "/#hoje",
    });
  }
  return result;
}
