import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}

// The title row every screen opens with: one h1, one line about the data, at most one action.
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-7 text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-text">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
