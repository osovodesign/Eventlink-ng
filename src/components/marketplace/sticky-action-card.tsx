import React, { useState } from 'react';
import {
  Bookmark,
  CalendarClock,
  Check,
  ExternalLink,
  Flag,
  GitCompareArrows,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Share2,
} from 'lucide-react';
import { ListingRecord, PricingModel } from '../../types/marketplace';
import { PublicVendorProfileSummary } from '../../server/repositories/marketplace-repository';
import { Button } from '../ui/button';

export interface StickyActionCardProps {
  listing: ListingRecord;
  vendorSummary: PublicVendorProfileSummary | null;
  isSaved: boolean;
  isCompared: boolean;
  onToggleSave: () => void;
  onToggleCompare: () => void;
  onOpenEnquiry: () => void;
  onShareListing: () => Promise<void> | void;
  onOpenReport: () => void;
}

function getPricingModelDescriptor(model: PricingModel): string {
  switch (model) {
    case 'fixed':
      return 'Fixed rate';
    case 'starting-at':
      return 'Starting price';
    case 'range':
      return 'Indicative price range';
    case 'custom-quote':
      return 'Custom event quote';
    case 'not-provided':
    default:
      return 'Price upon enquiry';
  }
}

/**
 * Validates that an external website URL uses a safe http: or https: scheme
 * (Security_and_Permissions.md Section 11).
 */
