import { cn } from "@/lib/cn";

type StatusPillProps = {
  children: React.ReactNode;
  tone?: "green" | "amber" | "slate";
};

const toneClasses: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  slate: "bg-slate-100 text-slate-700",
};

export function StatusPill({ children, tone = "slate" }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
