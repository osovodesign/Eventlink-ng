/**
 * EventLink Marketplace Data-Access Repository Layer (Architecture.md Section 5.4)
 * Encapsulates Firestore queries, pagination limits, ownership checks, and error handling.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../../lib/firebase/client';
import { recordOperationalEvent } from '../../lib/monitoring/release-monitor';
import {
  AuditLogRecord,
  EnquiryRecord,
  EnquiryStatus,
  EventTypeSlug,
  EventWorkspaceRecord,
  LaunchCity,
  ListingCardData,
  ListingMediaRecord,
  ListingRecord,
  ListingServiceRecord,
  ListingType,
  ModerationStatus,
  NotificationRecord,
  PublicationStatus,
  QuoteRecord,
  QuoteStatus,
  ReportReasonCode,
  ReportRecord,
  SavedListingRecord,
  PlatformCategoryConfig,
  PlatformSettingsRecord,
} from '../../types/marketplace';
import { LAUNCH_CATEGORIES } from '../../lib/config/env';
import { VendorOrganizationRecord } from '../../lib/permissions/access-control';
import {
  SCHEMA_LIMITS,
  buildDisplayPriceText,
  isValidEnquiryTransition,
  isValidListingTransition,
  isValidQuoteTransition,
  normalizeSlug,
  toListingCardData,
  validateAndComputeQuoteTotals,
} from '../../lib/validation/marketplace-schemas';

export const DEFAULT_PAGE_LIMIT = 24;

export interface DiscoveryQueryFilters {
  listingType?: ListingType;
  categoryId?: string;
  city?: LaunchCity;
  keyword?: string;
  minCapacity?: number;
  maxPriceMinor?: number;
  indoorOutdoor?: 'indoor' | 'outdoor' | 'both';
  sortBy?: 'recent' | 'price-asc' | 'price-desc' | 'capacity-desc';
}

/**
 * Sanitized public vendor organization summary for listing detail pages.
 * Never exposes ownerUid or private contact channels when contactVisibility !== 'public'.
 */
export interface PublicVendorProfileSummary {
  id: string;
  name: string;
  slug: string;
  businessType: VendorOrganizationRecord['businessType'];
  description: string;
  logoImageUrl: string | null;
  city: LaunchCity;
  state: string;
  publicEmail: string | null;
  publicPhone: string | null;
  whatsappNumber: string | null;
  websiteUrl: string | null;
}

export interface ListingDetailBundle {
  listing: ListingRecord;
  services: ListingServiceRecord[];
  media: ListingMediaRecord[];
  vendorSummary: PublicVendorProfileSummary | null;
  relatedListings: ListingCardData[];
  isPreviewMode: boolean;
}

/**
 * Queries published, approved listings for public marketplace discovery.
 * Never returns draft, pending, rejected, or archived listings.
 */
export async function listPublishedListings(
  filters: DiscoveryQueryFilters = {}
): Promise<ListingRecord[]> {
  const path = 'listings';
  try {
    const baseQuery = query(
      collection(db, path),
      where('publicationStatus', '==', 'published'),
      where('moderationStatus', '==', 'approved'),
      limit(DEFAULT_PAGE_LIMIT)
    );

    const snapshot = await getDocs(baseQuery);
    let results: ListingRecord[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ListingRecord, 'id'>),
    }));

    // Apply structured filters supported by real listing fields
    if (filters.listingType) {
      results = results.filter((item) => item.listingType === filters.listingType);
    }
    if (filters.categoryId) {
      results = results.filter((item) => item.categoryId === filters.categoryId);
    }
    if (filters.city) {
      const targetCity = filters.city;
      results = results.filter(
        (item) =>
          item.city === targetCity ||
          (item.serviceAreas && item.serviceAreas.includes(targetCity))
      );
    }
    if (filters.indoorOutdoor) {
      results = results.filter(
        (item) =>
          item.indoorOutdoor === filters.indoorOutdoor ||
          item.indoorOutdoor === 'both'
      );
    }
    if (filters.minCapacity !== undefined && filters.minCapacity > 0) {
      results = results.filter(
        (item) =>
          item.capacityMax !== null &&
          item.capacityMax !== undefined &&
          item.capacityMax >= filters.minCapacity!
      );
    }
    if (filters.maxPriceMinor !== undefined && filters.maxPriceMinor > 0) {
      results = results.filter(
        (item) =>
          item.minAmountMinor !== null &&
          item.minAmountMinor !== undefined &&
          item.minAmountMinor <= filters.maxPriceMinor!
      );
    }
    if (filters.keyword && filters.keyword.trim()) {
      const q = filters.keyword.trim().toLowerCase();
      results = results.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.headline.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.categoryId.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q)
      );
    }

    // Apply honest sorting (SEARCH-06: never treat missing price as 0 or highest)
    if (filters.sortBy === 'price-asc') {
      results.sort((a, b) => {
        const aPrice = a.minAmountMinor ?? Number.MAX_SAFE_INTEGER;
        const bPrice = b.minAmountMinor ?? Number.MAX_SAFE_INTEGER;
        return aPrice - bPrice;
      });
    } else if (filters.sortBy === 'price-desc') {
      results.sort((a, b) => {
        const aPrice = a.minAmountMinor ?? -1;
        const bPrice = b.minAmountMinor ?? -1;
        return bPrice - aPrice;
      });
    } else if (filters.sortBy === 'capacity-desc') {
      results.sort((a, b) => (b.capacityMax ?? 0) - (a.capacityMax ?? 0));
    }

    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Fetches a single public published listing by slug or ID.
 */
export async function getPublishedListingBySlugOrId(
  slugOrId: string
): Promise<ListingRecord | null> {
  const listings = await listPublishedListings();
  const match = listings.find(
    (item) => item.slug === slugOrId || item.id === slugOrId
  );
  return match ?? null;
}

/**
 * Fetches published services/packages for a listing.
 */
export async function listPublishedServicesForListing(
  listingId: string
): Promise<ListingServiceRecord[]> {
  const path = 'listingServices';
  try {
    const q = query(
      collection(db, path),
      where('listingId', '==', listingId),
      where('status', '==', 'published'),
      limit(20)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ListingServiceRecord, 'id'>),
    }));
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Fetches published media items for a listing.
 */
export async function listPublishedMediaForListing(
  listingId: string
): Promise<ListingMediaRecord[]> {
  const path = 'listingMedia';
  try {
    const q = query(
      collection(db, path),
      where('listingId', '==', listingId),
      where('publicationStatus', '==', 'published'),
      limit(20)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ListingMediaRecord, 'id'>),
    }));
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Fetches a sanitized public vendor organization summary.
 * Respects listing.contactVisibility so private/after-enquiry contact info is never leaked publicly.
 */
