import React from 'react';
import { ListingCardData } from '../../types/marketplace';
import { ListingCard } from './listing-card';
import { Skeleton, EmptyState, ErrorState } from '../ui/feedback';

export interface ListingGridProps {
  listings: ReadonlyArray<ListingCardData>;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptyActionSlot?: React.ReactNode;
}

/**
 * ListingGrid (Component_Specifications.md Section 3.2 & Design_System.md Section 5)
 * Responsive 1/2/3-column grid with geometry-matching loading skeletons, empty state, and error state.
 */
export function ListingGrid({
  listings,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = 'No listings match these filters',
  emptyDescription = 'Try expanding your search to both Warri and Effurun or clearing an active filter.',
  emptyActionLabel,
  onEmptyAction,
  emptyActionSlot,
}: ListingGridProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading listings"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-[14px] border border-[#D7DEE8] bg-white overflow-hidden"
          >
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="px-5 py-3.5 border-t border-[#E9EDF3] flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load listings"
        message={error}
        onRetry={onRetry}
      />
    );
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        actionSlot={emptyActionSlot}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((item) => (
        <ListingCard key={item.id} listing={item} />
      ))}
    </div>
  );
}
