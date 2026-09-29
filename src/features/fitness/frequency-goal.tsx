"use client";

import { useState } from "react";
import { Check, CalendarDays } from "lucide-react";
import { monthlyWorkoutFrequency, setWorkoutTarget, workoutTarget, weekStart } from "./model";
import { saveFitness, useFitness } from "./store";
import styles from "./fitness.module.css";
import calendar from "./frequency-goal.module.css";

export function FrequencyGoal() {
  const { data, today } = useFitness();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [notice, setNotice] = useState("");
  const target = workoutTarget(data, today);
  const result = monthlyWorkoutFrequency(data, month, today);
  const currentWeek = monthlyWorkoutFrequency(data, today.slice(0, 7), today).weeks.find((week) => week.start === weekStart(today));
  const offset = result.days.length ? (new Date(result.days[0].date + "T12:00:00").getDay() + 6) % 7 : 0;
  return <section className={calendar.panel} aria-labelledby="frequency-title">
    <div className={styles.sectionHeading}><h2 id="frequency-title">Frequência de treino</h2><CalendarDays size={21} aria-hidden="true" /></div>
    <p className={styles.description}>{target ? (currentWeek?.done ?? 0) + " de " + target + " treinos nesta semana" : "Defina quantos dias pretende treinar por semana."}</p>
    <form key={target ?? "unset"} className={calendar.goalForm} onSubmit={(event) => {
      event.preventDefault();
      const value = Number(new FormData(event.currentTarget).get("target"));
      if (value < 1 || value > 7 || !Number.isInteger(value)) return;
      if (saveFitness((current) => setWorkoutTarget(current, today, value))) setNotice("Meta salva para esta semana e as próximas. Semanas anteriores foram preservadas.");
    }}><label>Treinos por semana<select name="target" defaultValue={target ?? 3}>{[1,2,3,4,5,6,7].map((value) => <option key={value} value={value}>{value} {value === 1 ? "dia" : "dias"}</option>)}</select></label><button className={styles.primary} type="submit">Salvar meta semanal</button></form>
    <p className={styles.hint}>Cada dia com treino concluído conta uma vez. A meta entra em vigor na semana atual.</p>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    <label>Mês do acompanhamento<input type="month" min="1900-01" max={today.slice(0,7)} value={month} onChange={(event) => setMonth(event.target.value)} /></label>
    {result.days.length > 0 ? <>
      <p className={styles.hint}>{result.days.filter((day) => day.done).length} dias de treino concluído neste mês. ✓ = treino registrado.</p>
      <div className={calendar.calendar} role="group" aria-label="Calendário de treinos">
        {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((day) => <span key={day} className={calendar.weekday} aria-hidden="true">{day}</span>)}
        {result.days.map((day, index) => <span key={day.date} style={index === 0 ? { gridColumnStart: offset + 1 } : undefined} className={[calendar.day, day.done ? calendar.done : "", day.date > today ? calendar.future : ""].join(" ")} aria-label={day.date.split("-").reverse().join("/") + (day.done ? ": treino concluído" : day.date > today ? ": dia futuro" : ": sem treino registrado")}><span>{Number(day.date.slice(-2))}</span>{day.done && <Check size={13} aria-hidden="true" />}</span>)}
      </div>
      <p className={styles.hint}>Semanas vão de segunda a domingo e podem incluir dias do mês vizinho. Semanas em andamento ainda não são avaliadas como encerradas.</p>
      <ul className={calendar.weeks}>{result.weeks.map((week) => <li key={week.start}><span>{week.start.slice(8)}{"/"}{week.start.slice(5,7)} – {week.end.slice(8)}{"/"}{week.end.slice(5,7)}</span><strong>{week.done}{week.target ? "/" + week.target : ""} treinos</strong><span>{week.start > today ? "A começar" : !week.target ? "Sem meta definida" : week.done >= week.target ? "Meta atingida" : week.closed ? "Abaixo da meta" : "Em andamento"}</span></li>)}</ul>
    </> : <p role="status">Selecione um mês válido.</p>}
  </section>;
}
