"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Leaf } from "lucide-react";
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
  const { ready, error, today } = useFitness();
  const tab = useSyncExternalStore(subscribeHash, getHash, () => "#hoje");
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${navigation.find((item) => item.href === tab)?.label ?? "Hoje"} · FitnessHub`;
  }, [tab]);
  if (!ready) return <main className={styles.page}><Leaf aria-hidden="true" /><h1>Seu dia começa aqui.</h1><p role="status">Abrindo seus registros…</p></main>;
  return (
    <div className={styles.app}>
      {error && <div role="alert" className={styles.error}>{error}<button type="button" onClick={retryStorage}>Tentar novamente</button></div>}
      {tab === "#hoje" ? <TodayPage /> : tab === "#alimentacao" ? <Meals /> : tab === "#treinos" ? <Workouts /> : tab === "#progresso" ? <Progress key={today} /> : <ProfilePage />}
      <BottomNavigation items={navigation.map((item) => ({ ...item, active: item.href === tab }))} />
    </div>
  );
}
