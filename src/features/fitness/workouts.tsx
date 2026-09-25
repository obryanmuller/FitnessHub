"use client";

import { useState, type FormEvent } from "react";
import { Activity, Check, Dumbbell, Leaf, Pencil, Plus, Trash2 } from "lucide-react";
import {
  changeDay, changePlan, changeWorkoutDay, getDay, toggleId, weekdayFromDateKey,
  workoutPlanForWeekday, WORKOUT_ID, type Exercise, type Weekday, type WorkoutDayPlan,
} from "./model";
import { saveFitness, useFitness } from "./store";
import styles from "./fitness.module.css";
import weeklyStyles from "./workouts.module.css";

const days: { id: Weekday; short: string; label: string }[] = [
  { id: "1", short: "Seg", label: "Segunda" },
  { id: "2", short: "Ter", label: "Terça" },
  { id: "3", short: "Qua", label: "Quarta" },
  { id: "4", short: "Qui", label: "Quinta" },
  { id: "5", short: "Sex", label: "Sexta" },
  { id: "6", short: "Sáb", label: "Sábado" },
  { id: "0", short: "Dom", label: "Domingo" },
];
const createId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
const read = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function FormActions({ cancel }: { cancel: () => void }) {
  return <div className={styles.actions}><button className={styles.primary} type="submit"><Check size={17} /> Salvar</button><button className={styles.secondary} type="button" onClick={cancel}>Cancelar</button></div>;
}
function Remove({ label, onRemove }: { label: string; onRemove: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? <div className={styles.confirm}><span>Remover {label}?</span><button type="button" className={styles.danger} onClick={() => { onRemove(); setConfirm(false); }}>Remover</button><button type="button" onClick={() => setConfirm(false)}>Cancelar</button></div> : <button type="button" className={styles.iconButton} aria-label={`Remover ${label}`} onClick={() => setConfirm(true)}><Trash2 size={17} /></button>;
}

export function Workouts() {
  const { data, today } = useFitness();
  const todayWeekday = weekdayFromDateKey(today);
  const [selected, setSelected] = useState<Weekday>(todayWeekday);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [notice, setNotice] = useState("");
  const plan = workoutPlanForWeekday(data, selected);
  const selectedDay = days.find((item) => item.id === selected)!;
  const workout = data.routine.find((item) => item.id === WORKOUT_ID)!;
  const day = getDay(data, today);
  const isToday = selected === todayWeekday;
  const done = day.completed.includes(WORKOUT_ID);
  const completed = isToday ? day.exerciseCompleted.length : 0;

  function savePlan(next: WorkoutDayPlan, success: string) {
    if (saveFitness((current) => changeWorkoutDay(current, today, selected, next))) {
      setEditing(null); setEditingPlan(false); setNotice(success);
    }
  }
  function submitExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    const exercise: Exercise = {
      id: editing.id,
      name: read(form, "name"),
      sets: plan.kind === "cardio" ? 1 : Number(form.get("sets")),
      reps: read(form, "reps"),
      load: read(form, "load"),
    };
    if (!exercise.name || !exercise.reps) { setNotice(plan.kind === "cardio" ? "Preencha a atividade e a duração." : "Preencha o nome e as repetições do exercício."); return; }
    const exercises = plan.exercises.some((item) => item.id === exercise.id)
      ? plan.exercises.map((item) => item.id === exercise.id ? exercise : item)
      : [...plan.exercises, exercise];
    savePlan({ ...plan, exercises }, plan.kind === "cardio" ? "Atividade salva no cardio." : "Exercício salvo na ficha.");
  }

  return <main className={`${styles.page} ${styles.purple}`}>
    <header className={styles.heading}><div className={styles.eyebrow}><span><Leaf size={14} /> FITNESSHUB</span><Dumbbell size={22} /></div><p>NO SEU RITMO</p><h1>Treinos</h1><div className={styles.description}>Uma ficha para cada dia da sua semana.</div></header>

    <nav className={weeklyStyles.dayTabs} aria-label="Dia da ficha">
      {days.map((item) => <button key={item.id} type="button" className={item.id === selected ? weeklyStyles.activeDay : ""} aria-pressed={item.id === selected} onClick={() => { setSelected(item.id); setEditing(null); setEditingPlan(false); setNotice(""); }}>{item.short}<span>{item.id === todayWeekday ? "Hoje" : ""}</span></button>)}
    </nav>

    <section className={styles.hero}>
      <div className={weeklyStyles.planHeading}><div><span className={styles.tag}>{selectedDay.label} · {workout.time}</span><h2>{plan.title}</h2></div><button type="button" className={styles.iconButton} aria-label={`Editar ficha de ${selectedDay.label}`} onClick={() => setEditingPlan((value) => !value)}><Pencil size={17} /></button></div>
      <p className={weeklyStyles.kind}><span>{plan.kind === "cardio" ? <Activity size={15} /> : <Dumbbell size={15} />}{plan.kind === "cardio" ? "Cardio" : "Musculação"}</span><button type="button" onClick={() => setEditingTime((value) => !value)}>Horário padrão</button></p>
      {isToday && <><div className={styles.meter}><span style={{ width: `${plan.exercises.length ? completed / plan.exercises.length * 100 : 0}%` }} /></div><p>{completed} de {plan.exercises.length} atividades marcadas</p><button className={styles.primary} type="button" onClick={() => { if (saveFitness((current) => changeDay(current, today, (value) => ({ ...value, completed: toggleId(value.completed, WORKOUT_ID) })))) setNotice(done ? "Treino reaberto." : "Treino de hoje concluído. Boa!"); }}><Check size={18} />{done ? "Treino concluído · desfazer" : "Concluir treino de hoje"}</button></>}
    </section>

    {editingTime && <form className={styles.form} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const time = read(form, "time"); if (saveFitness((current) => { const changed = changePlan(current, today, current.routine.map((item) => item.id === WORKOUT_ID ? { ...item, time } : item)); return changeWorkoutDay(changed, today, todayWeekday, workoutPlanForWeekday(changed, todayWeekday)); })) { setEditingTime(false); setNotice("Horário padrão atualizado."); } }}><h2>Horário dos treinos</h2><label>Horário padrão<input type="time" name="time" defaultValue={workout.time} required autoFocus /></label><FormActions cancel={() => setEditingTime(false)} /></form>}

    {editingPlan && <form className={[styles.form, weeklyStyles.planForm].join(" ")} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const title = read(form, "title"); const kind = String(form.get("kind")) as WorkoutDayPlan["kind"]; if (!title || !["strength", "cardio"].includes(kind)) return; savePlan({ ...plan, title, kind }, `Ficha de ${selectedDay.label.toLocaleLowerCase("pt-BR")} atualizada.`); }}><h2>Ficha de {selectedDay.label}</h2><label>Nome da ficha<input name="title" defaultValue={plan.title} required maxLength={80} autoFocus placeholder="Ex.: Peito e tríceps" /></label><label>Tipo<select name="kind" defaultValue={plan.kind}><option value="strength">Musculação</option><option value="cardio">Cardio</option></select></label><FormActions cancel={() => setEditingPlan(false)} /></form>}

    <div className={styles.sectionHeading}><h2>{plan.kind === "cardio" ? "Atividades" : "Exercícios"} · {selectedDay.short}</h2><button className={styles.add} type="button" disabled={plan.exercises.length >= 100} onClick={() => { setEditing({ id: createId(), name: "", sets: plan.kind === "cardio" ? 1 : 3, reps: "", load: "" }); setNotice(""); }}><Plus size={16} /> Adicionar</button></div>
    {editing && <form key={`${selected}-${editing.id}`} className={styles.form} onSubmit={submitExercise}><h2>{plan.exercises.some((item) => item.id === editing.id) ? "Editar" : "Adicionar"} {plan.kind === "cardio" ? "atividade" : "exercício"}</h2><label>{plan.kind === "cardio" ? "Atividade" : "Exercício"}<input name="name" defaultValue={editing.name} required maxLength={80} autoFocus placeholder={plan.kind === "cardio" ? "Ex.: Caminhada" : "Ex.: Remada"} /></label>{plan.kind === "strength" ? <div className={styles.fieldGrid}><label>Séries<input type="number" name="sets" defaultValue={editing.sets} min={1} max={50} step={1} required /></label><label>Repetições<input name="reps" defaultValue={editing.reps} required maxLength={40} placeholder="Ex.: 10-12" /></label></div> : <label>Duração<input name="reps" defaultValue={editing.reps} required maxLength={40} placeholder="Ex.: 30 min" /></label>}<label>{plan.kind === "cardio" ? "Ritmo / observação (opcional)" : "Carga / observação (opcional)"}<input name="load" defaultValue={editing.load} maxLength={60} placeholder={plan.kind === "cardio" ? "Ex.: Ritmo moderado" : "Ex.: 20 kg"} /></label><FormActions cancel={() => setEditing(null)} /></form>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {plan.exercises.length === 0 && <div className={styles.empty}>{plan.kind === "cardio" ? <Activity /> : <Dumbbell />}<h2>{plan.kind === "cardio" ? "Planeje seu cardio" : "Monte esta ficha"}</h2><p>{plan.kind === "cardio" ? "Adicione caminhada, corrida, bicicleta ou outra atividade." : `Adicione os exercícios de ${selectedDay.label.toLocaleLowerCase("pt-BR")}.`}</p></div>}
    <ol className={styles.list}>{plan.exercises.map((item) => <li key={item.id}><div className={styles.row}>{isToday ? <label className={styles.exerciseCheck}><input type="checkbox" checked={day.exerciseCompleted.includes(item.id)} onChange={() => saveFitness((current) => changeDay(current, today, (value) => ({ ...value, exerciseCompleted: toggleId(value.exerciseCompleted, item.id) })))} /><span><strong>{item.name}</strong><small>{plan.kind === "cardio" ? item.reps : `${item.sets} séries · ${item.reps} repetições`}{item.load && ` · ${item.load}`}</small></span></label> : <div className={weeklyStyles.exerciseInfo}><strong>{item.name}</strong><small>{plan.kind === "cardio" ? item.reps : `${item.sets} séries · ${item.reps} repetições`}{item.load && ` · ${item.load}`}</small></div>}<button type="button" className={styles.iconButton} aria-label={`Editar ${item.name}`} onClick={() => setEditing(item)}><Pencil size={17} /></button></div><div className={styles.rowEnd}><Remove label={item.name} onRemove={() => savePlan({ ...plan, exercises: plan.exercises.filter((exercise) => exercise.id !== item.id) }, plan.kind === "cardio" ? "Atividade removida." : "Exercício removido.")} /></div></li>)}</ol>
  </main>;
}
