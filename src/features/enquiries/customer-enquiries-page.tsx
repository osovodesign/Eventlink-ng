import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RotateCcw,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/page-container';
import { PageHeading } from '../../components/layout/page-heading';
import { SectionHeader } from '../../components/layout/section-header';
import { Button } from '../../components/ui/button';
import { SelectField, TextArea, TextInput } from '../../components/ui/inputs';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  Skeleton,
} from '../../components/ui/feedback';
import { ConfirmDialog, Dialog } from '../../components/ui/overlays';
import { FormField } from '../../components/forms/form-field';
import {
  EnquiryStatusBadge,
  QuoteCard,
} from '../../components/marketplace/enquiry-components';
import { getSafeExternalHref } from '../../components/marketplace/sticky-action-card';
import { useToast } from '../../components/ui/toast';
import { useAuth } from '../../lib/auth/auth-context';
import { AppLink } from '../../lib/router/router-context';
import { EVENT_TYPES, formatMinorCurrency } from '../../lib/config/env';
import {
  createCustomerEvent,
  deleteCustomerEvent,
  getUnlockedVendorContactForEnquiry,
  listCustomerEnquiries,
  listCustomerEvents,
  listQuotesForCustomer,
  respondToQuoteAsCustomer,
  updateCustomerEventStatus,
  updateEnquiryStatusAsCustomer,
} from '../../server/repositories/marketplace-repository';
import {
  EnquiryRecord,
  EventTypeSlug,
  EventWorkspaceRecord,
  LaunchCity,
  QuoteRecord,
} from '../../types/marketplace';

type CustomerEnquiryFilter = 'all' | 'awaiting' | 'responded' | 'closed';

interface UnlockedContactMap {
  [enquiryId: string]: {
    unlocked: boolean;
    organizationName: string;
    publicEmail: string | null;
    publicPhone: string | null;
    whatsappNumber: string | null;
    websiteUrl: string | null;
  } | null;
}

