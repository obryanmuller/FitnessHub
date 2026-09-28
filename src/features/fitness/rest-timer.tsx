"use client";

import { createContext, useContext, useEffect, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import styles from "./fitness.module.css";

type TimerState = { duration: number; remaining: number; deadline: number | null; setDuration: Dispatch<SetStateAction<number>>; setRemaining: Dispatch<SetStateAction<number>>; setDeadline: Dispatch<SetStateAction<number | null>> };
const TimerContext = createContext<TimerState | null>(null);

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [deadline, setDeadline] = useState<number | null>(null);
  useEffect(() => {
    if (deadline === null) return;
    function tick() {
      const seconds = Math.max(0, Math.ceil((deadline! - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) setDeadline(null);
    }
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [deadline]);
  return <TimerContext.Provider value={{ duration, remaining, deadline, setDuration, setRemaining, setDeadline }}>{children}</TimerContext.Provider>;
}

export function RestTimer() {
  const timer = useContext(TimerContext);
  if (!timer) return null;
  const { duration, remaining, deadline, setDuration, setRemaining, setDeadline } = timer;
  return <section className={styles.restTimer} aria-label="Cronômetro de descanso">
    <div><h2>Descanso entre séries</h2><p className={styles.hint}>Escolha seu intervalo. O contador continua ao navegar pelo app.</p></div>
    <output aria-live="off" className={styles.timerDigits} aria-label="Tempo restante">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</output>
    <div className={styles.actions}>{[30, 60, 90, 120].map((seconds) => <button className={styles.secondary} aria-pressed={duration === seconds} key={seconds} type="button" onClick={() => { setDuration(seconds); setRemaining(seconds); setDeadline(null); }}>{seconds}s</button>)}</div>
    <div className={styles.actions}><button type="button" className={styles.primary} onClick={() => {
      if (deadline !== null) { setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))); setDeadline(null); }
      else { const seconds = remaining || duration; setRemaining(seconds); setDeadline(Date.now() + seconds * 1000); }
    }}>{deadline !== null ? "Pausar" : remaining === 0 ? "Repetir" : "Iniciar / continuar"}</button><button className={styles.secondary} type="button" onClick={() => { setDeadline(null); setRemaining(duration); }}>Reiniciar</button></div>
    <p role="status" className={styles.notice}>{remaining === 0 ? "Intervalo concluído. Pronto para a próxima série." : ""}</p>
  </section>;
}
