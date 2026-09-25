"use client";

import { useState, type FormEvent } from "react";
import { Check, UserPlus, Users, X } from "lucide-react";
import { createFitnessProfile, switchFitnessProfile, useFitness } from "./store";
import styles from "./profile-switcher.module.css";

export function ProfileManager() {
  const { profiles, activeProfileId } = useFitness();
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  async function addProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("profileName") ?? "").trim();
    if (!name) return;
    setCreating(true);
    if (await createFitnessProfile(name)) setAdding(false);
    setCreating(false);
  }

  return (
    <section className={styles.manager} aria-labelledby="profiles-title">
      <div className={styles.heading}>
        <div><h2 id="profiles-title">Perfis</h2><p>Escolha quem está usando o app.</p></div>
        <Users size={18} aria-hidden="true" />
      </div>
      <div className={styles.controls}>
        <label><span>Perfil ativo</span><select value={activeProfileId} onChange={(event) => void switchFitnessProfile(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        <button type="button" className={styles.iconButton} aria-label={adding ? "Cancelar novo perfil" : "Adicionar perfil"} title={adding ? "Cancelar" : "Adicionar perfil"} onClick={() => setAdding((value) => !value)}>{adding ? <X size={18} /> : <UserPlus size={18} />}</button>
      </div>
      {adding && <form className={styles.newProfile} onSubmit={addProfile}><label><span>Nome do novo perfil</span><input name="profileName" required maxLength={60} autoFocus placeholder="Nome" /></label><button type="submit" className={styles.createButton} aria-label="Criar perfil" title="Criar perfil" disabled={creating}><Check size={18} /></button></form>}
    </section>
  );
}
