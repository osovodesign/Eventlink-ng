import React from 'react';
import { Bookmark, Scale, Users, ArrowUpRight } from 'lucide-react';
import { ListingCardData } from '../../types/marketplace';
import { ListingMedia } from './listing-media';
import { AppLink } from '../../lib/router/router-context';
import { useSavedCompare } from '../../features/saved-items/saved-compare-context';

export interface ListingCardProps {
  listing: ListingCardData;
}

/**
 * ListingCard / VenueCard / ServiceProviderCard (PRD Section 8.4 VCARD-01–VCARD-07 & Component_Specifications.md Section 4.5)
 * - Uses restrained design, clear hierarchy, readable typography, and consistent 4:3 image crop.
 * - Renders metadata as clean, unboxed text with `·` separators (Zero-Pill discipline).
 * - Keeps Save and Compare actions as separate, non-nested interactive controls with accessible names and `aria-pressed`.
 * - Never fabricates ratings, reviews, verification badges, or live date availability.
 */
export function ListingCard({ listing }: ListingCardProps) {
  const { isSaved, isCompared, toggleSaveListing, toggleCompareListing } =
    useSavedCompare();

  const saved = isSaved(listing.id);
  const compared = isCompared(listing.id);
  const detailHref =
    listing.listingType === 'venue'
      ? `/venues/${listing.slug}`
      : `/vendors/${listing.slug}`;

  const settingLabel =
    listing.listingType === 'venue' &&
    listing.indoorOutdoor &&
    listing.indoorOutdoor !== 'not-specified'
      ? listing.indoorOutdoor === 'both'
        ? 'Indoor & outdoor'
        : listing.indoorOutdoor === 'indoor'
        ? 'Indoor'
        : 'Outdoor'
      : null;

  return (
    <article className="group flex flex-col justify-between rounded-[14px] border border-[#D7DEE8] bg-white overflow-hidden transition-colors hover:border-[#4778D8]">
      <div>
        {/* Primary Media Link */}
        <AppLink
          href={detailHref}
          aria-label={`View details for ${listing.title}`}
          className="block focus-visible:outline-offset-[-2px]"
        >
          <ListingMedia
            imageUrl={listing.coverImageUrl}
            altText={`${listing.title} in ${listing.locationLabel}`}
            listingType={listing.listingType}
            categoryLabel={listing.categoryLabel}
            aspectRatio="4:3"
          />
        </AppLink>

        {/* Card Body */}
        <div className="p-5 space-y-2.5">
          {/* Unboxed Metadata Kicker (Category · Location) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#697586]">
            <span>{listing.categoryLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{listing.locationLabel}</span>
            {settingLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{settingLabel}</span>
              </>
            )}
          </div>

          {/* Listing Title */}
          <h3 className="text-lg font-bold text-[#142B4A] leading-snug">
            <AppLink
              href={detailHref}
              className="hover:text-[#4778D8] transition-colors"
            >
              {listing.title}
            </AppLink>
          </h3>

          {/* Concise Headline */}
          <p className="text-sm text-[#344054] line-clamp-2 leading-relaxed">
            {listing.headline}
          </p>

          {/* Key Distinguishing Facts (Capacity / Amenities Preview) */}
          {(listing.capacityLabel || listing.amenitiesPreview.length > 0) && (
            <div className="pt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#344054]">
              {listing.capacityLabel && (
                <span className="inline-flex items-center gap-1 font-medium text-[#172B4D] tabular-nums">
                  <Users
                    className="h-3.5 w-3.5 text-[#4778D8] shrink-0"
                    aria-hidden="true"
                  />
                  {listing.capacityLabel}
                </span>
              )}
              {listing.capacityLabel &&
                listing.amenitiesPreview.length > 0 && (
                  <span aria-hidden="true" className="text-[#697586]">
                    ·
                  </span>
                )}
              {listing.amenitiesPreview.length > 0 && (
                <span className="text-[#697586] truncate">
                  {listing.amenitiesPreview.join(' · ')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Indicative Price + Non-Nested Actions */}
      <div className="px-5 py-3.5 border-t border-[#E9EDF3] bg-[#F4F6F9]/50 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] text-[#697586]">Indicative pricing</p>
          <p className="text-sm font-bold text-[#142B4A] tabular-nums">
            {listing.priceLabel}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Compare Toggle (Venues only per SAVE-02 / VCARD-07) */}
          {listing.listingType === 'venue' && (
            <button
              type="button"
              aria-pressed={compared}
              aria-label={
                compared
                  ? `Remove ${listing.title} from comparison`
                  : `Add ${listing.title} to comparison`
              }
              title={compared ? 'Remove from comparison' : 'Compare venue'}
              onClick={() => toggleCompareListing(listing.id, listing.title)}
              className={`inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                compared
                  ? 'border-[#4778D8] bg-[#EFF8FF] text-[#175CD3]'
                  : 'border-[#D7DEE8] bg-white text-[#344054] hover:bg-[#F4F6F9] hover:text-[#142B4A]'
              }`}
            >
              <Scale className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{compared ? 'Comparing' : 'Compare'}</span>
            </button>
          )}

          {/* Save Listing Button */}
          <button
            type="button"
            aria-pressed={saved}
            aria-label={
              saved
                ? `Remove ${listing.title} from saved listings`
                : `Save ${listing.title}`
            }
            title={saved ? 'Remove saved listing' : 'Save listing'}
            onClick={() => toggleSaveListing(listing.id, listing.title)}
            className={`inline-flex h-[38px] w-[38px] items-center justify-center rounded-[8px] border transition-colors cursor-pointer ${
              saved
                ? 'border-[#4778D8] bg-[#EFF8FF] text-[#175CD3]'
                : 'border-[#D7DEE8] bg-white text-[#344054] hover:bg-[#F4F6F9] hover:text-[#142B4A]'
            }`}
          >
            <Bookmark
              className={`h-4 w-4 ${saved ? 'fill-current' : ''}`}
              aria-hidden="true"
            />
          </button>

          {/* View Details Link */}
          <AppLink
            href={detailHref}
            aria-label={`Open ${listing.title}`}
            className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-[8px] bg-[#142B4A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1c3a63] transition-colors whitespace-nowrap shrink-0"
          >
            <span>View</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </AppLink>
        </div>
      </div>
    </article>
  );
}
