"use client";

import { useState, type FormEvent } from "react";
import { Activity, ArrowDown, ArrowUp, Bed, Check, ClipboardPen, Copy, Dumbbell, Leaf, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import {
  changeDay, changeWorkoutDay, exerciseHistory, getDay, isPersonalRecord, recordExercisePerformance, toggleId,
  weekdayFromDateKey, workoutPlanForWeekday, WORKOUT_ID, type Exercise, type Weekday, type WorkoutDayPlan,
} from "./model";
import { saveFitness, useFitness } from "./store";
import styles from "./fitness.module.css";
import weeklyStyles from "./workouts.module.css";

const days: { id: Weekday; short: string; label: string }[] = [
  { id: "1", short: "Seg", label: "Segunda" }, { id: "2", short: "Ter", label: "Terça" },
  { id: "3", short: "Qua", label: "Quarta" }, { id: "4", short: "Qui", label: "Quinta" },
  { id: "5", short: "Sex", label: "Sexta" }, { id: "6", short: "Sáb", label: "Sábado" },
  { id: "0", short: "Dom", label: "Domingo" },
];
const createId = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
const read = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const kindLabel = { strength: "Musculação", cardio: "Cardio", rest: "Descanso" } as const;

function FormActions({ cancel }: { cancel: () => void }) {
  return <div className={styles.actions}><button className={styles.primary} type="submit"><Check size={17} /> Salvar</button><button className={styles.secondary} type="button" onClick={cancel}>Cancelar</button></div>;
}
function Remove({ label, onRemove }: { label: string; onRemove: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? <div className={styles.confirm}><span>Remover {label}?</span><button type="button" className={styles.danger} onClick={() => { onRemove(); setConfirm(false); }}>Remover</button><button type="button" onClick={() => setConfirm(false)}>Cancelar</button></div> : <button type="button" className={styles.iconButton} aria-label={`Remover ${label}`} title={`Remover ${label}`} onClick={() => setConfirm(true)}><Trash2 size={17} /></button>;
}

export function Workouts() {
  const { data, today } = useFitness();
  const todayWeekday = weekdayFromDateKey(today);
  const [selected, setSelected] = useState<Weekday>(todayWeekday);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [logging, setLogging] = useState<Exercise | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [copying, setCopying] = useState(false);
  const [notice, setNotice] = useState("");
  const plan = workoutPlanForWeekday(data, selected);
  const selectedDay = days.find((item) => item.id === selected)!;
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
    const exercise: Exercise = { id: editing.id, name: read(form, "name"), sets: plan.kind === "cardio" ? 1 : Number(form.get("sets")), reps: read(form, "reps"), load: read(form, "load") };
    if (!exercise.name || !exercise.reps) { setNotice(plan.kind === "cardio" ? "Preencha a atividade e a duração." : "Preencha o nome e as repetições do exercício."); return; }
    const exercises = plan.exercises.some((item) => item.id === exercise.id) ? plan.exercises.map((item) => item.id === exercise.id ? exercise : item) : [...plan.exercises, exercise];
    savePlan({ ...plan, exercises }, plan.kind === "cardio" ? "Atividade salva no cardio." : "Exercício salvo na ficha.");
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= plan.exercises.length) return;
    const exercises = [...plan.exercises];
    [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
    savePlan({ ...plan, exercises }, "Ordem da ficha atualizada.");
  }

  const KindIcon = plan.kind === "cardio" ? Activity : plan.kind === "rest" ? Bed : Dumbbell;
  return <main className={`${styles.page} ${styles.purple}`}>
    <header className={styles.heading}><div className={styles.eyebrow}><span><Leaf size={14} /> FITNESSHUB</span><Dumbbell size={22} /></div><p>NO SEU RITMO</p><h1>Treinos</h1><div className={styles.description}>Uma ficha para cada dia da sua semana.</div></header>

    <nav className={weeklyStyles.dayTabs} aria-label="Dia da ficha">
      {days.map((item) => <button key={item.id} type="button" className={item.id === selected ? weeklyStyles.activeDay : ""} aria-pressed={item.id === selected} onClick={() => { setSelected(item.id); setEditing(null); setLogging(null); setEditingPlan(false); setCopying(false); setNotice(""); }}>{item.short}<span>{item.id === todayWeekday ? "Hoje" : ""}</span></button>)}
    </nav>

    <section className={styles.hero}>
      <div className={weeklyStyles.planHeading}><div><span className={styles.tag}>{selectedDay.label} · {plan.kind === "rest" ? "sem horário" : plan.time}</span><h2>{plan.title}</h2></div><div className={weeklyStyles.headingActions}><button type="button" className={styles.iconButton} aria-label="Duplicar ficha" title="Duplicar ficha" onClick={() => setCopying((value) => !value)}><Copy size={17} /></button><button type="button" className={styles.iconButton} aria-label={`Editar ficha de ${selectedDay.label}`} title="Editar ficha" onClick={() => setEditingPlan((value) => !value)}><Pencil size={17} /></button></div></div>
      <p className={weeklyStyles.kind}><span><KindIcon size={15} />{kindLabel[plan.kind]}</span></p>
      {isToday && plan.kind !== "rest" && <><div className={styles.meter}><span style={{ width: `${plan.exercises.length ? completed / plan.exercises.length * 100 : 0}%` }} /></div><p>{completed} de {plan.exercises.length} atividades marcadas</p><button className={styles.primary} type="button" onClick={() => { if (saveFitness((current) => changeDay(current, today, (value) => ({ ...value, completed: toggleId(value.completed, WORKOUT_ID) })))) setNotice(done ? "Treino reaberto." : "Treino de hoje concluído. Boa!"); }}><Check size={18} />{done ? "Treino concluído · desfazer" : "Concluir treino de hoje"}</button></>}
      {plan.kind === "rest" && <p>Este dia fica livre de treino e não entra como pendência na rotina.</p>}
    </section>

    {copying && <form className={styles.form} onSubmit={(event) => { event.preventDefault(); const target = String(new FormData(event.currentTarget).get("target")) as Weekday; if (target === selected) return; const targetLabel = days.find((item) => item.id === target)!.label; if (saveFitness((current) => changeWorkoutDay(current, today, target, { ...plan, exercises: plan.exercises.map((exercise) => ({ ...exercise })) }))) { setCopying(false); setNotice(`Ficha duplicada para ${targetLabel.toLocaleLowerCase("pt-BR")}.`); } }}><h2>Duplicar ficha</h2><label>Copiar para<select name="target" defaultValue={days.find((item) => item.id !== selected)!.id}>{days.filter((item) => item.id !== selected).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><FormActions cancel={() => setCopying(false)} /></form>}

    {editingPlan && <form className={[styles.form, weeklyStyles.planForm].join(" ")} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const title = read(form, "title"); const kind = String(form.get("kind")) as WorkoutDayPlan["kind"]; const time = read(form, "time"); if (!title || !["strength", "cardio", "rest"].includes(kind) || (kind !== "rest" && !time)) return; savePlan({ ...plan, title, kind, time }, `Ficha de ${selectedDay.label.toLocaleLowerCase("pt-BR")} atualizada.`); }}><h2>Ficha de {selectedDay.label}</h2><label>Nome da ficha<input name="title" defaultValue={plan.title} required maxLength={80} autoFocus placeholder="Ex.: Peito e tríceps" /></label><label>Tipo<select name="kind" defaultValue={plan.kind}><option value="strength">Musculação</option><option value="cardio">Cardio</option><option value="rest">Descanso</option></select></label><label>Horário<input type="time" name="time" defaultValue={plan.time} /></label><FormActions cancel={() => setEditingPlan(false)} /></form>}

    {plan.kind !== "rest" && <><div className={styles.sectionHeading}><h2>{plan.kind === "cardio" ? "Atividades" : "Exercícios"} · {selectedDay.short}</h2><button className={styles.add} type="button" disabled={plan.exercises.length >= 100} onClick={() => { setEditing({ id: createId(), name: "", sets: plan.kind === "cardio" ? 1 : 3, reps: "", load: "" }); setNotice(""); }}><Plus size={16} /> Adicionar</button></div>
    {editing && <form key={`${selected}-${editing.id}`} className={styles.form} onSubmit={submitExercise}><h2>{plan.exercises.some((item) => item.id === editing.id) ? "Editar" : "Adicionar"} {plan.kind === "cardio" ? "atividade" : "exercício"}</h2><label>{plan.kind === "cardio" ? "Atividade" : "Exercício"}<input name="name" defaultValue={editing.name} required maxLength={80} autoFocus placeholder={plan.kind === "cardio" ? "Ex.: Caminhada" : "Ex.: Remada"} /></label>{plan.kind === "strength" ? <div className={styles.fieldGrid}><label>Séries<input type="number" name="sets" defaultValue={editing.sets} min={1} max={50} step={1} required /></label><label>Repetições<input name="reps" defaultValue={editing.reps} required maxLength={40} placeholder="Ex.: 10-12" /></label></div> : <label>Duração<input name="reps" defaultValue={editing.reps} required maxLength={40} placeholder="Ex.: 30 min" /></label>}<label>{plan.kind === "cardio" ? "Ritmo / observação (opcional)" : "Carga planejada (opcional)"}<input name="load" defaultValue={editing.load} maxLength={60} placeholder={plan.kind === "cardio" ? "Ex.: Ritmo moderado" : "Ex.: 20 kg"} /></label><FormActions cancel={() => setEditing(null)} /></form>}
    {logging && <form key={`log-${logging.id}`} className={styles.form} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const reps = read(form, "actualReps"), load = read(form, "actualLoad"), note = read(form, "note"); if (!reps) { setNotice("Informe as repetições ou a duração realizada."); return; } if (saveFitness((current) => recordExercisePerformance(current, today, logging.id, { reps, load, ...(note ? { note } : {}) }))) { setLogging(null); setNotice("Desempenho registrado."); } }}><h2>Registrar {logging.name}</h2><div className={styles.fieldGrid}><label>{plan.kind === "cardio" ? "Duração" : "Repetições"}<input name="actualReps" defaultValue={day.exerciseLogs?.[logging.id]?.reps ?? logging.reps} required maxLength={40} autoFocus /></label><label>{plan.kind === "cardio" ? "Ritmo" : "Carga"}<input name="actualLoad" defaultValue={day.exerciseLogs?.[logging.id]?.load ?? logging.load} maxLength={60} placeholder={plan.kind === "cardio" ? "Ex.: leve" : "Ex.: 22 kg"} /></label></div><label>Observação (opcional)<input name="note" defaultValue={day.exerciseLogs?.[logging.id]?.note ?? ""} maxLength={200} placeholder="Como foi a execução?" /></label><FormActions cancel={() => setLogging(null)} /></form>}
    {plan.exercises.length === 0 && <div className={styles.empty}>{plan.kind === "cardio" ? <Activity /> : <Dumbbell />}<h2>{plan.kind === "cardio" ? "Planeje seu cardio" : "Monte esta ficha"}</h2><p>{plan.kind === "cardio" ? "Adicione caminhada, corrida, bicicleta ou outra atividade." : `Adicione os exercícios de ${selectedDay.label.toLocaleLowerCase("pt-BR")}.`}</p></div>}
    <ol className={styles.list}>{plan.exercises.map((item, index) => { const latest = exerciseHistory(data, item.id, today)[0]; const currentLog = isToday ? day.exerciseLogs?.[item.id] : undefined; const pr = currentLog && isPersonalRecord(data, item.id, today, currentLog.load); return <li key={item.id}><div className={styles.row}>{isToday ? <label className={styles.exerciseCheck}><input type="checkbox" checked={day.exerciseCompleted.includes(item.id)} onChange={() => saveFitness((current) => changeDay(current, today, (value) => ({ ...value, exerciseCompleted: toggleId(value.exerciseCompleted, item.id) })))} /><span><strong>{item.name}</strong><small>{plan.kind === "cardio" ? item.reps : `${item.sets} séries · ${item.reps} repetições`}{item.load && ` · ${item.load}`}</small>{currentLog ? <small className={weeklyStyles.performance}>Hoje: {currentLog.reps}{currentLog.load && ` · ${currentLog.load}`}{pr && <b><Trophy size={12} /> Recorde</b>}</small> : latest && <small className={weeklyStyles.performance}>Última: {latest.reps}{latest.load && ` · ${latest.load}`}</small>}</span></label> : <div className={weeklyStyles.exerciseInfo}><strong>{item.name}</strong><small>{plan.kind === "cardio" ? item.reps : `${item.sets} séries · ${item.reps} repetições`}{item.load && ` · ${item.load}`}</small>{latest && <small className={weeklyStyles.performance}>Última: {latest.reps}{latest.load && ` · ${latest.load}`}</small>}</div>}<div className={weeklyStyles.itemActions}>{isToday && <button type="button" className={styles.iconButton} aria-label={`Registrar desempenho de ${item.name}`} title="Registrar desempenho" onClick={() => setLogging(item)}><ClipboardPen size={17} /></button>}<button type="button" className={styles.iconButton} aria-label={`Editar ${item.name}`} title="Editar" onClick={() => setEditing(item)}><Pencil size={17} /></button></div></div><div className={weeklyStyles.orderRow}><button type="button" className={styles.iconButton} disabled={index === 0} aria-label={`Mover ${item.name} para cima`} title="Mover para cima" onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button type="button" className={styles.iconButton} disabled={index === plan.exercises.length - 1} aria-label={`Mover ${item.name} para baixo`} title="Mover para baixo" onClick={() => move(index, 1)}><ArrowDown size={16} /></button><Remove label={item.name} onRemove={() => savePlan({ ...plan, exercises: plan.exercises.filter((exercise) => exercise.id !== item.id) }, plan.kind === "cardio" ? "Atividade removida." : "Exercício removido.")} /></div></li>; })}</ol></>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
  </main>;
}
