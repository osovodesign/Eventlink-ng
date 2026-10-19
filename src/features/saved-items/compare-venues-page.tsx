import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  GitCompareArrows,
  MapPin,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/page-container';
import { PageHeading } from '../../components/layout/page-heading';
import { ListingMedia } from '../../components/marketplace/listing-media';
import { Button } from '../../components/ui/button';
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../components/ui/feedback';
import { AppLink } from '../../lib/router/router-context';
import { getListingsByIdsForWorkspace } from '../../server/repositories/marketplace-repository';
import { ListingRecord } from '../../types/marketplace';
import { useSavedCompare } from './saved-compare-context';

function formatIndoorSetting(setting?: string | null): string {
  switch (setting) {
    case 'indoor':
      return 'Indoor only';
    case 'outdoor':
      return 'Outdoor only';
    case 'both':
      return 'Indoor & outdoor spaces';
    default:
      return 'Not specified';
  }
}

function formatCapacityRange(
  min?: number | null,
  max?: number | null
): string {
  if (min && max) {
    return `${min.toLocaleString()}–${max.toLocaleString()} guests`;
  }
  if (max) {
    return `Up to ${max.toLocaleString()} guests`;
  }
  if (min) {
    return `From ${min.toLocaleString()} guests`;
  }
  return 'Not specified';
}

