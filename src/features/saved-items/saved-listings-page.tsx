import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Bookmark,
  GitCompareArrows,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/page-container';
import { PageHeading } from '../../components/layout/page-heading';
import { ListingCard } from '../../components/marketplace/listing-card';
import { ComparisonFloatingBar } from '../../components/marketplace/comparison-floating-bar';
import { Button } from '../../components/ui/button';
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../components/ui/feedback';
import { AppLink } from '../../lib/router/router-context';
import { toListingCardData } from '../../lib/validation/marketplace-schemas';
import { getListingsByIdsForWorkspace } from '../../server/repositories/marketplace-repository';
import { ListingCardData } from '../../types/marketplace';
import { useSavedCompare } from './saved-compare-context';

type SavedFilter = 'all' | 'venue' | 'service-provider';

export function SavedListingsPage() {
  const { savedListingIds, compareListingIds, toggleSaveListing } =
    useSavedCompare();

  const [availableCards, setAvailableCards] = useState<ListingCardData[]>([]);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<SavedFilter>('all');

  const loadSavedListings = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { availableListings, unavailableListingIds } =
        await getListingsByIdsForWorkspace(savedListingIds);
      setAvailableCards(availableListings.map(toListingCardData));
      setUnavailableIds(unavailableListingIds);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not load your saved listings right now.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [savedListingIds]);

  useEffect(() => {
    void loadSavedListings();
  }, [loadSavedListings]);

  const filteredCards = availableCards.filter((card) => {
    if (filter === 'venue') return card.listingType === 'venue';
    if (filter === 'service-provider')
      return card.listingType === 'service-provider';
    return true;
  });

  return (
    <div className="pb-24">
      <PageContainer className="py-8 sm:py-10 space-y-8">
        <PageHeading
          kicker="Customer shortlist"
          title="Saved Venues & Service Providers"
          description="Keep track of Warri and Effurun venues and event professionals you are considering, compare up to 3 venues side by side, or jump straight to sending an enquiry."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadSavedListings}
                leftIcon={<RotateCcw className="h-4 w-4" />}
              >
                Refresh
              </Button>
              {compareListingIds.length > 0 && (
                <AppLink
                  href="/compare"
                  className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-[8px] border border-[#D7DEE8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#142B4A] hover:bg-[#F4F6F9] transition-colors"
                >
                  <GitCompareArrows className="h-3.5 w-3.5 text-[#4778D8]" />
                  <span>Compare venues ({compareListingIds.length}/3)</span>
                </AppLink>
              )}
              <AppLink
                href="/search"
                className="inline-flex min-h-[36px] items-center justify-center rounded-[8px] bg-[#142B4A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1c3a63] transition-colors"
              >
                Explore more listings
              </AppLink>
            </div>
          }
        />

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#D7DEE8] pb-3">
          {(
            [
              { id: 'all', label: `All saved (${availableCards.length})` },
              {
                id: 'venue',
                label: `Venues (${
                  availableCards.filter((c) => c.listingType === 'venue').length
                })`,
              },
              {
                id: 'service-provider',
                label: `Service providers (${
                  availableCards.filter(
                    (c) => c.listingType === 'service-provider'
                  ).length
                })`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-[8px] px-3.5 py-2 text-xs font-semibold border transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'border-[#142B4A] bg-[#142B4A] text-white'
                  : 'border-[#D7DEE8] bg-white text-[#344054] hover:bg-[#F4F6F9]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Unavailable / Unpublished Saved Listings Notice */}
        {unavailableIds.length > 0 && (
          <div className="rounded-[12px] border border-[#B54708]/30 bg-[#FFFAEB] p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-[#B54708]">
              <AlertTriangle
                className="h-4 w-4 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  {unavailableIds.length}{' '}
                  {unavailableIds.length === 1
                    ? 'saved listing is'
                    : 'saved listings are'}{' '}
                  no longer publicly available
                </p>
                <p className="text-[#344054] mt-0.5">
                  The vendor may have archived or unpublished these listings. You can remove them from your shortlist below.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {unavailableIds.map((id) => (
                <div
                  key={id}
                  className="inline-flex items-center gap-2 rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-xs text-[#344054]"
                >
                  <span className="font-mono text-[#697586]">
                    Listing ID: {id.slice(0, 14)}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSaveListing(id)}
                    className="inline-flex items-center gap-1 font-semibold text-[#B42318] hover:underline cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Remove</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Listings Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-80 w-full rounded-[14px]" />
            <Skeleton className="h-80 w-full rounded-[14px]" />
            <Skeleton className="h-80 w-full rounded-[14px]" />
          </div>
        ) : errorMessage ? (
          <ErrorState
            title="Unable to load saved listings"
            message={errorMessage}
            onRetry={loadSavedListings}
          />
        ) : filteredCards.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-5 w-5" aria-hidden="true" />}
            title={
              savedListingIds.length === 0
                ? 'Your saved shortlist is empty'
                : 'No saved listings match this filter'
            }
            description="Click the 'Save' button on any venue or event service provider card across Warri and Effurun to build your event shortlist."
            actionSlot={
              <AppLink
                href="/search"
                className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1c3a63] transition-colors"
              >
                Explore venues &amp; services
              </AppLink>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card) => (
              <ListingCard key={card.id} listing={card} />
            ))}
          </div>
        )}
      </PageContainer>

      <ComparisonFloatingBar />
    </div>
  );
}
