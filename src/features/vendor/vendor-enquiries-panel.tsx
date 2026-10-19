import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  CheckCircle2,
  Eye,
  FilePlus2,
  Mail,
  MessageSquare,
  RotateCcw,
  Send,
  Users,
  XCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { TextArea, TextInput } from '../../components/ui/inputs';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  Skeleton,
} from '../../components/ui/feedback';
import { Dialog } from '../../components/ui/overlays';
import { FormField } from '../../components/forms/form-field';
import {
  EnquiryStatusBadge,
  QuoteCard,
} from '../../components/marketplace/enquiry-components';
import { useToast } from '../../components/ui/toast';
import { formatMinorCurrency } from '../../lib/config/env';
import {
  createAndSendVendorQuote,
  listQuotesForVendor,
  listVendorEnquiries,
  respondToEnquiryAsVendor,
  updateQuoteStatusAsVendor,
} from '../../server/repositories/marketplace-repository';
import { EnquiryRecord, QuoteRecord } from '../../types/marketplace';

type VendorEnquiryFilter = 'all' | 'awaiting' | 'responded' | 'closed';

export interface VendorEnquiriesPanelProps {
  vendorOwnerUid: string;
}

export function VendorEnquiriesPanel({
  vendorOwnerUid,
}: VendorEnquiriesPanelProps) {
  const { showToast } = useToast();

  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<VendorEnquiryFilter>('all');

  // Inline Reply State per Enquiry ID
  const [replyTextByEnquiry, setReplyTextByEnquiry] = useState<
    Record<string, string>
  >({});
  const [processingEnquiryId, setProcessingEnquiryId] = useState<string | null>(
    null
  );

  // Create Structured Quote Dialog State
  const [quoteTargetEnquiry, setQuoteTargetEnquiry] =
    useState<EnquiryRecord | null>(null);
  const [quoteItemsSummary, setQuoteItemsSummary] = useState('');
  const [quoteInclusions, setQuoteInclusions] = useState('');
  const [quoteExclusions, setQuoteExclusions] = useState('');
  const [quoteSubtotalNaira, setQuoteSubtotalNaira] = useState('');
  const [quoteDiscountNaira, setQuoteDiscountNaira] = useState('0');
  const [quoteDepositTerms, setQuoteDepositTerms] = useState(
    '50% deposit required to confirm date reservation; balance due 7 days before event.'
  );
  const [quoteValidUntil, setQuoteValidUntil] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [processingQuoteId, setProcessingQuoteId] = useState<string | null>(
    null
  );

  const loadVendorEnquiriesAndQuotes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [enqList, quoteList] = await Promise.all([
        listVendorEnquiries(vendorOwnerUid),
        listQuotesForVendor(vendorOwnerUid),
      ]);
      setEnquiries(enqList);
      setQuotes(quoteList);

      // Seed reply text with existing vendorResponse if present
      const initialReplies: Record<string, string> = {};
      for (const item of enqList) {
        if (item.vendorResponse) {
          initialReplies[item.id] = item.vendorResponse;
        }
      }
      setReplyTextByEnquiry((prev) => ({ ...initialReplies, ...prev }));
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to load incoming customer enquiries.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [vendorOwnerUid]);

  useEffect(() => {
    void loadVendorEnquiriesAndQuotes();
  }, [loadVendorEnquiriesAndQuotes]);

  const handleMarkViewed = async (enq: EnquiryRecord) => {
    if (enq.status !== 'submitted') return;
    setProcessingEnquiryId(enq.id);
    try {
      await respondToEnquiryAsVendor(vendorOwnerUid, enq, 'viewed');
      await loadVendorEnquiriesAndQuotes();
      showToast({
        title: 'Marked as viewed',
        description: `Customer notified that you are reviewing ${enq.subject}.`,
        tone: 'info',
      });
    } catch (err) {
      showToast({
        title: 'Could not update enquiry status',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setProcessingEnquiryId(null);
    }
  };

  const handleSendReply = async (enq: EnquiryRecord) => {
    const replyText = (replyTextByEnquiry[enq.id] || '').trim();
    if (replyText.length < 2) {
      showToast({
        title: 'Reply message required',
        description:
          'Please write a clear message confirming availability or next steps.',
        tone: 'warning',
      });
      return;
    }

    setProcessingEnquiryId(enq.id);
    try {
      await respondToEnquiryAsVendor(
        vendorOwnerUid,
        enq,
        'responded',
        replyText
      );
      await loadVendorEnquiriesAndQuotes();
      showToast({
        title: 'Response sent to customer',
        description:
          'Your reply has been saved and your direct business contact details are now unlocked for this customer.',
        tone: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Could not send response',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setProcessingEnquiryId(null);
    }
  };

  const handleCloseEnquiry = async (enq: EnquiryRecord) => {
    setProcessingEnquiryId(enq.id);
    try {
      await respondToEnquiryAsVendor(
        vendorOwnerUid,
        enq,
        'closed',
        replyTextByEnquiry[enq.id]
      );
      await loadVendorEnquiriesAndQuotes();
      showToast({
        title: 'Enquiry closed',
        tone: 'info',
      });
    } catch (err) {
      showToast({
        title: 'Could not close enquiry',
        description: err instanceof Error ? err.message : undefined,
        tone: 'danger',
      });
    } finally {
      setProcessingEnquiryId(null);
    }
  };

  const handleOpenQuoteModal = (enq: EnquiryRecord) => {
    setQuoteTargetEnquiry(enq);
    setQuoteItemsSummary(
      `Event service package for ${enq.subject} (${enq.listingName})`
    );
    setQuoteInclusions(
      'Full event day service, setup & breakdown, dedicated supervisor'
    );
    setQuoteExclusions('Overtime beyond agreed hours, external logistics');
    setQuoteSubtotalNaira(
      enq.budgetAmountMinor
        ? String(Math.round(enq.budgetAmountMinor / 100))
        : ''
    );
    setQuoteDiscountNaira('0');
    setQuoteValidUntil('');
    setQuoteNotes('');
    setQuoteError(null);
  };

  const submitVendorQuoteWithStatus = async (
    targetStatus: 'draft' | 'sent'
  ) => {
    if (!quoteTargetEnquiry) return;

    setQuoteError(null);
    const subtotalNaira = Number.parseFloat(
      quoteSubtotalNaira.trim().replace(/,/g, '')
    );
    const discountNaira = quoteDiscountNaira.trim()
      ? Number.parseFloat(quoteDiscountNaira.trim().replace(/,/g, ''))
      : 0;

    if (Number.isNaN(subtotalNaira) || subtotalNaira <= 0) {
      setQuoteError('Please enter a valid positive NGN subtotal amount.');
      return;
    }
    if (
      Number.isNaN(discountNaira) ||
      discountNaira < 0 ||
      discountNaira > subtotalNaira
    ) {
      setQuoteError(
        'Discount must be between ₦0 and the subtotal amount.'
      );
      return;
    }

    setIsSendingQuote(true);
    try {
      await createAndSendVendorQuote(vendorOwnerUid, quoteTargetEnquiry, {
        itemsSummary: quoteItemsSummary,
        inclusions: quoteInclusions,
        exclusions: quoteExclusions,
        subtotalMinor: Math.round(subtotalNaira * 100),
        discountMinor: Math.round(discountNaira * 100),
        depositTerms: quoteDepositTerms,
        validUntil: quoteValidUntil || null,
        notes: quoteNotes || null,
        status: targetStatus,
      });

      setQuoteTargetEnquiry(null);
      await loadVendorEnquiriesAndQuotes();
      showToast({
        title:
          targetStatus === 'sent'
            ? 'Structured NGN Quote sent'
            : 'Draft quote saved',
        description:
          targetStatus === 'sent'
            ? 'The customer can now review and accept or decline your quotation.'
            : 'Saved as draft. You can send it to the customer when ready.',
        tone: 'success',
      });
    } catch (err) {
      setQuoteError(
        err instanceof Error ? err.message : 'Could not save quotation.'
      );
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleSendQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitVendorQuoteWithStatus('sent');
  };

  const handleVendorQuoteAction = async (
    quote: QuoteRecord,
    nextStatus: 'sent' | 'withdrawn'
  ) => {
    setProcessingQuoteId(quote.id);
    try {
      await updateQuoteStatusAsVendor(vendorOwnerUid, quote, nextStatus);
      await loadVendorEnquiriesAndQuotes();
      showToast({
        title:
          nextStatus === 'sent'
            ? 'Quote sent to customer'
            : 'Quote withdrawn',
        tone: nextStatus === 'sent' ? 'success' : 'info',
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

  // Live preview of quote total in NGN
  const previewSubMinor = quoteSubtotalNaira.trim()
    ? Math.round(Number.parseFloat(quoteSubtotalNaira.trim()) * 100)
    : 0;
  const previewDiscMinor = quoteDiscountNaira.trim()
    ? Math.round(Number.parseFloat(quoteDiscountNaira.trim()) * 100)
    : 0;
  const previewTotalMinor = Math.max(0, previewSubMinor - previewDiscMinor);

  return (
    <section aria-label="Customer enquiries and quotes" className="space-y-6">
      {/* Filter & Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D7DEE8] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: `All (${enquiries.length})` },
              {
                id: 'awaiting',
                label: `Needs reply (${
                  enquiries.filter(
                    (e) => e.status === 'submitted' || e.status === 'viewed'
                  ).length
                })`,
              },
              {
                id: 'responded',
                label: `Responded (${
                  enquiries.filter((e) => e.status === 'responded').length
                })`,
              },
              {
                id: 'closed',
                label: `Closed (${
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

        <Button
          variant="secondary"
          size="sm"
          onClick={loadVendorEnquiriesAndQuotes}
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
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
          onRetry={loadVendorEnquiriesAndQuotes}
        />
      ) : filteredEnquiries.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
          title={
            enquiries.length === 0
              ? 'No customer enquiries received yet'
              : 'No enquiries match this filter'
          }
          description="When event organizers submit enquiries on your published venue or service listings, they will appear here for you to reply and send structured NGN quotes."
        />
      ) : (
        <div className="space-y-5">
          {filteredEnquiries.map((enq) => {
            const associatedQuotes = quotes.filter(
              (q) => q.enquiryId === enq.id
            );
            const isBusy = processingEnquiryId === enq.id;
            const isTerminal =
              enq.status === 'closed' || enq.status === 'cancelled';

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
                      <span className="text-xs font-medium text-[#475467]">
                        · Preferred reply: {enq.contactPreference}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#142B4A]">
                      {enq.subject}
                    </h3>
                    <p className="text-xs font-semibold text-[#4778D8]">
                      Listing: {enq.listingName}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {enq.status === 'submitted' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleMarkViewed(enq)}
                        leftIcon={<Eye className="h-3.5 w-3.5" />}
                      >
                        Mark Viewed
                      </Button>
                    )}

                    {!isTerminal && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleOpenQuoteModal(enq)}
                        leftIcon={
                          <FilePlus2 className="h-3.5 w-3.5 text-[#4778D8]" />
                        }
                      >
                        Issue NGN Quote
                      </Button>
                    )}

                    {!isTerminal && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleCloseEnquiry(enq)}
                        leftIcon={
                          <XCircle className="h-3.5 w-3.5 text-[#697586]" />
                        }
                      >
                        Close
                      </Button>
                    )}
                  </div>
                </div>

                {/* Customer & Event Metadata */}
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[10px] bg-[#F4F6F9] p-3.5 text-xs">
                  <div>
                    <dt className="text-[#697586]">Customer</dt>
                    <dd className="font-semibold text-[#172B4D] mt-0.5">
                      {enq.customerName}
                    </dd>
                    <dd className="text-[#4778D8] truncate mt-0.5">
                      <a
                        href={`mailto:${enq.customerEmail}`}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <Mail className="h-3 w-3 shrink-0" />
                        <span>{enq.customerEmail}</span>
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#697586]">Event type &amp; date</dt>
                    <dd className="font-semibold text-[#172B4D] capitalize mt-0.5">
                      {enq.eventType || 'Event'}
                    </dd>
                    <dd className="text-[#475467] flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3 text-[#4778D8]" />
                      <span>{enq.eventDate || 'Flexible date'}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#697586]">Estimated guests</dt>
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
                    <dt className="text-[#697586]">Customer budget</dt>
                    <dd className="font-semibold text-[#172B4D] tabular-nums mt-0.5">
                      {formatMinorCurrency(enq.budgetAmountMinor)}
                    </dd>
                  </div>
                </dl>

                {/* Customer Enquiry Message */}
                <div className="space-y-1 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#697586]">
                    Customer requirements
                  </p>
                  <p className="text-[#344054] whitespace-pre-line leading-relaxed">
                    {enq.message}
                  </p>
                </div>

                {/* Sent Quotes for this Enquiry */}
                {associatedQuotes.length > 0 && (
                  <div className="space-y-3">
                    {associatedQuotes.map((q) => (
                      <QuoteCard
                        key={q.id}
                        quote={q}
                        viewerRole="vendor"
                        onVendorAction={handleVendorQuoteAction}
                        isProcessingDecision={processingQuoteId === q.id}
                      />
                    ))}
                  </div>
                )}

                {/* Vendor Response Form */}
                {!isTerminal ? (
                  <div className="border-t border-[#E9EDF3] pt-4 space-y-3">
                    <FormField
                      id={`reply-${enq.id}`}
                      label="Your response to customer"
                      hint="Replying marks this enquiry as Responded and unlocks your business phone & email for the customer."
                    >
                      <TextArea
                        id={`reply-${enq.id}`}
                        rows={3}
                        value={replyTextByEnquiry[enq.id] || ''}
                        onChange={(e) =>
                          setReplyTextByEnquiry((prev) => ({
                            ...prev,
                            [enq.id]: e.target.value,
                          }))
                        }
                        placeholder="Confirm availability for their preferred date, answer their questions, or let them know you have attached a structured quotation…"
                        maxLength={3000}
                      />
                    </FormField>

                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isBusy}
                        onClick={() => handleSendReply(enq)}
                        leftIcon={<Send className="h-3.5 w-3.5" />}
                      >
                        {enq.status === 'responded'
                          ? 'Update Response'
                          : 'Send Response'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  enq.vendorResponse && (
                    <div className="border-t border-[#E9EDF3] pt-3 text-xs text-[#475467]">
                      <span className="font-semibold text-[#142B4A]">
                        Recorded response:{' '}
                      </span>
                      {enq.vendorResponse}
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Create & Send Structured Quote Dialog */}
      <Dialog
        isOpen={Boolean(quoteTargetEnquiry)}
        onClose={() => setQuoteTargetEnquiry(null)}
        title={
          quoteTargetEnquiry
            ? `Issue NGN Quote for ${quoteTargetEnquiry.customerName}`
            : 'Issue NGN Quote'
        }
        description="Send a clear, itemized Naira quotation. The customer will be able to accept or decline this quote in their workspace."
        maxWidthClass="max-w-xl"
        footer={
          <div className="flex flex-wrap w-full items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setQuoteTargetEnquiry(null)}
              disabled={isSendingQuote}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={isSendingQuote}
              onClick={() => submitVendorQuoteWithStatus('draft')}
            >
              Save as Draft
            </Button>
            <Button
              type="submit"
              form="vendor-send-quote-form"
              variant="primary"
              isLoading={isSendingQuote}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Send Quote to Customer
            </Button>
          </div>
        }
      >
        <form
          id="vendor-send-quote-form"
          onSubmit={handleSendQuoteSubmit}
          className="space-y-4"
        >
          {quoteError && (
            <InlineAlert tone="danger" title="Please check quote details">
              {quoteError}
            </InlineAlert>
          )}

          <FormField
            id="quote-summary"
            label="Quoted items summary"
            required
          >
            <TextInput
              id="quote-summary"
              value={quoteItemsSummary}
              onChange={(e) => setQuoteItemsSummary(e.target.value)}
              placeholder="e.g., Full-day Hall Rental + 500 Banquet Chairs & Backup Generator"
              maxLength={2000}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              id="quote-subtotal"
              label="Subtotal amount (₦ NGN)"
              required
            >
              <TextInput
                id="quote-subtotal"
                type="number"
                min={1}
                step="500"
                value={quoteSubtotalNaira}
                onChange={(e) => setQuoteSubtotalNaira(e.target.value)}
                placeholder="e.g., 850000"
                required
              />
            </FormField>

            <FormField id="quote-discount" label="Discount (₦ NGN)">
              <TextInput
                id="quote-discount"
                type="number"
                min={0}
                step="500"
                value={quoteDiscountNaira}
                onChange={(e) => setQuoteDiscountNaira(e.target.value)}
                placeholder="0"
              />
            </FormField>
          </div>

          <div className="rounded-[10px] border border-[#E9EDF3] bg-[#F4F6F9] px-3.5 py-2.5 flex items-center justify-between text-xs">
            <span className="font-medium text-[#475467]">
              Calculated total quotation (NGN):
            </span>
            <span className="text-sm font-bold text-[#142B4A] tabular-nums">
              {formatMinorCurrency(
                Number.isNaN(previewTotalMinor) ? 0 : previewTotalMinor
              )}
            </span>
          </div>

          <FormField id="quote-inclusions" label="What is included">
            <TextArea
              id="quote-inclusions"
              rows={2}
              value={quoteInclusions}
              onChange={(e) => setQuoteInclusions(e.target.value)}
              placeholder="List services, equipment, or hours included…"
              maxLength={1500}
            />
          </FormField>

          <FormField id="quote-exclusions" label="Exclusions">
            <TextInput
              id="quote-exclusions"
              value={quoteExclusions}
              onChange={(e) => setQuoteExclusions(e.target.value)}
              placeholder="e.g., Extra generator hours beyond 8 hours, corkage"
              maxLength={1500}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="quote-valid-until" label="Quote valid until">
              <TextInput
                id="quote-valid-until"
                type="date"
                value={quoteValidUntil}
                onChange={(e) => setQuoteValidUntil(e.target.value)}
              />
            </FormField>

            <FormField id="quote-deposit" label="Deposit & payment terms">
              <TextInput
                id="quote-deposit"
                value={quoteDepositTerms}
                onChange={(e) => setQuoteDepositTerms(e.target.value)}
                maxLength={500}
              />
            </FormField>
          </div>

          <FormField id="quote-notes" label="Additional notes">
            <TextArea
              id="quote-notes"
              rows={2}
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="Optional site inspection instructions or terms…"
              maxLength={1500}
            />
          </FormField>
        </form>
      </Dialog>
    </section>
  );
}
