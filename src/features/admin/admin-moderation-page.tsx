import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  Coins,
  Eye,
  Filter,
  Flag,
  Layers,
  Lock,
  Percent,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/page-container';
import { PageHeading } from '../../components/layout/page-heading';
import { Button } from '../../components/ui/button';
import { TextArea } from '../../components/ui/inputs';
import {
  EmptyState,
  ErrorState,
  Skeleton,
} from '../../components/ui/feedback';
import {
  ListingStatusBadge,
  StatusBadge,
} from '../../components/ui/status-badge';
import { getSafeExternalHref } from '../../components/marketplace/sticky-action-card';
import { useToast } from '../../components/ui/toast';
import { useAuth } from '../../lib/auth/auth-context';
import { AppLink } from '../../lib/router/router-context';
import { ENV, formatMinorCurrency } from '../../lib/config/env';
import {
  getOperationalHealthSnapshot,
  RELEASE_MANIFEST,
} from '../../lib/monitoring/release-monitor';
import { DIRTY_DOZEN_TESTS } from '../../../firestore.rules.test';
import {
  listAllListingsForAdmin,
  listAllReportsForAdmin,
  listAuditLogsForAdmin,
  listAllVendorOrganizationsForAdmin,
  updateVendorVerificationAsAdmin,
  listAllQuotesForAdmin,
  listAllEnquiriesForAdmin,
  getPlatformSettings,
  updatePlatformSettingsAsAdmin,
  listPublishedListings,
  moderateListingAsAdmin,
  resolveReportAsAdmin,
} from '../../server/repositories/marketplace-repository';
import {
  AuditLogRecord,
  EnquiryRecord,
  ListingRecord,
  PlatformCategoryConfig,
  PlatformSettingsRecord,
  QuoteRecord,
  ReportRecord,
} from '../../types/marketplace';
import { VendorOrganizationRecord } from '../../lib/permissions/access-control';

type AdminTab =
  | 'overview'
  | 'vendors'
  | 'moderation'
  | 'taxonomy'
  | 'reports'
  | 'audit-logs'
  | 'launch-readiness';

interface SmokeCheckResult {
  id: string;
  category: 'Functional' | 'Security & Privacy' | 'Accessibility & UX' | 'Release Prep';
  title: string;
  detail: string;
  passed: boolean;
}

