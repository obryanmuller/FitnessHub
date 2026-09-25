"use client";

import { Activity, Dumbbell, Home, LineChart, UserRound, Utensils } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavigationItem } from "@/types/navigation";

const iconMap = { home: Home, meals: Utensils, workouts: Dumbbell, progress: LineChart, profile: UserRound } satisfies Record<NavigationItem["icon"], typeof Activity>;
type BottomNavigationProps = { items: NavigationItem[] };

export function BottomNavigation({ items }: BottomNavigationProps) {
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[560px] rounded-t-[26px] border border-[#e6eade] bg-[#fcfdf9]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-4px_24px_rgba(35,62,44,0.035)] backdrop-blur-xl">
      <ul className="grid grid-cols-5 gap-0.5">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <li key={item.label}>
              <a href={item.disabled ? undefined : item.href} aria-current={item.active ? "page" : undefined} aria-disabled={item.disabled} className={cn("group flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-0.5 text-[10px] font-medium transition active:scale-95 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700", item.active ? "text-[#365c43]" : "text-[#788274]", item.disabled && "cursor-not-allowed")}>
                <span className={cn("flex h-8 w-12 items-center justify-center rounded-xl transition motion-reduce:transition-none", item.active ? "bg-[#e5eddc]" : "group-hover:bg-[#eff2e8]")}><Icon aria-hidden="true" className="h-[19px] w-[19px]" strokeWidth={item.active ? 2.3 : 1.7} /></span>
                <span className="leading-none">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
