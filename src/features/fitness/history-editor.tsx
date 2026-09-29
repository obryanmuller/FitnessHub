"use client";

import { useState, type FormEvent } from "react";
import { isOptionalRoutine, changeDay, getDay, validDate } from "./model";
import { saveFitness, useFitness } from "./store";
import { UndoNotice, useQuickUndo } from "./quick-undo";
import { SessionSummary } from "./workout-session";
import { ActivityLog } from "./activity-log";
import styles from "./fitness.module.css";

export function HistoryEditor() {
  const { data, today, activeProfileId } = useFitness();
  const [date, setDate] = useState(today);
  const undo = useQuickUndo();
  return <section className={styles.history}>
    <h2>Revisar registros</h2>
    <p className={styles.hint}>Corrija água, refeições e exercícios sem alterar seu plano.</p>
    <label>Data do registro<input type="date" value={date} min="1900-01-01" max={today} required onChange={(event) => { setDate(event.target.value); undo.dismiss(); }} /></label>
    {validDate(date) && date <= today ? <DayEditor key={activeProfileId + date + JSON.stringify(data.days[date])} date={date} onSave={undo.remember} /> : <p role="status">Escolha uma data válida até hoje.</p>}
    {!data.days[date] && validDate(date) && date <= today && <p className={styles.hint}>Sem registro anterior: usamos o plano atual como base. Marque apenas o que realizou nesse dia.</p>}
    {data.days[date]?.session?.finishedAt !== undefined && <SessionSummary session={data.days[date].session!} date={date} />}
    <ActivityLog date={date} />
    <UndoNotice action={undo} />
  </section>;
}
function DayEditor({ date, onSave }: { date: string; onSave: ReturnType<typeof useQuickUndo>["remember"] }) {
  const { data, today } = useFitness();
  const day = getDay(data, date);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const waterMl = Number(form.get("water"));
    if (!validDate(date) || date > today || !Number.isInteger(waterMl) || waterMl < 0 || waterMl > 100000) { setError("Informe um volume válido entre 0 e 100.000 ml."); return; }
    const before = data.days[date];
    const completed = day.routine.filter((item) => form.get("routine:" + item.id) === "completed").map((item) => item.id);
    const skipped = day.routine.filter((item) => form.get("routine:" + item.id) === "skipped").map((item) => item.id);
    const exerciseCompleted = form.getAll("exercise").map(String);
    if (saveFitness((current) => changeDay(current, date, (value) => ({ ...value, waterMl, skipped: skipped.filter((id) => value.routine.some((item) => item.id === id)), completed: completed.filter((id) => value.routine.some((item) => item.id === id)), exerciseCompleted: exerciseCompleted.filter((id) => value.exercises.some((item) => item.id === id)) })))) {
      setError("");
      onSave("Registros de " + date.split("-").reverse().join("/") + " salvos.", (current) => {
        if (before) return changeDay(current, date, (value) => ({ ...value, waterMl: before.waterMl, completed: before.completed, skipped: before.skipped ?? [], exerciseCompleted: before.exerciseCompleted }));
        const savedDay = current.days[date];
        if (savedDay && !Object.keys(savedDay.exerciseLogs ?? {}).length) {
          const days = { ...current.days };
          delete days[date];
          return { ...current, days };
        }
        return changeDay(current, date, (value) => ({ ...value, waterMl: 0, completed: [], skipped: [], exerciseCompleted: [] }));
      });
    }
  }
  return <form className={styles.form} onSubmit={submit}>
    <h3>{date.split("-").reverse().join("/")} {date === today ? "· Hoje" : "· Registro anterior"}</h3>
    <label>Água consumida (ml)<input name="water" type="number" min={0} max={100000} step={1} defaultValue={day.waterMl} required /></label>
    <fieldset className={styles.recordGroup}><legend>Refeições e treino</legend>{day.routine.map((item) => <label key={item.id} className={styles.recordCheck}><select name={"routine:" + item.id} aria-label={"Status de " + item.title} defaultValue={day.completed.includes(item.id) ? "completed" : day.skipped?.includes(item.id) ? "skipped" : "pending"}><option value="pending">Pendente</option><option value="completed">Concluído</option><option value="skipped">Não feito</option></select><span>{item.time} · {item.title}{isOptionalRoutine(item) ? " · Opcional" : ""}</span></label>)}</fieldset>
    {day.exercises.length > 0 && <fieldset className={styles.recordGroup}><legend>Exercícios realizados</legend>{day.exercises.map((item) => <label key={item.id} className={styles.recordCheck}><input type="checkbox" name="exercise" value={item.id} defaultChecked={day.exerciseCompleted.includes(item.id)} /><span>{item.name}</span></label>)}</fieldset>}
    <p className={styles.hint}>Marcar exercícios não conclui o treino automaticamente. Cargas já registradas são preservadas.</p>
    <button className={styles.primary} type="submit">Salvar registros deste dia</button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
