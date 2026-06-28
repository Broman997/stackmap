type BadgeVariant = "green" | "amber" | "rose" | "indigo" | "slate";

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  active: "green",
  paid: "green",
  free: "indigo",
  trial: "amber",
  credits: "amber",
  unknown: "amber",
  inactive: "slate",
  paused: "slate",
  cancelled: "rose",
};

export function StatusBadge({ value }: { value: string }) {
  const variant = STATUS_VARIANTS[value] ?? "slate";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${BADGE_CLASSES[variant]}`}
    >
      {value}
    </span>
  );
}