export function getSafeExternalHref(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * StickyActionCard (Component_Specifications.md Section 4.10 & Build_Plan.md Phase 6)
 * - Displays honest pricing (`displayPriceText`, never `₦0` or `"Free"`).
 * - Explicitly states `"Date availability: Contact vendor to confirm"` (never implies instant booking).
 * - Provides primary Enquiry CTA, Save/Compare toggles, Canonical Share action, and Report trigger.
 */
export function StickyActionCard({
  listing,
  vendorSummary,
  isSaved,
  isCompared,
  onToggleSave,
  onToggleCompare,
  onOpenEnquiry,
  onShareListing,
  onOpenReport,
}: StickyActionCardProps) {
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  const handleShareClick = async () => {
    await onShareListing();
    setCopiedJustNow(true);
    window.setTimeout(() => setCopiedJustNow(false), 2500);
  };

  const safeWebsiteHref = getSafeExternalHref(vendorSummary?.websiteUrl);
  const showPublicContact =
    listing.contactVisibility === 'public' &&
    Boolean(
      vendorSummary?.publicPhone ||
        vendorSummary?.publicEmail ||
        vendorSummary?.whatsappNumber ||
        safeWebsiteHref
    );

  return (
    <aside
      aria-label="Listing evaluation and enquiry actions"
      className="rounded-[20px] border border-[#D7DEE8] bg-white p-6 shadow-xs space-y-5 lg:sticky lg:top-24"
    >
      {/* Price Summary Header */}
      <div className="border-b border-[#E9EDF3] pb-4 space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
          {getPricingModelDescriptor(listing.pricingModel)}
        </span>
        <div className="text-2xl font-bold text-[#142B4A] tabular-nums">
          {listing.displayPriceText || 'Contact for pricing'}
        </div>
        <p className="text-xs text-[#697586]">
          All figures in Nigerian Naira (NGN). Final pricing depends on your event date, guest count, and requirements.
        </p>
      </div>

      {/* Honest Availability & Location Facts */}
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-3 rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-3">
          <CalendarClock
            className="h-4 w-4 text-[#4778D8] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[#142B4A]">
              Date availability
            </p>
            <p className="text-xs text-[#344054]">
              Contact vendor to confirm your preferred event date.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 px-1">
          <MapPin
            className="h-4 w-4 text-[#697586] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="space-y-0.5 text-xs">
            <p className="font-semibold text-[#172B4D]">
              {listing.addressDisplay}
            </p>
            <p className="text-[#697586]">
              Serves: {(listing.serviceAreas || [listing.city]).join(', ')}, Delta State
            </p>
          </div>
        </div>
      </div>

      {/* Primary Enquiry Action */}
      <div className="space-y-2.5">
        {listing.acceptsEnquiries ? (
          <Button
            variant="primary"
            className="w-full"
            onClick={onOpenEnquiry}
            leftIcon={<MessageSquare className="h-4 w-4" />}
          >
            Send Enquiry / Request Quote
          </Button>
        ) : (
          <div className="rounded-[10px] border border-[#F5D08A] bg-[#FEF4E6] p-3 text-xs text-[#8F4E00]">
            This listing is not currently accepting new online enquiries.
          </div>
        )}

        {/* Secondary Shortlist / Compare / Share Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleSave}
            aria-pressed={isSaved}
            leftIcon={
              <Bookmark
                className={`h-4 w-4 ${
                  isSaved ? 'fill-[#4778D8] text-[#4778D8]' : ''
                }`}
              />
            }
          >
            {isSaved ? 'Saved' : 'Save'}
          </Button>

          {listing.listingType === 'venue' ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleCompare}
              aria-pressed={isCompared}
              leftIcon={
                <GitCompareArrows
                  className={`h-4 w-4 ${
                    isCompared ? 'text-[#4778D8]' : ''
                  }`}
                />
              }
            >
              {isCompared ? 'Comparing' : 'Compare'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShareClick}
              leftIcon={
                copiedJustNow ? (
                  <Check className="h-4 w-4 text-[#146C43]" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )
              }
            >
              {copiedJustNow ? 'Link copied' : 'Share'}
            </Button>
          )}
        </div>

        {listing.listingType === 'venue' && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleShareClick}
            leftIcon={
              copiedJustNow ? (
                <Check className="h-4 w-4 text-[#146C43]" />
              ) : (
                <Share2 className="h-4 w-4" />
              )
            }
          >
            {copiedJustNow ? 'Canonical link copied' : 'Copy shareable link'}
          </Button>
        )}
      </div>

      {/* Contact Visibility Section */}
      <div className="border-t border-[#E9EDF3] pt-4 space-y-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
          Contact Channels
        </h3>

        {showPublicContact ? (
          <ul className="space-y-2 text-xs text-[#344054]">
            {vendorSummary?.publicPhone && (
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#4778D8]" aria-hidden="true" />
                <a
                  href={`tel:${vendorSummary.publicPhone.replace(/\s+/g, '')}`}
                  className="font-medium text-[#142B4A] hover:underline"
                >
                  {vendorSummary.publicPhone}
                </a>
              </li>
            )}
            {vendorSummary?.publicEmail && (
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#4778D8]" aria-hidden="true" />
                <a
                  href={`mailto:${vendorSummary.publicEmail}`}
                  className="font-medium text-[#142B4A] hover:underline break-all"
                >
                  {vendorSummary.publicEmail}
                </a>
              </li>
            )}
            {safeWebsiteHref && (
              <li className="flex items-center gap-2">
                <ExternalLink
                  className="h-3.5 w-3.5 text-[#4778D8]"
                  aria-hidden="true"
                />
                <a
                  href={safeWebsiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#142B4A] hover:underline"
                >
                  Visit business website
                </a>
              </li>
            )}
          </ul>
        ) : (
          <div className="flex items-start gap-2.5 text-xs text-[#697586]">
            <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Direct phone and email contact details are shared once the vendor responds to your EventLink enquiry.
            </p>
          </div>
        )}
      </div>

      {/* Report Listing Trigger */}
      <div className="border-t border-[#E9EDF3] pt-3 flex items-center justify-between">
        <span className="text-[11px] text-[#697586]">
          Notice inaccurate details?
        </span>
        <button
          type="button"
          onClick={onOpenReport}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#697586] hover:text-[#B42318] transition-colors cursor-pointer"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Report listing</span>
        </button>
      </div>
    </aside>
  );
}
