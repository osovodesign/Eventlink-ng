import React from 'react';
import { ChevronRight } from 'lucide-react';
import { AppLink } from '../../lib/router/router-context';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: ReadonlyArray<BreadcrumbItem>;
  className?: string;
}

/**
 * Breadcrumbs (Component_Specifications.md Section 3.1)
 * Shows hierarchy and allows keyboard/click navigation to parent pages.
 */
export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`py-2 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[#697586]">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 text-[#697586] shrink-0"
                  aria-hidden="true"
                />
              )}
              {item.href && !isLast ? (
                <AppLink
                  href={item.href}
                  className="hover:text-[#142B4A] hover:underline transition-colors"
                >
                  {item.label}
                </AppLink>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'font-medium text-[#172B4D]' : ''}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
