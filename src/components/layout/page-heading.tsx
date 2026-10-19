import React from 'react';

export interface PageHeadingProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  kicker?: string;
}

/**
 * PageHeading (Component_Specifications.md Section 3.1)
 * Enforces single main page heading (h1) with optional quiet kicker, supporting description, and actions.
 */
export function PageHeading({
  title,
  description,
  actions,
  kicker,
}: PageHeadingProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-[#E9EDF3]">
      <div className="space-y-2 max-w-2xl">
        {kicker && (
          <p className="text-xs font-medium text-[#697586]">{kicker}</p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-base text-[#344054] leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">{actions}</div>
      )}
    </div>
  );
}
