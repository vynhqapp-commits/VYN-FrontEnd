"use client";

import { cn } from "@/lib/utils";

type DashboardPageHeaderProps = {
  title: string;
  description?: string;
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
};

export default function DashboardPageHeader({
  title,
  description,
  icon,
  rightSlot,
  className,
}: DashboardPageHeaderProps) {
  return (
    <div
      className={cn(
        "elite-panel rounded-2xl px-4 sm:px-5 py-3",
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        className,
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-full bg-[var(--elite-orange-dim)] border border-[var(--elite-border-2)] flex items-center justify-center shrink-0">
          <span className="text-[var(--elite-orange)]">{icon}</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold elite-title leading-tight">{title}</h1>
          {description ? <p className="elite-subtle text-sm mt-1">{description}</p> : null}
        </div>
      </div>
      {rightSlot ? <div className="sm:ml-6 shrink-0">{rightSlot}</div> : null}
    </div>
  );
}
