import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  MapPin,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/page-container';
import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { SectionHeader } from '../../components/layout/section-header';
import { MediaGallery } from '../../components/marketplace/media-gallery';
import {
  StickyActionCard,
  getSafeExternalHref,
} from '../../components/marketplace/sticky-action-card';
import { ListingCard } from '../../components/marketplace/listing-card';
import { ComparisonFloatingBar } from '../../components/marketplace/comparison-floating-bar';
import { EnquiryForm } from '../../components/marketplace/enquiry-components';
import { Button } from '../../components/ui/button';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  Skeleton,
} from '../../components/ui/feedback';
import { Dialog } from '../../components/ui/overlays';
import {
  SelectField,
  TextArea,
} from '../../components/ui/inputs';
import { FormField } from '../../components/forms/form-field';
import { useToast } from '../../components/ui/toast';
import { useAuth } from '../../lib/auth/auth-context';
import { AppLink, useRouter } from '../../lib/router/router-context';
import {
  LAUNCH_CATEGORIES,
  formatMinorCurrency,
} from '../../lib/config/env';
import { useSavedCompare } from '../saved-items/saved-compare-context';
import {
  ListingDetailBundle,
  createListingReport,
  getListingDetailBundleBySlugOrId,
} from '../../server/repositories/marketplace-repository';
import {
  ListingServiceRecord,
  ListingType,
  ReportReasonCode,
} from '../../types/marketplace';

export interface ListingDetailPageProps {
  slugOrId: string;
  routeType: ListingType;
}

const REPORT_REASONS: ReadonlyArray<{
  value: ReportReasonCode;
  label: string;
}> = [
  { value: 'misleading-information', label: 'Misleading or inaccurate details' },
  { value: 'inaccurate-pricing', label: 'Inaccurate pricing information' },
  { value: 'duplicate-listing', label: 'Duplicate listing' },
  { value: 'inappropriate-content', label: 'Inappropriate content or photos' },
  { value: 'suspected-scam', label: 'Suspected fraudulent activity' },
  { value: 'other', label: 'Other concern' },
];

function formatBusinessTypeLabel(
  businessType?: string | null
): string {
  switch (businessType) {
    case 'registered-company':
      return 'Registered company';
    case 'sole-proprietor':
      return 'Sole proprietorship';
    case 'partnership':
      return 'Partnership';
    default:
      return 'Event service business';
  }
}

