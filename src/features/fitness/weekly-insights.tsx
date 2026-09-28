"use client";

import { Award, CalendarDays, Droplets, Dumbbell, Scale } from "lucide-react";
import { achievements, weeklySummary, weeklyComparison, exerciseHistory } from "./model";
import { useFitness } from "./store";
import styles from "./weekly-insights.module.css";

const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function WeeklyInsights() {
  const { data, today } = useFitness();
  const summary = weeklySummary(data, today);
  const comparison = weeklyComparison(data, today);
  const exercises = new Map(Object.entries(data.days).filter(([date]) => date <= today).sort(([a], [b]) => a.localeCompare(b)).flatMap(([, day]) => day.exercises.map((exercise) => [exercise.id, exercise] as const)));
  const loads = [...exercises.values()].map((exercise) => ({ exercise, history: exerciseHistory(data, exercise.id).filter((entry) => entry.date <= today) })).filter((item) => item.history.length >= 2).sort((a, b) => b.history[0].date.localeCompare(a.history[0].date)).slice(0, 5);
  const earned = achievements(data, today);
  return <>
    <section className={styles.section} aria-labelledby="weekly-title">
      <div className={styles.heading}><div><span>ESTA SEMANA</span><h2 id="weekly-title">Seu resumo</h2></div><CalendarDays size={21} aria-hidden="true" /></div>
      <div className={styles.grid}>
        <div><Dumbbell size={18} /><strong>{summary.workoutsDone}/{summary.workoutsPlanned}</strong><span>treinos</span></div>
        <div><Award size={18} /><strong>{summary.routinePercent}%</strong><span>da rotina</span></div>
        <div><Droplets size={18} /><strong>{number(summary.averageWaterMl)} ml</strong><span>média de água</span></div>
        <div><Scale size={18} /><strong>{summary.weightChange === null ? "—" : `${summary.weightChange > 0 ? "+" : ""}${number(summary.weightChange)} kg`}</strong><span>variação no peso</span></div>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="comparison-title">
      <div className={styles.heading}><h2 id="comparison-title">Semana a semana</h2></div>
      <p className={styles.empty}>Comparação de segunda-feira até o mesmo dia da semana. Médias consideram apenas dias registrados.</p>
      <div className={styles.comparisonWrap}><table className={styles.comparison}>
        <caption>{comparison.current.start.split("-").reverse().join("/")} a {comparison.current.end.split("-").reverse().join("/")} · {comparison.currentRecorded} dias registrados; período anterior: {comparison.previousRecorded}</caption>
        <thead><tr><th scope="col">Indicador</th><th scope="col">Anterior</th><th scope="col">Atual</th></tr></thead>
        <tbody>
          <tr><th scope="row">Treinos concluídos</th><td>{comparison.previousRecorded ? comparison.previous.workoutsDone : "—"}</td><td>{comparison.currentRecorded ? comparison.current.workoutsDone : "—"}</td></tr>
          <tr><th scope="row">Rotina concluída</th><td>{comparison.previousRecorded ? comparison.previous.routinePercent + "%" : "—"}</td><td>{comparison.currentRecorded ? summary.routinePercent + "%" : "—"}</td></tr>
          <tr><th scope="row">Média de água</th><td>{comparison.previousRecorded ? number(comparison.previous.averageWaterMl) + " ml" : "—"}</td><td>{comparison.currentRecorded ? number(summary.averageWaterMl) + " ml" : "—"}</td></tr>
          <tr><th scope="row">Dias com meta de água</th><td>{comparison.previousRecorded ? comparison.previousWaterGoals : "—"}</td><td>{comparison.currentRecorded ? comparison.currentWaterGoals : "—"}</td></tr>
        </tbody>
      </table></div>
      {!comparison.previousRecorded && <p className={styles.empty}>Sem registros no período anterior para comparar.</p>}
    </section>
    <section className={styles.section} aria-labelledby="loads-title">
      <div className={styles.heading}><h2 id="loads-title">Evolução nos exercícios</h2></div>
      <p className={styles.empty}>As duas últimas execuções de até cinco exercícios. Compare carga e repetições em conjunto.</p>
      {loads.length ? <ul className={styles.achievements}>{loads.map(({ exercise, history }) => <li key={exercise.id}><Dumbbell size={18} aria-hidden="true" /><div><strong>{exercise.name}</strong><span>{history[1].date.split("-").reverse().join("/")}: {history[1].load || "Sem carga"} · {history[1].reps}</span><span>{history[0].date.split("-").reverse().join("/")}: {history[0].load || "Sem carga"} · {history[0].reps}</span></div></li>)}</ul> : <p className={styles.empty}>Registre duas execuções de um exercício para comparar sua evolução.</p>}
    </section>
    <section className={styles.section} aria-labelledby="achievements-title">
      <div className={styles.heading}><div><span>MARCOS</span><h2 id="achievements-title">Conquistas</h2></div><Award size={21} aria-hidden="true" /></div>
      {earned.length ? <ul className={styles.achievements}>{earned.map((item) => <li key={item.id}><Award size={17} aria-hidden="true" /><div><strong>{item.title}</strong><span>{item.detail}</span></div></li>)}</ul> : <p className={styles.empty}>Seus primeiros marcos aparecem aqui conforme você registra a rotina.</p>}
    </section>
  </>;
}
