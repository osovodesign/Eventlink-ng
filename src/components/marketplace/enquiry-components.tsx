import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  MessageSquare,
  Send,
  XCircle,
} from 'lucide-react';
import {
  EnquiryRecord,
  EnquiryStatus,
  EventWorkspaceRecord,
  ListingRecord,
  ListingServiceRecord,
  QuoteRecord,
  QuoteStatus,
} from '../../types/marketplace';
import { StatusBadge } from '../ui/status-badge';
import { Button } from '../ui/button';
import { SelectField, TextArea, TextInput } from '../ui/inputs';
import { InlineAlert } from '../ui/feedback';
import { FormField } from '../forms/form-field';
import { AppLink } from '../../lib/router/router-context';
import { EVENT_TYPES, formatMinorCurrency } from '../../lib/config/env';
import {
  createCustomerEnquiry,
  listCustomerEvents,
} from '../../server/repositories/marketplace-repository';

/**
 * EnquiryStatusBadge (Component_Specifications.md Section 4.16)
 */
export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  switch (status) {
    case 'submitted':
      return (
        <StatusBadge
          status="submitted"
          label="Awaiting vendor reply"
          tone="info"
        />
      );
    case 'viewed':
      return (
        <StatusBadge status="viewed" label="Viewed by vendor" tone="info" />
      );
    case 'responded':
      return (
        <StatusBadge
          status="responded"
          label="Vendor responded"
          tone="success"
        />
      );
    case 'closed':
      return <StatusBadge status="closed" label="Closed" tone="neutral" />;
    case 'cancelled':
    default:
      return (
        <StatusBadge status="cancelled" label="Cancelled" tone="neutral" />
      );
  }
}

/**
 * QuoteStatusBadge (Component_Specifications.md Section 4.16)
 */
export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  switch (status) {
    case 'sent':
      return (
        <StatusBadge status="sent" label="Quote awaiting decision" tone="info" />
      );
    case 'accepted':
      return (
        <StatusBadge
          status="accepted"
          label="Quote accepted"
          tone="success"
        />
      );
    case 'declined':
      return (
        <StatusBadge status="declined" label="Quote declined" tone="danger" />
      );
    case 'expired':
      return (
        <StatusBadge status="expired" label="Quote expired" tone="warning" />
      );
    case 'withdrawn':
      return (
        <StatusBadge
          status="withdrawn"
          label="Withdrawn by vendor"
          tone="neutral"
        />
      );
    case 'draft':
    default:
      return <StatusBadge status="draft" label="Draft quote" tone="neutral" />;
  }
}

export interface QuoteCardProps {
  quote: QuoteRecord;
  viewerRole: 'customer' | 'vendor';
  onCustomerDecision?: (
    quote: QuoteRecord,
    decision: 'accepted' | 'declined'
  ) => Promise<void>;
  onVendorAction?: (
    quote: QuoteRecord,
    nextStatus: 'sent' | 'withdrawn'
  ) => Promise<void>;
  isProcessingDecision?: boolean;
}

/**
 * QuoteCard (Component_Specifications.md Section 4.12 & PRD Section 8.9)
 * Displays structured vendor quote line summary, inclusions, exclusions, NGN subtotal/discount/total,
 * and allows the customer to Accept or Decline when `status === 'sent'`, or the vendor to send a draft
 * or withdraw an unaccepted quote.
 */
