"use client";

import { Check, Droplets, Dumbbell, Flame, Leaf, Plus, Scale, Sun, Utensils, Waves } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { useFitness, saveFitness } from "@/features/fitness/store";
import { changeDay, dayKey, getDay, streak, toggleId, workoutPlanForDate, WORKOUT_ID, type Routine } from "@/features/fitness/model";
import { formatDateLong } from "@/lib/date";
import styles from "./today-page.module.css";

const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function TodayPage() {
  const { data, today } = useFitness();
  const day = getDay(data, today);
  const bottleMl = data.profile.bottleMl;
  const completedItems = new Set(day.completed);
  const completedCount = completedItems.size;
  const totalItems = day.routine.length;
  const waterConsumedMl = day.waterMl;
  const waterGoal = day.waterGoal;
  const waterProgress = Math.min(100, Math.round(waterConsumedMl / waterGoal * 100));
  const workoutDone = completedItems.has(WORKOUT_ID);
  const restDay = workoutPlanForDate(data, today).kind === "rest";
  const nextItem = day.routine.find((item) => !completedItems.has(item.id));
  const currentDate = formatDateLong(new Date(today + "T12:00:00"));
  const daysInRow = streak(data, today);
  const lastWeight = [...data.weights].sort((a, b) => b.date.localeCompare(a.date))[0];
  function toggleRoutineItem(item: Routine) {
    saveFitness((current) => changeDay(current, dayKey(), (value) => ({ ...value, completed: toggleId(value.completed, item.id) })));
  }
  function addWater(amount: number) {
    saveFitness((current) => changeDay(current, dayKey(), (value) => ({ ...value, waterMl: Math.max(0, Math.min(100000, value.waterMl + amount)) })));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrow}><span><Leaf size={15} aria-hidden="true" /> FITNESSHUB</span><Sun size={22} aria-hidden="true" /></div>
        <p className={styles.date}>{currentDate}</p>
        <h1>Bom dia, {data.profile.name} <span className={styles.wave}>👋</span></h1>
        <p className={styles.subtitle}>Vamos cuidar de você hoje?</p>
      </header>

      <section className={styles.summary} aria-label="Resumo do dia">
        <div className={styles.rhythm}><Flame aria-hidden="true" /><span>Sequência</span><strong>{daysInRow} <small>{daysInRow === 1 ? "dia" : "dias"}</small></strong></div>
        <div className={styles.workout}><Dumbbell aria-hidden="true" /><span>Treino</span><strong>{restDay ? "Descanso" : workoutDone ? "Feito!" : "Pendente"}</strong></div>
        <div className={styles.hydration}><Droplets aria-hidden="true" /><span>Água</span><strong>{waterProgress}<small>% da meta</small></strong></div>
      </section>

      <section aria-labelledby="routine-title" className={styles.routine}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>UM PASSO DE CADA VEZ</p><h2 id="routine-title">Seu dia</h2></div>
          <StatusPill tone={completedCount === totalItems ? "green" : "slate"}>{completedCount} de {totalItems}</StatusPill>
        </div>
        <ol className={styles.timeline}>
          {day.routine.map((item) => {
            const completed = completedItems.has(item.id);
            const isNext = nextItem?.id === item.id;
            const isWorkout = item.id === WORKOUT_ID;
            const Icon = isWorkout ? Dumbbell : Utensils;
            return (
              <li key={item.id} className={`${styles.timelineItem} ${isWorkout ? styles.training : ""} ${completed ? styles.completed : ""} ${isNext ? styles.next : ""}`}>
                <span className={styles.marker} aria-hidden="true">{completed ? <Check size={16} /> : <Icon size={16} />}</span>
                <label className={styles.routineLabel}>
                  <span className={styles.itemContent}>
                    <span className={styles.itemMeta}><time>{item.time}</time>{isNext && <span className={styles.nextBadge}>A seguir</span>}{completed && <span className={styles.doneText}>Concluído</span>}</span>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.entries}>{item.entries.map((entry, index) => <span key={index}>{index > 0 && <span aria-hidden="true"> · </span>}{entry}</span>)}</span>
                  </span>
                  <span className={styles.checkboxWrap}>
                    <input type="checkbox" checked={completed} onChange={() => toggleRoutineItem(item)} aria-label={`${item.time} — ${item.title}`} />
                    <span className={styles.checkboxFace} aria-hidden="true"><Check size={16} strokeWidth={3} /></span>
                  </span>
                </label>
              </li>
            );
          })}
        </ol>
        {completedCount === totalItems && <p className={styles.allDone}>Dia cuidado, etapa por etapa. Muito bem!</p>}
      </section>

      <Card className={styles.water} aria-labelledby="water-title">
        <div className={styles.waterHeading}><span className={styles.waterIcon}><Droplets size={22} aria-hidden="true" /></span><div><h2 id="water-title">Uma pausa para água</h2><p>Sua garrafa tem {number(bottleMl)} ml</p></div><Waves className={styles.waves} size={28} aria-hidden="true" /></div>
        <div className={styles.waterNumbers} aria-live="polite"><strong>{number(waterConsumedMl)} <span>/ {number(waterGoal)} ml</span></strong><p>Equivale a {number(waterConsumedMl / bottleMl)} garrafas</p></div>
        <div className={styles.waterTrack} role="progressbar" aria-label="Água consumida" aria-valuemin={0} aria-valuemax={waterGoal} aria-valuenow={Math.min(waterConsumedMl, waterGoal)} aria-valuetext={`${number(waterConsumedMl)} de ${number(waterGoal)} ml`}><span style={{ width: `${waterProgress}%` }} /></div>
        <div className={styles.bottleRow} aria-hidden="true">{Array.from({ length: Math.min(8, Math.ceil(waterGoal / bottleMl)) }, (_, index) => <span key={index} className={styles.bottle}><span style={{ height: `${Math.min(100, Math.max(0, (waterConsumedMl - index * bottleMl) / bottleMl * 100))}%` }} /></span>)}<p>Meta do dia<strong>{Math.floor(waterGoal / bottleMl)} garrafas{waterGoal % bottleMl > 0 ? ` + ${waterGoal % bottleMl} ml` : ""}</strong></p></div>
        <div className={styles.waterActions}>
          <button type="button" onClick={() => addWater(-bottleMl)} disabled={waterConsumedMl === 0} className={styles.waterUndo} aria-label={"Retirar " + bottleMl + " ml"}>−</button>
          <button type="button" onClick={() => addWater(bottleMl)} disabled={waterConsumedMl >= 100000} className={styles.waterButton}><Plus size={18} aria-hidden="true" />+1 garrafa · {number(bottleMl)} ml</button>
        </div>
        {waterConsumedMl >= waterGoal && <p className={styles.waterSuccess}>Meta de hoje alcançada!</p>}

      </Card>

      <section className={styles.weight} aria-label="Último registro de peso"><span className={styles.weightIcon}><Scale size={20} aria-hidden="true" /></span><div><h2>Seu progresso</h2><p>Último registro de peso</p></div><strong>{lastWeight ? <>{number(lastWeight.kg)} <small>kg</small></> : <small>Sem registro</small>}</strong></section>
      <p className={styles.footer}>Cuidar de você começa nas pequenas escolhas.</p>
    </main>
  );
}
