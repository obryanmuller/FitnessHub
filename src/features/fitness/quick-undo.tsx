"use client";

import { useState } from "react";
import type { FitnessData } from "./model";
import { saveFitness, useFitness } from "./store";
import styles from "./fitness.module.css";

export function useQuickUndo() {
  const { activeProfileId } = useFitness();
  const [entry, setEntry] = useState<{ profile: string | null; label: string; restore: (data: FitnessData) => FitnessData } | null>(null);
  return {
    message: entry?.profile === activeProfileId ? entry?.label : undefined,
    remember(label: string, restore: (data: FitnessData) => FitnessData) { setEntry({ profile: activeProfileId, label, restore }); },
    dismiss() { setEntry(null); },
    undo() { if (entry?.profile === activeProfileId && saveFitness(entry.restore)) setEntry(null); },
  };
}
export function UndoNotice({ action }: { action: ReturnType<typeof useQuickUndo> }) {
  if (!action.message) return null;
  return <div className={styles.undoNotice}><span role="status">{action.message}</span><button type="button" onClick={action.undo}>Desfazer</button><button type="button" aria-label="Dispensar aviso" onClick={action.dismiss}>×</button></div>;
}
