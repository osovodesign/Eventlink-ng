/**
 * Synchronized Validation Schemas & Lifecycle State Machines
 * Enforces volumetric boundaries, regex patterns, and enum rules from firebase-blueprint.json
 * and firestore.rules before any database mutation executes.
 */

import {
  EnquiryStatus,
  LaunchCity,
  ListingCardData,
  ListingRecord,
  ModerationStatus,
  PricingModel,
  PublicationStatus,
  QuoteStatus,
} from '../../types/marketplace';
import { LAUNCH_CATEGORIES, formatMinorCurrency } from '../config/env';

export const SCHEMA_LIMITS = {
  ID_MAX: 128,
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  SLUG_MIN: 2,
  SLUG_MAX: 140,
  SLUG_REGEX: /^[a-z0-9\-]+$/,
  NAME_MIN: 2,
  NAME_MAX: 120,
  HEADLINE_MIN: 4,
  HEADLINE_MAX: 160,
  DESCRIPTION_MIN: 10,
  DESCRIPTION_MAX: 3000,
  ORG_DESCRIPTION_MAX: 2000,
  ADDRESS_MIN: 2,
  ADDRESS_MAX: 200,
  SERVICE_AREAS_MAX: 10,
  AMENITIES_MAX: 20,
  COMPARISON_MAX_ITEMS: 3,
  ENQUIRY_SUBJECT_MIN: 2,
  ENQUIRY_SUBJECT_MAX: 160,
  ENQUIRY_MESSAGE_MIN: 10,
  ENQUIRY_MESSAGE_MAX: 3000,
  QUOTE_SUMMARY_MIN: 2,
  QUOTE_SUMMARY_MAX: 2000,
} as const;

export function normalizeSlug(raw: string): string {
  const slug = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SCHEMA_LIMITS.SLUG_MAX);
  return slug.length >= SCHEMA_LIMITS.SLUG_MIN ? slug : `item-${Date.now()}`;
}

export function buildDisplayPriceText(
  pricingModel: PricingModel,
  minAmountMinor?: number | null,
  maxAmountMinor?: number | null
): string {
  if (pricingModel === 'not-provided' || pricingModel === 'custom-quote') {
    return 'Contact for pricing';
  }
  if (minAmountMinor === null || minAmountMinor === undefined) {
    return 'Contact for pricing';
  }
  const formattedMin = formatMinorCurrency(minAmountMinor);
  if (pricingModel === 'fixed') {
    return formattedMin;
  }
  if (
    pricingModel === 'range' &&
    maxAmountMinor !== null &&
    maxAmountMinor !== undefined &&
    maxAmountMinor > minAmountMinor
  ) {
    return `${formattedMin} – ${formatMinorCurrency(maxAmountMinor)}`;
  }
  return `From ${formattedMin}`;
}

/**
 * Listing Lifecycle State Machine (TRD Section 7 & Database_Schema.md Section 11)
 * Vendors can never transition a listing directly to 'published' or 'approved'.
 */
export function isValidListingTransition(
  currentPub: PublicationStatus,
  nextPub: PublicationStatus,
  nextMod: ModerationStatus,
  actorRole: 'vendor' | 'admin'
): { valid: boolean; reason?: string } {
  if (actorRole === 'vendor') {
    if (nextPub === 'published' || nextMod === 'approved') {
      return {
        valid: false,
        reason: 'Vendors cannot self-publish or self-approve a listing.',
      };
    }
    const allowedVendorPub: PublicationStatus[] = [
      'draft',
      'pending_review',
      'archived',
    ];
    const allowedVendorMod: ModerationStatus[] = ['not_submitted', 'pending'];
    if (
      !allowedVendorPub.includes(nextPub) ||
      !allowedVendorMod.includes(nextMod)
    ) {
      return {
        valid: false,
        reason: `Invalid vendor listing transition from ${currentPub} to ${nextPub}.`,
      };
    }
    return { valid: true };
  }

  // Admin moderation transitions
  if (nextPub === 'published' && nextMod !== 'approved') {
    return {
      valid: false,
      reason: 'A listing can only be published when moderationStatus is approved.',
    };
  }
  return { valid: true };
}

/**
 * Enquiry Lifecycle State Machine (Database_Schema.md Section 11)
 * Terminal states ('closed', 'cancelled') are locked for non-admins.
 */
