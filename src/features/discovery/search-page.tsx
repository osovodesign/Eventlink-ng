import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { PageContainer } from '../../components/layout/page-container';
import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import {
  HeroSearch,
  SearchValues,
} from '../../components/marketplace/hero-search';
import {
  ActiveDiscoveryFilters,
  ActiveFilterChips,
  FilterPanel,
  SortSelect,
} from '../../components/marketplace/filter-panel';
import { ListingGrid } from '../../components/marketplace/listing-grid';
import { ComparisonFloatingBar } from '../../components/marketplace/comparison-floating-bar';
import { Button } from '../../components/ui/button';
import { Drawer } from '../../components/ui/overlays';
import { useRouter } from '../../lib/router/router-context';
import { LAUNCH_CATEGORIES } from '../../lib/config/env';
import { listPublishedListings } from '../../server/repositories/marketplace-repository';
import { toListingCardData } from '../../lib/validation/marketplace-schemas';
import {
  AsyncState,
  LaunchCity,
  ListingCardData,
  ListingType,
} from '../../types/marketplace';

export interface SearchPageProps {
  categorySlugFromRoute?: string;
}

const PAGE_SIZE = 9;

/**
 * SearchPage (PRD Section 8.3 SEARCH-01–SEARCH-06 & User_Flows.md Flow 2)
 * Encodes all search and filter state in the URL so parameters survive refresh
 * and browser back/forward navigation.
 */
