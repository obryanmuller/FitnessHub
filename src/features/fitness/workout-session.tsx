"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Dumbbell, Pause, Play, Timer } from "lucide-react";
import { activeWorkout, changeDay, exerciseHistory, finishWorkout, pauseWorkout, recordWorkoutSet, sessionCounts, startWorkout, workoutElapsed, workoutPlanForDate, type WorkoutSession, type WorkoutSet } from "./model";
import { saveFitness, useFitness } from "./store";
import styles from "./fitness.module.css";
import sessionStyles from "./workout-session.module.css";

const time = (ms: number) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
};

export function WorkoutSessionPanel() {
  const { data, today } = useFitness();
  const [now, setNow] = useState(() => Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [completedDate, setCompletedDate] = useState<string | null>(null);
  const active = activeWorkout(data);
  const date = active?.[0] ?? completedDate ?? today;
  const session = active?.[1].session ?? data.days[date]?.session;
  useEffect(() => {
    if (!session || session.finishedAt !== undefined || session.pausedAt !== undefined) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [session?.startedAt, session?.finishedAt, session?.pausedAt, session]);
  const plan = workoutPlanForDate(data, today);
  if (!session) return <section className={sessionStyles.panel}>
    <span className={styles.tag}>TREINO GUIADO</span><h2>Uma série de cada vez</h2>
    <p className={styles.hint}>Registre cada série. O descanso começa automaticamente e a sessão fica salva no seu perfil.</p>
    {plan.kind === "rest" ? <p>Hoje é dia de descanso na sua ficha.</p> : <button type="button" className={styles.primary} disabled={!plan.exercises.length} onClick={() => { if (saveFitness((current) => startWorkout(current, today, Date.now()))) setNow(Date.now()); }}><Play size={17} /> Iniciar treino de hoje</button>}
    {plan.kind !== "rest" && !plan.exercises.length && <p className={styles.hint}>Adicione exercícios à ficha de hoje para iniciar.</p>}
  </section>;
  const counts = sessionCounts(session);
  if (session.finishedAt !== undefined) return <><SessionSummary session={session} date={date} />{date !== today && <button type="button" className={styles.secondary} onClick={() => setCompletedDate(null)}>Voltar ao treino de hoje</button>}</>;
  const nextExercise = session.exercises.find((item) => item.series.some((set) => !set.done));
  const nextIndex = nextExercise?.series.findIndex((set) => !set.done) ?? -1;
  const previous = nextExercise ? exerciseHistory(data, nextExercise.id, date)[0] : undefined;
  const rest = session.restUntil ? Math.max(0, session.restUntil - now) : 0;
  const paused = session.pausedAt !== undefined;
  function finish() {
    if (saveFitness((current) => finishWorkout(current, date, Date.now()))) { setConfirmFinish(false); setCompletedDate(date); }
  }
  return <section className={sessionStyles.panel} aria-label="Treino em andamento">
    <div className={styles.sectionHeading}><div><span className={styles.tag}>SESSÃO · {date.split("-").reverse().join("/")}</span><h2>{session.title}</h2></div><Dumbbell aria-hidden="true" /></div>
    <div className={sessionStyles.metrics}><span><strong>{time(workoutElapsed(session, now))}</strong>tempo ativo</span><span><strong>{counts.done}/{counts.total}</strong>séries realizadas</span></div>
    <div className={styles.meter}><span style={{ width: counts.done / counts.total * 100 + "%" }} /></div>
    <div className={styles.actions}><button className={styles.secondary} type="button" onClick={() => { saveFitness((current) => pauseWorkout(current, date, Date.now())); setNow(Date.now()); }}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? "Retomar sessão" : "Pausar sessão"}</button>
      <label className={sessionStyles.restSelect}>Descanso<select aria-label="Descanso automático" value={session.restSeconds} onChange={(event) => { const seconds = Number(event.target.value); saveFitness((current) => changeDay(current, date, (day) => ({ ...day, session: day.session ? { ...day.session, restSeconds: seconds } : undefined }))); }}>{[0,30,60,90,120,180].map((seconds) => <option key={seconds} value={seconds}>{seconds ? seconds + " segundos" : "Sem descanso"}</option>)}</select></label>
    </div>
    {paused ? <p className={styles.notice} role="status">Sessão pausada. Seu tempo e suas séries estão preservados.</p> : <>
      {session.restUntil !== undefined && <div className={sessionStyles.rest}><Timer size={20} aria-hidden="true" /><span>{rest > 0 ? "Descanso" : "Pronto para a próxima série"}<strong aria-live="off">{time(Math.ceil(rest / 1000) * 1000)}</strong></span>{rest > 0 && <button type="button" className={styles.secondary} onClick={() => saveFitness((current) => changeDay(current, date, (day) => ({ ...day, session: day.session ? { ...day.session, restUntil: undefined } : undefined })))}>Pular descanso</button>}</div>}
      {nextExercise && <form key={nextExercise.id + ":" + nextIndex + ":" + date} className={sessionStyles.setForm} onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const values = { reps: String(form.get("reps")).trim(), load: String(form.get("load")).trim() };
        if (saveFitness((current) => recordWorkoutSet(current, date, nextExercise.id, nextIndex, values, Date.now()))) setNow(Date.now());
      }}>
        <span className={styles.tag}>SÉRIE {nextIndex + 1} DE {nextExercise.series.length}</span><h3>{nextExercise.name}</h3>
        <p className={styles.hint}>{previous ? "Última execução: " + previous.reps + " · " + (previous.load || "sem carga") : "Referência da ficha: " + nextExercise.reps + " · " + (nextExercise.load || "sem carga")}</p>
        <div className={styles.fieldGrid}><label>{session.kind === "cardio" ? "Duração realizada" : "Repetições realizadas"}<input name="reps" defaultValue={nextExercise.series[nextIndex].reps} maxLength={40} required /></label><label>{session.kind === "cardio" ? "Ritmo / observação" : "Carga realizada"}<input name="load" defaultValue={nextExercise.series[nextIndex].load} maxLength={60} placeholder="Ex.: 40 kg" /></label></div>
        <button className={styles.primary} type="submit" disabled={rest > 0}><Check size={17} /> Concluir série</button>
      </form>}
      {!nextExercise && <p className={styles.notice} role="status">Todas as séries realizadas. Finalize para salvar o resumo.</p>}
    </>}
    <details className={styles.details}><summary>Séries desta sessão</summary>{session.exercises.map((exercise) => <div key={exercise.id}><h3>{exercise.name}</h3><ol className={sessionStyles.setList}>{exercise.series.map((set, index) => <li key={index}><span>{index + 1}. {set.done ? set.reps + " · " + (set.load || "sem carga") : "Pendente"}</span>{set.done && <button type="button" disabled={paused} onClick={() => saveFitness((current) => changeDay(current, date, (day) => ({ ...day, session: day.session ? { ...day.session, restUntil: undefined, exercises: day.session.exercises.map((item) => item.id === exercise.id ? { ...item, series: item.series.map((entry, position) => position === index ? { ...entry, done: false } : entry) } : item) } : undefined })))}>Refazer série {index + 1}</button>}</li>)}</ol></div>)}</details>
    {counts.done > 0 ? <div className={styles.actions}><button type="button" className={styles.primary} onClick={() => counts.done < counts.total ? setConfirmFinish(true) : finish()}>Finalizar treino</button></div> : <p className={styles.hint}>Conclua ao menos uma série para finalizar. Você pode pausar e voltar depois.</p>}
    {counts.done === 0 && <button className={styles.secondary} type="button" onClick={() => setConfirmCancel(true)}>Cancelar sessão vazia</button>}
    {confirmCancel && <div className={sessionStyles.confirm} role="alert"><p>Cancelar esta sessão sem séries realizadas?</p><div className={styles.actions}><button className={styles.secondary} type="button" onClick={() => { if (saveFitness((current) => changeDay(current, date, (day) => ({ ...day, session: undefined })))) setConfirmCancel(false); }}>Confirmar cancelamento</button><button className={styles.secondary} type="button" onClick={() => setConfirmCancel(false)}>Voltar</button></div></div>}
    {confirmFinish && <div className={sessionStyles.confirm} role="alert"><p>Faltam {counts.total - counts.done} séries. Encerrar marcará o treino como concluído, preservando apenas as séries realizadas.</p><div className={styles.actions}><button className={styles.primary} type="button" onClick={finish}>Encerrar treino parcial</button><button className={styles.secondary} type="button" onClick={() => setConfirmFinish(false)}>Continuar treino</button></div></div>}
  </section>;
}

