import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  note?: string;
  icon: LucideIcon;
  href?: string;
};

export function StatCard({ label, value, detail, note, icon: Icon, href }: StatCardProps) {
  const content = (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
          {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
          {note ? <p className="mt-1 text-xs text-slate-400">{note}</p> : null}
        </div>
        <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </section>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block transition hover:-translate-y-0.5 hover:shadow-md">
      {content}
    </Link>
  );
}
