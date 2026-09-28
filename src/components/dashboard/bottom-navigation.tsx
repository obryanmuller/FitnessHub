"use client";

import { Activity, ArrowUpRight, Dumbbell, Home, LineChart, UserRound, Utensils } from "lucide-react";
import type { NavigationItem } from "@/types/navigation";
import styles from "./navigation.module.css";

const iconMap = { home: Home, meals: Utensils, workouts: Dumbbell, progress: LineChart, profile: UserRound } satisfies Record<NavigationItem["icon"], typeof Activity>;

export function BottomNavigation({ items }: { items: NavigationItem[] }) {
  return (
    <nav aria-label="Navegação principal" className={styles.navigation}>
      <a href="#hoje" className={styles.brand} aria-label="FitnessHub — início"><span><Activity size={24} aria-hidden="true" /></span>fitnesshub<span className={styles.brandDot}>.</span></a>
      <p className={styles.caption}>SEU PAINEL DE EVOLUÇÃO</p>
      <ul className={styles.items}>
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          return <li key={item.href}><a href={item.disabled ? undefined : item.href} aria-current={item.active ? "page" : undefined} aria-disabled={item.disabled} className={styles.link}><Icon size={21} aria-hidden="true" strokeWidth={item.active ? 2.2 : 1.7} /><span>{item.label}</span>{item.active && <span className={styles.activeDot} />}</a></li>;
        })}
      </ul>
      <div className={styles.note}><ArrowUpRight size={24} aria-hidden="true" /><p>Foco na rotina.<br /><em>Evolução constante.</em></p><span>Seu próximo passo começa hoje.</span></div>
    </nav>
  );
}