export function SearchPage({ categorySlugFromRoute }: SearchPageProps) {
  const { searchParams, navigate } = useRouter();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filters: ActiveDiscoveryFilters = useMemo(() => {
    const rawType = searchParams.get('type');
    const rawCity = searchParams.get('city');
    const rawSetting = searchParams.get('setting');
    const rawSort = searchParams.get('sort');

    return {
      q: searchParams.get('q') || '',
      type:
        rawType === 'venue' || rawType === 'service-provider'
          ? (rawType as ListingType)
          : '',
      category: categorySlugFromRoute || searchParams.get('category') || '',
      city:
        rawCity === 'Warri' || rawCity === 'Effurun'
          ? (rawCity as LaunchCity)
          : '',
      setting:
        rawSetting === 'indoor' ||
        rawSetting === 'outdoor' ||
        rawSetting === 'both'
          ? rawSetting
          : '',
      minCapacity: searchParams.get('minCapacity') || '',
      maxPriceNaira: searchParams.get('maxPrice') || '',
      sortBy:
        rawSort === 'price-asc' ||
        rawSort === 'price-desc' ||
        rawSort === 'capacity-desc'
          ? rawSort
          : 'recent',
    };
  }, [searchParams, categorySlugFromRoute]);

  const updateUrlWithFilters = useCallback(
    (nextPartial: Partial<ActiveDiscoveryFilters>) => {
      const merged: ActiveDiscoveryFilters = { ...filters, ...nextPartial };
      const params = new URLSearchParams();
      if (merged.q.trim()) params.set('q', merged.q.trim());
      if (merged.type) params.set('type', merged.type);
      if (merged.category) params.set('category', merged.category);
      if (merged.city) params.set('city', merged.city);
      if (merged.setting) params.set('setting', merged.setting);
      if (merged.minCapacity) params.set('minCapacity', merged.minCapacity);
      if (merged.maxPriceNaira) params.set('maxPrice', merged.maxPriceNaira);
      if (merged.sortBy && merged.sortBy !== 'recent') {
        params.set('sort', merged.sortBy);
      }

      const qs = params.toString();
      navigate(qs ? `/search?${qs}` : '/search');
      setVisibleCount(PAGE_SIZE);
    },
    [filters, navigate]
  );

  const resetAllFilters = useCallback(() => {
    navigate('/search');
    setVisibleCount(PAGE_SIZE);
  }, [navigate]);

  const [resultsState, setResultsState] = useState<
    AsyncState<ListingCardData[]>
  >({ status: 'loading' });

  const executeQuery = useCallback(async () => {
    setResultsState({ status: 'loading' });
    try {
      const minCap = filters.minCapacity
        ? Number(filters.minCapacity)
        : undefined;
      const maxPriceMinor = filters.maxPriceNaira
        ? Number(filters.maxPriceNaira) * 100
        : undefined;

      const records = await listPublishedListings({
        listingType: filters.type || undefined,
        categoryId: filters.category || undefined,
        city: filters.city || undefined,
        keyword: filters.q || undefined,
        indoorOutdoor: filters.setting || undefined,
        minCapacity:
          minCap && !Number.isNaN(minCap) && minCap > 0 ? minCap : undefined,
        maxPriceMinor:
          maxPriceMinor && !Number.isNaN(maxPriceMinor) && maxPriceMinor > 0
            ? maxPriceMinor
            : undefined,
        sortBy: filters.sortBy,
      });

      setResultsState({
        status: 'success',
        data: records.map(toListingCardData),
      });
    } catch {
      setResultsState({
        status: 'error',
        message:
          'We couldn’t complete your search. Your selected filters have been preserved.',
        retryable: true,
      });
    }
  }, [filters]);

  useEffect(() => {
    void executeQuery();
  }, [executeQuery]);

  const handleSearchBarSubmit = (values: SearchValues) => {
    updateUrlWithFilters({
      q: values.query,
      city:
        values.location === 'Warri' || values.location === 'Effurun'
          ? values.location
          : '',
      category: values.category,
    });
  };

  const categoryInfo = LAUNCH_CATEGORIES.find(
    (c) => c.slug === filters.category
  );
  const pageTitle = categoryInfo
    ? `${categoryInfo.label} in ${filters.city || 'Warri & Effurun'}`
    : filters.type === 'venue'
    ? `Event Venues in ${filters.city || 'Warri & Effurun'}`
    : filters.type === 'service-provider'
    ? `Event Service Providers in ${filters.city || 'Warri & Effurun'}`
    : `Explore Venues & Event Services in ${filters.city || 'Warri & Effurun'}`;

  const allMatching =
    resultsState.status === 'success' ? resultsState.data : [];
  const paginatedItems = allMatching.slice(0, visibleCount);
  const hasMore = visibleCount < allMatching.length;

  return (
    <PageContainer className="py-6 sm:py-10 space-y-6 pb-20">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: categoryInfo ? categoryInfo.label : 'Search & Explore' },
        ]}
      />

      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#142B4A]">
          {pageTitle}
        </h1>
        <HeroSearch
          compact
          initialValues={{
            query: filters.q,
            location: filters.city,
            category: filters.category,
          }}
          onSearch={handleSearchBarSubmit}
          isLoading={resultsState.status === 'loading'}
        />
      </div>

      {/* Main Layout: Sidebar Filters (Desktop) + Results Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
        {/* Desktop Filter Panel */}
        <aside
          aria-label="Search refinement filters"
          className="hidden lg:block lg:col-span-3 rounded-[14px] border border-[#D7DEE8] bg-white p-5 sticky top-20"
        >
          <FilterPanel
            filters={filters}
            onUpdateFilters={updateUrlWithFilters}
            onResetFilters={resetAllFilters}
          />
        </aside>

        {/* Results Area */}
        <div className="lg:col-span-9 space-y-5">
          {/* Results Summary + Mobile Filter Button + Sort Control */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#D7DEE8] bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="lg:hidden"
                leftIcon={
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                }
                onClick={() => setMobileFiltersOpen(true)}
              >
                Filters
              </Button>
              <p
                role="status"
                aria-live="polite"
                className="text-sm font-medium text-[#172B4D] tabular-nums"
              >
                {resultsState.status === 'loading'
                  ? 'Searching published listings…'
                  : `${allMatching.length} approved ${
                      allMatching.length === 1 ? 'listing' : 'listings'
                    } found`}
              </p>
            </div>

            <SortSelect
              value={filters.sortBy}
              onChange={(sortBy) => updateUrlWithFilters({ sortBy })}
            />
          </div>

          {/* Active Filter Chips */}
          <ActiveFilterChips
            filters={filters}
            onUpdateFilters={updateUrlWithFilters}
            onResetFilters={resetAllFilters}
          />

          {/* Listing Grid */}
          <ListingGrid
            listings={paginatedItems}
            isLoading={resultsState.status === 'loading'}
            error={
              resultsState.status === 'error' ? resultsState.message : null
            }
            onRetry={executeQuery}
            emptyTitle="No published listings match these filters"
            emptyDescription="Try removing a filter, broadening your price or capacity threshold, or searching across both Warri and Effurun."
            emptyActionLabel="Clear all filters"
            onEmptyAction={resetAllFilters}
          />

          {/* Load More Pagination */}
          {hasMore && resultsState.status === 'success' && (
            <div className="pt-4 flex justify-center">
              <Button
                variant="secondary"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                Show more listings ({allMatching.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <Drawer
        isOpen={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Filter listings"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                resetAllFilters();
                setMobileFiltersOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={() => setMobileFiltersOpen(false)}
            >
              Show results ({allMatching.length})
            </Button>
          </div>
        }
      >
        <FilterPanel
          filters={filters}
          onUpdateFilters={updateUrlWithFilters}
          onResetFilters={resetAllFilters}
        />
      </Drawer>

      <ComparisonFloatingBar />
    </PageContainer>
  );
}
