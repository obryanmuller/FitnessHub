"use client";

import { useState } from "react";
import { Check, Droplets, Dumbbell, Flame, Activity, Plus, Scale, Sun, Utensils, Waves } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { useFitness, saveFitness } from "@/features/fitness/store";
import { isOptionalRoutine, routineProgress, changeDay, dayKey, getDay, streak, toggleId, workoutPlanForDate, WORKOUT_ID, type Routine } from "@/features/fitness/model";
import { UndoNotice, useQuickUndo } from "@/features/fitness/quick-undo";
import { ActivityLog, actionTime } from "@/features/fitness/activity-log";
import { formatDateLong } from "@/lib/date";
import styles from "./today-page.module.css";

const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function TodayPage() {
  const { data, today } = useFitness();
  const [waterFeedback, setWaterFeedback] = useState({ sequence: 0, amount: 0, reachedGoal: false });
  const undo = useQuickUndo();
  const day = getDay(data, today);
  const bottleMl = data.profile.bottleMl;
  const completedItems = new Set(day.completed);
  const { completed: completedCount, total: totalItems } = routineProgress(day);

  const waterConsumedMl = day.waterMl;
  const waterGoal = day.waterGoal;
  const waterProgress = waterConsumedMl >= waterGoal ? 100 : Math.min(99, Math.round(waterConsumedMl / waterGoal * 100));
  const workoutDone = completedItems.has(WORKOUT_ID);
  const restDay = workoutPlanForDate(data, today).kind === "rest";
  const nextItem = day.routine.find((item) => !isOptionalRoutine(item) && !completedItems.has(item.id));
  const currentDate = formatDateLong(new Date(today + "T12:00:00"));
  const daysInRow = streak(data, today);
  const lastWeight = [...data.weights].sort((a, b) => b.date.localeCompare(a.date))[0];
  function toggleRoutineItem(item: Routine) {
    const date = dayKey();
    const wasCompleted = getDay(data, date).completed.includes(item.id);
    if (saveFitness((current) => changeDay(current, date, (value) => ({ ...value, completed: toggleId(value.completed, item.id) })))) {
      undo.remember(item.title + (wasCompleted ? " reaberto." : " concluído."), (current) => changeDay(current, date, (value) => ({
        ...value, completed: value.routine.some((entry) => entry.id === item.id) ? [...value.completed.filter((id) => id !== item.id), ...(wasCompleted ? [item.id] : [])] : value.completed,
      })));
    }
  }
  function addWater(amount: number) {
    const date = dayKey();
    const previousWater = getDay(data, date).waterMl;
    const saved = saveFitness((current) => changeDay(current, date, (value) => ({ ...value, waterMl: Math.max(0, Math.min(100000, value.waterMl + amount)) })));
    if (saved) undo.remember(amount > 0 ? "Água adicionada." : "Água retirada.", (current) => changeDay(current, date, (value) => ({ ...value, waterMl: previousWater })));
    if (saved && amount > 0 && waterConsumedMl < 100000) {
      setWaterFeedback((previous) => ({ sequence: previous.sequence + 1, amount: Math.min(amount, 100000 - waterConsumedMl), reachedGoal: waterConsumedMl < waterGoal && waterConsumedMl + amount >= waterGoal }));
    }
  }

  return (
    <main className={styles.page}>
      <UndoNotice action={undo} />
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <span>
            <Activity size={15} aria-hidden="true" />
            FITNESSHUB
          </span>

          <Sun size={22} aria-hidden="true" />
        </div>

        <p className={styles.date}>{currentDate}</p>

        <h1>Olá, {data.profile.name}</h1>

        <p className={styles.subtitle}>
          Acompanhe sua rotina, metas e progresso.
        </p>
        <div className={styles.dailyProgress}>
          <div className={styles.progressRing} style={{ background: `conic-gradient(#536440 ${totalItems ? completedCount / totalItems * 100 : 0}%, #c8d0bd 0)` }} aria-hidden="true"><span>{totalItems ? Math.round(completedCount / totalItems * 100) : 0}<small>%</small></span></div>
          <div><p>CONSISTÊNCIA DIÁRIA</p><strong>Mantenha o ritmo.</strong><span>{completedCount} de {totalItems} etapas obrigatórias concluídas</span></div>
        </div>
      </header>

      <section className={styles.summary} aria-label="Resumo do dia">
        <div className={styles.rhythm}><Flame aria-hidden="true" /><span>Sequência</span><strong>{daysInRow} <small>{daysInRow === 1 ? "dia" : "dias"}</small></strong></div>
        <div className={styles.workout}><Dumbbell aria-hidden="true" /><span>Treino</span><strong>{restDay ? "Descanso" : workoutDone ? "Feito!" : "Pendente"}</strong></div>
        <div className={styles.hydration}><Droplets aria-hidden="true" /><span>Água</span><strong>{waterProgress}<small>% da meta</small></strong></div>
      </section>

      {nextItem ? (
        <Card className={`${styles.nextAction} ${nextItem.id === WORKOUT_ID ? styles.nextActionTraining : ""}`} aria-labelledby="next-task-title">
          <div className={styles.nextActionHeading}>
            <span className={styles.nextActionIcon} aria-hidden="true">{nextItem.id === WORKOUT_ID ? <Dumbbell size={20} /> : <Utensils size={20} />}</span>
            <div>
              <p>Próxima tarefa</p>
              <h2 id="next-task-title">{nextItem.title}</h2>
            </div>
            <time>{nextItem.time}</time>
          </div>
          <p className={styles.nextActionEntries}>{nextItem.entries.join(" · ")}</p>
          <button type="button" className={styles.nextActionButton} onClick={() => toggleRoutineItem(nextItem)}>
            <Check size={18} aria-hidden="true" />
            Marcar como concluído
          </button>
        </Card>
      ) : (
        <Card className={styles.nextAction} aria-labelledby="next-task-title">
          <div className={styles.nextActionHeading}>
            <span className={styles.nextActionIcon} aria-hidden="true"><Check size={20} /></span>
            <div>
              <p>Próxima tarefa</p>
              <h2 id="next-task-title">{totalItems ? "Rotina obrigatória em dia" : "Sem etapas obrigatórias"}</h2>
            </div>
          </div>
          <p className={styles.nextActionEntries}>Dia cuidado, etapa por etapa. Muito bem!</p>
        </Card>
      )}

      <Card className={styles.water} aria-labelledby="water-title">
        <div className={styles.waterHeading}><span className={styles.waterIcon}><Droplets size={22} aria-hidden="true" /></span><div><h2 id="water-title">Hidratação</h2><p>Sua garrafa tem {number(bottleMl)} ml</p></div><Waves className={styles.waves} size={28} aria-hidden="true" /></div>
        <div className={styles.hydrationDisplay}>
          <div className={styles.bottleStage} role="progressbar" aria-label="Água consumida" aria-valuemin={0} aria-valuemax={waterGoal} aria-valuenow={Math.min(waterConsumedMl, waterGoal)} aria-valuetext={`${number(waterConsumedMl)} de ${number(waterGoal)} ml`}>
            <div className={styles.bottleCap} />
            <div className={styles.bottleBody} aria-hidden="true">
              <div className={styles.bottleLiquid} style={{ visibility: waterConsumedMl === 0 ? "hidden" : "visible", height: `${Math.min(100, waterConsumedMl / waterGoal * 100)}%` }}>
                <div key={waterFeedback.sequence} className={`${styles.liquidSurface} ${waterFeedback.sequence > 0 ? styles.liquidPouring : ""}`}>
                  <svg className={styles.liquidWaveBack} viewBox="0 0 240 32" preserveAspectRatio="none"><path d="M0 16 Q30 0 60 16 T120 16 T180 16 T240 16 V32 H0Z" /></svg>
                  <svg className={styles.liquidWaveFront} viewBox="0 0 240 32" preserveAspectRatio="none"><path d="M0 16 Q30 32 60 16 T120 16 T180 16 T240 16 V32 H0Z" /></svg>
                  {waterFeedback.sequence > 0 && <div className={styles.bubbles}><i /><i /><i /><i /><i /><i /></div>}
                </div>
              </div>
              <div className={styles.bottleGraduations}><span /><span /><span /><span /></div>
              <span className={styles.bottleEmblem}><Droplets size={25} strokeWidth={1.5} /></span>
              <span className={styles.bottleShine} />
            </div>
            <span className={styles.bottleShadow} />
          </div>
          <div className={styles.hydrationReadout} aria-live="polite">
            <span className={styles.hydrationLabel}>VOLUME DE HOJE</span>
            <strong>{number(waterConsumedMl)}<small> ml</small></strong>
            <p>de {number(waterGoal)} ml</p>
            <span className={styles.hydrationPercent}>{waterProgress}% <span>da meta</span></span>
            <p className={styles.hydrationRemaining}>{waterConsumedMl >= waterGoal ? "Meta completa. Bom trabalho!" : `Faltam ${number(waterGoal - waterConsumedMl)} ml. Continue no ritmo.`}</p>
          </div>
        </div>
        <p className={styles.bottleEquivalent}>{number(waterConsumedMl / bottleMl)} garrafas registradas <span>· {number(bottleMl)} ml cada</span></p>
        <div className={styles.waterActions}>
          <button type="button" onClick={() => addWater(-bottleMl)} disabled={waterConsumedMl === 0} className={styles.waterUndo} aria-label={"Retirar " + bottleMl + " ml"}>−</button>
          <button type="button" onClick={() => addWater(bottleMl)} disabled={waterConsumedMl >= 100000} className={styles.waterButton}>
            <Plus size={18} aria-hidden="true" />+1 garrafa · {number(bottleMl)} ml
            {waterFeedback.sequence > 0 && <span key={waterFeedback.sequence} className={styles.waterFeedback} aria-hidden="true">
              <span className={styles.waterRipple} />
              <span className={styles.waterSplash}><i /><i /><i /><i /><i /></span>
              <span className={styles.waterAdded}>+{number(waterFeedback.amount)} ml</span>
            </span>}
          </button>
        </div>
        {waterConsumedMl >= waterGoal && <p key={waterFeedback.sequence} className={`${styles.waterSuccess} ${waterFeedback.reachedGoal ? styles.goalCelebration : ""}`}><Check size={17} aria-hidden="true" /> Meta de hoje alcançada!</p>}

      </Card>

      <section aria-labelledby="routine-title" className={styles.routine}>
        <div className={styles.sectionHeading}>
          <div><p className={styles.kicker}>UM PASSO DE CADA VEZ</p><h2 id="routine-title">Seu dia</h2></div>
          <StatusPill tone={totalItems > 0 && completedCount === totalItems ? "green" : "slate"}>{completedCount} de {totalItems}</StatusPill>
        </div>
        <ol className={styles.timeline}>
          {day.routine.map((item) => {
            const completed = completedItems.has(item.id);
            const recorded = [...(day.activity ?? [])].reverse().find((event) => event.target === "routine:" + item.id);
            const isNext = nextItem?.id === item.id;
            const isWorkout = item.id === WORKOUT_ID;
            const Icon = isWorkout ? Dumbbell : Utensils;
            return (
              <li key={item.id} className={`${styles.timelineItem} ${isWorkout ? styles.training : ""} ${completed ? styles.completed : ""} ${isNext ? styles.next : ""}`}>
                <span className={styles.marker} aria-hidden="true">{completed ? <Check size={16} /> : <Icon size={16} />}</span>
                <label className={styles.routineLabel}>
                  <span className={styles.itemContent}>
                    <span className={styles.itemMeta}><time>{item.time}</time>{isNext && <span className={styles.nextBadge}>A seguir</span>}{isOptionalRoutine(item) && <span className={styles.nextBadge}>Opcional</span>}{completed && <span className={styles.doneText}>Concluído{recorded ? " às " + actionTime(recorded.at) : ""}</span>}</span>
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
        {totalItems > 0 && completedCount === totalItems && <p className={styles.allDone}>Dia cuidado, etapa por etapa. Muito bem!</p>}
      </section>

      <section className={styles.weight} aria-label="Último registro de peso"><span className={styles.weightIcon}><Scale size={20} aria-hidden="true" /></span><div><h2>Seu progresso</h2><p>Último registro de peso</p></div><strong>{lastWeight ? <>{number(lastWeight.kg)} <small>kg</small></> : <small>Sem registro</small>}</strong></section>
      <div className={styles.activitySection}><ActivityLog date={today} /></div>
      <p className={styles.footer}>Treino, nutrição e constância. Todos os dias.</p>
    </main>
  );
}
