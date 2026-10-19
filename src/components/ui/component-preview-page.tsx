import React, { useState } from 'react';
import { PageContainer } from '../layout/page-container';
import { PageHeading } from '../layout/page-heading';
import { SectionHeader } from '../layout/section-header';
import { Breadcrumbs } from '../layout/breadcrumbs';
import { Button } from './button';
import {
  TextInput,
  TextArea,
  SelectField,
  CheckboxField,
  RadioGroupField,
} from './inputs';
import { FormField } from '../forms/form-field';
import { StatusBadge, ListingStatusBadge } from './status-badge';
import {
  InlineAlert,
  Skeleton,
  Spinner,
  EmptyState,
  ErrorState,
} from './feedback';
import { Dialog, ConfirmDialog, Drawer } from './overlays';
import { useToast } from './toast';
import { LAUNCH_CATEGORIES, LAUNCH_LOCATIONS } from '../../lib/config/env';

/**
 * ComponentPreviewPage (Build_Plan.md Phase 4 Task: "Create a small component preview/test route")
 * Allows interactive keyboard, focus, and state verification of all Phase 4 UI primitives.
 */
export function ComponentPreviewPage() {
  const { showToast } = useToast();
  const [sampleName, setSampleName] = useState('');
  const [sampleCity, setSampleCity] = useState('Warri');
  const [sampleNotes, setSampleNotes] = useState('');
  const [sampleSetting, setSampleSetting] = useState('indoor');
  const [sampleAgree, setSampleAgree] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSampleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sampleName.trim()) {
      setShowValidationError(true);
      return;
    }
    setShowValidationError(false);
    showToast({
      title: 'Form validation passed',
      description: `Verified input for "${sampleName.trim()}" in ${sampleCity}.`,
      tone: 'success',
    });
  };

  return (
    <PageContainer className="py-8 sm:py-12 space-y-10">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Phase 4 UI Primitives' },
        ]}
      />

      <PageHeading
        kicker="Phase 4 component library & accessibility check"
        title="Shared UI primitives & interaction states"
        description="Interactive verification surface for EventLink buttons, form controls, status badges, dialogs, drawers, toasts, skeletons, empty states, and error states."
      />

      {/* 1. Buttons & Status Badges */}
      <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-6">
        <SectionHeader
          title="Buttons & status badges"
          description="44px minimum default touch targets, loading states, and non-color-only semantic badges."
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={() =>
              showToast({
                title: 'Primary action triggered',
                description: 'Toast live-region announcement verified.',
                tone: 'info',
              })
            }
          >
            Save listing
          </Button>
          <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>
            Open modal dialog
          </Button>
          <Button variant="ghost" onClick={() => setIsDrawerOpen(true)}>
            Open mobile drawer
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsConfirmOpen(true)}
          >
            Archive listing
          </Button>
          <Button variant="primary" isLoading loadingText="Submitting…">
            Send enquiry
          </Button>
          <Button variant="secondary" disabled>
            Disabled action
          </Button>
        </div>

        <div className="pt-4 border-t border-[#E9EDF3] flex flex-wrap items-center gap-2.5">
          <ListingStatusBadge
            publicationStatus="published"
            moderationStatus="approved"
          />
          <ListingStatusBadge
            publicationStatus="pending_review"
            moderationStatus="pending"
          />
          <ListingStatusBadge
            publicationStatus="draft"
            moderationStatus="changes_requested"
          />
          <ListingStatusBadge
            publicationStatus="rejected"
            moderationStatus="rejected"
          />
          <ListingStatusBadge
            publicationStatus="draft"
            moderationStatus="not_submitted"
          />
          <StatusBadge status="quote_sent" label="Quote sent" tone="info" />
          <StatusBadge
            status="quote_accepted"
            label="Quote accepted"
            tone="success"
          />
        </div>
      </section>

      {/* 2. Form Primitives & Validation */}
      <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-6">
        <SectionHeader
          title="Accessible form controls & input preservation"
          description="Programmatic htmlFor, aria-describedby, and aria-invalid associations."
        />
        <form onSubmit={handleSampleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            id="preview-venue-name"
            label="Venue or business name"
            hint="Enter at least 2 characters to test validation."
            required
            error={
              showValidationError && !sampleName.trim()
                ? 'Please enter a venue or business name before submitting.'
                : undefined
            }
          >
            <TextInput
              id="preview-venue-name"
              placeholder="e.g. Royal Palm Civic Centre"
              value={sampleName}
              hasError={showValidationError && !sampleName.trim()}
              onChange={(e) => setSampleName(e.target.value)}
            />
          </FormField>

          <FormField
            id="preview-city"
            label="Launch location"
            hint="Select a supported city in Delta State."
            required
          >
            <SelectField
              id="preview-city"
              value={sampleCity}
              onChange={(e) => setSampleCity(e.target.value)}
              options={LAUNCH_LOCATIONS.map((l) => ({
                value: l.city,
                label: l.label,
              }))}
            />
          </FormField>

          <div className="md:col-span-2">
            <RadioGroupField
              name="preview-setting"
              legend="Venue setting configuration"
              value={sampleSetting}
              onChange={setSampleSetting}
              options={[
                {
                  value: 'indoor',
                  label: 'Indoor hall',
                  description: 'Enclosed air-conditioned hall space',
                },
                {
                  value: 'both',
                  label: 'Indoor & outdoor',
                  description: 'Hall plus marquee or garden lawn',
                },
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <FormField
              id="preview-notes"
              label="Event requirements or service description"
              hint="Plain text only; user input is preserved if an operation fails."
            >
              <TextArea
                id="preview-notes"
                rows={3}
                placeholder="Share expected guest count, preferred setup, or package inclusions…"
                value={sampleNotes}
                onChange={(e) => setSampleNotes(e.target.value)}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <CheckboxField
              id="preview-enquiry-notice"
              label="I understand that sending an enquiry is not a confirmed booking"
              description="Vendors review requirements and confirm availability before any booking takes place."
              checked={sampleAgree}
              onChange={(e) => setSampleAgree(e.target.checked)}
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <Button type="submit" variant="primary">
              Validate form fields
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowValidationError(true)}
            >
              Simulate field error
            </Button>
          </div>
        </form>
      </section>

      {/* 3. Alerts, Skeletons, Empty & Error States */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 space-y-4">
          <h3 className="text-lg font-semibold text-[#142B4A]">
            Inline alerts & loading states
          </h3>
          <InlineAlert tone="info" title="Enquiry status notice">
            Your enquiry has been sent to the vendor. This is not a confirmed
            booking.
          </InlineAlert>
          <InlineAlert tone="warning" title="Changes requested by moderator">
            Please add a clear daytime photo of the main hall entrance before
            resubmitting.
          </InlineAlert>
          <div className="pt-2 space-y-2.5">
            <Spinner label="Loading published listings in Warri…" />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <EmptyState
            title="No listings match these filters"
            description="Try expanding your location to both Warri and Effurun or removing a capacity filter."
            actionLabel="Reset filters"
            onAction={() =>
              showToast({
                title: 'Filters reset',
                description: 'Showing all approved categories.',
                tone: 'info',
              })
            }
          />
          <ErrorState
            title="Search request timed out"
            message="We couldn’t reach the listings service. Your selected search filters have been preserved."
            onRetry={() =>
              showToast({
                title: 'Retrying request',
                description: `Reloading ${LAUNCH_CATEGORIES.length} categories…`,
                tone: 'info',
              })
            }
          />
        </div>
      </section>

      {/* Overlays */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Accessible modal dialog"
        description="Press Escape or click outside to close; keyboard focus returns to the trigger button."
        footer={
          <Button variant="primary" onClick={() => setIsDialogOpen(false)}>
            Done
          </Button>
        }
      >
        <p className="text-sm text-[#344054]">
          This dialog follows WCAG 2.2 AA focus management rules from{' '}
          <code>Component_Specifications.md</code> Section 4.17.
        </p>
      </Dialog>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          showToast({
            title: 'Listing archived',
            description: 'The listing is hidden from public discovery.',
            tone: 'warning',
          });
        }}
        title="Archive this listing?"
        description="Archiving hides this listing from public search results while preserving past enquiries and quotes."
        confirmLabel="Archive listing"
        isDestructive
      />

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Mobile filter sheet preview"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsDrawerOpen(false)}
            >
              Reset
            </Button>
            <Button variant="primary" onClick={() => setIsDrawerOpen(false)}>
              Apply filters
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[#344054]">
          On mobile viewports, search refinement filters open inside this
          accessible slide-over drawer with explicit Apply and Reset actions.
        </p>
      </Drawer>
    </PageContainer>
  );
}
