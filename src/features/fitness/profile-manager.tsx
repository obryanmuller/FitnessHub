"use client";

import { useState, type FormEvent } from "react";
import { Check, UserPlus, Users } from "lucide-react";
import { createFitnessProfile, switchFitnessProfile, useFitness } from "./store";
import styles from "./profile-switcher.module.css";

export function ProfileManager() {
  const { profiles, activeProfileId } = useFitness();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);

  async function addProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("profileName") ?? "").trim();
    if (!name) return;
    setCreating(true);
    if (await createFitnessProfile(name)) {
      setAdding(false);
      setOpen(false);
    }
    setCreating(false);
  }

  return (
    <div className={styles.manager}>
      <button type="button" className={styles.trigger} aria-label="Trocar perfil" title="Trocar perfil" aria-expanded={open} aria-controls="profile-menu" onClick={() => { setOpen((value) => !value); setAdding(false); }}><Users size={19} /></button>
      {open && <div className={styles.panel} id="profile-menu">
        <div className={styles.panelHeading}><div><h3>Trocar perfil</h3><p>Quem está usando o app?</p></div><button type="button" className={styles.addButton} aria-label="Adicionar perfil" title="Adicionar perfil" onClick={() => setAdding((value) => !value)}><UserPlus size={17} /></button></div>
        <label><span>Perfil ativo</span><select value={activeProfileId} onChange={(event) => void switchFitnessProfile(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
        {adding && <form className={styles.newProfile} onSubmit={addProfile}><label><span>Novo perfil</span><input name="profileName" required maxLength={60} autoFocus placeholder="Nome" /></label><button type="submit" className={styles.createButton} aria-label="Criar perfil" title="Criar perfil" disabled={creating}><Check size={18} /></button></form>}
      </div>}
    </div>
  );
}
