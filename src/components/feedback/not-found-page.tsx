import React from 'react';
import { Compass, Search, ArrowLeft } from 'lucide-react';
import { PageContainer } from '../layout/page-container';
import { AppLink } from '../../lib/router/router-context';

export interface NotFoundPageProps {
  requestedPath?: string;
}

/**
 * NotFoundPage (TRD Section 5, Build_Plan.md Phase 1)
 * Displays a helpful, accessible 404 state when a route or unpublished listing is not found.
 */
export function NotFoundPage({ requestedPath }: NotFoundPageProps) {
  return (
    <PageContainer className="py-12 sm:py-20">
      <div className="mx-auto max-w-xl rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-10">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#EFF8FF] text-[#175CD3] mb-4">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-xs font-medium text-[#697586] mb-1">
          Page not found
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#142B4A] mb-3">
          We couldn’t find that page
        </h1>
        <p className="text-base text-[#344054] mb-6 leading-relaxed">
          The page or listing you requested
          {requestedPath ? ` (${requestedPath})` : ''} may have been moved,
          unpublished, or does not exist. You can return to the marketplace home
          or search approved venues and event service providers in Warri and
          Effurun.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <AppLink
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#142B4A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to home
          </AppLink>
          <AppLink
            href="/search"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2.5 text-sm font-medium text-[#142B4A] hover:bg-[#F4F6F9] transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Explore listings
          </AppLink>
        </div>
      </div>
    </PageContainer>
  );
}
