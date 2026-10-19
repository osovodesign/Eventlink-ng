import React from 'react';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * SectionHeader (Component_Specifications.md Section 3.1)
 * Ordered section heading (h2) with optional supporting copy and right-aligned action.
 */
export function SectionHeader({
  title,
  description,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="space-y-1 max-w-2xl">
        <h2 className="text-xl sm:text-2xl font-semibold text-[#142B4A] tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm sm:text-base text-[#344054]">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
