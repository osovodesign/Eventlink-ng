import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Camera,
  ArrowRight,
  Database,
  CheckCircle2,
  Bookmark,
  Scale,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/page-container';
import { SectionHeader } from '../../components/layout/section-header';
import {
  HeroSearch,
  SearchValues,
} from '../../components/marketplace/hero-search';
import { CategoryChips } from '../../components/marketplace/filter-panel';
import { ListingGrid } from '../../components/marketplace/listing-grid';
import { ComparisonFloatingBar } from '../../components/marketplace/comparison-floating-bar';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast';
import { useAuth } from '../../lib/auth/auth-context';
import { AppLink, useRouter } from '../../lib/router/router-context';
import { ENV, LAUNCH_LOCATIONS } from '../../lib/config/env';
import { listPublishedListings } from '../../server/repositories/marketplace-repository';
import { toListingCardData } from '../../lib/validation/marketplace-schemas';
import { seedDevelopmentFixtures } from '../../lib/seed/dev-fixtures';
import { AsyncState, ListingCardData } from '../../types/marketplace';

/**
 * HomePage (PRD Section 8.2 DISC-01–DISC-07 & User_Flows.md Flow 1)
 * Public marketplace entry point with HeroSearch, location/category routes, and real published listings.
 * Never displays fabricated activity counters, fake testimonials, or unapproved listings.
 */