function formatIndoorOutdoorLabel(setting?: string | null): string {
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

function formatServicePackagePrice(service: ListingServiceRecord): string {
  if (service.pricingModel === 'custom-quote' || service.amountMinor <= 0) {
    return 'Custom quote';
  }
  const formatted = formatMinorCurrency(service.amountMinor);
  if (service.pricingModel === 'starting-at') {
    return `From ${formatted}`;
  }
  return formatted;
}

export function ListingDetailPage({
  slugOrId,
  routeType,
}: ListingDetailPageProps) {
  const { firebaseUser, userProfile, isAdmin, isAuthReady } = useAuth();
  const { pathname, navigate } = useRouter();
  const { showToast } = useToast();
  const {
    isSaved,
    isCompared,
    toggleSaveListing,
    toggleCompareListing,
  } = useSavedCompare();

  const [bundle, setBundle] = useState<ListingDetailBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Enquiry Dialog State
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Report Dialog State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReasonCode>(
    'misleading-information'
  );
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadListingDetail = useCallback(async () => {
    if (!isAuthReady) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await getListingDetailBundleBySlugOrId(slugOrId, {
        actorUid: firebaseUser?.uid ?? null,
        isAdmin,
      });
      setBundle(result);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to load listing details right now. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [slugOrId, isAuthReady, firebaseUser?.uid, isAdmin]);

  useEffect(() => {
    void loadListingDetail();
  }, [loadListingDetail]);

  // Dynamic SEO Document Title & Canonical Route Sync
  useEffect(() => {
    if (!bundle?.listing) return;
    const prevTitle = document.title;
    document.title = `${bundle.listing.name} — ${bundle.listing.city} | EventLink`;

    const canonicalPrefix =
      bundle.listing.listingType === 'venue' ? '/venues/' : '/vendors/';
    const canonicalPath = `${canonicalPrefix}${bundle.listing.slug}`;

    // If accessed via wrong route prefix (e.g., a venue opened under /vendors/:slug), normalize URL
    if (
      bundle.listing.listingType !== routeType &&
      pathname !== canonicalPath
    ) {
      navigate(canonicalPath);
    }

    return () => {
      document.title = prevTitle;
    };
  }, [bundle?.listing, routeType, pathname, navigate]);

  const handleOpenEnquiry = (preselectedService?: ListingServiceRecord) => {
    if (!bundle?.listing) return;

    if (!firebaseUser || !userProfile) {
      const canonicalPrefix =
        bundle.listing.listingType === 'venue' ? '/venues/' : '/vendors/';
      const returnUrl = encodeURIComponent(
        `${canonicalPrefix}${bundle.listing.slug}`
      );
      showToast({
        title: 'Sign in to send an enquiry',
        description:
          'Create an account or sign in so the vendor can reply with a structured quote.',
        tone: 'info',
      });
      navigate(`/login?returnTo=${returnUrl}`);
      return;
    }

    setSelectedServiceId(preselectedService ? preselectedService.id : '');
    setIsEnquiryOpen(true);
  };

  const handleOpenReport = () => {
    if (!bundle?.listing) return;
    if (!firebaseUser) {
      const canonicalPrefix =
        bundle.listing.listingType === 'venue' ? '/venues/' : '/vendors/';
      const returnUrl = encodeURIComponent(
        `${canonicalPrefix}${bundle.listing.slug}`
      );
      showToast({
        title: 'Sign in to report a listing',
        description: 'Please sign in so our moderation team can review your report.',
        tone: 'info',
      });
      navigate(`/login?returnTo=${returnUrl}`);
      return;
    }
    setReportError(null);
    setReportDetails('');
    setIsReportOpen(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundle?.listing || !firebaseUser) return;

    setIsSubmittingReport(true);
    setReportError(null);
    try {
      await createListingReport({
        reporterUid: firebaseUser.uid,
        listingId: bundle.listing.id,
        reasonCode: reportReason,
        details: reportDetails.trim() || null,
      });
      setIsReportOpen(false);
      showToast({
        title: 'Report submitted',
        description:
          'Thank you. Our moderation team will review this listing.',
        tone: 'success',
      });
    } catch (err) {
      setReportError(
        err instanceof Error
          ? err.message
          : 'Could not submit report. Please try again.'
      );
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleShareCanonicalUrl = async () => {
    if (!bundle?.listing) return;
    const prefix =
      bundle.listing.listingType === 'venue' ? '/venues/' : '/vendors/';
    const canonicalUrl = `${window.location.origin}${prefix}${bundle.listing.slug}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(canonicalUrl);
      }
      showToast({
        title: 'Shareable link copied',
        description: canonicalUrl,
        tone: 'info',
      });
    } catch {
      showToast({
        title: 'Share link ready',
        description: canonicalUrl,
        tone: 'info',
      });
    }
  };

  // 1. Loading State
  if (isLoading || !isAuthReady) {
    return (
      <PageContainer className="py-8 sm:py-10 space-y-6">
        <Skeleton className="h-5 w-64" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-3/4 max-w-2xl" />
          <Skeleton className="h-5 w-1/2 max-w-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="aspect-[16/9] w-full rounded-[20px]" />
            <Skeleton className="h-32 w-full rounded-[14px]" />
            <Skeleton className="h-48 w-full rounded-[14px]" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-96 w-full rounded-[20px]" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // 2. Network / Query Error State
  if (errorMessage) {
    return (
      <PageContainer className="py-12">
        <ErrorState
          title="Unable to load listing details"
          message={errorMessage}
          onRetry={loadListingDetail}
        />
      </PageContainer>
    );
  }

  // 3. Not Found / Unpublished / Unavailable State
  if (!bundle) {
    return (
      <PageContainer className="py-12 space-y-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Search marketplace', href: '/search' },
            { label: 'Listing unavailable' },
          ]}
        />
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          title="Listing not found or currently unavailable"
          description="This venue or service provider may have been unpublished, archived, or is still undergoing moderation review. Only approved, published listings are visible in the public catalog."
          actionSlot={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <AppLink
                href="/search"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1c3a63] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Browse published listings</span>
              </AppLink>
              <AppLink
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white px-5 py-2.5 text-sm font-semibold text-[#142B4A] hover:bg-[#F4F6F9] transition-colors"
              >
                Return to Home
              </AppLink>
            </div>
          }
        />
      </PageContainer>
    );
  }

  const {
    listing,
    services,
    media,
    vendorSummary,
    relatedListings,
    isPreviewMode,
  } = bundle;

  const categoryObj = LAUNCH_CATEGORIES.find(
    (c) => c.slug === listing.categoryId
  );
  const categoryLabel = categoryObj ? categoryObj.label : listing.categoryId;

  const isLongDescription = listing.description.length > 420;
  const displayedDescription =
    isLongDescription && !isDescriptionExpanded
      ? `${listing.description.slice(0, 420).trim()}…`
      : listing.description;

  const capacityText =
    listing.listingType === 'venue'
      ? listing.capacityMin && listing.capacityMax
        ? `${listing.capacityMin.toLocaleString()} – ${listing.capacityMax.toLocaleString()} guests`
        : listing.capacityMax
        ? `Up to ${listing.capacityMax.toLocaleString()} guests`
        : listing.capacityMin
        ? `From ${listing.capacityMin.toLocaleString()} guests`
        : 'Not provided'
      : null;

  const safeVendorWebsite = getSafeExternalHref(vendorSummary?.websiteUrl);

  return (
    <div className="pb-20">
      <PageContainer className="py-6 sm:py-8 space-y-6">
        {/* Authorized Owner / Admin Preview Banner for Unpublished Listings */}
        {isPreviewMode && (
          <InlineAlert
            tone="warning"
            title={`Authorized Preview — Listing status: ${listing.publicationStatus.replace('_', ' ')} (moderation: ${listing.moderationStatus.replace('_', ' ')})`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                You are viewing a private preview because you own this listing or are a platform administrator. Visitors cannot see this page until it is approved and published.
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-xs text-[#8A5A00]">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                Private preview
              </span>
            </div>
          </InlineAlert>
        )}

        {/* Breadcrumb Hierarchy */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Marketplace', href: '/search' },
            {
              label: categoryLabel,
              href: `/categories/${listing.categoryId}`,
            },
            { label: listing.name },
          ]}
        />

        {/* Listing Header Block */}
        <header className="space-y-3 border-b border-[#E9EDF3] pb-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#475467]">
            <span className="font-semibold uppercase tracking-wider text-[#4778D8]">
              {categoryLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-[#172B4D]">
              <MapPin
                className="h-3.5 w-3.5 text-[#4778D8]"
                aria-hidden="true"
              />
              {listing.city}, Delta State
            </span>
            {listing.listingType === 'venue' && listing.venueType && (
              <>
                <span aria-hidden="true">·</span>
                <span>{listing.venueType}</span>
              </>
            )}
            {listing.serviceAreas && listing.serviceAreas.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Covers: {listing.serviceAreas.join(', ')}
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-[#142B4A] tracking-tight leading-tight">
                {listing.name}
              </h1>
              <p className="text-base text-[#344054] leading-relaxed">
                {listing.headline}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <AppLink
                href="/search"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] border border-[#D7DEE8] bg-white px-3.5 py-2 text-xs font-semibold text-[#142B4A] hover:bg-[#F4F6F9] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Back to results</span>
              </AppLink>
            </div>
          </div>
        </header>

        {/* Main 2-Column Asymmetric Layout: 8 Cols Evaluation Details / 4 Cols Sticky Action Rail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* 1. Interactive Media Gallery */}
            <MediaGallery
              listingName={listing.name}
              listingType={listing.listingType}
              categoryLabel={categoryLabel}
              coverImageUrl={listing.coverImageUrl}
              mediaItems={media}
            />

            {/* 2. Structured Key Facts Bar (<dl>) */}
            <section
              aria-label="Key listing facts"
              className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 sm:p-6"
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#697586] mb-4">
                {listing.listingType === 'venue'
                  ? 'Venue Specifications & Facts'
                  : 'Service Coverage & Facts'}
              </h2>

              {listing.listingType === 'venue' ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Guest capacity</dt>
                    <dd className="text-sm font-bold text-[#142B4A] tabular-nums flex items-center gap-1.5">
                      <Users
                        className="h-4 w-4 text-[#4778D8] shrink-0"
                        aria-hidden="true"
                      />
                      <span>{capacityText}</span>
                    </dd>
                  </div>

                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Space setting</dt>
                    <dd className="text-sm font-bold text-[#142B4A]">
                      {formatIndoorOutdoorLabel(listing.indoorOutdoor)}
                    </dd>
                  </div>

                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Venue type</dt>
                    <dd className="text-sm font-bold text-[#142B4A]">
                      {listing.venueType || 'Not provided'}
                    </dd>
                  </div>

                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">City & location</dt>
                    <dd className="text-sm font-bold text-[#142B4A]">
                      {listing.addressDisplay}
                    </dd>
                  </div>

                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Indicative pricing</dt>
                    <dd className="text-sm font-bold text-[#142B4A] tabular-nums">
                      {listing.displayPriceText || 'Contact for pricing'}
                    </dd>
                  </div>

                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Date availability</dt>
                    <dd className="text-sm font-semibold text-[#344054]">
                      Contact vendor to confirm
                    </dd>
                  </div>
                </dl>
              ) : (
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Service category</dt>
                    <dd className="text-sm font-bold text-[#142B4A]">
                      {categoryLabel}
                    </dd>
                  </div>

                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Base location</dt>
                    <dd className="text-sm font-bold text-[#142B4A]">
                      {listing.addressDisplay}
                    </dd>
                  </div>

                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Service areas covered</dt>
                    <dd className="text-sm font-bold text-[#142B4A]">
                      {(listing.serviceAreas || [listing.city]).join(', ')}
                    </dd>
                  </div>

                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Indicative pricing</dt>
                    <dd className="text-sm font-bold text-[#142B4A] tabular-nums">
                      {listing.displayPriceText || 'Contact for pricing'}
                    </dd>
                  </div>

                  <div className="rounded-[10px] bg-[#F4F6F9] p-3.5 space-y-1">
                    <dt className="text-xs text-[#697586]">Date availability</dt>
                    <dd className="text-sm font-semibold text-[#344054]">
                      Contact vendor to confirm
                    </dd>
                  </div>
                </dl>
              )}
            </section>

            {/* 3. About / Detailed Description Section */}
            <section
              aria-labelledby="about-heading"
              className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4"
            >
              <h2
                id="about-heading"
                className="text-xl font-bold text-[#142B4A]"
              >
                About {listing.name}
              </h2>

              <div className="space-y-3 text-sm sm:text-base text-[#344054] leading-relaxed whitespace-pre-line">
                {displayedDescription}
              </div>

              {isLongDescription && (
                <button
                  type="button"
                  onClick={() =>
                    setIsDescriptionExpanded((prev) => !prev)
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4778D8] hover:text-[#142B4A] transition-colors cursor-pointer"
                >
                  <span>
                    {isDescriptionExpanded
                      ? 'Show less'
                      : 'Read full description'}
                  </span>
                  {isDescriptionExpanded ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              )}
            </section>

            {/* 4. Services & Packages Section */}
            <section
              aria-labelledby="packages-heading"
              className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-5"
            >
              <SectionHeader
                title={
                  listing.listingType === 'venue'
                    ? 'Hire Packages & Rates'
                    : 'Service Packages & Deliverables'
                }
                description="Indicative packages provided by the vendor. Request a quote to confirm pricing for your specific event date and guest count."
              />

              {services.length > 0 ? (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-[12px] border border-[#D7DEE8] bg-[#F4F6F9]/50 p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="flex flex-col sm:flex-row items-start gap-4 max-w-2xl">
                        {service.imageUrl && (
                          <img
                            src={service.imageUrl}
                            alt={`${service.name} package photograph`}
                            referrerPolicy="no-referrer"
                            className="w-full sm:w-44 aspect-[4/3] rounded-[10px] object-cover border border-[#D7DEE8] bg-white shrink-0"
                          />
                        )}
                        <div className="space-y-2.5">
                          <h3 className="text-base font-bold text-[#142B4A]">
                            {service.name}
                          </h3>
                          <p className="text-sm text-[#344054] leading-relaxed">
                            {service.description}
                          </p>

                          {service.inclusions && service.inclusions.length > 0 && (
                            <div className="pt-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-[#697586] mb-2">
                                What is included
                              </p>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#172B4D]">
                                {service.inclusions.map((inc, idx) => (
                                  <li
                                    key={`${service.id}-inc-${idx}`}
                                    className="flex items-start gap-2"
                                  >
                                    <CheckCircle2
                                      className="h-3.5 w-3.5 text-[#146C43] shrink-0 mt-0.5"
                                      aria-hidden="true"
                                    />
                                    <span>{inc}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 border-t sm:border-t-0 border-[#E9EDF3] pt-3 sm:pt-0">
                        <div>
                          <span className="block text-[11px] text-[#697586]">
                            Package price
                          </span>
                          <span className="text-lg font-bold text-[#142B4A] tabular-nums">
                            {formatServicePackagePrice(service)}
                          </span>
                        </div>

                        {listing.acceptsEnquiries && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEnquiry(service)}
                          >
                            Enquire about package
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[12px] border border-[#E9EDF3] bg-[#F4F6F9] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[#142B4A]">
                      Custom event quotations
                    </p>
                    <p className="text-xs text-[#475467]">
                      Individual fixed packages have not been itemized for this listing. Send an enquiry with your event details to receive a structured quote.
                    </p>
                  </div>
                  {listing.acceptsEnquiries && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEnquiry()}
                    >
                      Request custom quote
                    </Button>
                  )}
                </div>
              )}
            </section>

            {/* 5. Amenities & Equipment Features */}
            <section
              aria-labelledby="amenities-heading"
              className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4"
            >
              <h2
                id="amenities-heading"
                className="text-xl font-bold text-[#142B4A]"
              >
                {listing.listingType === 'venue'
                  ? 'Facility Amenities & Infrastructure'
                  : 'Service Highlights & Capabilities'}
              </h2>

              {listing.amenities && listing.amenities.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {listing.amenities.map((amenity) => (
                    <li
                      key={amenity}
                      className="flex items-center gap-2.5 rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9]/60 px-3.5 py-2.5 text-sm font-medium text-[#172B4D]"
                    >
                      <Sparkles
                        className="h-4 w-4 text-[#4778D8] shrink-0"
                        aria-hidden="true"
                      />
                      <span>{amenity}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#697586]">
                  Not provided — ask the vendor directly about specific equipment or facility requirements.
                </p>
              )}
            </section>

            {/* 6. Venue Policies & Rules (Venues Only) */}
            {listing.listingType === 'venue' && (
              <section
                aria-labelledby="policies-heading"
                className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4"
              >
                <h2
                  id="policies-heading"
                  className="text-xl font-bold text-[#142B4A]"
                >
                  Venue Rules & Policies
                </h2>
                <p className="text-xs text-[#697586]">
                  Confirm all operational rules, setup windows, and caution fee terms before finalizing your event agreement.
                </p>

                <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9]/50 p-4 space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
                      Catering policy
                    </dt>
                    <dd className="text-sm font-medium text-[#172B4D]">
                      {listing.cateringPolicy ||
                        'Not provided — confirm with venue'}
                    </dd>
                  </div>

                  <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9]/50 p-4 space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
                      Decoration policy
                    </dt>
                    <dd className="text-sm font-medium text-[#172B4D]">
                      {listing.decorationPolicy ||
                        'Not provided — confirm with venue'}
                    </dd>
                  </div>

                  <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9]/50 p-4 space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
                      Alcohol & corkage policy
                    </dt>
                    <dd className="text-sm font-medium text-[#172B4D]">
                      {listing.alcoholPolicy ||
                        'Not provided — confirm with venue'}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* 7. Vendor / Business Profile Summary */}
            <section
              aria-labelledby="business-profile-heading"
              className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                {vendorSummary?.logoImageUrl ? (
                  <img
                    src={vendorSummary.logoImageUrl}
                    alt={`${vendorSummary.name} profile picture`}
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 rounded-full object-cover border-2 border-[#4778D8] bg-white shrink-0"
                  />
                ) : (
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#F4F6F9] border border-[#D7DEE8] text-[#142B4A] shrink-0">
                    <Building2
                      className="h-6 w-6 text-[#4778D8]"
                      aria-hidden="true"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
                    Managed by vendor organization
                  </span>
                  <h2
                    id="business-profile-heading"
                    className="text-lg font-bold text-[#142B4A]"
                  >
                    {vendorSummary ? vendorSummary.name : listing.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#475467]">
                    <span>
                      {formatBusinessTypeLabel(vendorSummary?.businessType)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {vendorSummary
                        ? `${vendorSummary.city}, ${vendorSummary.state} State`
                        : `${listing.city}, Delta State`}
                    </span>
                    {vendorSummary?.logoImageUrl && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 font-medium text-[#146C43]">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Verified profile photo
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {vendorSummary?.description && (
                <p className="text-sm text-[#344054] leading-relaxed">
                  {vendorSummary.description}
                </p>
              )}

              {safeVendorWebsite && listing.contactVisibility === 'public' && (
                <div className="pt-1">
                  <a
                    href={safeVendorWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4778D8] hover:underline"
                  >
                    <span>Visit official website</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              )}
            </section>
          </div>

          {/* Right Column (4 Cols): Sticky Evaluation & Action Card */}
          <div className="lg:col-span-4">
            <StickyActionCard
              listing={listing}
              vendorSummary={vendorSummary}
              isSaved={isSaved(listing.id)}
              isCompared={isCompared(listing.id)}
              onToggleSave={() => toggleSaveListing(listing.id, listing.name)}
              onToggleCompare={() =>
                toggleCompareListing(listing.id, listing.name)
              }
              onOpenEnquiry={() => handleOpenEnquiry()}
              onShareListing={handleShareCanonicalUrl}
              onOpenReport={handleOpenReport}
            />
          </div>
        </div>

        {/* Related Published Listings Section */}
        {relatedListings.length > 0 && (
          <section
            aria-labelledby="related-listings-heading"
            className="pt-8 border-t border-[#D7DEE8] space-y-6"
          >
            <SectionHeader
              title="More options in Warri & Effurun"
              description="Compare similar published venues and event service professionals."
              action={
                <AppLink
                  href={`/categories/${listing.categoryId}`}
                  className="text-sm font-semibold text-[#4778D8] hover:underline"
                >
                  View all in {categoryLabel}
                </AppLink>
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedListings.map((rel) => (
                <ListingCard key={rel.id} listing={rel} />
              ))}
            </div>
          </section>
        )}
      </PageContainer>

      {/* Persistent Venue Comparison Floating Bar */}
      <ComparisonFloatingBar />

      {/* Customer Enquiry Dialog */}
      <Dialog
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
        title={`Send Enquiry to ${listing.name}`}
        description="Share your event date, guest count, and requirements. The vendor will respond with availability and a structured quotation."
        maxWidthClass="max-w-xl"
      >
        {firebaseUser && userProfile && (
          <EnquiryForm
            listing={listing}
            services={services}
            customerUid={firebaseUser.uid}
            customerName={userProfile.displayName}
            customerEmail={userProfile.email}
            initialServiceId={selectedServiceId}
            onSuccess={(created) => {
              showToast({
                title: 'Enquiry sent to vendor',
                description: `Reference ${created.id.slice(0, 12)} recorded.`,
                tone: 'success',
              });
            }}
            onCancel={() => setIsEnquiryOpen(false)}
          />
        )}
      </Dialog>

      {/* Report Listing Dialog */}
      <Dialog
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title={`Report ${listing.name}`}
        description="Help keep EventLink Warri & Effurun accurate and trustworthy. Reports are reviewed confidentially by platform administrators."
        maxWidthClass="max-w-md"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsReportOpen(false)}
              disabled={isSubmittingReport}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="report-listing-form"
              variant="destructive"
              isLoading={isSubmittingReport}
            >
              Submit Report
            </Button>
          </div>
        }
      >
        <form
          id="report-listing-form"
          onSubmit={handleSubmitReport}
          className="space-y-4"
        >
          {reportError && (
            <InlineAlert tone="danger" title="Could not submit report">
              {reportError}
            </InlineAlert>
          )}

          <FormField id="report-reason" label="Reason for report" required>
            <SelectField
              id="report-reason"
              value={reportReason}
              onChange={(e) =>
                setReportReason(e.target.value as ReportReasonCode)
              }
              options={REPORT_REASONS}
            />
          </FormField>

          <FormField
            id="report-details"
            label="Additional details"
            hint="Optional context to help our moderation team verify the issue."
          >
            <TextArea
              id="report-details"
              rows={3}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Describe what is inaccurate or concerning…"
              maxLength={1500}
            />
          </FormField>
        </form>
      </Dialog>
    </div>
  );
}
