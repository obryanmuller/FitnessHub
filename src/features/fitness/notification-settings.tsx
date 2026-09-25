"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useFitness } from "./store";
import styles from "./notification-settings.module.css";

type Settings = { meals: boolean; workout: boolean; water: boolean };
const defaults: Settings = { meals: true, workout: true, water: false };

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new Uint8Array(bytes.buffer);
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || "Não foi possível configurar as notificações.");
  return body as T;
}

export function NotificationSettings() {
  const { activeProfileId } = useFitness();
  const [settings, setSettings] = useState(defaults);
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!available) { if (active) { setSupported(false); setBusy(false); } return; }
      try {
        const registration = await navigator.serviceWorker.ready;
        const current = await registration.pushManager.getSubscription();
        if (!current) { if (active) { setSubscribed(false); setBusy(false); } return; }
        const query = new URLSearchParams({ profileId: activeProfileId, endpoint: current.endpoint });
        const result = await responseJson<{ subscribed: boolean; settings: Settings }>(await fetch(`/api/notifications?${query}`, { cache: "no-store" }));
        if (active) { setSubscribed(result.subscribed); setSettings(result.settings); setBusy(false); }
      } catch (error) {
        if (active) { setNotice(error instanceof Error ? error.message : "Não foi possível consultar as notificações."); setBusy(false); }
      }
    }
    queueMicrotask(() => { if (active) { setBusy(true); setNotice(""); void load(); } });
    return () => { active = false; };
  }, [activeProfileId]);

  async function subscription() {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }
  async function save(next: Settings, welcome = false) {
    const current = await subscription();
    if (!current) throw new Error("Este celular ainda não está inscrito para notificações.");
    await responseJson(await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: activeProfileId, subscription: current.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, settings: next, welcome }),
    }));
  }
  async function enable() {
    setBusy(true); setNotice("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permissão de notificação não concedida.");
      const config = await responseJson<{ publicKey: string }>(await fetch("/api/notifications/config", { cache: "no-store" }));
      const registration = await navigator.serviceWorker.ready;
      let current = await registration.pushManager.getSubscription();
      current ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(config.publicKey) });
      await responseJson(await fetch("/api/notifications", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: activeProfileId, subscription: current.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, settings, welcome: true }),
      }));
      setSubscribed(true); setNotice("Notificações ativadas neste celular.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível ativar as notificações."); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true); setNotice("");
    try {
      const current = await subscription();
      if (current) {
        await responseJson(await fetch("/api/notifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId: activeProfileId, endpoint: current.endpoint }) }));
        await current.unsubscribe();
      }
      setSubscribed(false); setNotice("Notificações desativadas neste celular.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível desativar as notificações."); }
    finally { setBusy(false); }
  }
  async function change(key: keyof Settings, checked: boolean) {
    const previous = settings;
    const next = { ...settings, [key]: checked };
    setSettings(next); setNotice("");
    try { await save(next); } catch (error) { setSettings(previous); setNotice(error instanceof Error ? error.message : "Não foi possível salvar a preferência."); }
  }

  return <section className={styles.notifications}>
    <div className={styles.heading}><div><h2>Notificações</h2><p>Lembretes deste perfil neste celular.</p></div>{subscribed ? <BellRing size={19} aria-hidden="true" /> : <Bell size={19} aria-hidden="true" />}</div>
    {!supported ? <p className={styles.info}>Neste iPhone, adicione o FitnessHub à Tela de Início e abra pelo ícone para ativar notificações.</p> : busy && !subscribed ? <p className={styles.info} role="status">Verificando notificações…</p> : !subscribed ? <button type="button" className={styles.enable} onClick={() => void enable()} disabled={busy}><BellRing size={17} /> Ativar neste celular</button> : <><div className={styles.options}><label><input type="checkbox" checked={settings.meals} onChange={(event) => void change("meals", event.target.checked)} /> Refeições nos horários da rotina</label><label><input type="checkbox" checked={settings.workout} onChange={(event) => void change("workout", event.target.checked)} /> Horário do treino</label><label><input type="checkbox" checked={settings.water} onChange={(event) => void change("water", event.target.checked)} /> Água a cada 2 horas, das 8h às 20h</label></div><button type="button" className={styles.disable} onClick={() => void disable()} disabled={busy}><BellOff size={16} /> Desativar neste celular</button></>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
  </section>;
}
