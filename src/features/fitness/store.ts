"use client";

import { useSyncExternalStore } from "react";
import { todayDashboardMock } from "@/data/today-dashboard";
import { dayKey, initialData, isFitnessData, upgradeFitnessData, type FitnessData } from "./model";

const LEGACY_STORAGE_KEY = "fitnesshub.personal.v1";
const ACTIVE_PROFILE_KEY = "fitnesshub.active-profile.v1";
const CACHE_KEY = "fitnesshub.cloud-cache.v1";
const OUTBOX_KEY = "fitnesshub.outbox.v1";

export type FitnessProfile = { id: string; name: string; updatedAt: string };
export type SyncStatus = "saved" | "saving" | "offline";
type Cache = { profiles: FitnessProfile[]; dataByProfile: Record<string, FitnessData>; activeProfileId: string };

const initial = {
  data: initialData(todayDashboardMock.routine), profiles: [] as FitnessProfile[], activeProfileId: "",
  today: "", ready: false, error: "", syncStatus: "saved" as SyncStatus,
};
let snapshot = initial;
let requestVersion = 0;
const listeners = new Set<() => void>();
const pendingWrites = new Map<string, Promise<void>>();
let stopListening: (() => void) | undefined;

function emit() { listeners.forEach((listener) => listener()); }
function message(error: unknown, fallback: string): string { return error instanceof Error && error.message ? error.message : fallback; }
async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "Não foi possível acessar o banco de dados.");
  return body as T;
}
function readObject(key: string): unknown {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : null; } catch { return null; }
}
function legacyData(): FitnessData | null {
  const parsed = readObject(LEGACY_STORAGE_KEY);
  return isFitnessData(parsed) ? upgradeFitnessData(parsed) : null;
}
function readCache(): Cache | null {
  const value = readObject(CACHE_KEY);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Partial<Cache>;
  if (!Array.isArray(raw.profiles) || !raw.dataByProfile || typeof raw.dataByProfile !== "object" || typeof raw.activeProfileId !== "string") return null;
  const dataByProfile: Record<string, FitnessData> = {};
  for (const [id, data] of Object.entries(raw.dataByProfile)) if (isFitnessData(data)) dataByProfile[id] = upgradeFitnessData(data);
  const profiles = raw.profiles.filter((profile): profile is FitnessProfile => !!profile && typeof profile.id === "string" && typeof profile.name === "string" && typeof profile.updatedAt === "string" && !!dataByProfile[profile.id]);
  return profiles.length ? { profiles, dataByProfile, activeProfileId: raw.activeProfileId } : null;
}
function writeCache(profileId: string, data: FitnessData, profiles = snapshot.profiles) {
  const previous = readCache();
  const cache: Cache = { profiles, activeProfileId: profileId, dataByProfile: { ...previous?.dataByProfile, [profileId]: data } };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
function readOutbox(): Record<string, FitnessData> {
  const raw = readObject(OUTBOX_KEY);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, FitnessData] => isFitnessData(entry[1])));
}
function writeOutbox(outbox: Record<string, FitnessData>) {
  if (Object.keys(outbox).length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  else localStorage.removeItem(OUTBOX_KEY);
}
function queueOffline(profileId: string, data: FitnessData) { writeOutbox({ ...readOutbox(), [profileId]: data }); }
function clearOffline(profileId: string) { const outbox = readOutbox(); delete outbox[profileId]; writeOutbox(outbox); }
function remember(id: string) { localStorage.setItem(ACTIVE_PROFILE_KEY, id); }

async function loadProfile(id: string, profiles: FitnessProfile[], version: number) {
  const result = await json<{ data: unknown }>(`/api/profiles/${encodeURIComponent(id)}`);
  if (!isFitnessData(result.data)) throw new Error("O perfil salvo no banco contém dados inválidos.");
  if (version !== requestVersion) return;
  const data = upgradeFitnessData(result.data);
  remember(id); writeCache(id, data, profiles);
  snapshot = { data, profiles, activeProfileId: id, today: dayKey(), ready: true, error: "", syncStatus: "saved" };
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
    const hadPendingSync = Object.keys(readOutbox()).length > 0;
    await loadProfile(active.id, profiles, version);
    await flushOutbox();
    if (hadPendingSync && !Object.keys(readOutbox()).length) await loadProfile(active.id, snapshot.profiles, version);
  } catch (error) {
    if (version !== requestVersion) return;
    const cache = readCache();
    const active = cache && (cache.profiles.find((profile) => profile.id === cache.activeProfileId) ?? cache.profiles[0]);
    if (cache && active) {
      snapshot = { data: cache.dataByProfile[active.id], profiles: cache.profiles, activeProfileId: active.id, today: dayKey(), ready: true, error: "", syncStatus: "offline" };
    } else snapshot = { ...snapshot, today: dayKey(), ready: true, error: message(error, "Não foi possível carregar seus dados."), syncStatus: "offline" };
    emit();
  }
}

