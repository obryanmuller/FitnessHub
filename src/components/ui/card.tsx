import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

type CardProps = ComponentPropsWithoutRef<"section">;

export function Card({ className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/80 bg-white/86 p-4 shadow-sm shadow-emerald-950/5 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
