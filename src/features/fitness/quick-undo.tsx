"use client";

import { useEffect, useState } from "react";
import type { FitnessData } from "./model";
import { saveFitness, useFitness } from "./store";
import styles from "./fitness.module.css";

export function useQuickUndo() {
  const { activeProfileId } = useFitness();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [entry, setEntry] = useState<{ id: number; profile: string; label: string; restore: (data: FitnessData) => FitnessData } | null>(null);
  const held = hovered || focused;
  useEffect(() => {
    if (!entry || held) return;
    const timer = window.setTimeout(() => setEntry((current) => current === entry ? null : current), 2000);
    return () => window.clearTimeout(timer);
  }, [entry, held]);
  return {
    id: entry?.id, held, setHovered, setFocused,
    message: entry?.profile === activeProfileId ? entry?.label : undefined,
    remember(label: string, restore: (data: FitnessData) => FitnessData) { setHovered(false); setFocused(false); setEntry({ id: Date.now(), profile: activeProfileId, label, restore }); },
    dismiss() { setEntry(null); setHovered(false); setFocused(false); },
    undo() { if (entry?.profile === activeProfileId && saveFitness(entry.restore)) { setEntry(null); setHovered(false); setFocused(false); } },
  };
}
export function UndoNotice({ action }: { action: ReturnType<typeof useQuickUndo> }) {
  if (!action.message) return null;
  return <div className={styles.undoNotice} onMouseEnter={() => action.setHovered(true)} onMouseLeave={() => action.setHovered(false)} onFocusCapture={() => action.setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) action.setFocused(false); }}>
    <span role="status">{action.message}</span><button type="button" onClick={action.undo}>Desfazer</button><button type="button" aria-label="Dispensar aviso" onClick={action.dismiss}>×</button>
    <i key={String(action.id) + String(action.held)} className={styles.undoCountdown} style={{ animationPlayState: action.held ? "paused" : "running" }} aria-hidden="true" />
  </div>;
}
