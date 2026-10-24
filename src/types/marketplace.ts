/**
 * EventLink Marketplace Domain Models & Presentation View Models
 * Aligned with Database_Schema.md, firebase-blueprint.json, and Component_Specifications.md.
 */

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string; retryable: boolean };

export type ListingType = 'venue' | 'service-provider';
export type LaunchCity = 'Warri' | 'Effurun';
export type PricingModel =
  | 'fixed'
  | 'starting-at'
  | 'range'
  | 'custom-quote'
  | 'not-provided';
export type IndoorOutdoorSetting =
  | 'indoor'
  | 'outdoor'
  | 'both'
  | 'not-specified';
export type ContactVisibility = 'public' | 'after-enquiry' | 'private';

export type PublicationStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived';

export type ModerationStatus =
  | 'not_submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export type EnquiryStatus =
  | 'submitted'
  | 'viewed'
  | 'responded'
  | 'closed'
  | 'cancelled';

export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'withdrawn';

export type EventTypeSlug =
  | 'wedding'
  | 'birthday'
  | 'corporate'
  | 'burial'
  | 'anniversary'
  | 'religious'
  | 'conference'
  | 'other';

export type ReportReasonCode =
  | 'misleading-information'
  | 'inaccurate-pricing'
  | 'duplicate-listing'
  | 'inappropriate-content'
  | 'suspected-scam'
  | 'other';

export interface ListingRecord {
  id: string;
  organizationId: string;
  ownerUid: string;
  listingType: ListingType;
  name: string;
  slug: string;
  headline: string;
  description: string;
  categoryId: string;
  city: LaunchCity;
  state: string;
  countryCode: 'NG';
  addressDisplay: string;
  serviceAreas: string[];
  currency: 'NGN';
  pricingModel: PricingModel;
  minAmountMinor?: number | null;
  maxAmountMinor?: number | null;
  displayPriceText: string;
  capacityMin?: number | null;
  capacityMax?: number | null;
  indoorOutdoor: IndoorOutdoorSetting;
  venueType?: string | null;
  amenities: string[];
  cateringPolicy?: string | null;
  decorationPolicy?: string | null;
  alcoholPolicy?: string | null;
  coverImageUrl?: string | null;
  contactVisibility: ContactVisibility;
  acceptsEnquiries: boolean;
  publicationStatus: PublicationStatus;
  moderationStatus: ModerationStatus;
  moderationNotes?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Sanitized public view model for ListingCard / VenueCard / ServiceProviderCard
 * (Component_Specifications.md Section 4.5).
 * Never exposes ownerUid, moderationNotes, or private vendor fields.
 */
export interface ListingCardData {
  id: string;
  slug: string;
  listingType: ListingType;
  title: string;
  headline: string;
  categoryId: string;
  categoryLabel: string;
  city: LaunchCity;
  locationLabel: string;
  coverImageUrl?: string | null;
  priceLabel: string;
  pricingModel: PricingModel;
  capacityLabel?: string | null;
  indoorOutdoor?: IndoorOutdoorSetting;
  amenitiesPreview: string[];
  acceptsEnquiries: boolean;
  status: 'published';
}

export interface ListingServiceRecord {
  id: string;
  listingId: string;
  organizationId: string;
  ownerUid: string;
  name: string;
  description: string;
  categoryId: string;
  inclusions: string[];
  imageUrl?: string | null;
  currency: 'NGN';
  pricingModel: 'fixed' | 'starting-at' | 'range' | 'custom-quote';
  amountMinor: number;
  status: 'draft' | 'published' | 'archived';
  sortOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ListingMediaRecord {
  id: string;
  listingId: string;
  organizationId: string;
  ownerUid: string;
  imageUrl: string;
  altText: string;
  caption?: string | null;
  sortOrder: number;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  publicationStatus: 'published' | 'archived';
  uploadedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavedListingRecord {
  id: string;
  uid: string;
  listingId: string;
  createdAt?: unknown;
}

export interface ComparisonRecord {
  id: string;
  uid: string;
  name: string;
  listingIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EventWorkspaceRecord {
  id: string;
  ownerUid: string;
  title: string;
  eventType: EventTypeSlug;
  eventDate?: string | null;
  timeZone: 'Africa/Lagos';
  guestCount?: number | null;
  city: LaunchCity;
  state: string;
  countryCode: 'NG';
  currency: 'NGN';
  budgetAmountMinor?: number | null;
  notes?: string | null;
  status: 'planning' | 'completed' | 'cancelled' | 'archived';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EnquiryRecord {
  id: string;
  customerUid: string;
  customerName: string;
  customerEmail: string;
  listingId: string;
  listingName: string;
  organizationId: string;
  vendorOwnerUid: string;
  eventId?: string | null;
  serviceId?: string | null;
  subject: string;
  message: string;
  eventType?: string | null;
  eventDate?: string | null;
  timeZone: 'Africa/Lagos';
  guestCount?: number | null;
  locationText?: string | null;
  currency: 'NGN';
  budgetAmountMinor?: number | null;
  contactPreference: 'email' | 'phone' | 'whatsapp';
  status: EnquiryStatus;
  vendorResponse?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface QuoteRecord {
  id: string;
  enquiryId: string;
  listingId: string;
  listingName: string;
  organizationId: string;
  vendorOwnerUid: string;
  customerUid: string;
  createdBy: string;
  currency: 'NGN';
  itemsSummary: string;
  inclusions?: string | null;
  exclusions?: string | null;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  depositTerms?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  status: QuoteStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NotificationRecord {
  id: string;
  recipientUid: string;
  senderUid: string;
  type:
    | 'enquiry_received'
    | 'enquiry_responded'
    | 'quote_received'
    | 'quote_status_changed'
    | 'listing_moderation_update'
    | 'account_update';
  title: string;
  body: string;
  entityType: 'enquiry' | 'quote' | 'listing' | 'account';
  entityId: string;
  isRead: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReportRecord {
  id: string;
  reporterUid: string;
  targetType: 'listing' | 'account';
  targetId: string;
  reasonCode: ReportReasonCode;
  details?: string | null;
  status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  resolutionNotes?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLogRecord {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: 'listing' | 'vendorOrganization' | 'report' | 'user' | 'platformSettings';
  targetId: string;
  reason?: string | null;
  createdAt?: unknown;
}

export interface PlatformCategoryConfig {
  id: string;
  slug: string;
  label: string;
  listingType: ListingType;
  commissionPercent: number;
  isActive: boolean;
}

export interface PlatformSettingsRecord {
  id: string;
  defaultCommissionPercent: number;
  featuredListingFeeMinor: number;
  categories: PlatformCategoryConfig[];
  updatedBy?: string | null;
  updatedAt?: unknown;
}