export function CompareVenuesPage() {
  const { compareListingIds, toggleCompareListing, clearComparison } =
    useSavedCompare();

  const [venues, setVenues] = useState<ListingRecord[]>([]);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadComparisonVenues = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { availableListings, unavailableListingIds } =
        await getListingsByIdsForWorkspace(compareListingIds);
      setVenues(availableListings);
      setUnavailableIds(unavailableListingIds);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Could not load venue comparison details.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [compareListingIds]);

  useEffect(() => {
    void loadComparisonVenues();
  }, [loadComparisonVenues]);

  return (
    <PageContainer className="py-8 sm:py-10 space-y-8">
      <PageHeading
        kicker={`Side-by-side comparison (${compareListingIds.length}/3 venues)`}
        title="Compare Selected Event Venues"
        description="Evaluate capacity, NGN pricing, indoor/outdoor space settings, catering policies, and amenities side by side across Warri and Effurun."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {compareListingIds.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={clearComparison}
                leftIcon={<Trash2 className="h-3.5 w-3.5 text-[#B42318]" />}
              >
                Clear all
              </Button>
            )}
            <AppLink
              href="/search?type=venue"
              className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-[8px] bg-[#142B4A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1c3a63] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add more venues</span>
            </AppLink>
          </div>
        }
      />

      {/* Unavailable Compared Items Notice */}
      {unavailableIds.length > 0 && (
        <div className="rounded-[12px] border border-[#B54708]/30 bg-[#FFFAEB] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#B54708]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              {unavailableIds.length} compared{' '}
              {unavailableIds.length === 1 ? 'venue is' : 'venues are'} no
              longer publicly available.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unavailableIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleCompareListing(id)}
                className="rounded-[6px] border border-[#D7DEE8] bg-white px-2.5 py-1 font-semibold text-[#B42318] hover:underline cursor-pointer"
              >
                Remove ({id.slice(0, 10)})
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-96 w-full rounded-[14px]" />
        </div>
      ) : errorMessage ? (
        <ErrorState
          title="Could not load venue comparison"
          message={errorMessage}
          onRetry={loadComparisonVenues}
        />
      ) : venues.length === 0 ? (
        <EmptyState
          icon={<GitCompareArrows className="h-5 w-5" aria-hidden="true" />}
          title="No venues selected for comparison"
          description="Select up to 3 venues using the 'Compare' button on any venue card in Warri or Effurun to evaluate their capacity, pricing, and policies side by side."
          actionSlot={
            <AppLink
              href="/search?type=venue"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1c3a63] transition-colors"
            >
              Browse Event Venues
            </AppLink>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[#D7DEE8] bg-white shadow-xs">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#D7DEE8] bg-[#F4F6F9]/60">
                <th className="w-48 p-5 align-top text-xs font-bold uppercase tracking-wider text-[#697586]">
                  Venue attribute
                </th>
                {venues.map((v) => {
                  const detailHref = `/venues/${v.slug}`;
                  return (
                    <th key={v.id} className="p-5 align-top min-w-[240px]">
                      <div className="space-y-3">
                        <ListingMedia
                          imageUrl={v.coverImageUrl}
                          altText={v.name}
                          listingType="venue"
                          categoryLabel={v.venueType || 'Event Venue'}
                          aspectRatio="16:9"
                          className="rounded-[10px] border border-[#E9EDF3]"
                        />
                        <div className="space-y-1">
                          <AppLink
                            href={detailHref}
                            className="text-base font-bold text-[#142B4A] hover:text-[#4778D8] hover:underline block"
                          >
                            {v.name}
                          </AppLink>
                          <p className="text-xs font-normal text-[#475467] line-clamp-2">
                            {v.headline}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <AppLink
                            href={detailHref}
                            className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-[8px] bg-[#142B4A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1c3a63] transition-colors"
                          >
                            <span>View &amp; Enquire</span>
                            <ExternalLink className="h-3 w-3" />
                          </AppLink>
                          <button
                            type="button"
                            onClick={() => toggleCompareListing(v.id, v.name)}
                            className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-[8px] border border-[#D7DEE8] bg-white px-2.5 py-1.5 text-xs font-medium text-[#B42318] hover:bg-[#FEF3F2] transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EDF3]">
              {/* Price Display */}
              <tr>
                <th className="p-4 font-semibold text-[#142B4A] bg-[#F4F6F9]/40">
                  Displayed price (NGN)
                </th>
                {venues.map((v) => (
                  <td
                    key={v.id}
                    className="p-4 font-bold text-[#142B4A] tabular-nums"
                  >
                    {v.displayPriceText}
                  </td>
                ))}
              </tr>

              {/* City & Location */}
              <tr>
                <th className="p-4 font-semibold text-[#142B4A] bg-[#F4F6F9]/40">
                  Location &amp; address
                </th>
                {venues.map((v) => (
                  <td key={v.id} className="p-4 text-[#344054]">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-4 w-4 text-[#4778D8] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#172B4D] block">
                          {v.city}, Delta State
                        </span>
                        <span className="text-xs text-[#697586]">
                          {v.addressDisplay}
                        </span>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              {/* Guest Capacity */}
              <tr>
                <th className="p-4 font-semibold text-[#142B4A] bg-[#F4F6F9]/40">
                  Guest capacity
                </th>
                {venues.map((v) => (
                  <td
                    key={v.id}
                    className="p-4 font-semibold text-[#172B4D] tabular-nums"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-[#4778D8]" />
                      {formatCapacityRange(v.capacityMin, v.capacityMax)}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Space Setting */}
              <tr>
                <th className="p-4 font-semibold text-[#142B4A] bg-[#F4F6F9]/40">
                  Space setting
                </th>
                {venues.map((v) => (
                  <td key={v.id} className="p-4 text-[#344054]">
                    {formatIndoorSetting(v.indoorOutdoor)}
                  </td>
                ))}
              </tr>

              {/* Venue Type */}
              <tr>
                <th className="p-4 font-semibold text-[#142B4A] bg-[#F4F6F9]/40">
                  Venue type
                </th>
                {venues.map((v) => (
                  <td key={v.id} className="p-4 text-[#344054]">
                    {v.venueType || 'Event venue'}
                  </td>
                ))}
              </tr>

              {/* Catering Policy */}
              <tr>
                <th className="p-4 font-semibold text-[#142B4A] bg-[#F4F6F9]/40">
                  Catering policy
                </th>
                {venues.map((v) => (
                  <td key={v.id} className="p-4 text-xs text-[#344054]">
                    {v.cateringPolicy || 'Not provided — confirm with venue'}
                  </td>
                ))}
              </tr>

              {/* Decoration Policy */}
              <tr>
                <th className="p-4 font-semibold text-[#142B4A] bg-[#F4F6F9]/40">
                  Decoration policy
                </th>
                {venues.map((v) => (
                  <td key={v.id} className="p-4 text-xs text-[#344054]">
                    {v.decorationPolicy || 'Not provided — confirm with venue'}
                  </td>
                ))}
              </tr>

              {/* Alcohol Policy */}
              <tr>
                <th className="p-4 font-semibold text-[#142B4A] bg-[#F4F6F9]/40">
                  Alcohol &amp; corkage
                </th>
                {venues.map((v) => (
                  <td key={v.id} className="p-4 text-xs text-[#344054]">
                    {v.alcoholPolicy || 'Not provided — confirm with venue'}
                  </td>
                ))}
              </tr>

              {/* Amenities */}
              <tr>
                <th className="p-4 font-semibold text-[#142B4A] bg-[#F4F6F9]/40 align-top">
                  Amenities &amp; facilities
                </th>
                {venues.map((v) => (
                  <td key={v.id} className="p-4 align-top">
                    {v.amenities && v.amenities.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-[#344054]">
                        {v.amenities.map((amenity) => (
                          <li
                            key={amenity}
                            className="flex items-center gap-1.5"
                          >
                            <Check className="h-3.5 w-3.5 text-[#16794B] shrink-0" />
                            <span>{amenity}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-[#697586]">
                        Not provided
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
