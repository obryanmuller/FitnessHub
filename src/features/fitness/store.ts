"use client";

import { useSyncExternalStore } from "react";
import { todayDashboardMock } from "@/data/today-dashboard";
import { dayKey, initialData, isFitnessData, type FitnessData } from "./model";

const STORAGE_KEY = "fitnesshub.personal.v1";
const initial = { data: initialData(todayDashboardMock.routine), today: "", ready: false, error: "" };
let snapshot = initial;
let blocked = false;
const listeners = new Set<() => void>();
let stopListening: (() => void) | undefined;
function emit() { listeners.forEach((listener) => listener()); }
function refresh() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const data: unknown = saved ? JSON.parse(saved) : initialData(todayDashboardMock.routine);
    if (!isFitnessData(data)) throw new Error("invalid");
    blocked = false;
    snapshot = { data, today: dayKey(), ready: true, error: "" };
  } catch {
    blocked = true;
    snapshot = { ...snapshot, today: dayKey(), ready: true, error: "Não foi possível ler seus dados locais. Eles não serão sobrescritos. Tente novamente ou restaure um backup no Perfil." };
  }
  emit();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    refresh();
    const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) refresh(); };
    const clock = () => {
      if (snapshot.today !== dayKey()) {
        snapshot = { ...snapshot, today: dayKey() };
        emit();
      }
    };
    const focus = () => refresh();
    window.addEventListener("storage", storage);
    window.addEventListener("focus", focus);
    const timer = window.setInterval(clock, 15000);
    stopListening = () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", focus);
      window.clearInterval(timer);
    };
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopListening?.();
      stopListening = undefined;
    }
  };
}
export function useFitness() {
  return useSyncExternalStore(subscribe, () => snapshot, () => initial);
}
export function saveFitness(update: (data: FitnessData) => FitnessData, replace = false): boolean {
  if (blocked && !replace) return false;
  try {
    // Refresh before mutation so a second tab does not silently overwrite an older snapshot.
    const saved = localStorage.getItem(STORAGE_KEY);
    let current = snapshot.data;
    if (saved && !replace) {
      const parsed: unknown = JSON.parse(saved);
      if (!isFitnessData(parsed)) throw new Error("invalid");
      current = parsed;
    }
    const next = update(current);
    if (!isFitnessData(next)) throw new Error("invalid");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    blocked = false;
    snapshot = { data: next, today: dayKey(), ready: true, error: "" };
    emit();
    return true;
  } catch {
    snapshot = { ...snapshot, error: "Não foi possível salvar. Nenhuma alteração foi confirmada. Verifique o espaço e a permissão de armazenamento do navegador e tente novamente." };
    emit();
    return false;
  }
}
export const retryStorage = refresh;