export function SessionSummary({ session, date }: { session: WorkoutSession; date: string }) {
  const { data } = useFitness();
  const counts = sessionCounts(session);
  return <section className={sessionStyles.panel} aria-label="Resumo da sessão">
    <span className={styles.tag}>TREINO FINALIZADO · {date.split("-").reverse().join("/")}</span><h2>{session.title}</h2>
    <div className={sessionStyles.metrics}><span><strong>{time(workoutElapsed(session, session.finishedAt ?? session.startedAt))}</strong>tempo ativo</span><span><strong>{counts.done}/{counts.total}</strong>séries realizadas</span></div>
    <p className={styles.hint}>Séries detalhadas preservadas. O histórico de carga usa a última série realizada de cada exercício.</p>
    {session.exercises.map((exercise) => {
      const performed = exercise.series.filter((set) => set.done);
      const previous = exerciseHistory(data, exercise.id, date)[0];
      return <div key={exercise.id} className={sessionStyles.summaryExercise}><h3>{exercise.name}</h3><p className={styles.hint}>{previous ? "Execução anterior: " + previous.reps + " · " + (previous.load || "sem carga") : "Primeira execução registrada"}</p><p>{performed.length ? exercise.series.map((set: WorkoutSet, index) => set.done ? "S" + (index + 1) + ": " + set.reps + " · " + (set.load || "sem carga") : null).filter(Boolean).join(" / ") : "Não realizado"}</p></div>;
    })}
  </section>;
}
