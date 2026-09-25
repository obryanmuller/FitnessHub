"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Check, Leaf, UserPlus, Users, X } from "lucide-react";
import { BottomNavigation } from "@/components/dashboard/bottom-navigation";
import { TodayPage } from "@/features/daily-routine/today-page";
import { Meals, Workouts, Progress, ProfilePage } from "./screens";
import { createFitnessProfile, retryStorage, switchFitnessProfile, useFitness } from "./store";
import type { NavigationItem } from "@/types/navigation";
import styles from "./fitness.module.css";
import profileStyles from "./profile-switcher.module.css";

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
  const { ready, error, today, profiles, activeProfileId, data } = useFitness();
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const tab = useSyncExternalStore(subscribeHash, getHash, () => "#hoje");
  useEffect(() => {
    window.scrollTo(0, 0);
    const section = navigation.find((item) => item.href === tab)?.label ?? "Hoje";
    document.title = `${section} · ${data.profile.name} · FitnessHub`;
  }, [data.profile.name, tab]);
  async function addProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("profileName") ?? "").trim();
    if (!name) return;
    setCreating(true);
    if (await createFitnessProfile(name)) setAdding(false);
    setCreating(false);
  }
  if (!ready) return <main className={styles.page}><Leaf aria-hidden="true" /><h1>Seu dia começa aqui.</h1><p role="status">Abrindo seus registros…</p></main>;
  return (
    <div className={styles.app}>
      <div className={profileStyles.profileBar}>
        <label className={profileStyles.profileSelect}>
          <Users size={17} aria-hidden="true" />
          <span>Perfil</span>
          <select value={activeProfileId} onChange={(event) => void switchFitnessProfile(event.target.value)} aria-label="Perfil ativo">
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
        </label>
        <button type="button" className={profileStyles.profileAction} aria-label="Adicionar perfil" title="Adicionar perfil" onClick={() => setAdding((value) => !value)}>
          {adding ? <X size={18} /> : <UserPlus size={18} />}
        </button>
      </div>
      {adding && <form className={profileStyles.newProfile} onSubmit={addProfile}><label>Novo perfil<input name="profileName" required maxLength={60} autoFocus placeholder="Nome" /></label><button type="submit" aria-label="Criar perfil" title="Criar perfil" disabled={creating}><Check size={18} /></button></form>}
      {error && <div role="alert" className={styles.error}>{error}<button type="button" onClick={() => void retryStorage()}>Tentar novamente</button></div>}
      {tab === "#hoje" ? <TodayPage /> : tab === "#alimentacao" ? <Meals /> : tab === "#treinos" ? <Workouts /> : tab === "#progresso" ? <Progress key={today} /> : <ProfilePage />}
      <BottomNavigation items={navigation.map((item) => ({ ...item, active: item.href === tab }))} />
    </div>
  );
}