export function HomePage() {
  const { navigate } = useRouter();
  const { userProfile, isAdmin, refreshVendorContext } = useAuth();
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState<'' | 'Warri' | 'Effurun'>('');
  const [listingsState, setListingsState] = useState<
    AsyncState<ListingCardData[]>
  >({ status: 'loading' });
  const [isSeeding, setIsSeeding] = useState(false);

  const loadListings = useCallback(async () => {
    setListingsState({ status: 'loading' });
    try {
      const records = await listPublishedListings({
        categoryId: selectedCategory || undefined,
        city: selectedCity || undefined,
      });
      setListingsState({
        status: 'success',
        data: records.map(toListingCardData),
      });
    } catch {
      setListingsState({
        status: 'error',
        message:
          'We couldn’t load published listings right now. Please check your connection and try again.',
        retryable: true,
      });
    }
  }, [selectedCategory, selectedCity]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const handleHeroSearch = (values: SearchValues) => {
    const params = new URLSearchParams();
    if (values.query) params.set('q', values.query);
    if (values.location) params.set('city', values.location);
    if (values.category) params.set('category', values.category);
    const queryStr = params.toString();
    navigate(queryStr ? `/search?${queryStr}` : '/search');
  };

  const handleSeedPublishedDevListings = async () => {
    if (!userProfile) {
      navigate('/login?returnTo=%2F');
      return;
    }
    setIsSeeding(true);
    try {
      const count = await seedDevelopmentFixtures(userProfile.uid, isAdmin);
      await refreshVendorContext();
      await loadListings();
      showToast({
        title: isAdmin
          ? `Seeded & published ${count} dev sample listings`
          : `Seeded ${count} dev sample listings (pending review)`,
        description: isAdmin
          ? 'Warri & Effurun sample venues and vendors are now visible in discovery.'
          : 'Sign in with an admin account to approve them for public discovery.',
        tone: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Could not seed development fixtures',
        description: err instanceof Error ? err.message : 'Please try again.',
        tone: 'danger',
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const allCards =
    listingsState.status === 'success' ? listingsState.data : [];
  const venueCards = allCards.filter((c) => c.listingType === 'venue');
  const serviceCards = allCards.filter(
    (c) => c.listingType === 'service-provider'
  );

  return (
    <div className="pb-16">
      {/* Section 1: Marketplace Hero & Primary Search */}
      <section className="bg-white border-b border-[#D7DEE8] py-10 sm:py-14">
        <PageContainer className="space-y-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-medium text-[#697586]">
              Warri & Effurun · Delta State, Nigeria
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#142B4A] tracking-tight">
              Find the right venue and event professionals with confidence.
            </h1>
            <p className="text-base sm:text-lg text-[#344054] leading-relaxed">
              Discover approved event halls, gardens, photographers, caterers,
              decorators, and event specialists across Warri and Effurun.
              Compare real details and send structured enquiries directly.
            </p>
          </div>

          <HeroSearch onSearch={handleHeroSearch} />

          {/* Quick Location & Path Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#344054]">
              <span className="font-medium text-[#697586]">
                Filter by location:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCity('')}
                className={`rounded-[8px] px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                  selectedCity === ''
                    ? 'bg-[#142B4A] text-white'
                    : 'bg-[#F4F6F9] text-[#172B4D] hover:bg-[#E9EDF3]'
                }`}
              >
                All (Warri & Effurun)
              </button>
              {LAUNCH_LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() =>
                    setSelectedCity(loc.city as 'Warri' | 'Effurun')
                  }
                  className={`rounded-[8px] px-3 py-1.5 font-medium transition-colors cursor-pointer ${
                    selectedCity === loc.city
                      ? 'bg-[#142B4A] text-white'
                      : 'bg-[#F4F6F9] text-[#172B4D] hover:bg-[#E9EDF3]'
                  }`}
                >
                  {loc.city}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#697586]">
              <AppLink
                href="/saved"
                className="inline-flex items-center gap-1.5 font-medium text-[#142B4A] hover:text-[#4778D8]"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#4778D8]" aria-hidden="true" />
                <span>Saved shortlist</span>
              </AppLink>
              <span aria-hidden="true">·</span>
              <AppLink
                href="/compare"
                className="inline-flex items-center gap-1.5 font-medium text-[#142B4A] hover:text-[#4778D8]"
              >
                <Scale className="h-3.5 w-3.5 text-[#4778D8]" aria-hidden="true" />
                <span>Compare venues</span>
              </AppLink>
            </div>
          </div>
        </PageContainer>
      </section>

      <PageContainer className="py-10 space-y-12">
        {/* Section 2: Category Navigation & Published Listings */}
        <section aria-labelledby="discover-listings-heading" className="space-y-6">
          <SectionHeader
            title="Browse approved venues & event professionals"
            description="Only active listings reviewed and approved for publication appear in public discovery."
            action={
              <AppLink
                href="/search"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4778D8] hover:underline"
              >
                <span>Open full search & filters</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </AppLink>
            }
          />

          <CategoryChips
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <ListingGrid
            listings={allCards}
            isLoading={listingsState.status === 'loading'}
            error={
              listingsState.status === 'error' ? listingsState.message : null
            }
            onRetry={loadListings}
            emptyTitle={
              selectedCategory || selectedCity
                ? 'No published listings match your current selection'
                : 'No published listings in the catalog yet'
            }
            emptyDescription={
              selectedCategory || selectedCity
                ? 'Try clearing your category or city filter to see all approved listings in Warri and Effurun.'
                : 'Listings appear here once submitted by vendors and approved by moderation.'
            }
            emptyActionSlot={
              <div className="flex flex-wrap items-center justify-center gap-3">
                {(selectedCategory || selectedCity) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedCategory('');
                      setSelectedCity('');
                    }}
                  >
                    Show all locations & categories
                  </Button>
                )}
                <AppLink
                  href="/vendor"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#142B4A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors"
                >
                  Create a vendor listing
                </AppLink>
                {ENV.isDevelopment && (
                  <Button
                    variant="secondary"
                    isLoading={isSeeding}
                    leftIcon={
                      <Database
                        className="h-4 w-4 text-[#4778D8]"
                        aria-hidden="true"
                      />
                    }
                    onClick={handleSeedPublishedDevListings}
                  >
                    Seed Warri & Effurun dev samples
                  </Button>
                )}
              </div>
            }
          />
        </section>

        {/* Section 3: Dedicated Paths for Venues vs Service Providers */}
        <section
          aria-labelledby="marketplace-paths-heading"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#EFF8FF] text-[#175CD3]">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-[#142B4A]">
                Event venues & halls ({venueCards.length} published)
              </h2>
              <p className="text-sm text-[#344054] leading-relaxed">
                Evaluate civic halls, hotel banquet rooms, and garden marquees
                by guest capacity, indoor/outdoor configuration, power backup,
                parking, and catering policies. Compare up to three venues side
                by side.
              </p>
            </div>
            <div>
              <AppLink
                href="/search?type=venue"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#142B4A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors"
              >
                <span>Browse venues</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </AppLink>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-2.5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#EFF8FF] text-[#175CD3]">
                <Camera className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold text-[#142B4A]">
                Event service providers ({serviceCards.length} published)
              </h2>
              <p className="text-sm text-[#344054] leading-relaxed">
                Find photographers, videographers, caterers, decorators, event
                planners, DJs, MCs, makeup artists, and rental professionals
                serving Warri and Effurun. Review service packages and request
                tailored quotes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AppLink
                href="/search?type=service-provider"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#142B4A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors"
              >
                <span>Browse service providers</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </AppLink>
              <AppLink
                href="/vendor"
                className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2.5 text-sm font-medium text-[#142B4A] hover:bg-[#F4F6F9] transition-colors"
              >
                List your business
              </AppLink>
            </div>
          </div>
        </section>

        {/* Honest Marketplace Standards Banner */}
        <section className="rounded-[14px] border border-[#D7DEE8] bg-white p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-[#344054]">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="h-5 w-5 text-[#16794B] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-[#142B4A]">
                  Moderated listings
                </p>
                <p className="text-xs text-[#697586] mt-0.5">
                  Every venue and vendor profile is reviewed before appearing in
                  public search.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="h-5 w-5 text-[#16794B] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-[#142B4A]">
                  Transparent pricing & policies
                </p>
                <p className="text-xs text-[#697586] mt-0.5">
                  Indicative starting prices, capacity limits, and venue rules
                  are structured clearly—never fabricated.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="h-5 w-5 text-[#16794B] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-[#142B4A]">
                  Direct enquiries, clear boundaries
                </p>
                <p className="text-xs text-[#697586] mt-0.5">
                  Send structured event enquiries and receive vendor responses.
                  An enquiry is not a confirmed booking.
                </p>
              </div>
            </div>
          </div>
        </section>
      </PageContainer>

      <ComparisonFloatingBar />
    </div>
  );
}
