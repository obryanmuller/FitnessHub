"use client";

import { useSyncExternalStore } from "react";
import { todayDashboardMock } from "@/data/today-dashboard";
import { dayKey, initialData, isFitnessData, upgradeFitnessData, type FitnessData } from "./model";

const LEGACY_STORAGE_KEY = "fitnesshub.personal.v1";
const ACTIVE_PROFILE_KEY = "fitnesshub.active-profile.v1";
const initial = {
  data: initialData(todayDashboardMock.routine),
  profiles: [] as FitnessProfile[],
  activeProfileId: "",
  today: "",
  ready: false,
  error: "",
};

export type FitnessProfile = { id: string; name: string; updatedAt: string };

let snapshot = initial;
let requestVersion = 0;
const listeners = new Set<() => void>();
const pendingWrites = new Map<string, Promise<void>>();
let stopListening: (() => void) | undefined;

function emit() { listeners.forEach((listener) => listener()); }
function message(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "Não foi possível acessar o banco de dados.");
  return body as T;
}
function legacyData(): FitnessData | null {
  try {
    const saved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    return isFitnessData(parsed) ? upgradeFitnessData(parsed) : null;
  } catch {
    return null;
  }
}
function remember(id: string) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

async function loadProfile(id: string, profiles: FitnessProfile[], version: number) {
  const result = await json<{ data: unknown }>(`/api/profiles/${encodeURIComponent(id)}`);
  if (!isFitnessData(result.data)) throw new Error("O perfil salvo no banco contém dados inválidos.");
  if (version !== requestVersion) return;
  remember(id);
  snapshot = { data: upgradeFitnessData(result.data), profiles, activeProfileId: id, today: dayKey(), ready: true, error: "" };
  emit();
}

async function refresh() {
  const version = ++requestVersion;
  try {
    const result = await json<{ profiles: FitnessProfile[] }>("/api/profiles");
    let profiles = result.profiles;
    if (!profiles.length) {
      const data = legacyData() ?? initialData(todayDashboardMock.routine);
      const created = await json<{ id: string; data: FitnessData; updatedAt: string }>("/api/profiles", { method: "POST", body: JSON.stringify({ data }) });
      profiles = [{ id: created.id, name: created.data.profile.name, updatedAt: created.updatedAt }];
    }
    const remembered = localStorage.getItem(ACTIVE_PROFILE_KEY);
    const active = profiles.find((profile) => profile.id === remembered) ?? profiles[0];
    await loadProfile(active.id, profiles, version);
  } catch (error) {
    if (version !== requestVersion) return;
    snapshot = { ...snapshot, today: dayKey(), ready: true, error: message(error, "Não foi possível carregar seus dados.") };
    emit();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refresh();
    const focus = () => { if (!pendingWrites.size) void refresh(); };
    const clock = () => {
      if (snapshot.today !== dayKey()) {
        snapshot = { ...snapshot, today: dayKey() };
        emit();
      }
    };
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("fitnesshub.profiles.v1");
    if (channel) channel.onmessage = (event: MessageEvent<{ profileId?: string }>) => {
      if (event.data.profileId === snapshot.activeProfileId && !pendingWrites.has(snapshot.activeProfileId)) void refresh();
    };
    window.addEventListener("focus", focus);
    const timer = window.setInterval(clock, 15000);
    stopListening = () => {
      window.removeEventListener("focus", focus);
      window.clearInterval(timer);
      channel?.close();
    };
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      stopListening?.();
      stopListening = undefined;
    }
  };
}

export function useFitness() {
  return useSyncExternalStore(subscribe, () => snapshot, () => initial);
}

function persist(profileId: string, data: FitnessData) {
  const previous = pendingWrites.get(profileId) ?? Promise.resolve();
  const task = previous.catch(() => undefined).then(async () => {
    const result = await json<{ updatedAt: string }>(`/api/profiles/${encodeURIComponent(profileId)}`, { method: "PUT", body: JSON.stringify({ data }) });
    if (snapshot.activeProfileId === profileId) {
      snapshot = {
        ...snapshot,
        profiles: snapshot.profiles.map((profile) => profile.id === profileId
          ? { ...profile, name: data.profile.name, updatedAt: result.updatedAt }
          : profile),
        error: "",
      };
      emit();
    }
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("fitnesshub.profiles.v1");
    channel?.postMessage({ profileId });
    channel?.close();
  }).catch((error) => {
    if (snapshot.activeProfileId === profileId) {
      snapshot = { ...snapshot, error: `${message(error, "Não foi possível salvar.")} Suas últimas alterações ainda aparecem neste dispositivo; tente novamente.` };
      emit();
    }
  }).finally(() => {
    if (pendingWrites.get(profileId) === task) pendingWrites.delete(profileId);
  });
  pendingWrites.set(profileId, task);
  return task;
}

export function saveFitness(update: (data: FitnessData) => FitnessData, _replace = false): boolean {
  void _replace;
  if (!snapshot.ready || !snapshot.activeProfileId) return false;
  try {
    const next = upgradeFitnessData(update(snapshot.data));
    if (!isFitnessData(next)) throw new Error("Os dados informados são inválidos.");
    const profileId = snapshot.activeProfileId;
    snapshot = {
      ...snapshot,
      data: next,
      profiles: snapshot.profiles.map((profile) => profile.id === profileId ? { ...profile, name: next.profile.name } : profile),
      error: "",
    };
    emit();
    persist(profileId, next);
    return true;
  } catch (error) {
    snapshot = { ...snapshot, error: message(error, "Não foi possível salvar esta alteração.") };
    emit();
    return false;
  }
}

export async function createFitnessProfile(name: string): Promise<boolean> {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 60) return false;
  try {
    const data = initialData(todayDashboardMock.routine);
    data.profile.name = cleanName;
    const created = await json<{ id: string; data: FitnessData; updatedAt: string }>("/api/profiles", { method: "POST", body: JSON.stringify({ data }) });
    const profile = { id: created.id, name: cleanName, updatedAt: created.updatedAt };
    requestVersion++;
    remember(created.id);
    snapshot = { data: created.data, profiles: [...snapshot.profiles, profile], activeProfileId: created.id, today: dayKey(), ready: true, error: "" };
    emit();
    return true;
  } catch (error) {
    snapshot = { ...snapshot, error: message(error, "Não foi possível criar o perfil.") };
    emit();
    return false;
  }
}

export async function switchFitnessProfile(id: string): Promise<void> {
  if (id === snapshot.activeProfileId || !snapshot.profiles.some((profile) => profile.id === id)) return;
  const previousProfileId = snapshot.activeProfileId;
  const version = ++requestVersion;
  snapshot = { ...snapshot, ready: false, error: "" };
  emit();
  try {
    await (pendingWrites.get(previousProfileId) ?? Promise.resolve());
    await loadProfile(id, snapshot.profiles, version);
  } catch (error) {
    if (version !== requestVersion) return;
    snapshot = { ...snapshot, ready: true, error: message(error, "Não foi possível trocar de perfil.") };
    emit();
  }
}

export async function retryStorage() {
  if (!snapshot.activeProfileId) return refresh();
  await persist(snapshot.activeProfileId, snapshot.data);
}