export function CustomerEnquiriesPage() {
  const { firebaseUser, userProfile } = useAuth();
  const { showToast } = useToast();

  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [events, setEvents] = useState<EventWorkspaceRecord[]>([]);
  const [contactsByEnquiry, setContactsByEnquiry] =
    useState<UnlockedContactMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<CustomerEnquiryFilter>('all');

  const [cancelTarget, setCancelTarget] = useState<EnquiryRecord | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [processingQuoteId, setProcessingQuoteId] = useState<string | null>(
    null
  );

  // Create Planned Event Dialog State
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtType, setEvtType] = useState<EventTypeSlug>('wedding');
  const [evtCity, setEvtCity] = useState<LaunchCity>('Warri');
  const [evtDate, setEvtDate] = useState('');
  const [evtGuests, setEvtGuests] = useState('');
  const [evtBudgetNaira, setEvtBudgetNaira] = useState('');
  const [evtNotes, setEvtNotes] = useState('');
  const [evtError, setEvtError] = useState<string | null>(null);
  const [isSavingEvt, setIsSavingEvt] = useState(false);

  const loadCustomerActivity = useCallback(async () => {
    if (!firebaseUser) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [enqList, quoteList, eventList] = await Promise.all([
        listCustomerEnquiries(firebaseUser.uid),
        listQuotesForCustomer(firebaseUser.uid),
        listCustomerEvents(firebaseUser.uid),
      ]);

      setEnquiries(enqList);
      setQuotes(quoteList);
      setEvents(eventList);

      // Load contact unlock state for each enquiry
      const contactEntries = await Promise.all(
        enqList.map(async (enq) => {
          const info = await getUnlockedVendorContactForEnquiry(enq);
          return [enq.id, info] as const;
        })
      );
      const map: UnlockedContactMap = {};
      for (const [id, info] of contactEntries) {
        map[id] = info;
      }
      setContactsByEnquiry(map);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to load your enquiries right now.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    void loadCustomerActivity();
  }, [loadCustomerActivity]);

  const handleCreateEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setEvtError(null);

    if (evtTitle.trim().length < 2) {
      setEvtError('Please enter a title for your event plan.');
      return;
    }

    const parsedGuests = evtGuests.trim()
      ? Number.parseInt(evtGuests.trim(), 10)
      : null;
    const parsedBudget = evtBudgetNaira.trim()
      ? Number.parseFloat(evtBudgetNaira.trim().replace(/,/g, ''))
      : null;

    setIsSavingEvt(true);
    try {
      await createCustomerEvent(firebaseUser.uid, {
        title: evtTitle.trim(),
        eventType: evtType,
        city: evtCity,
        eventDate: evtDate || null,
        guestCount: parsedGuests,
        budgetAmountMinor:
          parsedBudget !== null && !Number.isNaN(parsedBudget)
            ? Math.round(parsedBudget * 100)
            : null,
        notes: evtNotes.trim() || null,
      });
      setIsNewEventOpen(false);
      setEvtTitle('');
      setEvtDate('');
      setEvtGuests('');
      setEvtBudgetNaira('');
      setEvtNotes('');
      await loadCustomerActivity();
      showToast({
        title: 'Event plan created',
        description:
          'You can now link new venue & vendor enquiries directly to this event.',
        tone: 'success',
      });
    } catch (err) {
      setEvtError(
        err instanceof Error ? err.message : 'Could not create event plan.'
      );
    } finally {
      setIsSavingEvt(false);
    }
  };

  const handleToggleEventCompleted = async (evt: EventWorkspaceRecord) => {
    if (!firebaseUser) return;
    const nextStatus = evt.status === 'planning' ? 'completed' : 'planning';
    try {
      await updateCustomerEventStatus(firebaseUser.uid, evt, nextStatus);
      await loadCustomerActivity();
      showToast({
        title:
          nextStatus === 'completed'
            ? 'Event marked completed'
            : 'Event reopened for planning',
        tone: 'info',
      });
    } catch {
      showToast({
        title: 'Could not update event status',
        tone: 'danger',
      });
    }
  };

  const handleDeleteEvent = async (evt: EventWorkspaceRecord) => {
    if (!firebaseUser) return;
    try {
      await deleteCustomerEvent(firebaseUser.uid, evt);
      await loadCustomerActivity();
      showToast({
        title: 'Event plan removed',
        tone: 'info',
      });
    } catch {
      showToast({
        title: 'Could not delete event plan',
        tone: 'danger',
      });
    }
  };

  const handleConfirmCancelEnquiry = async () => {
    if (!firebaseUser || !cancelTarget) return;
    setIsCancelling(true);
    try {
      await updateEnquiryStatusAsCustomer(
        firebaseUser.uid,
        cancelTarget,
        'cancelled'
      );
      setCancelTarget(null);
      await loadCustomerActivity();
      showToast({
        title: 'Enquiry cancelled',
        description: `Your enquiry for ${cancelTarget.listingName} has been closed.`,
        tone: 'info',
      });
    } catch (err) {
      showToast({
        title: 'Could not cancel enquiry',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleQuoteDecision = async (
    quote: QuoteRecord,
    decision: 'accepted' | 'declined'
  ) => {
    if (!firebaseUser) return;
    setProcessingQuoteId(quote.id);
    try {
      await respondToQuoteAsCustomer(firebaseUser.uid, quote, decision);
      await loadCustomerActivity();
      showToast({
        title:
          decision === 'accepted' ? 'Quote accepted' : 'Quote declined',
        description:
          decision === 'accepted'
            ? `Your acceptance has been shared with ${quote.listingName}.`
            : `Quote marked declined.`,
        tone: decision === 'accepted' ? 'success' : 'info',
      });
    } catch (err) {
      showToast({
        title: 'Could not update quote status',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setProcessingQuoteId(null);
    }
  };

  const filteredEnquiries = enquiries.filter((item) => {
    if (filter === 'awaiting') {
      return item.status === 'submitted' || item.status === 'viewed';
    }
    if (filter === 'responded') {
      return item.status === 'responded';
    }
    if (filter === 'closed') {
      return item.status === 'closed' || item.status === 'cancelled';
    }
    return true;
  });

  return (
    <PageContainer className="py-8 sm:py-10 space-y-8">
      <PageHeading
        kicker={`Customer workspace · ${userProfile?.displayName}`}
        title="My Events, Enquiries & Quotations"
        description="Organize your planned events in Warri and Effurun, track enquiries sent to venues and service professionals, review structured NGN quotes, and access unlocked vendor contact channels."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadCustomerActivity}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewEventOpen(true)}
              leftIcon={<CalendarPlus className="h-4 w-4 text-[#4778D8]" />}
            >
              New Event Plan
            </Button>
            <AppLink
              href="/search"
              className="inline-flex min-h-[36px] items-center justify-center rounded-[8px] bg-[#142B4A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1c3a63] transition-colors"
            >
              Explore more listings
            </AppLink>
          </div>
        }
      />

      {/* Non-booking reminder */}
      <InlineAlert tone="info" title="How EventLink Enquiries & Quotes Work">
        Submitting an enquiry initiates a direct conversation and quotation request with a vendor — it does not automatically lock or reserve a date. Once a vendor responds or sends a quote, their direct phone and email contact details unlock below so you can finalize arrangements.
      </InlineAlert>

      {/* Customer Event Planning Section (`events/{eventId}`) */}
      <section
        aria-labelledby="planned-events-heading"
        className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4"
      >
        <SectionHeader
          title={`My Event Plans (${events.length})`}
          description="Create an event plan (e.g., Traditional Marriage or Corporate Conference) so you can pre-fill and group your venue and vendor enquiries."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewEventOpen(true)}
              leftIcon={<CalendarPlus className="h-3.5 w-3.5 text-[#4778D8]" />}
            >
              Create Event Plan
            </Button>
          }
        />

        {events.length === 0 ? (
          <p className="text-xs text-[#697586]">
            You have not created an event plan yet. Click &ldquo;Create Event
            Plan&rdquo; above to set your target event date, guest count, and
            NGN budget.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((evt) => {
              const linkedEnquiriesCount = enquiries.filter(
                (e) => e.eventId === evt.id
              ).length;
              return (
                <div
                  key={evt.id}
                  className="rounded-[12px] border border-[#E9EDF3] bg-[#F4F6F9]/70 p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-[6px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          evt.status === 'planning'
                            ? 'bg-[#EFF8FF] text-[#1D4ED8]'
                            : 'bg-[#EAF7F0] text-[#146C43]'
                        }`}
                      >
                        {evt.status}
                      </span>
                      <span className="text-xs text-[#697586] capitalize">
                        {evt.eventType} · {evt.city}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#142B4A]">
                      {evt.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#344054]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[#4778D8]" />
                        {evt.eventDate || 'Date TBD'}
                      </span>
                      {evt.guestCount && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Users className="h-3.5 w-3.5 text-[#4778D8]" />
                          {evt.guestCount.toLocaleString()} guests
                        </span>
                      )}
                      {evt.budgetAmountMinor !== null &&
                        evt.budgetAmountMinor !== undefined && (
                          <span className="font-semibold text-[#172B4D] tabular-nums">
                            Budget: {formatMinorCurrency(evt.budgetAmountMinor)}
                          </span>
                        )}
                    </div>

                    {evt.notes && (
                      <p className="text-xs text-[#475467] line-clamp-2">
                        {evt.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E9EDF3] text-xs">
                    <span className="font-medium text-[#4778D8]">
                      {linkedEnquiriesCount} linked{' '}
                      {linkedEnquiriesCount === 1 ? 'enquiry' : 'enquiries'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleEventCompleted(evt)}
                        className="inline-flex items-center gap-1 font-medium text-[#142B4A] hover:underline cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#16794B]" />
                        <span>
                          {evt.status === 'planning'
                            ? 'Mark completed'
                            : 'Reopen'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(evt)}
                        className="inline-flex items-center gap-1 font-medium text-[#B42318] hover:underline cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D7DEE8] pb-3">
        {(
          [
            { id: 'all', label: `All enquiries (${enquiries.length})` },
            {
              id: 'awaiting',
              label: `Awaiting reply (${
                enquiries.filter(
                  (e) => e.status === 'submitted' || e.status === 'viewed'
                ).length
              })`,
            },
            {
              id: 'responded',
              label: `Vendor responded (${
                enquiries.filter((e) => e.status === 'responded').length
              })`,
            },
            {
              id: 'closed',
              label: `Closed / Cancelled (${
                enquiries.filter(
                  (e) => e.status === 'closed' || e.status === 'cancelled'
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

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-[14px]" />
          <Skeleton className="h-44 w-full rounded-[14px]" />
        </div>
      ) : errorMessage ? (
        <ErrorState
          title="Could not load enquiries"
          message={errorMessage}
          onRetry={loadCustomerActivity}
        />
      ) : filteredEnquiries.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
          title={
            enquiries.length === 0
              ? 'You have not sent any enquiries yet'
              : 'No enquiries match this filter'
          }
          description="Browse published venues and event professionals in Warri and Effurun and click 'Send Enquiry / Request Quote' on any listing page."
          actionSlot={
            <AppLink
              href="/search"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1c3a63] transition-colors"
            >
              Browse venues &amp; services
            </AppLink>
          }
        />
      ) : (
        <div className="space-y-5">
          {filteredEnquiries.map((enq) => {
            const associatedQuotes = quotes.filter(
              (q) => q.enquiryId === enq.id && q.status !== 'draft'
            );
            const linkedEvent = events.find((ev) => ev.id === enq.eventId);
            const contactInfo = contactsByEnquiry[enq.id] ?? null;
            const safeWebsite = getSafeExternalHref(contactInfo?.websiteUrl);
            const canCancel =
              enq.status !== 'closed' && enq.status !== 'cancelled';

            return (
              <article
                key={enq.id}
                className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-5"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#E9EDF3] pb-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <EnquiryStatusBadge status={enq.status} />
                      <span className="text-xs font-mono text-[#697586]">
                        Ref: {enq.id.slice(0, 12)}
                      </span>
                      {linkedEvent && (
                        <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#F4F6F9] px-2 py-0.5 text-xs font-medium text-[#142B4A]">
                          <MapPin className="h-3 w-3 text-[#4778D8]" />
                          <span>Event plan: {linkedEvent.title}</span>
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-bold text-[#142B4A]">
                      {enq.subject}
                    </h2>
                    <p className="text-xs font-semibold text-[#4778D8]">
                      Listing: {enq.listingName}
                    </p>
                  </div>

                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCancelTarget(enq)}
                      leftIcon={
                        <XCircle className="h-3.5 w-3.5 text-[#B42318]" />
                      }
                      className="text-[#B42318] hover:bg-[#FEF3F2] shrink-0"
                    >
                      Cancel enquiry
                    </Button>
                  )}
                </div>

                {/* Event Summary Metadata */}
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[10px] bg-[#F4F6F9] p-3.5 text-xs">
                  <div>
                    <dt className="text-[#697586]">Event type</dt>
                    <dd className="font-semibold text-[#172B4D] capitalize mt-0.5">
                      {enq.eventType || 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#697586]">Preferred date</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-[#4778D8]" />
                      <span>{enq.eventDate || 'Flexible / TBD'}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#697586]">Guest count</dt>
                    <dd className="font-semibold text-[#172B4D] tabular-nums mt-0.5 flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-[#4778D8]" />
                      <span>
                        {enq.guestCount
                          ? `${enq.guestCount.toLocaleString()} guests`
                          : 'Not specified'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#697586]">Estimated budget</dt>
                    <dd className="font-semibold text-[#172B4D] tabular-nums mt-0.5">
                      {formatMinorCurrency(enq.budgetAmountMinor)}
                    </dd>
                  </div>
                </dl>

                {/* Customer Message */}
                <div className="space-y-1 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
                    Your message
                  </p>
                  <p className="text-[#344054] whitespace-pre-line leading-relaxed">
                    {enq.message}
                  </p>
                </div>

                {/* Vendor Response Block */}
                {enq.vendorResponse && (
                  <div className="rounded-[12px] border border-[#16794B]/30 bg-[#EAF7F0]/60 p-4 space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#146C43]">
                      Vendor Response from {enq.listingName}
                    </p>
                    <p className="text-sm text-[#172B4D] whitespace-pre-line leading-relaxed">
                      {enq.vendorResponse}
                    </p>
                  </div>
                )}

                {/* Structured Quotes Sent for this Enquiry */}
                {associatedQuotes.length > 0 && (
                  <div className="space-y-3">
                    {associatedQuotes.map((q) => (
                      <QuoteCard
                        key={q.id}
                        quote={q}
                        viewerRole="customer"
                        onCustomerDecision={handleQuoteDecision}
                        isProcessingDecision={processingQuoteId === q.id}
                      />
                    ))}
                  </div>
                )}

                {/* Approved Contact Sharing Workflow Footer */}
                <div className="border-t border-[#E9EDF3] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {contactInfo?.unlocked ? (
                    <div className="flex flex-wrap items-center gap-4 text-[#172B4D]">
                      <span className="font-semibold text-[#142B4A]">
                        Direct vendor contact ({contactInfo.organizationName}):
                      </span>
                      {contactInfo.publicPhone && (
                        <a
                          href={`tel:${contactInfo.publicPhone.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1 font-medium text-[#4778D8] hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>{contactInfo.publicPhone}</span>
                        </a>
                      )}
                      {contactInfo.publicEmail && (
                        <a
                          href={`mailto:${contactInfo.publicEmail}`}
                          className="inline-flex items-center gap-1 font-medium text-[#4778D8] hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>{contactInfo.publicEmail}</span>
                        </a>
                      )}
                      {safeWebsite && (
                        <a
                          href={safeWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#4778D8] hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Website</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#697586]">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Direct vendor phone and email details unlock automatically once the vendor responds to your enquiry.
                      </span>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create Planned Event Dialog */}
      <Dialog
        isOpen={isNewEventOpen}
        onClose={() => setIsNewEventOpen(false)}
        title="Create Event Plan"
        description="Set up your event details in Warri or Effurun so you can link and pre-fill future venue and service enquiries."
        maxWidthClass="max-w-lg"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsNewEventOpen(false)}
              disabled={isSavingEvt}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-customer-event-form"
              variant="primary"
              isLoading={isSavingEvt}
              leftIcon={<CalendarPlus className="h-4 w-4" />}
            >
              Save Event Plan
            </Button>
          </div>
        }
      >
        <form
          id="create-customer-event-form"
          onSubmit={handleCreateEventSubmit}
          className="space-y-4"
        >
          {evtError && (
            <InlineAlert tone="danger" title="Please check event details">
              {evtError}
            </InlineAlert>
          )}

          <FormField id="evt-title" label="Event title" required>
            <TextInput
              id="evt-title"
              value={evtTitle}
              onChange={(e) => setEvtTitle(e.target.value)}
              placeholder="e.g., Ada & Chidi Traditional Marriage Reception"
              maxLength={120}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="evt-type" label="Event type" required>
              <SelectField
                id="evt-type"
                value={evtType}
                onChange={(e) => setEvtType(e.target.value as EventTypeSlug)}
                options={EVENT_TYPES.map((et) => ({
                  value: et.slug,
                  label: et.label,
                }))}
              />
            </FormField>

            <FormField id="evt-city" label="Primary city" required>
              <SelectField
                id="evt-city"
                value={evtCity}
                onChange={(e) => setEvtCity(e.target.value as LaunchCity)}
                options={[
                  { value: 'Warri', label: 'Warri, Delta State' },
                  { value: 'Effurun', label: 'Effurun, Delta State' },
                ]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField id="evt-date" label="Target date">
              <TextInput
                id="evt-date"
                type="date"
                value={evtDate}
                onChange={(e) => setEvtDate(e.target.value)}
              />
            </FormField>

            <FormField id="evt-guests" label="Guest count">
              <TextInput
                id="evt-guests"
                type="number"
                min={1}
                max={50000}
                value={evtGuests}
                onChange={(e) => setEvtGuests(e.target.value)}
                placeholder="350"
              />
            </FormField>

            <FormField id="evt-budget" label="Budget (₦ NGN)">
              <TextInput
                id="evt-budget"
                type="number"
                min={0}
                step="1000"
                value={evtBudgetNaira}
                onChange={(e) => setEvtBudgetNaira(e.target.value)}
                placeholder="2500000"
              />
            </FormField>
          </div>

          <FormField id="evt-notes" label="Planning notes">
            <TextArea
              id="evt-notes"
              rows={2}
              value={evtNotes}
              onChange={(e) => setEvtNotes(e.target.value)}
              placeholder="Optional notes on color theme, venue preferences, or vendor priorities…"
              maxLength={2000}
            />
          </FormField>
        </form>
      </Dialog>

      {/* Cancel Enquiry Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancelEnquiry}
        title="Cancel this enquiry?"
        description="Cancelling marks this enquiry as closed so the vendor knows you are no longer requesting availability for this event."
        confirmLabel="Cancel enquiry"
        isDestructive
        isLoading={isCancelling}
      />
    </PageContainer>
  );
}