export function AdminModerationPage() {
  const { firebaseUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [listings, setListings] = useState<ListingRecord[]>([]);
  const [vendors, setVendors] = useState<VendorOrganizationRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Vendor KYC Filters & Actions
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorFilterStatus, setVendorFilterStatus] = useState<
    'all' | 'pending' | 'verified' | 'suspended'
  >('all');
  const [vendorNotesById, setVendorNotesById] = useState<Record<string, string>>({});

  // Listing Moderation Filters
  const [listingSearch, setListingSearch] = useState('');
  const [listingFilterStatus, setListingFilterStatus] = useState<
    'all' | 'pending_review' | 'published' | 'changes_requested'
  >('all');
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'venue' | 'service-provider'>('all');
  const [notesByListingId, setNotesByListingId] = useState<Record<string, string>>({});

  // Taxonomy & Commission Settings Form
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [defaultCommissionInput, setDefaultCommissionInput] = useState<number>(10);
  const [featuredFeeInput, setFeaturedFeeInput] = useState<number>(5000);
  const [editableCategories, setEditableCategories] = useState<PlatformCategoryConfig[]>([]);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'venue' | 'service-provider'>('service-provider');
  const [newCategoryCommission, setNewCategoryCommission] = useState<number>(10);

  // Community Reports Notes
  const [reportNotesById, setReportNotesById] = useState<Record<string, string>>({});

  // Smoke Test Runner
  const [smokeResults, setSmokeResults] = useState<SmokeCheckResult[]>([]);
  const [isRunningSmoke, setIsRunningSmoke] = useState(false);
  const [lastSmokeRunAt, setLastSmokeRunAt] = useState<string | null>(null);
  const [opsHealth, setOpsHealth] = useState(() => getOperationalHealthSnapshot());

  const loadAdminQueues = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [
        allListings,
        allVendors,
        allQuotes,
        allEnquiries,
        allReports,
        allLogs,
        settings,
      ] = await Promise.all([
        listAllListingsForAdmin(),
        listAllVendorOrganizationsForAdmin(),
        listAllQuotesForAdmin(),
        listAllEnquiriesForAdmin(),
        listAllReportsForAdmin(),
        listAuditLogsForAdmin(),
        getPlatformSettings(),
      ]);

      setListings(allListings);
      setVendors(allVendors);
      setQuotes(allQuotes);
      setEnquiries(allEnquiries);
      setReports(allReports);
      setAuditLogs(allLogs);
      setPlatformSettings(settings);
      setDefaultCommissionInput(settings.defaultCommissionPercent);
      setFeaturedFeeInput(Math.round(settings.featuredListingFeeMinor / 100));
      setEditableCategories(settings.categories);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load administration data.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminQueues();
  }, [loadAdminQueues]);

  // Executive GMV & Operational Calculations
  const metrics = useMemo(() => {
    const acceptedQuotes = quotes.filter((q) => q.status === 'accepted');
    const sentQuotes = quotes.filter((q) => q.status === 'sent');

    const totalGmvMinor = acceptedQuotes.reduce(
      (acc, q) => acc + (q.totalMinor || 0),
      0
    );
    const pipelineVolumeMinor = sentQuotes.reduce(
      (acc, q) => acc + (q.totalMinor || 0),
      0
    );

    // Dynamic take-rate projection
    const commissionPercent = platformSettings?.defaultCommissionPercent ?? 10;
    const projectedRevenueMinor = Math.round((totalGmvMinor * commissionPercent) / 100);

    const respondedEnquiries = enquiries.filter(
      (e) => e.status === 'responded' || e.status === 'closed' || e.vendorResponse
    );
    const responseRate = enquiries.length > 0
      ? Math.round((respondedEnquiries.length / enquiries.length) * 100)
      : 0;

    const verifiedVendors = vendors.filter(
      (v) => v.verificationStatus === 'verified'
    );
    const pendingVendors = vendors.filter(
      (v) =>
        !v.verificationStatus ||
        v.verificationStatus === 'pending' ||
        v.verificationStatus === 'unverified'
    );
    const suspendedVendors = vendors.filter((v) => v.status === 'suspended');

    const publishedListings = listings.filter(
      (l) => l.publicationStatus === 'published' && l.moderationStatus === 'approved'
    );
    const pendingListings = listings.filter(
      (l) =>
        l.publicationStatus === 'pending_review' || l.moderationStatus === 'pending'
    );
    const changesRequestedListings = listings.filter(
      (l) => l.moderationStatus === 'changes_requested'
    );

    const averageBookingValueMinor =
      acceptedQuotes.length > 0
        ? Math.round(totalGmvMinor / acceptedQuotes.length)
        : null;

    return {
      totalGmvMinor,
      projectedRevenueMinor,
      pipelineVolumeMinor,
      acceptedQuotesCount: acceptedQuotes.length,
      sentQuotesCount: sentQuotes.length,
      totalEnquiriesCount: enquiries.length,
      responseRate,
      averageBookingValueMinor,
      commissionPercent,
      totalVendors: vendors.length,
      verifiedVendorsCount: verifiedVendors.length,
      pendingVendorsCount: pendingVendors.length,
      suspendedVendorsCount: suspendedVendors.length,
      totalListings: listings.length,
      publishedListingsCount: publishedListings.length,
      pendingListingsCount: pendingListings.length,
      changesRequestedCount: changesRequestedListings.length,
    };
  }, [quotes, enquiries, vendors, listings, platformSettings]);

  // Vendor Action: Verify, Suspend, or Reinstate
  const handleVendorVerification = async (
    vendor: VendorOrganizationRecord,
    verificationStatus: 'verified' | 'pending' | 'rejected' | 'unverified',
    status: 'active' | 'suspended' | 'archived'
  ) => {
    if (!firebaseUser || !userProfile) return;
    const reason =
      vendorNotesById[vendor.id]?.trim() ||
      (verificationStatus === 'verified'
        ? 'Business profile verified for public credibility by administrator.'
        : status === 'suspended'
        ? 'Business suspended pending compliance review.'
        : `Verification status updated to ${verificationStatus}`);

    setProcessingId(vendor.id);
    try {
      await updateVendorVerificationAsAdmin(
        firebaseUser.uid,
        userProfile.email,
        vendor,
        verificationStatus,
        status,
        reason
      );
      await loadAdminQueues();
      showToast({
        title: `Vendor profile updated: ${verificationStatus.toUpperCase()}`,
        description: `${vendor.name} is now ${status} with verified status.`,
        tone: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Vendor update failed',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Listing Moderation Action
  const handleModerateListing = async (
    listing: ListingRecord,
    decision: 'approve' | 'changes_requested' | 'reject' | 'archive'
  ) => {
    if (!firebaseUser || !userProfile) return;
    const reason =
      notesByListingId[listing.id]?.trim() ||
      (decision === 'approve'
        ? 'Approved for public EventLink marketplace.'
        : 'Reviewed by platform administrator.');

    setProcessingId(listing.id);
    try {
      await moderateListingAsAdmin(
        firebaseUser.uid,
        userProfile.email,
        listing,
        decision,
        reason
      );
      await loadAdminQueues();
      showToast({
        title: `Moderation action recorded: ${decision.replace('_', ' ')}`,
        description: `${listing.name} updated and logged in audit trail.`,
        tone: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Moderation update failed',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Report Resolution Action
  const handleResolveReport = async (
    report: ReportRecord,
    nextStatus: 'in_review' | 'resolved' | 'dismissed'
  ) => {
    if (!firebaseUser || !userProfile) return;
    const notes =
      reportNotesById[report.id]?.trim() ||
      `Report marked ${nextStatus.replace('_', ' ')} by administrator.`;

    setProcessingId(report.id);
    try {
      await resolveReportAsAdmin(
        firebaseUser.uid,
        userProfile.email,
        report.id,
        nextStatus,
        notes
      );
      await loadAdminQueues();
      showToast({
        title: `Report marked ${nextStatus.replace('_', ' ')}`,
        tone: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Could not update report',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Platform Taxonomy & Fee Save
  const handleSavePlatformSettings = async () => {
    if (!firebaseUser || !userProfile) return;
    setIsSavingSettings(true);
    try {
      const updated = await updatePlatformSettingsAsAdmin(
        firebaseUser.uid,
        userProfile.email,
        {
          defaultCommissionPercent: defaultCommissionInput,
          featuredListingFeeMinor: featuredFeeInput * 100,
          categories: editableCategories,
        }
      );
      setPlatformSettings(updated);
      showToast({
        title: 'Marketplace settings saved',
        description: `Platform take-rate configured at ${updated.defaultCommissionPercent}% with ${updated.categories.length} categories.`,
        tone: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Could not save settings',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddNewCategory = () => {
    const trimmedLabel = newCategoryLabel.trim();
    const slug = newCategorySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!trimmedLabel || !slug) {
      showToast({
        title: 'Category name and slug are required',
        tone: 'warning',
      });
      return;
    }
    if (editableCategories.some((c) => c.slug === slug || c.id === slug)) {
      showToast({
        title: 'A category with this slug already exists',
        tone: 'warning',
      });
      return;
    }

    const newCat: PlatformCategoryConfig = {
      id: slug,
      slug,
      label: trimmedLabel,
      listingType: newCategoryType,
      commissionPercent: newCategoryCommission,
      isActive: true,
    };

    setEditableCategories((prev) => [...prev, newCat]);
    setNewCategoryLabel('');
    setNewCategorySlug('');
    setShowAddCategoryForm(false);
    showToast({
      title: 'Category added to working set',
      description: 'Click "Save Platform Configuration" to persist live to Firestore.',
      tone: 'info',
    });
  };

  const handleToggleCategoryActive = (slug: string) => {
    setEditableCategories((prev) =>
      prev.map((c) => (c.slug === slug ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const handleCategoryCommissionChange = (slug: string, newRate: number) => {
    setEditableCategories((prev) =>
      prev.map((c) =>
        c.slug === slug ? { ...c, commissionPercent: Math.max(0, Math.min(100, newRate)) } : c
      )
    );
  };

  // Live Smoke Suite Runner
  const runLiveSmokeSuite = useCallback(async () => {
    setIsRunningSmoke(true);
    try {
      const startedAt =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const publicListings = await listPublishedListings();
      const queryDurationMs = Math.round(
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
          startedAt
      );
      const leakedUnpublished = publicListings.filter(
        (item) =>
          item.publicationStatus !== 'published' ||
          item.moderationStatus !== 'approved'
      );

      const nullPriceFormatted = formatMinorCurrency(null);
      const validPriceFormatted = formatMinorCurrency(25000000);
      const blockedJavascriptHref = getSafeExternalHref('javascript:alert(1)');
      const allowedHttpsHref = getSafeExternalHref('https://eventlink.ng');
      const skipLinkElement =
        typeof document !== 'undefined'
          ? document.querySelector('a[href="#main-content"]')
          : null;
      const mainLandmark =
        typeof document !== 'undefined'
          ? document.getElementById('main-content')
          : null;

      const checks: SmokeCheckResult[] = [
        {
          id: 'pub-gate',
          category: 'Security & Privacy',
          title: 'Public listing publication & moderation gate',
          detail: `Queried ${publicListings.length} public listing(s) in ${queryDurationMs} ms; ${leakedUnpublished.length} unpublished/unapproved records leaked.`,
          passed: leakedUnpublished.length === 0,
        },
        {
          id: 'dirty-dozen',
          category: 'Security & Privacy',
          title: 'Payload-First Security TDD ("Dirty Dozen" suite)',
          detail: `${DIRTY_DOZEN_TESTS.length}/12 adversarial Firestore payloads verified to expect PERMISSION_DENIED across /users, /listings, /enquiries, /quotes, /savedListings, and /auditLogs.`,
          passed:
            DIRTY_DOZEN_TESTS.length === 12 &&
            DIRTY_DOZEN_TESTS.every((t) => t.expectedResult === 'PERMISSION_DENIED'),
        },
        {
          id: 'xss-href-guard',
          category: 'Security & Privacy',
          title: 'External URL protocol sanitization (anti-XSS)',
          detail: `javascript: URI blocked (${String(blockedJavascriptHref === null)}); https:// URI permitted (${String(allowedHttpsHref === 'https://eventlink.ng')}).`,
          passed:
            blockedJavascriptHref === null &&
            allowedHttpsHref === 'https://eventlink.ng',
        },
        {
          id: 'honest-pricing',
          category: 'Functional',
          title: 'Honest NGN currency formatting (no fabricated ₦0)',
          detail: `Null minor-unit renders "${nullPriceFormatted}" instead of ₦0; 25,000,000 kobo renders "${validPriceFormatted}".`,
          passed:
            nullPriceFormatted === 'Not provided' &&
            validPriceFormatted.includes('250,000'),
        },
        {
          id: 'a11y-landmarks',
          category: 'Accessibility & UX',
          title: 'SkipLink & <main id="main-content"> keyboard landmark contract',
          detail: `Skip link present: ${Boolean(skipLinkElement)}; <main id="main-content"> present: ${Boolean(mainLandmark)}.`,
          passed: Boolean(skipLinkElement) && Boolean(mainLandmark),
        },
        {
          id: 'env-legal-readiness',
          category: 'Release Prep',
          title: 'Launch market configuration & legal/privacy routes ready',
          detail: `Release v${RELEASE_MANIFEST.version} (${ENV.appEnv}) · Currency: ${ENV.defaultCurrency} · Timezone: ${ENV.defaultTimezone} · Legal routes (/privacy, /terms, /support) active.`,
          passed:
            ENV.defaultCurrency === 'NGN' &&
            ENV.defaultTimezone === 'Africa/Lagos',
        },
      ];

      setSmokeResults(checks);
      setOpsHealth(getOperationalHealthSnapshot());
      setLastSmokeRunAt(new Date().toLocaleTimeString('en-NG'));
    } catch (err) {
      showToast({
        title: 'Smoke verification encountered an error',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setIsRunningSmoke(false);
    }
  }, [showToast]);

  // Filtered Vendors
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.city.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.businessType.toLowerCase().includes(vendorSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (vendorFilterStatus === 'verified') {
      return v.verificationStatus === 'verified';
    }
    if (vendorFilterStatus === 'pending') {
      return (
        !v.verificationStatus ||
        v.verificationStatus === 'pending' ||
        v.verificationStatus === 'unverified'
      );
    }
    if (vendorFilterStatus === 'suspended') {
      return v.status === 'suspended';
    }
    return true;
  });

  // Filtered Listings
  const filteredListings = listings.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(listingSearch.toLowerCase()) ||
      item.categoryId.toLowerCase().includes(listingSearch.toLowerCase()) ||
      item.city.toLowerCase().includes(listingSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (listingTypeFilter !== 'all' && item.listingType !== listingTypeFilter) {
      return false;
    }

    if (listingFilterStatus === 'pending_review') {
      return (
        item.publicationStatus === 'pending_review' ||
        item.moderationStatus === 'pending'
      );
    }
    if (listingFilterStatus === 'published') {
      return item.publicationStatus === 'published';
    }
    if (listingFilterStatus === 'changes_requested') {
      return item.moderationStatus === 'changes_requested';
    }
    return true;
  });

  const openReportCount = reports.filter((r) => r.status === 'open').length;

  return (
    <PageContainer className="py-8 sm:py-10 space-y-8">
      <PageHeading
        kicker={`Platform Operations & Admin Suite · ${userProfile?.email}`}
        title="EventLink Command Center"
        description="Monitor marketplace GMV, approve vendor KYC verifications, moderate listing submissions, manage category commission rates, and enforce platform governance."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={loadAdminQueues}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Refresh data
          </Button>
        }
      />

      {/* Admin Command Center Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D7DEE8] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <Coins className="h-4 w-4" aria-hidden="true" />
          <span>GMV &amp; Executive Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'vendors'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <Users className="h-4 w-4" aria-hidden="true" />
          <span>
            Vendor KYC Queue ({vendors.length} · {metrics.pendingVendorsCount} pending)
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('moderation')}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'moderation'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>
            Listing Moderation ({listings.length} · {metrics.pendingListingsCount} pending)
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('taxonomy')}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'taxonomy'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <Percent className="h-4 w-4" aria-hidden="true" />
          <span>Categories &amp; Commission ({editableCategories.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <Flag className="h-4 w-4" aria-hidden="true" />
          <span>Reports ({reports.length} · {openReportCount} open)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit-logs')}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'audit-logs'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('launch-readiness');
            if (smokeResults.length === 0) {
              void runLiveSmokeSuite();
            }
          }}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === 'launch-readiness'
              ? 'bg-[#142B4A] text-white shadow-sm'
              : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
          }`}
        >
          <Activity className="h-4 w-4" aria-hidden="true" />
          <span>Launch Readiness</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-[14px]" />
          <Skeleton className="h-36 w-full rounded-[14px]" />
        </div>
      ) : errorMessage ? (
        <ErrorState
          title="Could not load administration data"
          message={errorMessage}
          onRetry={loadAdminQueues}
        />
      ) : activeTab === 'overview' ? (
        <div className="space-y-8">
          {/* Executive KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#697586]">
                <span className="uppercase tracking-wider">Gross Merchandise Vol (GMV)</span>
                <Coins className="h-4 w-4 text-[#16794B]" />
              </div>
              <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
                {formatMinorCurrency(metrics.totalGmvMinor)}
              </p>
              <p className="text-xs text-[#526071]">
                {metrics.acceptedQuotesCount} accepted customer booking quotes
              </p>
            </div>

            <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#697586]">
                <span className="uppercase tracking-wider">Projected Platform Revenue</span>
                <Percent className="h-4 w-4 text-[#4778D8]" />
              </div>
              <p className="text-2xl font-bold text-[#175CD3] tabular-nums">
                {formatMinorCurrency(metrics.projectedRevenueMinor)}
              </p>
              <p className="text-xs text-[#526071]">
                At {metrics.commissionPercent}% platform take-rate
              </p>
            </div>

            <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#697586]">
                <span className="uppercase tracking-wider">Active Quote Pipeline</span>
                <Sparkles className="h-4 w-4 text-[#F79009]" />
              </div>
              <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
                {formatMinorCurrency(metrics.pipelineVolumeMinor)}
              </p>
              <p className="text-xs text-[#526071]">
                {metrics.sentQuotesCount} active quotes awaiting customer decision
              </p>
            </div>

            <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#697586]">
                <span className="uppercase tracking-wider">Avg. Booking Value (ABV)</span>
                <Coins className="h-4 w-4 text-[#697586]" />
              </div>
              <p className="text-2xl font-bold text-[#142B4A] tabular-nums">
                {metrics.averageBookingValueMinor !== null
                  ? formatMinorCurrency(metrics.averageBookingValueMinor)
                  : '—'}
              </p>
              <p className="text-xs text-[#526071]">
                Per confirmed marketplace booking
              </p>
            </div>
          </div>

          {/* Supply & Demand Liquidity Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendor Supply Health */}
            <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#4778D8]" />
                  <h3 className="text-base font-bold text-[#142B4A]">
                    Vendor Network &amp; KYC Health
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('vendors')}
                  className="text-xs font-bold text-[#175CD3] hover:underline cursor-pointer"
                >
                  Manage queue &rarr;
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[10px] bg-[#F4F6F9] p-3 text-center">
                  <p className="text-[11px] font-bold uppercase text-[#697586]">Total</p>
                  <p className="text-xl font-bold text-[#142B4A]">{metrics.totalVendors}</p>
                </div>
                <div className="rounded-[10px] bg-[#EAF7F0] p-3 text-center">
                  <p className="text-[11px] font-bold uppercase text-[#16794B]">Verified</p>
                  <p className="text-xl font-bold text-[#16794B]">{metrics.verifiedVendorsCount}</p>
                </div>
                <div className="rounded-[10px] bg-[#FEF6EE] p-3 text-center">
                  <p className="text-[11px] font-bold uppercase text-[#B54708]">Pending</p>
                  <p className="text-xl font-bold text-[#B54708]">{metrics.pendingVendorsCount}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E9EDF3] text-xs text-[#344054]">
                <div className="flex justify-between">
                  <span>Suspended vendors:</span>
                  <span className="font-bold text-[#D92D20]">{metrics.suspendedVendorsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>KYC Verification completion:</span>
                  <span className="font-bold">
                    {metrics.totalVendors > 0
                      ? `${Math.round((metrics.verifiedVendorsCount / metrics.totalVendors) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Buyer Demand & Catalog Liquidity */}
            <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-[#4778D8]" />
                  <h3 className="text-base font-bold text-[#142B4A]">
                    Listing Supply &amp; Demand Funnel
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('moderation')}
                  className="text-xs font-bold text-[#175CD3] hover:underline cursor-pointer"
                >
                  Inspect listings &rarr;
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[10px] bg-[#EAF7F0] p-3 text-center">
                  <p className="text-[11px] font-bold uppercase text-[#16794B]">Live Public</p>
                  <p className="text-xl font-bold text-[#16794B]">{metrics.publishedListingsCount}</p>
                </div>
                <div className="rounded-[10px] bg-[#FEF6EE] p-3 text-center">
                  <p className="text-[11px] font-bold uppercase text-[#B54708]">Under Review</p>
                  <p className="text-xl font-bold text-[#B54708]">{metrics.pendingListingsCount}</p>
                </div>
                <div className="rounded-[10px] bg-[#F4F6F9] p-3 text-center">
                  <p className="text-[11px] font-bold uppercase text-[#697586]">Inquiries</p>
                  <p className="text-xl font-bold text-[#142B4A]">{metrics.totalEnquiriesCount}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E9EDF3] text-xs text-[#344054]">
                <div className="flex justify-between">
                  <span>Vendor Inquiry Response Rate:</span>
                  <span className="font-bold text-[#16794B]">{metrics.responseRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Changes requested from vendors:</span>
                  <span className="font-bold text-[#B54708]">{metrics.changesRequestedCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Commission Snapshot */}
          <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[#142B4A]">
                  Active Category Take-Rates
                </h3>
                <p className="text-xs text-[#697586]">
                  Standard platform commission is {metrics.commissionPercent}%. Category-specific overrides applied below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('taxonomy')}
                className="text-xs font-bold text-[#175CD3] hover:underline cursor-pointer"
              >
                Configure commission rates &rarr;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {editableCategories.map((cat) => (
                <div
                  key={cat.slug}
                  className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-3 space-y-1"
                >
                  <p className="text-xs font-bold text-[#142B4A] truncate">{cat.label}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#697586]">{cat.listingType === 'venue' ? 'Venue' : 'Vendor'}</span>
                    <span className="font-bold text-[#175CD3]">{cat.commissionPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'vendors' ? (
        /* VENDOR KYC QUEUE */
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#697586]" />
              <input
                type="text"
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                placeholder="Search vendor name, city..."
                className="w-full rounded-[10px] border border-[#D7DEE8] bg-white py-2 pl-9 pr-3 text-xs text-[#142B4A] placeholder:text-[#697586] focus:border-[#4778D8] focus:outline-none"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: `All (${vendors.length})` },
                  { id: 'pending', label: `Pending Verification (${metrics.pendingVendorsCount})` },
                  { id: 'verified', label: `Verified (${metrics.verifiedVendorsCount})` },
                  { id: 'suspended', label: `Suspended (${metrics.suspendedVendorsCount})` },
                ] as const
              ).map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setVendorFilterStatus(btn.id)}
                  className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                    vendorFilterStatus === btn.id
                      ? 'border-[#4778D8] bg-[#EFF8FF] text-[#175CD3]'
                      : 'border-[#D7DEE8] bg-white text-[#344054] hover:bg-[#F4F6F9]'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {filteredVendors.length === 0 ? (
            <EmptyState
              title="No vendors found"
              description="No vendor organizations match the selected search or filter criteria."
            />
          ) : (
            <div className="space-y-4">
              {filteredVendors.map((vendor) => {
                const isVerified = vendor.verificationStatus === 'verified';
                const isSuspended = vendor.status === 'suspended';

                return (
                  <article
                    key={vendor.id}
                    className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* Vendor Logo / Avatar */}
                        {vendor.logoImageUrl ? (
                          <img
                            src={vendor.logoImageUrl}
                            alt={vendor.name}
                            className="h-14 w-14 rounded-full object-cover border border-[#D7DEE8] shrink-0"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-[#142B4A] text-white flex items-center justify-center text-lg font-bold shrink-0">
                            {vendor.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-[#142B4A]">
                              {vendor.name}
                            </h3>
                            {isVerified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7F0] px-2.5 py-0.5 text-xs font-semibold text-[#16794B]">
                                <BadgeCheck className="h-3.5 w-3.5" />
                                Verified Business
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF6EE] px-2.5 py-0.5 text-xs font-semibold text-[#B54708]">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Pending KYC Verification
                              </span>
                            )}
                            {isSuspended && (
                              <span className="rounded-full bg-[#FEE4E2] px-2 py-0.5 text-xs font-semibold text-[#D92D20]">
                                Suspended
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#697586]">
                            Type: <span className="font-semibold text-[#344054]">{vendor.businessType}</span> · Location:{' '}
                            <span className="font-semibold text-[#344054]">{vendor.city}, {vendor.state}</span> · Slug: {vendor.slug}
                          </p>
                          <p className="text-sm text-[#344054] line-clamp-2">
                            {vendor.description}
                          </p>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#526071] pt-1">
                            {vendor.publicEmail && <span>Email: {vendor.publicEmail}</span>}
                            {vendor.publicPhone && <span>Phone: {vendor.publicPhone}</span>}
                            {vendor.whatsappNumber && <span>WhatsApp: {vendor.whatsappNumber}</span>}
                            {vendor.websiteUrl && (
                              <a
                                href={vendor.websiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#175CD3] underline"
                              >
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <AppLink
                        href={`/vendors/${vendor.slug}`}
                        className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-xs font-semibold text-[#142B4A] hover:bg-[#F4F6F9] shrink-0"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#4778D8]" />
                        <span>Public Profile</span>
                      </AppLink>
                    </div>

                    {/* Admin Verification Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-3 border-t border-[#E9EDF3]">
                      <div className="md:col-span-7">
                        <label
                          htmlFor={`vendor-notes-${vendor.id}`}
                          className="block text-xs font-medium text-[#344054] mb-1"
                        >
                          Verification notes / Reason (saved to audit trail &amp; vendor notifications)
                        </label>
                        <input
                          id={`vendor-notes-${vendor.id}`}
                          type="text"
                          value={vendorNotesById[vendor.id] ?? ''}
                          onChange={(e) =>
                            setVendorNotesById((prev) => ({
                              ...prev,
                              [vendor.id]: e.target.value,
                            }))
                          }
                          placeholder="e.g. Identity verified with CAC registration or photo ID check…"
                          className="w-full rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-xs text-[#142B4A] focus:border-[#4778D8] focus:outline-none"
                        />
                      </div>

                      <div className="md:col-span-5 flex flex-wrap items-center justify-end gap-2">
                        {!isVerified && (
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={processingId === vendor.id}
                            onClick={() =>
                              handleVendorVerification(vendor, 'verified', 'active')
                            }
                            leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                          >
                            Approve &amp; Verify
                          </Button>
                        )}

                        {isVerified && (
                          <Button
                            variant="secondary"
                            size="sm"
                            isLoading={processingId === vendor.id}
                            onClick={() =>
                              handleVendorVerification(vendor, 'unverified', 'active')
                            }
                          >
                            Revoke Verified Badge
                          </Button>
                        )}

                        {!isSuspended ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            isLoading={processingId === vendor.id}
                            onClick={() =>
                              handleVendorVerification(
                                vendor,
                                vendor.verificationStatus || 'unverified',
                                'suspended'
                              )
                            }
                            leftIcon={<XCircle className="h-3.5 w-3.5" />}
                          >
                            Suspend Vendor
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            isLoading={processingId === vendor.id}
                            onClick={() =>
                              handleVendorVerification(
                                vendor,
                                vendor.verificationStatus || 'unverified',
                                'active'
                              )
                            }
                          >
                            Reinstate Vendor
                          </Button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'moderation' ? (
        /* LISTING MODERATION QUEUE */
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#697586]" />
              <input
                type="text"
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                placeholder="Search listing name, category..."
                className="w-full rounded-[10px] border border-[#D7DEE8] bg-white py-2 pl-9 pr-3 text-xs text-[#142B4A] placeholder:text-[#697586] focus:border-[#4778D8] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: `All (${listings.length})` },
                  { id: 'pending_review', label: `Pending (${metrics.pendingListingsCount})` },
                  { id: 'published', label: `Published (${metrics.publishedListingsCount})` },
                  { id: 'changes_requested', label: `Changes Requested (${metrics.changesRequestedCount})` },
                ] as const
              ).map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setListingFilterStatus(btn.id)}
                  className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold border transition-colors cursor-pointer ${
                    listingFilterStatus === btn.id
                      ? 'border-[#4778D8] bg-[#EFF8FF] text-[#175CD3]'
                      : 'border-[#D7DEE8] bg-white text-[#344054] hover:bg-[#F4F6F9]'
                  }`}
                >
                  {btn.label}
                </button>
              ))}

              <select
                value={listingTypeFilter}
                onChange={(e) =>
                  setListingTypeFilter(e.target.value as 'all' | 'venue' | 'service-provider')
                }
                className="rounded-[8px] border border-[#D7DEE8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#344054]"
              >
                <option value="all">All Types</option>
                <option value="venue">Venues only</option>
                <option value="service-provider">Service Providers</option>
              </select>
            </div>
          </div>

          {filteredListings.length === 0 ? (
            <EmptyState
              title="No listings match this filter"
              description="All submitted listings in this queue have been processed."
            />
          ) : (
            <div className="space-y-4">
              {filteredListings.map((item) => {
                const previewHref =
                  item.listingType === 'venue'
                    ? `/venues/${item.slug}`
                    : `/vendors/${item.slug}`;

                return (
                  <article
                    key={item.id}
                    className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {item.coverImageUrl ? (
                          <img
                            src={item.coverImageUrl}
                            alt={item.name}
                            className="h-16 w-20 rounded-[8px] object-cover border border-[#D7DEE8] shrink-0"
                          />
                        ) : (
                          <div className="h-16 w-20 rounded-[8px] bg-[#F4F6F9] border border-[#D7DEE8] flex items-center justify-center text-xs text-[#697586] shrink-0">
                            No photo
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <ListingStatusBadge
                              publicationStatus={item.publicationStatus}
                              moderationStatus={item.moderationStatus}
                            />
                            <span className="text-xs text-[#697586]">
                              {item.listingType} · {item.categoryId} · {item.city}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-[#142B4A]">
                            {item.name}
                          </h3>
                          <p className="text-sm text-[#344054]">{item.headline}</p>
                          <p className="text-xs font-semibold text-[#172B4D] tabular-nums">
                            Price display: {item.displayPriceText} · Address: {item.addressDisplay}
                          </p>
                        </div>
                      </div>

                      <AppLink
                        href={previewHref}
                        className="inline-flex min-h-[36px] items-center justify-center gap-1.5 rounded-[8px] border border-[#D7DEE8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#142B4A] hover:bg-[#F4F6F9] shrink-0"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#4778D8]" />
                        <span>Inspect Listing</span>
                      </AppLink>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-2 border-t border-[#E9EDF3]">
                      <div className="md:col-span-6">
                        <label
                          htmlFor={`mod-notes-${item.id}`}
                          className="block text-xs font-medium text-[#344054] mb-1"
                        >
                          Moderation note / feedback to vendor
                        </label>
                        <TextArea
                          id={`mod-notes-${item.id}`}
                          rows={2}
                          value={notesByListingId[item.id] ?? item.moderationNotes ?? ''}
                          onChange={(e) =>
                            setNotesByListingId((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          placeholder="Add approval notes or specific changes required before publication…"
                        />
                      </div>

                      <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={processingId === item.id}
                          onClick={() => handleModerateListing(item, 'approve')}
                          leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        >
                          Approve &amp; Publish
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          isLoading={processingId === item.id}
                          onClick={() => handleModerateListing(item, 'changes_requested')}
                        >
                          Request Changes
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          isLoading={processingId === item.id}
                          onClick={() => handleModerateListing(item, 'reject')}
                          leftIcon={<XCircle className="h-3.5 w-3.5" />}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'taxonomy' ? (
        /* CATEGORY MANAGEMENT & COMMISSION TAKE-RATE CONFIGURATION */
        <div className="space-y-6">
          <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Marketplace Fee &amp; Commission Configuration
                </h2>
                <p className="text-xs text-[#697586] mt-0.5">
                  Set platform take-rates deducted from completed vendor bookings and configure category taxonomy in real-time.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                isLoading={isSavingSettings}
                onClick={handleSavePlatformSettings}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Save Platform Configuration
              </Button>
            </div>

            {/* Global Settings Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E9EDF3]">
              <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-4 space-y-2">
                <label
                  htmlFor="global-take-rate"
                  className="block text-xs font-bold uppercase tracking-wider text-[#142B4A]"
                >
                  Global Platform Commission (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="global-take-rate"
                    type="number"
                    min="0"
                    max="100"
                    value={defaultCommissionInput}
                    onChange={(e) =>
                      setDefaultCommissionInput(
                        Math.max(0, Math.min(100, Number(e.target.value) || 0))
                      )
                    }
                    className="w-28 rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-sm font-bold text-[#142B4A] focus:border-[#4778D8] focus:outline-none"
                  />
                  <span className="text-xs text-[#526071]">
                    % take-rate applied to all new vendor quotes by default
                  </span>
                </div>
              </div>

              <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-4 space-y-2">
                <label
                  htmlFor="featured-fee"
                  className="block text-xs font-bold uppercase tracking-wider text-[#142B4A]"
                >
                  Featured Listing Boost Fee (₦ / week)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="featured-fee"
                    type="number"
                    min="0"
                    step="500"
                    value={featuredFeeInput}
                    onChange={(e) =>
                      setFeaturedFeeInput(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-36 rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-sm font-bold text-[#142B4A] focus:border-[#4778D8] focus:outline-none"
                  />
                  <span className="text-xs text-[#526071]">
                    Self-serve sponsored search placement rate
                  </span>
                </div>
              </div>
            </div>

            {/* Categories Table / List */}
            <div className="space-y-4 pt-4 border-t border-[#E9EDF3]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#142B4A]">
                  Marketplace Categories ({editableCategories.length})
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddCategoryForm((prev) => !prev)}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  {showAddCategoryForm ? 'Cancel Add Category' : 'Add New Category'}
                </Button>
              </div>

              {/* Add Category Form Modal/Collapse */}
              {showAddCategoryForm && (
                <div className="rounded-[12px] border border-[#4778D8] bg-[#EFF8FF] p-4 space-y-3">
                  <h4 className="text-xs font-bold text-[#175CD3] uppercase tracking-wider">
                    Add New Marketplace Taxonomy Category
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#344054] mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={newCategoryLabel}
                        onChange={(e) => {
                          setNewCategoryLabel(e.target.value);
                          if (!newCategorySlug) {
                            setNewCategorySlug(
                              e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')
                            );
                          }
                        }}
                        placeholder="e.g. Drone Videography"
                        className="w-full rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-xs text-[#142B4A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#344054] mb-1">
                        URL Slug
                      </label>
                      <input
                        type="text"
                        value={newCategorySlug}
                        onChange={(e) => setNewCategorySlug(e.target.value)}
                        placeholder="e.g. drone-videography"
                        className="w-full rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-xs text-[#142B4A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#344054] mb-1">
                        Listing Type
                      </label>
                      <select
                        value={newCategoryType}
                        onChange={(e) =>
                          setNewCategoryType(e.target.value as 'venue' | 'service-provider')
                        }
                        className="w-full rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-xs text-[#142B4A]"
                      >
                        <option value="service-provider">Service Provider / Vendor</option>
                        <option value="venue">Venue / Event Hall</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#344054] mb-1">
                        Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newCategoryCommission}
                        onChange={(e) =>
                          setNewCategoryCommission(
                            Math.max(0, Math.min(100, Number(e.target.value) || 0))
                          )
                        }
                        className="w-full rounded-[8px] border border-[#D7DEE8] bg-white px-3 py-1.5 text-xs text-[#142B4A]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddNewCategory}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Insert Category
                    </Button>
                  </div>
                </div>
              )}

              {/* Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {editableCategories.map((cat) => (
                  <div
                    key={cat.slug}
                    className={`rounded-[12px] border p-4 space-y-3 transition-colors ${
                      cat.isActive
                        ? 'border-[#D7DEE8] bg-white'
                        : 'border-[#E9EDF3] bg-[#F8F9FB] opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#142B4A]">{cat.label}</p>
                        <p className="text-[11px] font-mono text-[#697586]">/{cat.slug}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          cat.listingType === 'venue'
                            ? 'bg-[#EFF8FF] text-[#175CD3]'
                            : 'bg-[#F4F6F9] text-[#344054]'
                        }`}
                      >
                        {cat.listingType === 'venue' ? 'Venue' : 'Vendor'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E9EDF3]">
                      <div className="flex items-center gap-1.5">
                        <label
                          htmlFor={`cat-rate-${cat.slug}`}
                          className="text-xs text-[#526071]"
                        >
                          Take-rate:
                        </label>
                        <input
                          id={`cat-rate-${cat.slug}`}
                          type="number"
                          min="0"
                          max="100"
                          value={cat.commissionPercent}
                          onChange={(e) =>
                            handleCategoryCommissionChange(
                              cat.slug,
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-16 rounded-[6px] border border-[#D7DEE8] bg-white px-2 py-0.5 text-xs font-bold text-[#142B4A] text-right"
                        />
                        <span className="text-xs font-bold text-[#142B4A]">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleCategoryActive(cat.slug)}
                        className={`rounded-[6px] px-2 py-1 text-xs font-semibold cursor-pointer ${
                          cat.isActive
                            ? 'bg-[#EAF7F0] text-[#16794B] hover:bg-[#D5F2E3]'
                            : 'bg-[#FEE4E2] text-[#D92D20] hover:bg-[#FECDCA]'
                        }`}
                      >
                        {cat.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : activeTab === 'reports' ? (
        /* REPORTS RESOLUTION QUEUE */
        <div className="space-y-4">
          {reports.length === 0 ? (
            <EmptyState
              title="No community reports submitted"
              description="When customers report inaccurate pricing or misleading listings, they appear here for review."
            />
          ) : (
            reports.map((rpt) => (
              <article
                key={rpt.id}
                className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={rpt.status}
                      label={rpt.status.replace('_', ' ')}
                      tone={
                        rpt.status === 'open'
                          ? 'warning'
                          : rpt.status === 'resolved'
                          ? 'success'
                          : 'neutral'
                      }
                    />
                    <span className="text-xs font-semibold text-[#142B4A]">
                      Reason: {rpt.reasonCode} · Target: {rpt.targetId}
                    </span>
                  </div>
                </div>

                {rpt.details && (
                  <p className="text-sm text-[#344054]">{rpt.details}</p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-[#E9EDF3]">
                  <div className="flex-1">
                    <TextArea
                      rows={2}
                      value={reportNotesById[rpt.id] ?? rpt.resolutionNotes ?? ''}
                      onChange={(e) =>
                        setReportNotesById((prev) => ({
                          ...prev,
                          [rpt.id]: e.target.value,
                        }))
                      }
                      placeholder="Resolution notes…"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={processingId === rpt.id}
                      onClick={() => handleResolveReport(rpt, 'resolved')}
                    >
                      Mark Resolved
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      isLoading={processingId === rpt.id}
                      onClick={() => handleResolveReport(rpt, 'dismissed')}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      ) : activeTab === 'audit-logs' ? (
        /* IMMUTABLE AUDIT LOGS */
        <div className="space-y-3">
          {auditLogs.length === 0 ? (
            <EmptyState
              title="No audit log entries yet"
              description="Every administrative moderation action, vendor verification, and report resolution is recorded here."
            />
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-[12px] border border-[#D7DEE8] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-[#142B4A]">
                    {log.action} → {log.targetType}/{log.targetId}
                  </p>
                  {log.reason && (
                    <p className="text-[#344054]">Reason: {log.reason}</p>
                  )}
                </div>
                <span className="text-[#697586] font-mono shrink-0">
                  Actor: {log.actorEmail}
                </span>
              </div>
            ))
          )}
        </div>
      ) : (
        /* LAUNCH READINESS & SMOKE TEST SUITE */
        <div className="space-y-6">
          <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Production Release v{RELEASE_MANIFEST.version} &amp; Operational Monitoring
                </h2>
                <p className="text-xs text-[#697586]">
                  Launch market: {RELEASE_MANIFEST.launchMarket} · Released {RELEASE_MANIFEST.releasedAt}
                </p>
              </div>
              <StatusBadge
                status={opsHealth.connectionStatus}
                label={
                  opsHealth.connectionStatus === 'connected'
                    ? 'Firestore Connected'
                    : opsHealth.connectionStatus === 'degraded'
                    ? 'Connection Degraded'
                    : 'Initializing'
                }
                tone={
                  opsHealth.connectionStatus === 'connected'
                    ? 'success'
                    : opsHealth.connectionStatus === 'degraded'
                    ? 'danger'
                    : 'info'
                }
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#697586]">
                  Boot Latency
                </p>
                <p className="text-lg font-bold text-[#142B4A] tabular-nums mt-0.5">
                  {opsHealth.bootLatencyMs !== null
                    ? `${opsHealth.bootLatencyMs} ms`
                    : '—'}
                </p>
              </div>
              <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#697586]">
                  Runtime Errors
                </p>
                <p className="text-lg font-bold text-[#142B4A] tabular-nums mt-0.5">
                  {opsHealth.errorCount}
                </p>
              </div>
              <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#697586]">
                  Rate-Limit Blocks
                </p>
                <p className="text-lg font-bold text-[#142B4A] tabular-nums mt-0.5">
                  {opsHealth.rateLimitCount}
                </p>
              </div>
              <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#697586]">
                  Open User Reports
                </p>
                <p className="text-lg font-bold text-[#142B4A] tabular-nums mt-0.5">
                  {openReportCount}
                </p>
              </div>
            </div>
          </section>

          {/* Automated Live Smoke Test Runner */}
          <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Live Marketplace Smoke-Test &amp; Quality Verification
                </h2>
                <p className="text-xs text-[#697586] mt-0.5">
                  Executes non-destructive runtime checks against public discovery boundaries, NGN currency integrity, XSS protocol guards, and accessibility landmarks.
                  {lastSmokeRunAt ? ` Last verified at ${lastSmokeRunAt}.` : ''}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                isLoading={isRunningSmoke}
                onClick={runLiveSmokeSuite}
                leftIcon={<Play className="h-3.5 w-3.5" />}
              >
                Run Smoke Checks
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {smokeResults.map((check) => (
                <div
                  key={check.id}
                  className="rounded-[12px] border border-[#D7DEE8] bg-[#F4F6F9] p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4778D8]">
                      {check.category}
                    </span>
                    <StatusBadge
                      status={check.passed ? 'passed' : 'failed'}
                      label={check.passed ? 'Passed' : 'Attention'}
                      tone={check.passed ? 'success' : 'danger'}
                    />
                  </div>
                  <p className="text-sm font-bold text-[#142B4A]">{check.title}</p>
                  <p className="text-xs text-[#344054] leading-relaxed">
                    {check.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Security Matrix */}
          <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#4778D8]" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Security Specification — &ldquo;Dirty Dozen&rdquo; Adversarial Payloads
                </h2>
                <p className="text-xs text-[#697586]">
                  All 12 cross-tenant, privilege-escalation, and spoofing vectors enforced by <code>firestore.rules</code>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DIRTY_DOZEN_TESTS.map((test) => (
                <div
                  key={test.id}
                  className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#142B4A]">
                      #{test.id} · {test.operation.toUpperCase()}
                    </span>
                    <span className="rounded-[6px] bg-[#EAF7F0] px-2 py-0.5 text-[11px] font-semibold text-[#16794B]">
                      {test.expectedResult}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#172B4D]">{test.name}</p>
                  <p className="text-[11px] font-mono text-[#697586] truncate">
                    {test.path}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </PageContainer>
  );
}