export function QuoteCard({
  quote,
  viewerRole,
  onCustomerDecision,
  onVendorAction,
  isProcessingDecision = false,
}: QuoteCardProps) {
  return (
    <div className="rounded-[12px] border border-[#D7DEE8] bg-[#F4F6F9]/70 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E9EDF3] pb-3">
        <div className="flex items-center gap-2">
          <FileText
            className="h-4 w-4 text-[#4778D8] shrink-0"
            aria-hidden="true"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-[#142B4A]">
            Structured Quotation ({quote.id.slice(0, 10)})
          </span>
        </div>
        <QuoteStatusBadge status={quote.status} />
      </div>

      <div className="space-y-2 text-sm">
        <p className="font-semibold text-[#142B4A]">{quote.itemsSummary}</p>

        {quote.inclusions && (
          <div className="text-xs text-[#344054]">
            <span className="font-semibold text-[#172B4D]">Included: </span>
            {quote.inclusions}
          </div>
        )}

        {quote.exclusions && (
          <div className="text-xs text-[#697586]">
            <span className="font-semibold text-[#344054]">Exclusions: </span>
            {quote.exclusions}
          </div>
        )}

        {quote.depositTerms && (
          <div className="text-xs text-[#344054]">
            <span className="font-semibold text-[#172B4D]">
              Deposit &amp; payment terms:{' '}
            </span>
            {quote.depositTerms}
          </div>
        )}

        {quote.validUntil && (
          <div className="text-xs text-[#697586]">
            Valid until: <span className="font-medium">{quote.validUntil}</span>
          </div>
        )}

        {quote.notes && (
          <div className="text-xs text-[#344054] italic">{quote.notes}</div>
        )}
      </div>

      {/* Minor-unit verified NGN Pricing Breakdown */}
      <dl className="grid grid-cols-3 gap-3 rounded-[10px] border border-[#E9EDF3] bg-white p-3.5 text-xs">
        <div>
          <dt className="text-[#697586]">Subtotal</dt>
          <dd className="font-semibold text-[#172B4D] tabular-nums mt-0.5">
            {formatMinorCurrency(quote.subtotalMinor)}
          </dd>
        </div>
        <div>
          <dt className="text-[#697586]">Discount</dt>
          <dd className="font-semibold text-[#146C43] tabular-nums mt-0.5">
            {quote.discountMinor > 0
              ? `−${formatMinorCurrency(quote.discountMinor)}`
              : '₦0'}
          </dd>
        </div>
        <div>
          <dt className="text-[#697586] font-semibold">Total (NGN)</dt>
          <dd className="text-sm font-bold text-[#142B4A] tabular-nums mt-0.5">
            {formatMinorCurrency(quote.totalMinor)}
          </dd>
        </div>
      </dl>

      {/* Customer Decision Controls */}
      {viewerRole === 'customer' &&
        quote.status === 'sent' &&
        onCustomerDecision && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E9EDF3]">
            <p className="text-xs text-[#697586]">
              Accepting records your decision so you and the vendor can finalize offline contract &amp; payment arrangements.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessingDecision}
                onClick={() => onCustomerDecision(quote, 'declined')}
                leftIcon={<XCircle className="h-3.5 w-3.5 text-[#B42318]" />}
              >
                Decline Quote
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isProcessingDecision}
                onClick={() => onCustomerDecision(quote, 'accepted')}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Accept Quote
              </Button>
            </div>
          </div>
        )}

      {/* Vendor Quote Lifecycle Controls (Draft -> Sent, Sent -> Withdrawn) */}
      {viewerRole === 'vendor' &&
        onVendorAction &&
        (quote.status === 'draft' || quote.status === 'sent') && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E9EDF3]">
            <p className="text-xs text-[#697586]">
              {quote.status === 'draft'
                ? 'This quote is currently a draft and is not yet visible to the customer.'
                : 'Awaiting customer decision. You may withdraw this quote if terms change.'}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {quote.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isProcessingDecision}
                  onClick={() => onVendorAction(quote, 'sent')}
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                >
                  Send to Customer
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessingDecision}
                onClick={() => onVendorAction(quote, 'withdrawn')}
                leftIcon={<XCircle className="h-3.5 w-3.5 text-[#B42318]" />}
              >
                Withdraw Quote
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}

export interface EnquiryFormProps {
  listing: ListingRecord;
  services: ListingServiceRecord[];
  customerUid: string;
  customerName: string;
  customerEmail: string;
  initialServiceId?: string;
  onSuccess?: (created: EnquiryRecord) => void;
  onCancel?: () => void;
}

/**
 * EnquiryForm (Component_Specifications.md Section 4.12 & Build_Plan.md Phase 8 & 10)
 * - Clearly states that an enquiry is not a confirmed booking.
 * - Allows linking an enquiry to a planned Customer Event (`events/{eventId}`).
 * - Preserves all user input if a submission fails.
 * - Prevents duplicate submissions and displays a server-confirmed receipt.
 */
