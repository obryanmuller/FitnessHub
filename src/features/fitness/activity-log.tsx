"use client";

import { useFitness } from "./store";
import styles from "./fitness.module.css";
export const actionTime = (at: number) => new Date(at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
export function ActivityLog({ date }: { date: string }) {
  const { data } = useFitness();
  const events = data.days[date]?.activity ?? [];
  return <details className={styles.activityLog}><summary>Horários dos registros · {events.length}</summary>
    <p className={styles.hint}>Horário em que você registrou a ação, no fuso deste dispositivo. Registros antigos não recebem horários estimados.</p>
    {events.length ? <ol>{[...events].reverse().map((event, index) => <li key={index}><time dateTime={new Date(event.at).toISOString()}>{new Date(event.at).toLocaleDateString("pt-BR")} · {actionTime(event.at)}</time><span>{event.label}</span></li>)}</ol> : <p className={styles.hint}>Nenhum horário registrado para este dia.</p>}
  </details>;
}