async function flushOutbox() {
  const entries = Object.entries(readOutbox());
  if (!entries.length) return;
  snapshot = { ...snapshot, syncStatus: "saving" }; emit();
  try {
    for (const [profileId, data] of entries) {
      const result = await json<{ updatedAt: string }>(`/api/profiles/${encodeURIComponent(profileId)}`, { method: "PUT", body: JSON.stringify({ data }) });
      clearOffline(profileId);
      if (snapshot.activeProfileId === profileId) snapshot = { ...snapshot, profiles: snapshot.profiles.map((profile) => profile.id === profileId ? { ...profile, name: data.profile.name, updatedAt: result.updatedAt } : profile) };
    }
    snapshot = { ...snapshot, error: "", syncStatus: "saved" }; emit();
  } catch {
    snapshot = { ...snapshot, error: "", syncStatus: "offline" }; emit();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refresh();
    const focus = () => { if (!pendingWrites.size && !Object.keys(readOutbox()).length) void refresh(); };
    const online = async () => { await flushOutbox(); if (!Object.keys(readOutbox()).length) await refresh(); };
    const offline = () => { snapshot = { ...snapshot, syncStatus: "offline" }; emit(); };
    const clock = () => { if (snapshot.today !== dayKey()) { snapshot = { ...snapshot, today: dayKey() }; emit(); } };
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("fitnesshub.profiles.v1");
    if (channel) channel.onmessage = (event: MessageEvent<{ profileId?: string }>) => { if (event.data.profileId === snapshot.activeProfileId && !pendingWrites.has(snapshot.activeProfileId) && !readOutbox()[snapshot.activeProfileId]) void refresh(); };
    window.addEventListener("focus", focus); window.addEventListener("online", online); window.addEventListener("offline", offline);
    const timer = window.setInterval(clock, 15000);
    stopListening = () => { window.removeEventListener("focus", focus); window.removeEventListener("online", online); window.removeEventListener("offline", offline); window.clearInterval(timer); channel?.close(); };
  }
  return () => { listeners.delete(listener); if (!listeners.size) { stopListening?.(); stopListening = undefined; } };
}

export function useFitness() { return useSyncExternalStore(subscribe, () => snapshot, () => initial); }

function persist(profileId: string, data: FitnessData) {
  const previous = pendingWrites.get(profileId) ?? Promise.resolve();
  const task = previous.catch(() => undefined).then(async () => {
    const result = await json<{ updatedAt: string }>(`/api/profiles/${encodeURIComponent(profileId)}`, { method: "PUT", body: JSON.stringify({ data }) });
    clearOffline(profileId);
    if (snapshot.activeProfileId === profileId) {
      snapshot = { ...snapshot, profiles: snapshot.profiles.map((profile) => profile.id === profileId ? { ...profile, name: data.profile.name, updatedAt: result.updatedAt } : profile), error: "", syncStatus: "saved" };
      writeCache(profileId, data, snapshot.profiles); emit();
    }
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("fitnesshub.profiles.v1"); channel?.postMessage({ profileId }); channel?.close();
  }).catch(() => {
    queueOffline(profileId, data);
    if (snapshot.activeProfileId === profileId) { snapshot = { ...snapshot, error: "", syncStatus: "offline" }; emit(); }
  }).finally(() => { if (pendingWrites.get(profileId) === task) pendingWrites.delete(profileId); });
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
    const profiles = snapshot.profiles.map((profile) => profile.id === profileId ? { ...profile, name: next.profile.name } : profile);
    snapshot = { ...snapshot, data: next, profiles, error: "", syncStatus: "saving" };
    writeCache(profileId, next, profiles); emit(); persist(profileId, next); return true;
  } catch (error) { snapshot = { ...snapshot, error: message(error, "Não foi possível salvar esta alteração.") }; emit(); return false; }
}

export async function createFitnessProfile(name: string): Promise<boolean> {
  const cleanName = name.trim(); if (!cleanName || cleanName.length > 60) return false;
  try {
    const data = initialData(todayDashboardMock.routine); data.profile.name = cleanName;
    const created = await json<{ id: string; data: FitnessData; updatedAt: string }>("/api/profiles", { method: "POST", body: JSON.stringify({ data }) });
    const profile = { id: created.id, name: cleanName, updatedAt: created.updatedAt };
    requestVersion++; remember(created.id);
    const profiles = [...snapshot.profiles, profile]; snapshot = { data: created.data, profiles, activeProfileId: created.id, today: dayKey(), ready: true, error: "", syncStatus: "saved" };
    writeCache(created.id, created.data, profiles); emit(); return true;
  } catch (error) { snapshot = { ...snapshot, error: message(error, "Não foi possível criar o perfil.") }; emit(); return false; }
}

export async function switchFitnessProfile(id: string): Promise<void> {
  if (id === snapshot.activeProfileId || !snapshot.profiles.some((profile) => profile.id === id)) return;
  const previousProfileId = snapshot.activeProfileId, version = ++requestVersion;
  snapshot = { ...snapshot, ready: false, error: "" }; emit();
  try { await (pendingWrites.get(previousProfileId) ?? Promise.resolve()); await loadProfile(id, snapshot.profiles, version); }
  catch (error) {
    if (version !== requestVersion) return;
    const cached = readCache()?.dataByProfile[id];
    if (cached) { remember(id); snapshot = { ...snapshot, data: cached, activeProfileId: id, ready: true, error: "", syncStatus: "offline" }; }
    else snapshot = { ...snapshot, ready: true, error: message(error, "Não foi possível trocar de perfil.") };
    emit();
  }
}

export async function retryStorage() { await flushOutbox(); if (!Object.keys(readOutbox()).length) await refresh(); }