export async function getPublicVendorOrganizationSummary(
  organizationId: string,
  contactVisibility: ListingRecord['contactVisibility']
): Promise<PublicVendorProfileSummary | null> {
  if (!organizationId) return null;
  try {
    const snap = await getDoc(doc(db, 'vendorOrganizations', organizationId));
    if (!snap.exists()) return null;
    const data = snap.data() as Omit<VendorOrganizationRecord, 'id'>;
    if (data.status !== 'active') return null;

    const allowPublicContact = contactVisibility === 'public';
    return {
      id: snap.id,
      name: data.name,
      slug: data.slug,
      businessType: data.businessType,
      description: data.description,
      logoImageUrl: data.logoImageUrl || null,
      city: data.city as LaunchCity,
      state: data.state,
      publicEmail: allowPublicContact ? data.publicEmail || null : null,
      publicPhone: allowPublicContact ? data.publicPhone || null : null,
      whatsappNumber: allowPublicContact ? data.whatsappNumber || null : null,
      websiteUrl: allowPublicContact ? data.websiteUrl || null : null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetches the full listing detail bundle for `/venues/:slug` and `/vendors/:slug` (Phase 6).
 * Enforces public visibility (`published` + `approved`) on every request unless an authorized
 * listing owner or platform admin is previewing their own unpublished listing.
 */
export async function getListingDetailBundleBySlugOrId(
  slugOrId: string,
  options: { actorUid?: string | null; isAdmin?: boolean } = {}
): Promise<ListingDetailBundle | null> {
  const allPublished = await listPublishedListings();
  let targetListing =
    allPublished.find((item) => item.slug === slugOrId || item.id === slugOrId) ??
    null;
  let isPreviewMode = false;

  // If not found in public published catalog, check if an authorized owner or admin is previewing
  if (!targetListing && (options.actorUid || options.isAdmin)) {
    if (options.isAdmin) {
      const adminAll = await listAllListingsForAdmin();
      const match = adminAll.find(
        (item) => item.slug === slugOrId || item.id === slugOrId
      );
      if (match) {
        targetListing = match;
        isPreviewMode =
          match.publicationStatus !== 'published' ||
          match.moderationStatus !== 'approved';
      }
    } else if (options.actorUid) {
      const owned = await listVendorOwnedListings(options.actorUid);
      const match = owned.find(
        (item) => item.slug === slugOrId || item.id === slugOrId
      );
      if (match) {
        targetListing = match;
        isPreviewMode =
          match.publicationStatus !== 'published' ||
          match.moderationStatus !== 'approved';
      }
    }
  }

  if (!targetListing) {
    return null;
  }

  const [services, media, vendorSummary] = await Promise.all([
    listPublishedServicesForListing(targetListing.id),
    listPublishedMediaForListing(targetListing.id),
    getPublicVendorOrganizationSummary(
      targetListing.organizationId,
      targetListing.contactVisibility
    ),
  ]);

  const relatedListings = allPublished
    .filter(
      (item) =>
        item.id !== targetListing!.id &&
        (item.categoryId === targetListing!.categoryId ||
          item.city === targetListing!.city)
    )
    .slice(0, 3)
    .map(toListingCardData);

  return {
    listing: targetListing,
    services,
    media,
    vendorSummary,
    relatedListings,
    isPreviewMode,
  };
}

/**
 * Creates a validated Customer Enquiry for a published listing, enforces duplicate submission
 * protection (Phase 8), and dispatches an in-app notification to the vendor owner.
 */
export async function createCustomerEnquiry(input: {
  customerUid: string;
  customerName: string;
  customerEmail: string;
  listing: ListingRecord;
  eventId?: string | null;
  serviceId?: string | null;
  subject: string;
  message: string;
  eventType?: string | null;
  eventDate?: string | null;
  guestCount?: number | null;
  locationText?: string | null;
  budgetAmountMinor?: number | null;
  contactPreference: 'email' | 'phone' | 'whatsapp';
}): Promise<EnquiryRecord> {
  if (
    input.listing.publicationStatus !== 'published' ||
    !input.listing.acceptsEnquiries
  ) {
    throw new Error('This listing is not currently accepting public enquiries.');
  }

  const subject = input.subject
    .trim()
    .slice(0, SCHEMA_LIMITS.ENQUIRY_SUBJECT_MAX);
  const message = input.message
    .trim()
    .slice(0, SCHEMA_LIMITS.ENQUIRY_MESSAGE_MAX);

  if (subject.length < SCHEMA_LIMITS.ENQUIRY_SUBJECT_MIN) {
    throw new Error('Please provide a clear enquiry subject (at least 2 characters).');
  }
  if (message.length < SCHEMA_LIMITS.ENQUIRY_MESSAGE_MIN) {
    throw new Error(
      'Please include at least 10 characters describing your event requirements.'
    );
  }

  // Phase 8 Duplicate / Repeated Submission Protection:
  // Check if customer already has an active ('submitted' or 'viewed') enquiry for the same listing and subject/date
  try {
    const existingCustomerEnquiries = await listCustomerEnquiries(
      input.customerUid
    );
    const normalizedSubj = subject.toLowerCase();
    const normalizedDate = input.eventDate?.trim() || null;

    const duplicate = existingCustomerEnquiries.find(
      (item) =>
        item.listingId === input.listing.id &&
        (item.status === 'submitted' || item.status === 'viewed') &&
        item.subject.trim().toLowerCase() === normalizedSubj &&
        (item.eventDate || null) === normalizedDate
    );

    if (duplicate) {
      recordOperationalEvent(
        'rate_limit_blocked',
        `duplicate_enquiry:${input.listing.id}`,
        `Blocked duplicate active enquiry for listing ${input.listing.id}`
      );
      throw new Error(
        `You already have an active enquiry (${duplicate.id.slice(0, 12)}) for ${input.listing.name} with this subject and date. You can track or manage it in your Enquiries workspace.`
      );
    }
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes('You already have an active enquiry')
    ) {
      throw err;
    }
  }

  const enquiryId = `enq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const payload = {
    customerUid: input.customerUid,
    customerName: input.customerName.trim().slice(0, 100),
    customerEmail: input.customerEmail.trim().slice(0, 254),
    listingId: input.listing.id,
    listingName: input.listing.name.slice(0, 120),
    organizationId: input.listing.organizationId,
    vendorOwnerUid: input.listing.ownerUid,
    eventId: input.eventId || null,
    serviceId: input.serviceId || null,
    subject,
    message,
    eventType: input.eventType?.trim().slice(0, 32) || null,
    eventDate: input.eventDate?.trim().slice(0, 32) || null,
    timeZone: 'Africa/Lagos' as const,
    guestCount:
      input.guestCount && input.guestCount >= 1
        ? Math.min(50000, Math.round(input.guestCount))
        : null,
    locationText: input.locationText?.trim().slice(0, 160) || null,
    currency: 'NGN' as const,
    budgetAmountMinor:
      input.budgetAmountMinor !== null &&
      input.budgetAmountMinor !== undefined &&
      input.budgetAmountMinor >= 0
        ? Math.round(input.budgetAmountMinor)
        : null,
    contactPreference: input.contactPreference,
    status: 'submitted' as const,
    vendorResponse: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'enquiries', enquiryId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `enquiries/${enquiryId}`);
  }

  // Create in-app notification for vendor owner
  const notifId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'notifications', notifId), {
      recipientUid: input.listing.ownerUid,
      senderUid: input.customerUid,
      type: 'enquiry_received',
      title: `New enquiry for ${input.listing.name.slice(0, 80)}`,
      body: `${payload.customerName} sent an enquiry: "${subject.slice(0, 120)}"`,
      entityType: 'enquiry',
      entityId: enquiryId,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal if notification write is skipped
  }

  return {
    id: enquiryId,
    ...payload,
  };
}

/**
 * Lists all enquiries submitted by a specific customer (`customerUid`).
 */
export async function listCustomerEnquiries(
  customerUid: string
): Promise<EnquiryRecord[]> {
  const path = 'enquiries';
  try {
    const q = query(
      collection(db, path),
      where('customerUid', '==', customerUid),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<EnquiryRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Lists all enquiries received by a specific vendor owner (`vendorOwnerUid`).
 */
export async function listVendorEnquiries(
  vendorOwnerUid: string
): Promise<EnquiryRecord[]> {
  const path = 'enquiries';
  try {
    const q = query(
      collection(db, path),
      where('vendorOwnerUid', '==', vendorOwnerUid),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<EnquiryRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Vendor updates enquiry status ('viewed' | 'responded' | 'closed') and optional response text,
 * and dispatches an in-app notification to the customer.
 */
export async function respondToEnquiryAsVendor(
  vendorOwnerUid: string,
  enquiry: EnquiryRecord,
  nextStatus: 'viewed' | 'responded' | 'closed',
  responseText?: string | null
): Promise<void> {
  if (enquiry.vendorOwnerUid !== vendorOwnerUid) {
    throw new Error('You are not authorized to respond to this enquiry.');
  }

  const check = isValidEnquiryTransition(enquiry.status, nextStatus, 'vendor');
  if (!check.valid) {
    throw new Error(check.reason);
  }

  const trimmedResponse =
    responseText !== undefined
      ? responseText?.trim().slice(0, 3000) || null
      : enquiry.vendorResponse || null;

  if (nextStatus === 'responded' && (!trimmedResponse || trimmedResponse.length < 2)) {
    throw new Error('Please write a response message to the customer.');
  }

  const path = `enquiries/${enquiry.id}`;
  try {
    await updateDoc(doc(db, 'enquiries', enquiry.id), {
      status: nextStatus,
      vendorResponse: trimmedResponse,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  if (nextStatus === 'responded') {
    const notifId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      await setDoc(doc(db, 'notifications', notifId), {
        recipientUid: enquiry.customerUid,
        senderUid: vendorOwnerUid,
        type: 'enquiry_responded',
        title: `Vendor replied to your enquiry for ${enquiry.listingName.slice(0, 70)}`,
        body: (trimmedResponse || 'View the vendor response in your Enquiries workspace.').slice(
          0,
          300
        ),
        entityType: 'enquiry',
        entityId: enquiry.id,
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal
    }
  }
}

/**
 * Customer cancels or closes their own active enquiry.
 */
export async function updateEnquiryStatusAsCustomer(
  customerUid: string,
  enquiry: EnquiryRecord,
  nextStatus: 'cancelled' | 'closed'
): Promise<void> {
  if (enquiry.customerUid !== customerUid) {
    throw new Error('You can only update your own enquiries.');
  }

  const check = isValidEnquiryTransition(
    enquiry.status,
    nextStatus,
    'customer'
  );
  if (!check.valid) {
    throw new Error(check.reason);
  }

  const path = `enquiries/${enquiry.id}`;
  try {
    await updateDoc(doc(db, 'enquiries', enquiry.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Returns direct vendor contact details for a customer enquiry ONLY when the vendor has responded
 * (`status === 'responded'`) or when the organization contact is publicly shared.
 */
export async function getUnlockedVendorContactForEnquiry(
  enquiry: EnquiryRecord
): Promise<{
  unlocked: boolean;
  organizationName: string;
  publicEmail: string | null;
  publicPhone: string | null;
  whatsappNumber: string | null;
  websiteUrl: string | null;
} | null> {
  if (!enquiry.organizationId) return null;
  try {
    const orgSnap = await getDoc(
      doc(db, 'vendorOrganizations', enquiry.organizationId)
    );
    if (!orgSnap.exists()) return null;
    const orgData = orgSnap.data() as Omit<VendorOrganizationRecord, 'id'>;

    // Contact details unlock once the vendor responds to the enquiry
    const isUnlocked = enquiry.status === 'responded';
    return {
      unlocked: isUnlocked,
      organizationName: orgData.name,
      publicEmail: isUnlocked ? orgData.publicEmail || null : null,
      publicPhone: isUnlocked ? orgData.publicPhone || null : null,
      whatsappNumber: isUnlocked ? orgData.whatsappNumber || null : null,
      websiteUrl: isUnlocked ? orgData.websiteUrl || null : null,
    };
  } catch {
    return null;
  }
}

/**
 * Creates and sends a structured Vendor Quote (`quotes/{quoteId}`) for an enquiry,
 * enforcing minor-unit subtotal/discount/total math.
 */
export async function createAndSendVendorQuote(
  vendorOwnerUid: string,
  enquiry: EnquiryRecord,
  input: {
    itemsSummary: string;
    inclusions?: string | null;
    exclusions?: string | null;
    subtotalMinor: number;
    discountMinor: number;
    depositTerms?: string | null;
    validUntil?: string | null;
    notes?: string | null;
    status?: 'draft' | 'sent';
  }
): Promise<QuoteRecord> {
  if (enquiry.vendorOwnerUid !== vendorOwnerUid) {
    throw new Error('You are not authorized to issue a quote for this enquiry.');
  }

  const mathCheck = validateAndComputeQuoteTotals(
    input.subtotalMinor,
    input.discountMinor
  );
  if (!mathCheck.valid) {
    throw new Error(mathCheck.error || 'Invalid quote pricing calculation.');
  }

  const summary = input.itemsSummary
    .trim()
    .slice(0, SCHEMA_LIMITS.QUOTE_SUMMARY_MAX);
  if (summary.length < SCHEMA_LIMITS.QUOTE_SUMMARY_MIN) {
    throw new Error('Please provide a clear summary of quoted items.');
  }

  const quoteId = `qte_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const quoteStatus: QuoteStatus = input.status || 'sent';

  const payload = {
    enquiryId: enquiry.id,
    listingId: enquiry.listingId,
    listingName: enquiry.listingName.slice(0, 120),
    organizationId: enquiry.organizationId,
    vendorOwnerUid,
    customerUid: enquiry.customerUid,
    createdBy: vendorOwnerUid,
    currency: 'NGN' as const,
    itemsSummary: summary,
    inclusions: input.inclusions?.trim().slice(0, 1500) || null,
    exclusions: input.exclusions?.trim().slice(0, 1500) || null,
    subtotalMinor: input.subtotalMinor,
    discountMinor: input.discountMinor,
    totalMinor: mathCheck.totalMinor,
    depositTerms: input.depositTerms?.trim().slice(0, 500) || null,
    validUntil: input.validUntil?.trim().slice(0, 32) || null,
    notes: input.notes?.trim().slice(0, 1500) || null,
    status: quoteStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'quotes', quoteId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `quotes/${quoteId}`);
  }

  // Also mark the enquiry as 'responded' if it is currently 'submitted' or 'viewed'
  if (enquiry.status === 'submitted' || enquiry.status === 'viewed') {
    try {
      await updateDoc(doc(db, 'enquiries', enquiry.id), {
        status: 'responded',
        vendorResponse:
          enquiry.vendorResponse ||
          `Structured quotation (${quoteId.slice(0, 10)}) sent: ${summary.slice(0, 140)}`,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal
    }
  }

  if (quoteStatus === 'sent') {
    const notifId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      await setDoc(doc(db, 'notifications', notifId), {
        recipientUid: enquiry.customerUid,
        senderUid: vendorOwnerUid,
        type: 'quote_received',
        title: `New quote received from ${enquiry.listingName.slice(0, 70)}`,
        body: `Quoted total: ₦${Math.round(mathCheck.totalMinor / 100).toLocaleString()} — ${summary.slice(0, 120)}`,
        entityType: 'quote',
        entityId: quoteId,
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal
    }
  }

  return {
    id: quoteId,
    ...payload,
  };
}

/**
 * Lists all structured quotes sent to a customer (`customerUid`).
 */
export async function listQuotesForCustomer(
  customerUid: string
): Promise<QuoteRecord[]> {
  const path = 'quotes';
  try {
    const q = query(
      collection(db, path),
      where('customerUid', '==', customerUid),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<QuoteRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Lists all structured quotes created by a vendor (`vendorOwnerUid`).
 */
export async function listQuotesForVendor(
  vendorOwnerUid: string
): Promise<QuoteRecord[]> {
  const path = 'quotes';
  try {
    const q = query(
      collection(db, path),
      where('vendorOwnerUid', '==', vendorOwnerUid),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<QuoteRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Customer accepts or declines a sent quote (`status === 'sent'`).
 */
export async function respondToQuoteAsCustomer(
  customerUid: string,
  quote: QuoteRecord,
  decision: 'accepted' | 'declined'
): Promise<void> {
  if (quote.customerUid !== customerUid) {
    throw new Error('You can only respond to quotes addressed to your account.');
  }

  const check = isValidQuoteTransition(quote.status, decision, 'customer');
  if (!check.valid) {
    throw new Error(check.reason);
  }

  const path = `quotes/${quote.id}`;
  try {
    await updateDoc(doc(db, 'quotes', quote.id), {
      status: decision,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  const notifId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'notifications', notifId), {
      recipientUid: quote.vendorOwnerUid,
      senderUid: customerUid,
      type: 'quote_status_changed',
      title: `Customer ${decision} your quote for ${quote.listingName.slice(0, 60)}`,
      body: `Quote ${quote.id.slice(0, 10)} was marked ${decision} by the customer.`,
      entityType: 'quote',
      entityId: quote.id,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Submits a structured listing report to `reports/{reportId}` for moderation review.
 */
export async function createListingReport(input: {
  reporterUid: string;
  listingId: string;
  reasonCode: ReportReasonCode;
  details?: string | null;
}): Promise<ReportRecord> {
  const reportId = `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    reporterUid: input.reporterUid,
    targetType: 'listing' as const,
    targetId: input.listingId,
    reasonCode: input.reasonCode,
    details: input.details?.trim().slice(0, 1500) || null,
    status: 'open' as const,
    resolutionNotes: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'reports', reportId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${reportId}`);
  }

  return {
    id: reportId,
    ...payload,
  };
}

/**
 * Submits structured post-launch user/vendor feedback or issue report to `reports/{reportId}`
 * with severity and functional area metadata for administrative triage.
 */
export async function submitPlatformFeedbackOrIssue(input: {
  reporterUid: string;
  roleContext: 'customer' | 'vendor';
  severity: 'low' | 'medium' | 'high' | 'critical';
  area: 'search' | 'listing-details' | 'enquiries-quotes' | 'vendor-workspace' | 'other';
  summary: string;
}): Promise<ReportRecord> {
  const trimmedSummary = input.summary.trim().slice(0, 1300);
  if (trimmedSummary.length < 5) {
    throw new Error('Please provide at least 5 characters describing your feedback or issue.');
  }

  const reportId = `fbk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const structuredDetails = `[Launch Feedback · Severity: ${input.severity.toUpperCase()} · Area: ${input.area} · Role: ${input.roleContext}] ${trimmedSummary}`.slice(
    0,
    1500
  );

  const payload = {
    reporterUid: input.reporterUid,
    targetType: 'account' as const,
    targetId: input.reporterUid,
    reasonCode: 'other' as const,
    details: structuredDetails,
    status: 'open' as const,
    resolutionNotes: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'reports', reportId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${reportId}`);
  }

  return {
    id: reportId,
    ...payload,
  };
}

/**
 * Creates a Vendor Organization and its Owner Membership record idempotently.
 */
export async function createVendorOrganizationWithOwner(
  ownerUid: string,
  input: {
    name: string;
    businessType: VendorOrganizationRecord['businessType'];
    description: string;
    city: LaunchCity;
    logoImageUrl?: string | null;
    publicEmail?: string | null;
    publicPhone?: string | null;
    whatsappNumber?: string | null;
    websiteUrl?: string | null;
  }
): Promise<VendorOrganizationRecord> {
  const orgId = `org_${ownerUid.slice(0, 16)}_${Date.now()}`;
  const slug = normalizeSlug(input.name);
  const orgPath = `vendorOrganizations/${orgId}`;

  const trimmedName = input.name.trim().slice(0, SCHEMA_LIMITS.NAME_MAX);
  const trimmedDesc = input.description
    .trim()
    .slice(0, SCHEMA_LIMITS.ORG_DESCRIPTION_MAX);
  const trimmedLogo = input.logoImageUrl?.trim().slice(0, 300000) || null;

  if (trimmedName.length < SCHEMA_LIMITS.NAME_MIN) {
    throw new Error('Business name must be at least 2 characters.');
  }
  if (trimmedDesc.length < 10) {
    throw new Error(
      'Business description must be at least 10 characters describing your services.'
    );
  }
  if (!trimmedLogo) {
    throw new Error(
      'Please upload a vendor profile picture or business logo to establish credibility.'
    );
  }

  const payload = {
    name: trimmedName,
    slug,
    businessType: input.businessType,
    description: trimmedDesc,
    ownerUid,
    logoImageUrl: trimmedLogo,
    publicEmail: input.publicEmail?.trim().slice(0, 254) || null,
    publicPhone: input.publicPhone?.trim().slice(0, 32) || null,
    whatsappNumber: input.whatsappNumber?.trim().slice(0, 32) || null,
    websiteUrl: input.websiteUrl?.trim().slice(0, 300) || null,
    city: input.city,
    state: 'Delta',
    countryCode: 'NG' as const,
    status: 'active' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'vendorOrganizations', orgId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, orgPath);
  }

  const membershipId = `${orgId}_${ownerUid}`;
  const membershipPath = `vendorMemberships/${membershipId}`;
  try {
    await setDoc(doc(db, 'vendorMemberships', membershipId), {
      organizationId: orgId,
      uid: ownerUid,
      role: 'owner' as const,
      status: 'active' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, membershipPath);
  }

  return {
    id: orgId,
    ...payload,
  };
}

/**
 * Updates an existing Vendor Organization profile owned by `ownerUid`.
 */
export async function updateVendorOrganization(
  ownerUid: string,
  existingOrg: VendorOrganizationRecord,
  input: {
    name: string;
    businessType: VendorOrganizationRecord['businessType'];
    description: string;
    city: LaunchCity;
    logoImageUrl?: string | null;
    publicEmail?: string | null;
    publicPhone?: string | null;
    whatsappNumber?: string | null;
    websiteUrl?: string | null;
  }
): Promise<void> {
  if (existingOrg.ownerUid !== ownerUid) {
    throw new Error('You do not have permission to edit this business profile.');
  }
  const trimmedName = input.name.trim().slice(0, SCHEMA_LIMITS.NAME_MAX);
  const trimmedDesc = input.description
    .trim()
    .slice(0, SCHEMA_LIMITS.ORG_DESCRIPTION_MAX);
  const trimmedLogo =
    input.logoImageUrl?.trim().slice(0, 300000) ||
    existingOrg.logoImageUrl ||
    null;

  if (trimmedName.length < SCHEMA_LIMITS.NAME_MIN) {
    throw new Error('Business name must be at least 2 characters.');
  }
  if (trimmedDesc.length < 10) {
    throw new Error('Business description must be at least 10 characters.');
  }
  if (!trimmedLogo) {
    throw new Error(
      'Please upload a vendor profile picture or business logo to establish credibility.'
    );
  }

  const orgPath = `vendorOrganizations/${existingOrg.id}`;
  const slug = normalizeSlug(trimmedName);

  try {
    await updateDoc(doc(db, 'vendorOrganizations', existingOrg.id), {
      name: trimmedName,
      slug,
      businessType: input.businessType,
      description: trimmedDesc,
      logoImageUrl: trimmedLogo,
      city: input.city,
      state: 'Delta',
      publicEmail: input.publicEmail?.trim().slice(0, 254) || null,
      publicPhone: input.publicPhone?.trim().slice(0, 32) || null,
      whatsappNumber: input.whatsappNumber?.trim().slice(0, 32) || null,
      websiteUrl: input.websiteUrl?.trim().slice(0, 300) || null,
      status: 'active',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, orgPath);
  }
}

export interface VendorListingInput {
  listingType: ListingType;
  name: string;
  headline: string;
  description: string;
  categoryId: string;
  city: LaunchCity;
  addressDisplay: string;
  serviceAreas: string[];
  pricingModel: ListingRecord['pricingModel'];
  minAmountMinor?: number | null;
  maxAmountMinor?: number | null;
  capacityMin?: number | null;
  capacityMax?: number | null;
  indoorOutdoor: ListingRecord['indoorOutdoor'];
  venueType?: string | null;
  amenities: string[];
  cateringPolicy?: string | null;
  decorationPolicy?: string | null;
  alcoholPolicy?: string | null;
  coverImageUrl?: string | null;
  contactVisibility: ListingRecord['contactVisibility'];
  acceptsEnquiries: boolean;
  submitForReview?: boolean;
}

function validateVendorListingFields(input: VendorListingInput): void {
  const name = input.name.trim();
  const headline = input.headline.trim();
  const desc = input.description.trim();
  const addr = input.addressDisplay.trim();

  if (name.length < SCHEMA_LIMITS.NAME_MIN || name.length > SCHEMA_LIMITS.NAME_MAX) {
    throw new Error('Listing name must be between 2 and 120 characters.');
  }
  if (
    headline.length < SCHEMA_LIMITS.HEADLINE_MIN ||
    headline.length > SCHEMA_LIMITS.HEADLINE_MAX
  ) {
    throw new Error('Listing headline must be between 4 and 160 characters.');
  }
  if (
    desc.length < SCHEMA_LIMITS.DESCRIPTION_MIN ||
    desc.length > SCHEMA_LIMITS.DESCRIPTION_MAX
  ) {
    throw new Error('Listing description must be between 10 and 3,000 characters.');
  }
  if (
    addr.length < SCHEMA_LIMITS.ADDRESS_MIN ||
    addr.length > SCHEMA_LIMITS.ADDRESS_MAX
  ) {
    throw new Error('Address display must be between 2 and 200 characters.');
  }
  if (
    input.minAmountMinor !== null &&
    input.minAmountMinor !== undefined &&
    input.maxAmountMinor !== null &&
    input.maxAmountMinor !== undefined &&
    input.maxAmountMinor < input.minAmountMinor
  ) {
    throw new Error('Maximum price cannot be less than minimum price.');
  }
  if (
    input.capacityMin !== null &&
    input.capacityMin !== undefined &&
    input.capacityMax !== null &&
    input.capacityMax !== undefined &&
    input.capacityMax < input.capacityMin
  ) {
    throw new Error('Maximum guest capacity cannot be less than minimum capacity.');
  }
}

/**
 * Creates a new Venue or Service Provider Listing in 'draft' or 'pending_review' state.
 */
export async function createVendorListing(
  ownerUid: string,
  organizationId: string,
  input: VendorListingInput
): Promise<ListingRecord> {
  validateVendorListingFields(input);

  const listingId = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const slug = normalizeSlug(`${input.name}-${input.city}`);
  const publicationStatus: PublicationStatus = input.submitForReview
    ? 'pending_review'
    : 'draft';
  const moderationStatus: ModerationStatus = input.submitForReview
    ? 'pending'
    : 'not_submitted';

  const check = isValidListingTransition(
    'draft',
    publicationStatus,
    moderationStatus,
    'vendor'
  );
  if (!check.valid) {
    throw new Error(check.reason);
  }

  const displayPriceText = buildDisplayPriceText(
    input.pricingModel,
    input.minAmountMinor,
    input.maxAmountMinor
  );

  const payload = {
    organizationId,
    ownerUid,
    listingType: input.listingType,
    name: input.name.trim().slice(0, SCHEMA_LIMITS.NAME_MAX),
    slug,
    headline: input.headline.trim().slice(0, SCHEMA_LIMITS.HEADLINE_MAX),
    description: input.description
      .trim()
      .slice(0, SCHEMA_LIMITS.DESCRIPTION_MAX),
    categoryId: input.categoryId,
    city: input.city,
    state: 'Delta',
    countryCode: 'NG' as const,
    addressDisplay: input.addressDisplay
      .trim()
      .slice(0, SCHEMA_LIMITS.ADDRESS_MAX),
    serviceAreas:
      input.serviceAreas.length > 0
        ? input.serviceAreas.slice(0, SCHEMA_LIMITS.SERVICE_AREAS_MAX)
        : [input.city],
    currency: 'NGN' as const,
    pricingModel: input.pricingModel,
    minAmountMinor: input.minAmountMinor ?? null,
    maxAmountMinor: input.maxAmountMinor ?? null,
    displayPriceText,
    capacityMin: input.capacityMin ?? null,
    capacityMax: input.capacityMax ?? null,
    indoorOutdoor: input.indoorOutdoor,
    venueType: input.venueType?.trim().slice(0, 64) || null,
    amenities: input.amenities.slice(0, SCHEMA_LIMITS.AMENITIES_MAX),
    cateringPolicy: input.cateringPolicy?.trim().slice(0, 120) || null,
    decorationPolicy: input.decorationPolicy?.trim().slice(0, 120) || null,
    alcoholPolicy: input.alcoholPolicy?.trim().slice(0, 120) || null,
    coverImageUrl: input.coverImageUrl?.trim().slice(0, 300000) || null,
    contactVisibility: input.contactVisibility,
    acceptsEnquiries: input.acceptsEnquiries,
    publicationStatus,
    moderationStatus,
    moderationNotes: null,
    createdBy: ownerUid,
    updatedBy: ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'listings', listingId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `listings/${listingId}`);
  }

  return {
    id: listingId,
    ...payload,
  };
}

/**
 * Updates an existing Vendor Listing owned by `ownerUid` and enforces the vendor lifecycle state machine.
 */
export async function updateVendorListing(
  ownerUid: string,
  existingListing: ListingRecord,
  input: VendorListingInput & { targetAction?: 'save_draft' | 'submit_review' | 'archive' }
): Promise<void> {
  if (existingListing.ownerUid !== ownerUid) {
    throw new Error('You are not authorized to edit this listing.');
  }

  validateVendorListingFields(input);

  const action =
    input.targetAction ||
    (input.submitForReview ? 'submit_review' : 'save_draft');

  let nextPub: PublicationStatus = 'draft';
  let nextMod: ModerationStatus = 'not_submitted';

  if (action === 'submit_review') {
    nextPub = 'pending_review';
    nextMod = 'pending';
  } else if (action === 'archive') {
    nextPub = 'archived';
    nextMod = 'not_submitted';
  } else {
    nextPub = 'draft';
    nextMod = 'not_submitted';
  }

  const transitionCheck = isValidListingTransition(
    existingListing.publicationStatus,
    nextPub,
    nextMod,
    'vendor'
  );
  if (!transitionCheck.valid) {
    throw new Error(transitionCheck.reason);
  }

  const displayPriceText = buildDisplayPriceText(
    input.pricingModel,
    input.minAmountMinor,
    input.maxAmountMinor
  );
  const slug = normalizeSlug(`${input.name}-${input.city}`);

  const listingPath = `listings/${existingListing.id}`;
  try {
    await updateDoc(doc(db, 'listings', existingListing.id), {
      listingType: input.listingType,
      name: input.name.trim().slice(0, SCHEMA_LIMITS.NAME_MAX),
      slug,
      headline: input.headline.trim().slice(0, SCHEMA_LIMITS.HEADLINE_MAX),
      description: input.description
        .trim()
        .slice(0, SCHEMA_LIMITS.DESCRIPTION_MAX),
      categoryId: input.categoryId,
      city: input.city,
      state: 'Delta',
      addressDisplay: input.addressDisplay
        .trim()
        .slice(0, SCHEMA_LIMITS.ADDRESS_MAX),
      serviceAreas:
        input.serviceAreas.length > 0
          ? input.serviceAreas.slice(0, SCHEMA_LIMITS.SERVICE_AREAS_MAX)
          : [input.city],
      pricingModel: input.pricingModel,
      minAmountMinor: input.minAmountMinor ?? null,
      maxAmountMinor: input.maxAmountMinor ?? null,
      displayPriceText,
      capacityMin: input.capacityMin ?? null,
      capacityMax: input.capacityMax ?? null,
      indoorOutdoor: input.indoorOutdoor,
      venueType: input.venueType?.trim().slice(0, 64) || null,
      amenities: input.amenities.slice(0, SCHEMA_LIMITS.AMENITIES_MAX),
      cateringPolicy: input.cateringPolicy?.trim().slice(0, 120) || null,
      decorationPolicy: input.decorationPolicy?.trim().slice(0, 120) || null,
      alcoholPolicy: input.alcoholPolicy?.trim().slice(0, 120) || null,
      coverImageUrl: input.coverImageUrl?.trim().slice(0, 300000) || null,
      contactVisibility: input.contactVisibility,
      acceptsEnquiries: input.acceptsEnquiries,
      publicationStatus: nextPub,
      moderationStatus: nextMod,
      updatedBy: ownerUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, listingPath);
  }
}

/**
 * Lists all listings owned by a specific vendor user.
 */
export async function listVendorOwnedListings(
  ownerUid: string
): Promise<ListingRecord[]> {
  const path = 'listings';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ListingRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Vendor Media Management (Phase 7): Lists all media items for a vendor-owned listing.
 */
export async function listVendorMediaForListing(
  ownerUid: string,
  listingId: string
): Promise<ListingMediaRecord[]> {
  const path = 'listingMedia';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('listingId', '==', listingId),
      limit(20)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ListingMediaRecord, 'id'>),
    }));
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Adds a validated photo record to `listingMedia` for a vendor-owned listing.
 */
export async function addVendorListingMedia(
  ownerUid: string,
  organizationId: string,
  listingId: string,
  input: {
    imageUrl: string;
    altText: string;
    caption?: string | null;
    sortOrder: number;
  }
): Promise<ListingMediaRecord> {
  const trimmedUrl = input.imageUrl.trim();
  const trimmedAlt = input.altText.trim().slice(0, 200);
  const trimmedCaption = input.caption?.trim().slice(0, 240) || null;

  if (trimmedUrl.length < 5 || trimmedUrl.length > 300000) {
    throw new Error(
      'Image URL or compressed image payload exceeds the allowed size limit (max 300 KB).'
    );
  }
  if (
    !trimmedUrl.startsWith('https://') &&
    !trimmedUrl.startsWith('http://') &&
    !trimmedUrl.startsWith('data:image/')
  ) {
    throw new Error('Image must be a valid https:// URL or an uploaded image file.');
  }
  if (trimmedAlt.length < 2) {
    throw new Error('Please provide descriptive alt text (at least 2 characters) for accessibility.');
  }

  const safeSortOrder = Math.max(0, Math.min(20, Math.round(input.sortOrder)));
  const mediaId = `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const payload = {
    listingId,
    organizationId,
    ownerUid,
    imageUrl: trimmedUrl,
    altText: trimmedAlt,
    caption: trimmedCaption,
    sortOrder: safeSortOrder,
    moderationStatus: 'approved' as const,
    publicationStatus: 'published' as const,
    uploadedBy: ownerUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'listingMedia', mediaId), payload);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `listingMedia/${mediaId}`
    );
  }

  return {
    id: mediaId,
    ...payload,
  };
}

/**
 * Updates the sortOrder of a vendor-owned `listingMedia` item.
 */
export async function reorderVendorListingMedia(
  ownerUid: string,
  mediaItem: ListingMediaRecord,
  nextSortOrder: number
): Promise<void> {
  if (mediaItem.ownerUid !== ownerUid) {
    throw new Error('Unauthorized media reorder attempt.');
  }
  const safeOrder = Math.max(0, Math.min(20, Math.round(nextSortOrder)));
  try {
    await updateDoc(doc(db, 'listingMedia', mediaItem.id), {
      sortOrder: safeOrder,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `listingMedia/${mediaItem.id}`
    );
  }
}

/**
 * Deletes a vendor-owned `listingMedia` item.
 */
export async function deleteVendorListingMedia(
  ownerUid: string,
  mediaItem: ListingMediaRecord
): Promise<void> {
  if (mediaItem.ownerUid !== ownerUid) {
    throw new Error('Unauthorized media deletion attempt.');
  }
  try {
    await deleteDoc(doc(db, 'listingMedia', mediaItem.id));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `listingMedia/${mediaItem.id}`
    );
  }
}

/**
 * Vendor Service Package Management (Phase 7): Lists all service packages for a vendor-owned listing.
 */
export async function listVendorServicesForListing(
  ownerUid: string,
  listingId: string
): Promise<ListingServiceRecord[]> {
  const path = 'listingServices';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      where('listingId', '==', listingId),
      limit(20)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ListingServiceRecord, 'id'>),
    }));
    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Creates a structured service package (`listingServices`) under a vendor-owned listing.
 */
export async function createVendorListingService(
  ownerUid: string,
  organizationId: string,
  listingId: string,
  input: {
    name: string;
    description: string;
    categoryId: string;
    inclusions: string[];
    imageUrl?: string | null;
    pricingModel: ListingServiceRecord['pricingModel'];
    amountMinor: number;
    sortOrder: number;
  }
): Promise<ListingServiceRecord> {
  const trimmedName = input.name.trim().slice(0, 120);
  const trimmedDesc = input.description.trim().slice(0, 1500);
  const trimmedImage = input.imageUrl?.trim().slice(0, 300000) || null;

  if (trimmedName.length < 2) {
    throw new Error('Package name must be at least 2 characters.');
  }
  if (trimmedDesc.length < 5) {
    throw new Error('Package description must be at least 5 characters.');
  }

  const serviceId = `srv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    listingId,
    organizationId,
    ownerUid,
    name: trimmedName,
    description: trimmedDesc,
    categoryId: input.categoryId,
    inclusions: input.inclusions
      .map((s) => s.trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 15),
    imageUrl: trimmedImage,
    currency: 'NGN' as const,
    pricingModel: input.pricingModel,
    amountMinor: Math.max(0, Math.round(input.amountMinor)),
    status: 'published' as const,
    sortOrder: Math.max(0, Math.round(input.sortOrder)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'listingServices', serviceId), payload);
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `listingServices/${serviceId}`
    );
  }

  return {
    id: serviceId,
    ...payload,
  };
}

/**
 * Deletes a vendor-owned service package (`listingServices`).
 */
export async function deleteVendorListingService(
  ownerUid: string,
  service: ListingServiceRecord
): Promise<void> {
  if (service.ownerUid !== ownerUid) {
    throw new Error('Unauthorized package deletion attempt.');
  }
  try {
    await deleteDoc(doc(db, 'listingServices', service.id));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `listingServices/${service.id}`
    );
  }
}

/**
 * Lists all listings for an authorized administrator moderation queue.
 */
export async function listAllListingsForAdmin(): Promise<ListingRecord[]> {
  const path = 'listings';
  try {
    const q = query(collection(db, path), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ListingRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Admin moderation action: Approves, requests changes, or rejects a listing
 * and records an immutable AuditLog entry + vendor notification.
 */
export async function moderateListingAsAdmin(
  adminUid: string,
  adminEmail: string,
  listing: ListingRecord,
  decision: 'approve' | 'changes_requested' | 'reject' | 'archive',
  reason: string
): Promise<void> {
  let nextPub: PublicationStatus = listing.publicationStatus;
  let nextMod: ModerationStatus = listing.moderationStatus;

  if (decision === 'approve') {
    nextPub = 'published';
    nextMod = 'approved';
  } else if (decision === 'changes_requested') {
    nextPub = 'draft';
    nextMod = 'changes_requested';
  } else if (decision === 'reject') {
    nextPub = 'rejected';
    nextMod = 'rejected';
  } else if (decision === 'archive') {
    nextPub = 'archived';
  }

  const check = isValidListingTransition(
    listing.publicationStatus,
    nextPub,
    nextMod,
    'admin'
  );
  if (!check.valid) {
    throw new Error(check.reason);
  }

  const listingPath = `listings/${listing.id}`;
  try {
    await updateDoc(doc(db, 'listings', listing.id), {
      publicationStatus: nextPub,
      moderationStatus: nextMod,
      moderationNotes: reason.trim().slice(0, 1000) || null,
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, listingPath);
  }

  // Record append-only AuditLog
  const logId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      actorUid: adminUid,
      actorEmail: adminEmail.slice(0, 254),
      action: `listing.moderation.${decision}`,
      targetType: 'listing' as const,
      targetId: listing.id,
      reason: reason.trim().slice(0, 1000) || null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${logId}`);
  }

  // Notify listing owner
  const notifId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'notifications', notifId), {
      recipientUid: listing.ownerUid,
      senderUid: adminUid,
      type: 'listing_moderation_update',
      title: `Moderation update for ${listing.name.slice(0, 80)}`,
      body: `Status updated to ${nextPub.replace('_', ' ')} (${nextMod.replace('_', ' ')}). ${reason.trim().slice(0, 200)}`,
      entityType: 'listing',
      entityId: listing.id,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Lists submitted reports for platform administrators.
 */
export async function listAllReportsForAdmin(): Promise<ReportRecord[]> {
  const path = 'reports';
  try {
    const q = query(collection(db, path), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ReportRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Resolves or dismisses a report as an administrator and writes an AuditLog entry.
 */
export async function resolveReportAsAdmin(
  adminUid: string,
  adminEmail: string,
  reportId: string,
  nextStatus: 'in_review' | 'resolved' | 'dismissed',
  resolutionNotes: string
): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status: nextStatus,
      resolutionNotes: resolutionNotes.trim().slice(0, 1000) || null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  const logId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      actorUid: adminUid,
      actorEmail: adminEmail.slice(0, 254),
      action: `report.status.${nextStatus}`,
      targetType: 'report' as const,
      targetId: reportId,
      reason: resolutionNotes.trim().slice(0, 1000) || null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${logId}`);
  }
}

/**
 * Lists recent immutable AuditLog entries for platform administrators.
 */
export async function listAuditLogsForAdmin(): Promise<AuditLogRecord[]> {
  const path = 'auditLogs';
  try {
    const q = query(collection(db, path), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AuditLogRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Saved Listings: Toggle save/remove with deterministic ID `{uid}_{listingId}`.
 */
export async function listUserSavedListings(
  uid: string
): Promise<SavedListingRecord[]> {
  const path = 'savedListings';
  try {
    const q = query(
      collection(db, path),
      where('uid', '==', uid),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SavedListingRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveListingForUser(
  uid: string,
  listingId: string
): Promise<void> {
  const savedId = `${uid}_${listingId}`;
  const path = `savedListings/${savedId}`;
  try {
    await setDoc(doc(db, 'savedListings', savedId), {
      uid,
      listingId,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeSavedListingForUser(
  uid: string,
  listingId: string
): Promise<void> {
  const savedId = `${uid}_${listingId}`;
  const path = `savedListings/${savedId}`;
  try {
    await deleteDoc(doc(db, 'savedListings', savedId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Resolves an array of listing IDs for Customer Saved Shortlist (`/saved`) and Venue Comparison (`/compare`).
 * Separates publicly available listings from any IDs that are no longer published/available so the UI
 * can show honest "Listing no longer available" cards with a Remove action.
 */
export async function getListingsByIdsForWorkspace(
  listingIds: string[]
): Promise<{
  availableListings: ListingRecord[];
  unavailableListingIds: string[];
}> {
  if (listingIds.length === 0) {
    return { availableListings: [], unavailableListingIds: [] };
  }

  const availableListings: ListingRecord[] = [];
  const unavailableListingIds: string[] = [];

  await Promise.all(
    listingIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'listings', id));
        if (!snap.exists()) {
          unavailableListingIds.push(id);
          return;
        }
        const data = snap.data() as Omit<ListingRecord, 'id'>;
        if (
          data.publicationStatus === 'published' &&
          data.moderationStatus === 'approved'
        ) {
          availableListings.push({
            id: snap.id,
            ...data,
          });
        } else {
          unavailableListingIds.push(id);
        }
      } catch {
        // Firestore rule rejects reading non-published listing if not owner/admin
        unavailableListingIds.push(id);
      }
    })
  );

  // Preserve original order of listingIds
  const orderMap = new Map(listingIds.map((id, index) => [id, index]));
  availableListings.sort(
    (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
  );

  return { availableListings, unavailableListingIds };
}

/**
 * Lists in-app notifications addressed to `recipientUid`.
 */
export async function listUserNotifications(
  recipientUid: string
): Promise<NotificationRecord[]> {
  const path = 'notifications';
  try {
    const q = query(
      collection(db, path),
      where('recipientUid', '==', recipientUid),
      limit(40)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<NotificationRecord, 'id'>),
    }));
    return items.sort((a, b) => b.id.localeCompare(a.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Marks a single notification as read for its recipient.
 */
export async function markNotificationRead(
  recipientUid: string,
  notification: NotificationRecord
): Promise<void> {
  if (notification.recipientUid !== recipientUid || notification.isRead) {
    return;
  }
  const path = `notifications/${notification.id}`;
  try {
    await updateDoc(doc(db, 'notifications', notification.id), {
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Marks all unread notifications as read for `recipientUid`.
 */
export async function markAllUserNotificationsRead(
  recipientUid: string,
  notifications: NotificationRecord[]
): Promise<void> {
  const unread = notifications.filter(
    (n) => n.recipientUid === recipientUid && !n.isRead
  );
  await Promise.all(
    unread.map((item) => markNotificationRead(recipientUid, item))
  );
}

/**
 * Vendor updates a quote status (`draft` -> `sent`, or `sent` -> `withdrawn`).
 */
export async function updateQuoteStatusAsVendor(
  vendorOwnerUid: string,
  quote: QuoteRecord,
  nextStatus: 'sent' | 'withdrawn'
): Promise<void> {
  if (quote.vendorOwnerUid !== vendorOwnerUid) {
    throw new Error('You can only update quotes issued by your business.');
  }

  const check = isValidQuoteTransition(quote.status, nextStatus, 'vendor');
  if (!check.valid) {
    throw new Error(check.reason);
  }

  const path = `quotes/${quote.id}`;
  try {
    await updateDoc(doc(db, 'quotes', quote.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  const notifId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'notifications', notifId), {
      recipientUid: quote.customerUid,
      senderUid: vendorOwnerUid,
      type: nextStatus === 'sent' ? 'quote_received' : 'quote_status_changed',
      title:
        nextStatus === 'sent'
          ? `New quote received from ${quote.listingName.slice(0, 70)}`
          : `Quote ${quote.id.slice(0, 10)} withdrawn by ${quote.listingName.slice(0, 50)}`,
      body:
        nextStatus === 'sent'
          ? `Quoted total: ₦${Math.round(quote.totalMinor / 100).toLocaleString()} — ${quote.itemsSummary.slice(0, 120)}`
          : 'The vendor withdrew this quotation. Check your Enquiries workspace for updates.',
      entityType: 'quote',
      entityId: quote.id,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Customer Event Planning Workspace (`events/{eventId}`):
 * Lists planned events owned by `ownerUid`.
 */
export async function listCustomerEvents(
  ownerUid: string
): Promise<EventWorkspaceRecord[]> {
  const path = 'events';
  try {
    const q = query(
      collection(db, path),
      where('ownerUid', '==', ownerUid),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<EventWorkspaceRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Creates a new Customer Event Plan in `events/{eventId}`.
 */
export async function createCustomerEvent(
  ownerUid: string,
  input: {
    title: string;
    eventType: EventTypeSlug;
    eventDate?: string | null;
    guestCount?: number | null;
    city: LaunchCity;
    budgetAmountMinor?: number | null;
    notes?: string | null;
  }
): Promise<EventWorkspaceRecord> {
  const trimmedTitle = input.title.trim().slice(0, 120);
  if (trimmedTitle.length < 2) {
    throw new Error('Event title must be at least 2 characters.');
  }

  const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    ownerUid,
    title: trimmedTitle,
    eventType: input.eventType,
    eventDate: input.eventDate?.trim().slice(0, 32) || null,
    timeZone: 'Africa/Lagos' as const,
    guestCount:
      input.guestCount && input.guestCount >= 1
        ? Math.min(50000, Math.round(input.guestCount))
        : null,
    city: input.city,
    state: 'Delta',
    countryCode: 'NG' as const,
    currency: 'NGN' as const,
    budgetAmountMinor:
      input.budgetAmountMinor !== null &&
      input.budgetAmountMinor !== undefined &&
      input.budgetAmountMinor >= 0
        ? Math.round(input.budgetAmountMinor)
        : null,
    notes: input.notes?.trim().slice(0, 2000) || null,
    status: 'planning' as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'events', eventId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `events/${eventId}`);
  }

  return {
    id: eventId,
    ...payload,
  };
}

/**
 * Updates the status of a Customer Event Plan (`planning` | `completed` | `cancelled` | `archived`).
 */
export async function updateCustomerEventStatus(
  ownerUid: string,
  event: EventWorkspaceRecord,
  nextStatus: EventWorkspaceRecord['status']
): Promise<void> {
  if (event.ownerUid !== ownerUid) {
    throw new Error('You can only update your own event plans.');
  }
  const path = `events/${event.id}`;
  try {
    await updateDoc(doc(db, 'events', event.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Deletes a Customer Event Plan owned by `ownerUid`.
 */
export async function deleteCustomerEvent(
  ownerUid: string,
  event: EventWorkspaceRecord
): Promise<void> {
  if (event.ownerUid !== ownerUid) {
    throw new Error('You can only delete your own event plans.');
  }
  const path = `events/${event.id}`;
  try {
    await deleteDoc(doc(db, 'events', event.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Lists all vendor organizations for authorized platform administrators.
 */
export async function listAllVendorOrganizationsForAdmin(): Promise<VendorOrganizationRecord[]> {
  const path = 'vendorOrganizations';
  try {
    const q = query(collection(db, path), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<VendorOrganizationRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Updates vendor organization verification and/or active status as an administrator.
 * Writes an append-only AuditLog and in-app notification.
 */
export async function updateVendorVerificationAsAdmin(
  adminUid: string,
  adminEmail: string,
  organization: VendorOrganizationRecord,
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'unverified',
  status: 'active' | 'suspended' | 'archived',
  reason: string
): Promise<void> {
  const orgPath = `vendorOrganizations/${organization.id}`;
  try {
    await updateDoc(doc(db, 'vendorOrganizations', organization.id), {
      verificationStatus,
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, orgPath);
  }

  // Record AuditLog
  const logId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      actorUid: adminUid,
      actorEmail: adminEmail.slice(0, 254),
      action: `vendor.verification.${verificationStatus}.${status}`,
      targetType: 'vendorOrganization' as const,
      targetId: organization.id,
      reason:
        reason.trim().slice(0, 1000) ||
        `Verification marked as ${verificationStatus}, status ${status}`,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${logId}`);
  }

  // In-app Notification to vendor owner
  const notifId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'notifications', notifId), {
      recipientUid: organization.ownerUid,
      senderUid: adminUid,
      type: 'account_update',
      title: `Business Profile Verification Update: ${organization.name.slice(0, 50)}`,
      body: `Your vendor account verification is now "${verificationStatus.toUpperCase()}" with status "${status.toUpperCase()}". ${reason.trim().slice(0, 200)}`,
      entityType: 'account',
      entityId: organization.id,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Lists recent customer quotes across all vendors for platform GMV calculation and administrative analytics.
 */
export async function listAllQuotesForAdmin(): Promise<QuoteRecord[]> {
  const path = 'quotes';
  try {
    const q = query(collection(db, path), limit(150));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<QuoteRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Lists recent customer enquiries across all vendors for platform demand analytics.
 */
export async function listAllEnquiriesForAdmin(): Promise<EnquiryRecord[]> {
  const path = 'enquiries';
  try {
    const q = query(collection(db, path), limit(150));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<EnquiryRecord, 'id'>),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsRecord = {
  id: 'marketplaceConfig',
  defaultCommissionPercent: 10,
  featuredListingFeeMinor: 500000, // ₦5,000 / week
  categories: LAUNCH_CATEGORIES.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    label: cat.label,
    listingType: cat.listingType,
    commissionPercent: cat.id === 'venue' ? 8 : cat.id === 'rentals' ? 15 : 10,
    isActive: true,
  })),
};

/**
 * Fetches platform settings (category taxonomy & commission rates).
 * Falls back safely to DEFAULT_PLATFORM_SETTINGS if not yet created in Firestore.
 */
export async function getPlatformSettings(): Promise<PlatformSettingsRecord> {
  try {
    const snap = await getDoc(doc(db, 'platformSettings', 'marketplaceConfig'));
    if (!snap.exists()) {
      return DEFAULT_PLATFORM_SETTINGS;
    }
    const data = snap.data();
    let categories: PlatformCategoryConfig[] = DEFAULT_PLATFORM_SETTINGS.categories;
    if (typeof data.categoriesJson === 'string') {
      try {
        const parsed = JSON.parse(data.categoriesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          categories = parsed;
        }
      } catch {
        // Fallback to default
      }
    }
    return {
      id: snap.id,
      defaultCommissionPercent:
        typeof data.defaultCommissionPercent === 'number'
          ? data.defaultCommissionPercent
          : 10,
      featuredListingFeeMinor:
        typeof data.featuredListingFeeMinor === 'number'
          ? data.featuredListingFeeMinor
          : 500000,
      categories,
      updatedBy: data.updatedBy || null,
      updatedAt: data.updatedAt,
    };
  } catch {
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

/**
 * Updates platform configuration (categories and commission rates) as an administrator.
 */
export async function updatePlatformSettingsAsAdmin(
  adminUid: string,
  adminEmail: string,
  settings: {
    defaultCommissionPercent: number;
    featuredListingFeeMinor: number;
    categories: PlatformCategoryConfig[];
  }
): Promise<PlatformSettingsRecord> {
  const path = 'platformSettings/marketplaceConfig';
  const categoriesJson = JSON.stringify(settings.categories);
  const payload = {
    id: 'marketplaceConfig',
    defaultCommissionPercent: Math.max(
      0,
      Math.min(100, Math.round(settings.defaultCommissionPercent))
    ),
    featuredListingFeeMinor: Math.max(0, Math.round(settings.featuredListingFeeMinor)),
    categoriesJson: categoriesJson.slice(0, 50000),
    updatedBy: adminUid,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'platformSettings', 'marketplaceConfig'), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  // Record AuditLog
  const logId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      actorUid: adminUid,
      actorEmail: adminEmail.slice(0, 254),
      action: 'platformSettings.update',
      targetType: 'platformSettings' as const,
      targetId: 'marketplaceConfig',
      reason: `Updated default commission to ${payload.defaultCommissionPercent}% and saved ${settings.categories.length} categories`,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `auditLogs/${logId}`);
  }

  return {
    ...payload,
    categories: settings.categories,
  };
}