export function isValidEnquiryTransition(
  currentStatus: EnquiryStatus,
  nextStatus: EnquiryStatus,
  actorRole: 'customer' | 'vendor' | 'admin'
): { valid: boolean; reason?: string } {
  if (actorRole === 'admin') {
    return { valid: true };
  }
  if (currentStatus === 'closed' || currentStatus === 'cancelled') {
    return {
      valid: false,
      reason: `Enquiry is already ${currentStatus} and cannot be modified.`,
    };
  }
  if (actorRole === 'vendor') {
    if (['viewed', 'responded', 'closed'].includes(nextStatus)) {
      return { valid: true };
    }
    return {
      valid: false,
      reason: `Vendor cannot set enquiry status to ${nextStatus}.`,
    };
  }
  if (actorRole === 'customer') {
    if (['cancelled', 'closed'].includes(nextStatus)) {
      return { valid: true };
    }
    return {
      valid: false,
      reason: `Customer cannot set enquiry status to ${nextStatus}.`,
    };
  }
  return { valid: false, reason: 'Unauthorized actor role.' };
}

/**
 * Quote Lifecycle & Total Calculation Validator (Database_Schema.md Section 6.13)
 */
export function validateAndComputeQuoteTotals(
  subtotalMinor: number,
  discountMinor: number
): { valid: boolean; totalMinor: number; error?: string } {
  if (!Number.isInteger(subtotalMinor) || subtotalMinor < 0) {
    return {
      valid: false,
      totalMinor: 0,
      error: 'Subtotal must be a non-negative integer in minor units (kobo).',
    };
  }
  if (!Number.isInteger(discountMinor) || discountMinor < 0) {
    return {
      valid: false,
      totalMinor: 0,
      error: 'Discount must be a non-negative integer in minor units (kobo).',
    };
  }
  if (discountMinor > subtotalMinor) {
    return {
      valid: false,
      totalMinor: 0,
      error: 'Discount cannot exceed the quote subtotal.',
    };
  }
  return {
    valid: true,
    totalMinor: subtotalMinor - discountMinor,
  };
}

export function isValidQuoteTransition(
  currentStatus: QuoteStatus,
  nextStatus: QuoteStatus,
  actorRole: 'customer' | 'vendor' | 'admin'
): { valid: boolean; reason?: string } {
  if (actorRole === 'admin') return { valid: true };
  if (['accepted', 'declined', 'withdrawn'].includes(currentStatus)) {
    return {
      valid: false,
      reason: `Quote is already ${currentStatus} and cannot be changed.`,
    };
  }
  if (actorRole === 'customer') {
    if (currentStatus === 'sent' && ['accepted', 'declined'].includes(nextStatus)) {
      return { valid: true };
    }
    return {
      valid: false,
      reason: 'Customers can only accept or decline a sent quote.',
    };
  }
  if (actorRole === 'vendor') {
    if (['draft', 'sent', 'withdrawn'].includes(nextStatus)) {
      return { valid: true };
    }
    return {
      valid: false,
      reason: `Vendor cannot transition quote to ${nextStatus}.`,
    };
  }
  return { valid: false, reason: 'Invalid quote transition.' };
}

/**
 * Converts a published ListingRecord into a sanitized public ListingCardData presentation model.
 */
export function toListingCardData(record: ListingRecord): ListingCardData {
  const categoryObj = LAUNCH_CATEGORIES.find((c) => c.slug === record.categoryId);
  const categoryLabel = categoryObj ? categoryObj.label : record.categoryId;

  let capacityLabel: string | null = null;
  if (record.listingType === 'venue') {
    if (record.capacityMin && record.capacityMax) {
      capacityLabel = `${record.capacityMin.toLocaleString()}–${record.capacityMax.toLocaleString()} guests`;
    } else if (record.capacityMax) {
      capacityLabel = `Up to ${record.capacityMax.toLocaleString()} guests`;
    } else if (record.capacityMin) {
      capacityLabel = `From ${record.capacityMin.toLocaleString()} guests`;
    }
  }

  return {
    id: record.id,
    slug: record.slug,
    listingType: record.listingType,
    title: record.name,
    headline: record.headline,
    categoryId: record.categoryId,
    categoryLabel,
    city: record.city as LaunchCity,
    locationLabel: `${record.city}, Delta State`,
    coverImageUrl: record.coverImageUrl ?? null,
    priceLabel: record.displayPriceText || 'Contact for pricing',
    pricingModel: record.pricingModel,
    capacityLabel,
    indoorOutdoor: record.indoorOutdoor,
    amenitiesPreview: (record.amenities || []).slice(0, 3),
    acceptsEnquiries: record.acceptsEnquiries,
    status: 'published',
  };
}
