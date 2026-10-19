import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  Flag,
  HelpCircle,
  Lock,
  Mail,
  MapPin,
  MessageSquarePlus,
  Send,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/page-container';
import { PageHeading } from '../../components/layout/page-heading';
import { FormField } from '../../components/forms/form-field';
import { Button } from '../../components/ui/button';
import { SelectField, TextArea } from '../../components/ui/inputs';
import { InlineAlert } from '../../components/ui/feedback';
import { useToast } from '../../components/ui/toast';
import { useAuth } from '../../lib/auth/auth-context';
import { AppLink } from '../../lib/router/router-context';
import { ENV } from '../../lib/config/env';
import { RELEASE_MANIFEST } from '../../lib/monitoring/release-monitor';
import { submitPlatformFeedbackOrIssue } from '../../server/repositories/marketplace-repository';

export type LegalSection = 'privacy' | 'terms' | 'support';

export interface LegalAndTrustPageProps {
  section: LegalSection;
}

export function LegalAndTrustPage({ section }: LegalAndTrustPageProps) {
  const { firebaseUser } = useAuth();
  const { showToast } = useToast();

  const [roleContext, setRoleContext] = useState<'customer' | 'vendor'>(
    'customer'
  );
  const [severity, setSeverity] = useState<
    'low' | 'medium' | 'high' | 'critical'
  >('low');
  const [area, setArea] = useState<
    | 'search'
    | 'listing-details'
    | 'enquiries-quotes'
    | 'vendor-workspace'
    | 'other'
  >('search');
  const [feedbackSummary, setFeedbackSummary] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setFeedbackError(null);
    if (feedbackSummary.trim().length < 5) {
      setFeedbackError(
        'Please enter at least 5 characters describing your feedback or issue.'
      );
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await submitPlatformFeedbackOrIssue({
        reporterUid: firebaseUser.uid,
        roleContext,
        severity,
        area,
        summary: feedbackSummary,
      });
      setFeedbackSummary('');
      showToast({
        title: 'Feedback & issue report logged',
        description:
          'Thank you. Your submission has been prioritized in the platform governance queue.',
        tone: 'success',
      });
    } catch (err) {
      setFeedbackError(
        err instanceof Error
          ? err.message
          : 'Could not submit feedback right now. Your input has been preserved.'
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const tabs: Array<{
    id: LegalSection;
    href: string;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'privacy',
      href: '/privacy',
      label: 'Privacy & Data Protection',
      icon: <Lock className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'terms',
      href: '/terms',
      label: 'Terms of Service',
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
    },
    {
      id: 'support',
      href: '/support',
      label: 'Support, Trust & Safety',
      icon: <HelpCircle className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  return (
    <PageContainer className="py-8 sm:py-12 space-y-8">
      <PageHeading
        kicker="EventLink Legal, Privacy & Marketplace Trust · Warri & Effurun"
        title={
          section === 'privacy'
            ? 'Privacy Policy & Data Protection'
            : section === 'terms'
            ? 'Marketplace Terms of Service'
            : 'Support, Trust & Safety Center'
        }
        description={
          section === 'privacy'
            ? 'How EventLink collects, isolates, retains, exports, and deletes customer and vendor personal data in accordance with the Nigeria Data Protection Act (NDPA).'
            : section === 'terms'
            ? 'Clear rules governing public venue and service discovery, structured NGN pricing, customer enquiries, vendor quotations, and listing moderation.'
            : 'Contact our Warri & Effurun marketplace team, submit prioritized launch feedback or issue reports, and review our V1 scope commitments.'
        }
      />

      {/* Section Navigation Tabs */}
      <nav
        aria-label="Legal and support sections"
        className="flex flex-wrap items-center gap-2 border-b border-[#D7DEE8] pb-3"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === section;
          return (
            <AppLink
              key={tab.id}
              href={tab.href}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-[10px] px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-[#142B4A] text-white'
                  : 'bg-white text-[#344054] border border-[#D7DEE8] hover:bg-[#F4F6F9]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </AppLink>
          );
        })}
      </nav>

      {section === 'privacy' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 text-[#4778D8]" aria-hidden="true" />
                <h2 className="text-lg font-bold text-[#142B4A]">
                  1. Personal Data Collection &amp; Purpose
                </h2>
              </div>
              <p className="text-sm text-[#344054] leading-relaxed">
                EventLink collects only the minimum personal and business
                information necessary to operate the event-services marketplace
                in Warri and Effurun, Delta State:
              </p>
              <ul className="space-y-2 text-sm text-[#344054] list-disc pl-5">
                <li>
                  <strong>Customer Account Profile:</strong> Display name,
                  verified email address, optional phone number, and preferred
                  launch city (Warri or Effurun).
                </li>
                <li>
                  <strong>Event Enquiries &amp; Planning Records:</strong> Event
                  type, preferred date, guest count, optional budget in Nigerian
                  Naira (NGN), and enquiry notes shared with the specific vendor
                  you choose to contact.
                </li>
                <li>
                  <strong>Vendor Organization &amp; Listing Records:</strong>{' '}
                  Business name, primary city/area, service descriptions,
                  starting prices, capacities, media URLs, and optional business
                  contact details.
                </li>
              </ul>
            </section>

            <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Lock className="h-5 w-5 text-[#4778D8]" aria-hidden="true" />
                <h2 className="text-lg font-bold text-[#142B4A]">
                  2. Visibility Boundaries &amp; Contact Disclosure
                </h2>
              </div>
              <p className="text-sm text-[#344054] leading-relaxed">
                We enforce strict tenant isolation in Firebase Firestore rules so
                public visitors cannot scrape private user profiles, draft
                listings, or customer enquiries:
              </p>
              <ul className="space-y-2 text-sm text-[#344054] list-disc pl-5">
                <li>
                  <strong>Public Marketplace Discovery:</strong> Only listings
                  with <code>publicationStatus == &apos;published&apos;</code>{' '}
                  and <code>moderationStatus == &apos;approved&apos;</code> are
                  publicly readable.
                </li>
                <li>
                  <strong>Private Customer Workspace:</strong> Saved listings (
                  <code>/saved</code>), venue comparisons (<code>/compare</code>
                  ), planned events, and notifications are isolated strictly to
                  the authenticated account owner.
                </li>
                <li>
                  <strong>Gated Vendor Direct Contact:</strong> When a vendor
                  sets <code>contactVisibility</code> to unlock after response,
                  their direct phone, WhatsApp, and email channels are revealed
                  to the customer only after the vendor views or responds to the
                  enquiry or issues an official quote.
                </li>
              </ul>
            </section>

            <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Download
                  className="h-5 w-5 text-[#4778D8]"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-[#142B4A]">
                  3. Data Export, Retention &amp; Account Deletion Rights
                </h2>
              </div>
              <p className="text-sm text-[#344054] leading-relaxed">
                In compliance with the Nigeria Data Protection Act (NDPA) and
                modern data portability standards, every authenticated user has
                direct self-service controls in{' '}
                <AppLink
                  href="/account"
                  className="font-semibold text-[#175CD3] hover:underline"
                >
                  Account Settings (/account)
                </AppLink>
                :
              </p>
              <ul className="space-y-2 text-sm text-[#344054] list-disc pl-5">
                <li>
                  <strong>Portable JSON Export:</strong> Download a complete,
                  machine-readable JSON archive of your account profile, saved
                  listings, comparison set, sent enquiries, and received quotes
                  at any time.
                </li>
                <li>
                  <strong>Self-Service Account Deletion:</strong> Permanently
                  delete your customer account and personal workspace records
                  (saved items and comparisons) directly from your account page.
                </li>
              </ul>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#142B4A]">
                Privacy Quick Actions
              </h3>
              <p className="text-xs text-[#697586] leading-relaxed">
                Manage your personal profile, export your data archive, or
                delete your account from your authenticated settings workspace.
              </p>
              <div className="pt-1 flex flex-col gap-2">
                <AppLink
                  href="/account"
                  className="inline-flex min-h-[38px] items-center justify-center rounded-[10px] bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1c3a63]"
                >
                  Open Account &amp; Privacy Controls
                </AppLink>
                <AppLink
                  href="/support"
                  className="inline-flex min-h-[38px] items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2 text-xs font-semibold text-[#142B4A] hover:bg-[#F4F6F9]"
                >
                  Contact Data Protection Support
                </AppLink>
              </div>
            </div>
          </aside>
        </div>
      )}

      {section === 'terms' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <FileText
                  className="h-5 w-5 text-[#4778D8]"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-[#142B4A]">
                  1. Marketplace Scope &amp; Non-Reservation Disclosure
                </h2>
              </div>
              <p className="text-sm text-[#344054] leading-relaxed">
                EventLink is a discovery, comparison, enquiry, and quotation
                marketplace connecting event organisers with venues and event
                service professionals in Warri and Effurun, Delta State.
              </p>
              <div className="rounded-[10px] border border-[#F5D08A] bg-[#FFF5D6] p-4 text-xs text-[#8A5A00] space-y-1">
                <p className="font-bold">
                  Important Booking &amp; Payment Boundary:
                </p>
                <p>
                  Submitting an enquiry or accepting a vendor quote on EventLink
                  records your response in the workspace, but{' '}
                  <strong>
                    does not process online payments or automatically guarantee
                    a calendar reservation
                  </strong>
                  . Final contracts, deposits, and event dates are confirmed
                  directly between the customer and the vendor organization.
                </p>
              </div>
            </section>

            <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck
                  className="h-5 w-5 text-[#4778D8]"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-[#142B4A]">
                  2. Vendor Listing Accuracy &amp; NGN Pricing Integrity
                </h2>
              </div>
              <ul className="space-y-2 text-sm text-[#344054] list-disc pl-5">
                <li>
                  <strong>Honest Pricing in NGN:</strong> Vendors must provide
                  accurate starting prices in Nigerian Naira (
                  <code>{ENV.defaultCurrency}</code>) or explicitly mark pricing
                  as custom/upon request. EventLink never fabricates{' '}
                  <code>₦0</code> when a price is omitted.
                </li>
                <li>
                  <strong>Moderation &amp; Approval Meaning:</strong> A listing
                  marked <em>Approved for Marketplace</em> indicates that an
                  EventLink administrator reviewed the submission for required
                  completeness and formatting. It is not a physical safety
                  inspection or legal warranty unless explicitly stated.
                </li>
                <li>
                  <strong>Media Ownership:</strong> Vendors must upload or link
                  only genuine photographs of their actual venue or past event
                  work.
                </li>
              </ul>
            </section>

            <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Flag className="h-5 w-5 text-[#4778D8]" aria-hidden="true" />
                <h2 className="text-lg font-bold text-[#142B4A]">
                  3. Abuse Prevention, Rate Limits &amp; Community Reports
                </h2>
              </div>
              <p className="text-sm text-[#344054] leading-relaxed">
                To protect both event organisers and businesses from spam and
                misrepresentation:
              </p>
              <ul className="space-y-2 text-sm text-[#344054] list-disc pl-5">
                <li>
                  Duplicate enquiries to the same listing for the same event
                  date within 30 minutes are automatically blocked.
                </li>
                <li>
                  Signed-in users can report inaccurate pricing, misleading
                  photos, or impersonation directly from any listing detail
                  page. Every report is tracked in the administrative governance
                  queue with an immutable audit log.
                </li>
              </ul>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#142B4A]">
                Marketplace Coverage
              </h3>
              <p className="text-xs text-[#697586] leading-relaxed">
                Launch cities: <strong>Warri</strong> and{' '}
                <strong>Effurun</strong>, Delta State, Nigeria (Timezone:{' '}
                <code>{ENV.defaultTimezone}</code> · Currency:{' '}
                <code>{ENV.defaultCurrency}</code>).
              </p>
              <AppLink
                href="/search"
                className="inline-flex w-full min-h-[38px] items-center justify-center rounded-[10px] bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1c3a63]"
              >
                Explore Verified Listings
              </AppLink>
            </div>
          </aside>
        </div>
      )}

      {section === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <HelpCircle
                  className="h-5 w-5 text-[#4778D8]"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-bold text-[#142B4A]">
                  How EventLink Support &amp; Moderation Works
                </h2>
              </div>
              <p className="text-sm text-[#344054] leading-relaxed">
                Whether you are planning a wedding, birthday, corporate seminar,
                or funeral reception in Warri or Effurun, or managing a venue or
                event service business, our team is here to help.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-[12px] border border-[#E9EDF3] bg-[#F4F6F9] p-4 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4778D8]">
                    For Event Organisers
                  </p>
                  <p className="text-sm font-bold text-[#142B4A]">
                    Enquiries, Quotes &amp; Reports
                  </p>
                  <p className="text-xs text-[#344054] leading-relaxed">
                    Use the <strong>Report Listing</strong> button on any venue
                    or vendor page if you notice outdated NGN prices, wrong
                    capacities, or unreachable contacts.
                  </p>
                </div>

                <div className="rounded-[12px] border border-[#E9EDF3] bg-[#F4F6F9] p-4 space-y-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#4778D8]">
                    For Venue &amp; Service Owners
                  </p>
                  <p className="text-sm font-bold text-[#142B4A]">
                    Listing Review &amp; Publication
                  </p>
                  <p className="text-xs text-[#344054] leading-relaxed">
                    Submit your draft listing from the{' '}
                    <AppLink
                      href="/vendor"
                      className="font-semibold text-[#175CD3] hover:underline"
                    >
                      Vendor Workspace
                    </AppLink>
                    . If changes are requested, review the moderator notes on
                    your listing card and re-submit.
                  </p>
                </div>
              </div>
            </section>

            {/* Customer & Vendor Launch Feedback & Issue Tracker (Phase 12) */}
            <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <MessageSquarePlus
                  className="h-5 w-5 text-[#4778D8]"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-lg font-bold text-[#142B4A]">
                    Submit Launch Feedback or Report an Issue
                  </h2>
                  <p className="text-xs text-[#697586]">
                    Help us improve EventLink in Warri &amp; Effurun. Submissions
                    are prioritized by severity and user impact in our governance
                    queue.
                  </p>
                </div>
              </div>

              {!firebaseUser ? (
                <div className="rounded-[12px] border border-[#E9EDF3] bg-[#F4F6F9] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-[#344054]">
                    Sign in to submit structured product feedback or report a
                    technical issue directly to the EventLink team.
                  </p>
                  <AppLink
                    href="/login"
                    className="inline-flex min-h-[36px] items-center justify-center rounded-[8px] bg-[#142B4A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1c3a63] shrink-0"
                  >
                    Sign in to submit feedback
                  </AppLink>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  {feedbackError && (
                    <InlineAlert tone="danger" title="Could not submit feedback">
                      {feedbackError}
                    </InlineAlert>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormField id="fbk-role" label="Your role">
                      <SelectField
                        id="fbk-role"
                        value={roleContext}
                        onChange={(e) =>
                          setRoleContext(
                            e.target.value as 'customer' | 'vendor'
                          )
                        }
                        options={[
                          {
                            value: 'customer',
                            label: 'Event Organiser / Customer',
                          },
                          {
                            value: 'vendor',
                            label: 'Venue / Service Vendor',
                          },
                        ]}
                      />
                    </FormField>

                    <FormField id="fbk-area" label="Feature area">
                      <SelectField
                        id="fbk-area"
                        value={area}
                        onChange={(e) =>
                          setArea(
                            e.target.value as
                              | 'search'
                              | 'listing-details'
                              | 'enquiries-quotes'
                              | 'vendor-workspace'
                              | 'other'
                          )
                        }
                        options={[
                          { value: 'search', label: 'Search & Filters' },
                          {
                            value: 'listing-details',
                            label: 'Listing Details',
                          },
                          {
                            value: 'enquiries-quotes',
                            label: 'Enquiries & NGN Quotes',
                          },
                          {
                            value: 'vendor-workspace',
                            label: 'Vendor Workspace',
                          },
                          { value: 'other', label: 'General / Other' },
                        ]}
                      />
                    </FormField>

                    <FormField id="fbk-severity" label="Impact / Severity">
                      <SelectField
                        id="fbk-severity"
                        value={severity}
                        onChange={(e) =>
                          setSeverity(
                            e.target.value as
                              | 'low'
                              | 'medium'
                              | 'high'
                              | 'critical'
                          )
                        }
                        options={[
                          {
                            value: 'low',
                            label: 'Low — Suggestion / Polish',
                          },
                          {
                            value: 'medium',
                            label: 'Medium — Minor Friction',
                          },
                          {
                            value: 'high',
                            label: 'High — Workflow Blocked',
                          },
                          {
                            value: 'critical',
                            label: 'Critical — Data / Security Issue',
                          },
                        ]}
                      />
                    </FormField>
                  </div>

                  <FormField
                    id="fbk-summary"
                    label="Details & steps to reproduce"
                    required
                  >
                    <TextArea
                      id="fbk-summary"
                      rows={3}
                      value={feedbackSummary}
                      onChange={(e) => setFeedbackSummary(e.target.value)}
                      placeholder="Share your experience or describe what happened…"
                      required
                    />
                  </FormField>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSubmittingFeedback}
                      leftIcon={<Send className="h-3.5 w-3.5" />}
                    >
                      Submit Prioritized Feedback
                    </Button>
                  </div>
                </form>
              )}
            </section>

            {/* Documented V1 Scope & Known Limitations (Phase 12) */}
            <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <CheckCircle2
                  className="h-5 w-5 text-[#16794B]"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-lg font-bold text-[#142B4A]">
                    Release v{RELEASE_MANIFEST.version} — Trust Guarantees &amp;
                    Scope Boundaries
                  </h2>
                  <p className="text-xs text-[#697586]">
                    Released {RELEASE_MANIFEST.releasedAt} ·{' '}
                    {RELEASE_MANIFEST.launchMarket}
                  </p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-[#344054] list-disc pl-5">
                {RELEASE_MANIFEST.knownLimitations.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-5 space-y-4">
              <h3 className="text-sm font-bold text-[#142B4A]">
                Support Contact Channels
              </h3>
              <div className="space-y-3 text-xs text-[#344054]">
                <div className="flex items-start gap-2.5">
                  <Mail className="h-4 w-4 text-[#4778D8] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#142B4A]">
                      Marketplace Support &amp; Governance
                    </p>
                    <p className="text-[#697586]">
                      osovoyoronogheneovo@gmail.com
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-[#4778D8] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[#142B4A]">
                      Launch Operating Coverage
                    </p>
                    <p className="text-[#697586]">
                      Warri &amp; Effurun, Delta State, Nigeria
                    </p>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-[#E9EDF3] flex flex-col gap-2">
                <AppLink
                  href="/search"
                  className="inline-flex min-h-[38px] items-center justify-center rounded-[10px] bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1c3a63]"
                >
                  Browse Marketplace
                </AppLink>
                <AppLink
                  href="/enquiries"
                  className="inline-flex min-h-[38px] items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2 text-xs font-semibold text-[#142B4A] hover:bg-[#F4F6F9]"
                >
                  View My Enquiries
                </AppLink>
              </div>
            </div>
          </aside>
        </div>
      )}
    </PageContainer>
  );
}