export function EnquiryForm({
  listing,
  services,
  customerUid,
  customerName,
  customerEmail,
  initialServiceId = '',
  onSuccess,
  onCancel,
}: EnquiryFormProps) {
  const [plannedEvents, setPlannedEvents] = useState<EventWorkspaceRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId);
  const [subject, setSubject] = useState('');
  const [eventType, setEventType] = useState('wedding');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const [budgetNaira, setBudgetNaira] = useState('');
  const [contactPreference, setContactPreference] = useState<
    'email' | 'phone' | 'whatsapp'
  >('email');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEnquiry, setCreatedEnquiry] = useState<EnquiryRecord | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    listCustomerEvents(customerUid)
      .then((evts) => {
        if (!cancelled) {
          setPlannedEvents(evts.filter((e) => e.status === 'planning'));
        }
      })
      .catch(() => {
        // Non-fatal
      });
    return () => {
      cancelled = true;
    };
  }, [customerUid]);

  useEffect(() => {
    setSelectedServiceId(initialServiceId);
    const matchedPkg = services.find((s) => s.id === initialServiceId);
    if (matchedPkg) {
      setSubject(`Enquiry: ${matchedPkg.name} at ${listing.name}`);
    } else {
      setSubject(`Event enquiry for ${listing.name}`);
    }
  }, [initialServiceId, listing.name, services]);

  const handleSelectPlannedEvent = (evtId: string) => {
    setSelectedEventId(evtId);
    const matchedEvt = plannedEvents.find((e) => e.id === evtId);
    if (matchedEvt) {
      setEventType(matchedEvt.eventType);
      if (matchedEvt.eventDate) setEventDate(matchedEvt.eventDate);
      if (matchedEvt.guestCount) setGuestCount(String(matchedEvt.guestCount));
      if (matchedEvt.budgetAmountMinor) {
        setBudgetNaira(String(Math.round(matchedEvt.budgetAmountMinor / 100)));
      }
      setSubject(`${matchedEvt.title} — Enquiry for ${listing.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < 2) {
      setErrorMsg('Please enter a clear subject for your enquiry.');
      return;
    }
    if (trimmedMessage.length < 10) {
      setErrorMsg(
        'Please include at least 10 characters describing your event date, guest count, or requirements.'
      );
      return;
    }

    const parsedGuests = guestCount.trim()
      ? Number.parseInt(guestCount.trim(), 10)
      : null;
    if (
      parsedGuests !== null &&
      (Number.isNaN(parsedGuests) || parsedGuests < 1 || parsedGuests > 50000)
    ) {
      setErrorMsg('Estimated guest count must be between 1 and 50,000.');
      return;
    }

    const parsedBudgetNaira = budgetNaira.trim()
      ? Number.parseFloat(budgetNaira.trim().replace(/,/g, ''))
      : null;
    if (
      parsedBudgetNaira !== null &&
      (Number.isNaN(parsedBudgetNaira) || parsedBudgetNaira < 0)
    ) {
      setErrorMsg('Estimated budget must be a valid positive Naira amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCustomerEnquiry({
        customerUid,
        customerName,
        customerEmail,
        listing,
        eventId: selectedEventId || null,
        serviceId: selectedServiceId || null,
        subject: trimmedSubject,
        message: trimmedMessage,
        eventType: eventType || null,
        eventDate: eventDate || null,
        guestCount: parsedGuests,
        locationText: `${listing.city}, Delta State`,
        budgetAmountMinor:
          parsedBudgetNaira !== null
            ? Math.round(parsedBudgetNaira * 100)
            : null,
        contactPreference,
      });

      setCreatedEnquiry(created);
      onSuccess?.(created);
    } catch (err) {
      // Failed submission preserves all user fields in state
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not submit your enquiry right now. Your message has been preserved — please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdEnquiry) {
    return (
      <div className="space-y-4">
        <InlineAlert tone="success" title="Enquiry delivered to vendor">
          Your enquiry (Reference:{' '}
          <span className="font-mono font-semibold">{createdEnquiry.id}</span>)
          has been recorded for <strong>{listing.name}</strong>.
        </InlineAlert>

        <div className="rounded-[12px] border border-[#E9EDF3] bg-[#F4F6F9] p-4 space-y-2 text-xs text-[#344054]">
          <p className="font-semibold text-[#142B4A]">
            What happens next?
          </p>
          <p>
            Submitting an enquiry does not automatically reserve your date. The vendor will review your requirements and respond with availability and a structured NGN quotation.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <AppLink
            href="/enquiries"
            className="inline-flex min-h-[40px] items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2 text-xs font-semibold text-[#142B4A] hover:bg-[#F4F6F9] transition-colors"
          >
            View in My Enquiries
          </AppLink>
          {onCancel && (
            <Button variant="primary" size="sm" onClick={onCancel}>
              Done
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Mandatory Non-Booking Disclosure (Build_Plan.md Phase 8 Acceptance Criteria) */}
      <div className="flex items-start gap-2.5 rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] p-3 text-xs text-[#344054]">
        <CalendarClock
          className="h-4 w-4 text-[#4778D8] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p>
          <strong>Note:</strong> Submitting an enquiry is not a confirmed booking or date reservation. The vendor will confirm date availability and send a structured quote.
        </p>
      </div>

      {errorMsg && (
        <InlineAlert
          tone="danger"
          title="Enquiry could not be sent (your draft is preserved)"
        >
          {errorMsg}
        </InlineAlert>
      )}

      {plannedEvents.length > 0 && (
        <FormField
          id="enq-event-plan"
          label="Link to a planned event"
          hint="Select one of your planned events to pre-fill date, guest count, and budget."
        >
          <SelectField
            id="enq-event-plan"
            value={selectedEventId}
            onChange={(e) => handleSelectPlannedEvent(e.target.value)}
            placeholderOption="Standalone enquiry (not linked to an event plan)"
            options={plannedEvents.map((ev) => ({
              value: ev.id,
              label: `${ev.title} (${ev.city}${
                ev.eventDate ? ` · ${ev.eventDate}` : ''
              })`,
            }))}
          />
        </FormField>
      )}

      {services.length > 0 && (
        <FormField
          id="enq-package"
          label="Interested package"
          hint="Select an itemized package or leave blank for a custom quote."
        >
          <SelectField
            id="enq-package"
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            placeholderOption="General enquiry / custom package"
            options={services.map((s) => ({
              value: s.id,
              label: `${s.name} (${
                s.pricingModel === 'custom-quote' || s.amountMinor <= 0
                  ? 'Custom quote'
                  : formatMinorCurrency(s.amountMinor)
              })`,
            }))}
          />
        </FormField>
      )}

      <FormField id="enq-subject" label="Enquiry subject" required>
        <TextInput
          id="enq-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g., Traditional marriage reception in November"
          maxLength={160}
          required
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="enq-event-type" label="Event type" required>
          <SelectField
            id="enq-event-type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            options={EVENT_TYPES.map((et) => ({
              value: et.slug,
              label: et.label,
            }))}
          />
        </FormField>

        <FormField
          id="enq-event-date"
          label="Preferred event date"
          hint="Vendor will confirm availability."
        >
          <TextInput
            id="enq-event-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField id="enq-guests" label="Estimated guest count">
          <TextInput
            id="enq-guests"
            type="number"
            min={1}
            max={50000}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="e.g., 350"
          />
        </FormField>

        <FormField id="enq-budget" label="Estimated budget (₦ NGN)">
          <TextInput
            id="enq-budget"
            type="number"
            min={0}
            step="1000"
            value={budgetNaira}
            onChange={(e) => setBudgetNaira(e.target.value)}
            placeholder="e.g., 500000"
          />
        </FormField>
      </div>

      <FormField id="enq-contact-pref" label="Preferred reply channel" required>
        <SelectField
          id="enq-contact-pref"
          value={contactPreference}
          onChange={(e) =>
            setContactPreference(
              e.target.value as 'email' | 'phone' | 'whatsapp'
            )
          }
          options={[
            { value: 'email', label: 'Email & EventLink workspace' },
            { value: 'phone', label: 'Phone call & EventLink workspace' },
            { value: 'whatsapp', label: 'WhatsApp & EventLink workspace' },
          ]}
        />
      </FormField>

      <FormField
        id="enq-message"
        label="Event details & questions"
        hint="Include setup requirements, timing, or specific questions for the vendor (10–3,000 characters)."
        required
      >
        <TextArea
          id="enq-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell the vendor about your event timeline, guest expectations, and what you need included in their quote…"
          maxLength={3000}
          required
        />
      </FormField>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[#E9EDF3]">
        {onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          leftIcon={<MessageSquare className="h-4 w-4" />}
        >
          Submit Enquiry
        </Button>
      </div>
    </form>
  );
}
