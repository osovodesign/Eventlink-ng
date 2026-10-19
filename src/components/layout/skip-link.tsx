import React from 'react';

export interface SkipLinkProps {
  targetId?: string;
  label?: string;
}

/**
 * SkipLink (Component_Specifications.md Section 3.1 & 4.1)
 * Provides keyboard users a direct shortcut to the single <main> landmark.
 */
export function SkipLink({
  targetId = 'main-content',
  label = 'Skip to main content',
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-[10px] focus:bg-[#142B4A] focus:text-white focus:font-medium focus:text-sm focus:shadow-md"
    >
      {label}
    </a>
  );
}
