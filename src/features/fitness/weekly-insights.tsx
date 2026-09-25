"use client";

import { Award, CalendarDays, Droplets, Dumbbell, Scale } from "lucide-react";
import { achievements, weeklySummary } from "./model";
import { useFitness } from "./store";
import styles from "./weekly-insights.module.css";

const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function WeeklyInsights() {
  const { data, today } = useFitness();
  const summary = weeklySummary(data, today);
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
    <section className={styles.section} aria-labelledby="achievements-title">
      <div className={styles.heading}><div><span>MARCOS</span><h2 id="achievements-title">Conquistas</h2></div><Award size={21} aria-hidden="true" /></div>
      {earned.length ? <ul className={styles.achievements}>{earned.map((item) => <li key={item.id}><Award size={17} aria-hidden="true" /><div><strong>{item.title}</strong><span>{item.detail}</span></div></li>)}</ul> : <p className={styles.empty}>Seus primeiros marcos aparecem aqui conforme você registra a rotina.</p>}
    </section>
  </>;
}
