"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useFitness } from "./store";
import styles from "./notification-settings.module.css";

import { defaultNotificationSettings as defaults, normalizeNotificationSettings, isNotificationSettings, type NotificationSettings as Settings } from "@/lib/reminder-policy";

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
  const [settings, setSettings] = useState<Required<Settings>>(defaults);
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
        const registration = await navigator.serviceWorker.getRegistration();
        const current = await registration?.pushManager.getSubscription();
        if (!current) { if (active) { setSubscribed(false); setBusy(false); } return; }
        const query = new URLSearchParams({ profileId: activeProfileId, endpoint: current.endpoint });
        const result = await responseJson<{ subscribed: boolean; settings: Settings }>(await fetch(`/api/notifications?${query}`, { cache: "no-store" }));
        if (active) { setSubscribed(result.subscribed); setSettings(normalizeNotificationSettings(result.settings)); setBusy(false); }
      } catch (error) {
        if (active) { setNotice(error instanceof Error ? error.message : "Não foi possível consultar as notificações."); setBusy(false); }
      }
    }
    queueMicrotask(() => { if (active) { setBusy(true); setNotice(""); setSettings(defaults); setSubscribed(false); void load(); } });
    return () => { active = false; };
  }, [activeProfileId]);

  async function subscription() {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.pushManager.getSubscription();
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
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration?.active) throw new Error("Abra a versão publicada do app e tente novamente. As notificações precisam do serviço em segundo plano ativo.");
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
  async function savePreferences() {
    if (!isNotificationSettings(settings)) { setNotice("Confira os horários: o fim da água deve ser posterior ao início e o silêncio deve ter horários diferentes."); return; }
    setBusy(true); setNotice("");
    try { await save(settings); setNotice("Horários e preferências salvos."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  return <section className={styles.notifications}>
    <div className={styles.heading}><div><h2>Lembretes</h2><p>Preferências deste perfil neste dispositivo.</p></div>{subscribed ? <BellRing size={19} aria-hidden="true" /> : <Bell size={19} aria-hidden="true" />}</div>
    {!supported ? <p className={styles.info}>Este navegador não oferece notificações. No iPhone, abra o app instalado pela Tela de Início.</p> :
      <form onSubmit={(event) => { event.preventDefault(); void savePreferences(); }}>
        <fieldset disabled={busy} className={styles.preferences}>
          <div className={styles.options}>
            <label><input type="checkbox" checked={settings.meals} onChange={(event) => setSettings({ ...settings, meals: event.target.checked })} /> Refeições nos horários da rotina</label>
            <label><input type="checkbox" checked={settings.workout} onChange={(event) => setSettings({ ...settings, workout: event.target.checked })} /> Treino no horário da ficha</label>
            <label><input type="checkbox" checked={settings.water} onChange={(event) => setSettings({ ...settings, water: event.target.checked })} /> Lembretes de água</label>
          </div>
          {settings.water && <div className={styles.schedule}>
            <label>Água a partir de<input type="time" value={settings.waterStart} required onChange={(event) => setSettings({ ...settings, waterStart: event.target.value })} /></label>
            <label>Último horário de água<input type="time" value={settings.waterEnd} required onChange={(event) => setSettings({ ...settings, waterEnd: event.target.value })} /></label>
            <label>Intervalo da água<select value={settings.waterInterval} onChange={(event) => setSettings({ ...settings, waterInterval: Number(event.target.value) })}>{[30,60,90,120,180,240].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select></label>
          </div>}
          <div className={styles.options}><label><input type="checkbox" checked={settings.quietEnabled} onChange={(event) => setSettings({ ...settings, quietEnabled: event.target.checked })} /> Horário de silêncio</label></div>
          {settings.quietEnabled && <div className={styles.schedule}><label>Silêncio a partir de<input type="time" value={settings.quietStart} required onChange={(event) => setSettings({ ...settings, quietStart: event.target.value })} /></label><label>Voltar a avisar às<input type="time" value={settings.quietEnd} required onChange={(event) => setSettings({ ...settings, quietEnd: event.target.value })} /></label></div>}
          <p className={styles.info}>Refeições e treinos concluídos não geram avisos. Atingir a meta de água encerra os lembretes do dia. Horários seguem o fuso deste dispositivo; não reenviamos avisos suprimidos durante o silêncio.</p>
          {subscribed ? <><button className={styles.enable} type="submit">Salvar lembretes</button><button type="button" className={styles.disable} onClick={() => void disable()}><BellOff size={16} /> Desativar neste dispositivo</button></> : <button type="button" className={styles.enable} onClick={() => { if (isNotificationSettings(settings)) void enable(); else setNotice("Confira os horários antes de ativar."); }}><BellRing size={17} /> Ativar neste dispositivo</button>}
        </fieldset>
      </form>}
    {busy && <p role="status" className={styles.info}>Carregando…</p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
  </section>;
}