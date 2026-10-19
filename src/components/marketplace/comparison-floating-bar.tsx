import React from 'react';
import { Scale, X, ArrowRight } from 'lucide-react';
import { useSavedCompare } from '../../features/saved-items/saved-compare-context';
import { AppLink } from '../../lib/router/router-context';

/**
 * ComparisonFloatingBar (PRD Section 8.8 SAVE-02 & Component_Specifications.md Section 4.9)
 * Compact, accessible bar shown when 1–3 venues are selected for side-by-side comparison.
 */
export function ComparisonFloatingBar() {
  const { compareListingIds, clearComparison } = useSavedCompare();

  if (compareListingIds.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Selected venues for comparison"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] max-w-xl rounded-[14px] border border-[#142B4A] bg-[#142B4A] px-4 py-3 text-white shadow-lg flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-2.5 text-sm">
        <Scale className="h-4 w-4 text-[#4778D8] shrink-0" aria-hidden="true" />
        <span className="font-medium tabular-nums">
          {compareListingIds.length} of 3 venues selected for comparison
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => void clearComparison()}
          aria-label="Clear selected comparison venues"
          className="inline-flex min-h-[36px] items-center justify-center gap-1 rounded-[8px] px-2.5 py-1.5 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Clear</span>
        </button>
        <AppLink
          href="/compare"
          className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-[8px] bg-[#4778D8] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#3b67c0] transition-colors whitespace-nowrap"
        >
          <span>Compare venues</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </AppLink>
      </div>
    </div>
  );
}
