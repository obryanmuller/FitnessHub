"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CloudOff, Leaf, RefreshCw } from "lucide-react";
import { BottomNavigation } from "@/components/dashboard/bottom-navigation";
import { TodayPage } from "@/features/daily-routine/today-page";
import { Meals, Workouts, Progress, ProfilePage } from "./screens";
import { retryStorage, useFitness } from "./store";
import type { NavigationItem } from "@/types/navigation";
import styles from "./fitness.module.css";

const navigation: NavigationItem[] = [
  { label: "Hoje", icon: "home", href: "#hoje" },
  { label: "Alimentação", icon: "meals", href: "#alimentacao" },
  { label: "Treinos", icon: "workouts", href: "#treinos" },
  { label: "Progresso", icon: "progress", href: "#progresso" },
  { label: "Perfil", icon: "profile", href: "#perfil" },
];
function subscribeHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
function getHash() { return navigation.some((item) => item.href === location.hash) ? location.hash : "#hoje"; }

export function FitnessApp() {
  const { ready, error, today, data, syncStatus } = useFitness();
  const tab = useSyncExternalStore(subscribeHash, getHash, () => "#hoje");
  useEffect(() => {
    window.scrollTo(0, 0);
    const section = navigation.find((item) => item.href === tab)?.label ?? "Hoje";
    document.title = `${section} · ${data.profile.name} · FitnessHub`;
  }, [data.profile.name, tab]);
  if (!ready) return <main className={styles.page}><Leaf aria-hidden="true" /><h1>Seu dia começa aqui.</h1><p role="status">Abrindo seus registros…</p></main>;
  return (
    <div className={styles.app}>
      {error && <div role="alert" className={styles.error}>{error}<button type="button" onClick={() => void retryStorage()}>Tentar novamente</button></div>}
      {syncStatus !== "saved" && <div className={styles.syncStatus} role="status" aria-live="polite">{syncStatus === "offline" ? <><CloudOff size={14} /> Offline · sincroniza depois</> : <><RefreshCw size={14} /> Salvando</>}</div>}
      {tab === "#hoje" ? <TodayPage /> : tab === "#alimentacao" ? <Meals /> : tab === "#treinos" ? <Workouts /> : tab === "#progresso" ? <Progress key={today} /> : <ProfilePage />}
      <BottomNavigation items={navigation.map((item) => ({ ...item, active: item.href === tab }))} />
    </div>
  );
}
