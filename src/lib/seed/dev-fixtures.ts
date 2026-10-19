/**
 * EventLink Development Seed Fixtures & Schema Verification Suite (Build_Plan.md Phase 3, 5 & 6)
 *
 * CRITICAL GUARDRAIL (Master Build Prompt Section 6 & Build_Plan.md Section 2.2):
 * - Development fixtures are strictly gated by ENV.isDevelopment.
 * - They never fabricate reviews, star ratings, verification badges, or live calendar claims.
 * - They are explicitly tagged with "(Dev Sample)" so they can never be mistaken for unreviewed production data.
 */

import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/client';
import { ENV } from '../config/env';
import {
  buildDisplayPriceText,
  isValidEnquiryTransition,
  isValidListingTransition,
  isValidQuoteTransition,
  validateAndComputeQuoteTotals,
} from '../validation/marketplace-schemas';

export interface ValidationCheckResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

/**
 * Runs deterministic Phase 3 domain validation & security invariant checks.
 */
export function runPhase3DomainChecks(): ValidationCheckResult[] {
  const results: ValidationCheckResult[] = [];

  const vendorPublishAttempt = isValidListingTransition(
    'draft',
    'published',
    'approved',
    'vendor'
  );
  results.push({
    id: 'CHK-01',
    name: 'Vendor self-publish & self-approve blocked',
    passed: vendorPublishAttempt.valid === false,
    detail: vendorPublishAttempt.reason || 'Blocked as expected',
  });

  const vendorSubmitAttempt = isValidListingTransition(
    'draft',
    'pending_review',
    'pending',
    'vendor'
  );
  results.push({
    id: 'CHK-02',
    name: 'Vendor draft → pending_review transition allowed',
    passed: vendorSubmitAttempt.valid === true,
    detail: 'Valid moderation submission transition',
  });

  const invalidAdminPublish = isValidListingTransition(
    'pending_review',
    'published',
    'pending',
    'admin'
  );
  results.push({
    id: 'CHK-03',
    name: 'Admin publish requires moderationStatus == approved',
    passed: invalidAdminPublish.valid === false,
    detail: invalidAdminPublish.reason || 'Enforced',
  });

  const closedEnquiryMutation = isValidEnquiryTransition(
    'closed',
    'responded',
    'vendor'
  );
  results.push({
    id: 'CHK-04',
    name: 'Terminal enquiry state (closed) locked against mutation',
    passed: closedEnquiryMutation.valid === false,
    detail: closedEnquiryMutation.reason || 'Locked',
  });

  const validQuoteCalc = validateAndComputeQuoteTotals(15000000, 2500000);
  const invalidDiscountCalc = validateAndComputeQuoteTotals(5000000, 8000000);
  results.push({
    id: 'CHK-05',
    name: 'Quote server-side minor-unit math & discount guard',
    passed:
      validQuoteCalc.valid === true &&
      validQuoteCalc.totalMinor === 12500000 &&
      invalidDiscountCalc.valid === false,
    detail: `15,000,000 - 2,500,000 = ${validQuoteCalc.totalMinor.toLocaleString()} kobo (₦125,000)`,
  });

  const missingPriceText = buildDisplayPriceText('not-provided', null, null);
  results.push({
    id: 'CHK-06',
    name: 'Missing price renders honestly as "Contact for pricing"',
    passed: missingPriceText === 'Contact for pricing',
    detail: `Output: "${missingPriceText}"`,
  });

  const prematureAccept = isValidQuoteTransition(
    'draft',
    'accepted',
    'customer'
  );
  results.push({
    id: 'CHK-07',
    name: 'Customer cannot accept an unsent draft quote',
    passed: prematureAccept.valid === false,
    detail: prematureAccept.reason || 'Blocked',
  });

  return results;
}

/**
 * Generates a clean SVG data URI illustration for development sample media items
 * so that gallery navigation, captions, and aspect ratios can be tested without external stock photos.
 */
function createDevSampleSvgDataUri(
  title: string,
  subtitle: string,
  accentHex: string = '#142B4A'
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#F4F6F9"/>
    <rect x="48" y="48" width="1104" height="704" rx="24" fill="#FFFFFF" stroke="#D7DEE8" stroke-width="3"/>
    <rect x="96" y="96" width="160" height="44" rx="10" fill="${accentHex}"/>
    <text x="176" y="124" font-family="Inter, sans-serif" font-size="16" font-weight="600" fill="#FFFFFF" text-anchor="middle">DEV SAMPLE</text>
    <text x="96" y="380" font-family="Manrope, sans-serif" font-size="44" font-weight="700" fill="#142B4A">${title}</text>
    <text x="96" y="440" font-family="Inter, sans-serif" font-size="24" font-weight="500" fill="#475467">${subtitle}</text>
    <text x="96" y="680" font-family="Inter, sans-serif" font-size="18" fill="#697586">EventLink Warri &amp; Effurun Architectural Preview Diagram</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Seeds clearly marked development sample listings, packages, and gallery items
 * in Warri and Effurun for local testing.
 * Strictly requires ENV.isDevelopment and an authenticated user UID.
 */
export async function seedDevelopmentFixtures(
  actorUid: string,
  publishImmediatelyAsAdmin: boolean = false
): Promise<number> {
  if (!ENV.isDevelopment) {
    throw new Error('Development fixtures can only be seeded in development mode.');
  }

  const orgId = `org_dev_warri_${actorUid.slice(0, 8)}`;
  try {
    await setDoc(doc(db, 'vendorOrganizations', orgId), {
      name: 'Delta Event Spaces & Services (Dev Fixture)',
      slug: 'delta-event-spaces-dev-fixture',
      businessType: 'registered-company',
      description:
        'Development fixture organization for testing Warri and Effurun venue and service provider workflows, package pricing, and customer enquiries.',
      ownerUid: actorUid,
      publicEmail: 'contact@example.com',
      publicPhone: '+234 800 000 0000',
      whatsappNumber: '+2348000000000',
      websiteUrl: 'https://example.com',
      city: 'Warri',
      state: 'Delta',
      countryCode: 'NG',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `vendorOrganizations/${orgId}`
    );
  }

  const membershipId = `${orgId}_${actorUid}`;
  try {
    await setDoc(doc(db, 'vendorMemberships', membershipId), {
      organizationId: orgId,
      uid: actorUid,
      role: 'owner',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `vendorMemberships/${membershipId}`
    );
  }

  const palmCourtCover = createDevSampleSvgDataUri(
    'Palm Court Civic Hall — Main Banquet Floor',
    'Seated layout for up to 600 guests in GRA Phase 1, Warri',
    '#142B4A'
  );
  const effurunGardenCover = createDevSampleSvgDataUri(
    'Effurun Garden Pavilion — Marquee & Lawn',
    'Indoor-outdoor reception layout along PTI Road, Effurun',
    '#4778D8'
  );
  const kokoLensCover = createDevSampleSvgDataUri(
    'Koko Lens Documentary Photography',
    'Full-day wedding & corporate event documentary coverage in Warri',
    '#142B4A'
  );

  const fixtures = [
    {
      id: 'lst_dev_palm_court_warri',
      listingType: 'venue' as const,
      name: 'Palm Court Civic Hall (Dev Sample)',
      slug: 'palm-court-civic-hall-warri',
      headline:
        'Spacious air-conditioned event hall in GRA Warri for weddings and conferences',
      description:
        'Located in GRA Phase 1, Warri, Palm Court Civic Hall accommodates seated banquets, traditional marriages, and corporate conferences with dedicated paved parking, dual backup generator power, acoustic wall panelling, and flexible stage layouts.\n\nOur on-site facility team coordinates hall access for your decorator and caterer starting 6 hours prior to event kick-off, ensuring smooth setup and teardown.',
      categoryId: 'venue',
      city: 'Warri' as const,
      addressDisplay: 'GRA Phase 1, Warri, Delta State',
      serviceAreas: ['Warri', 'Effurun'],
      pricingModel: 'starting-at' as const,
      minAmountMinor: 45000000, // ₦450,000
      maxAmountMinor: 75000000,
      displayPriceText: 'From ₦450,000',
      capacityMin: 100,
      capacityMax: 600,
      indoorOutdoor: 'indoor' as const,
      venueType: 'Event Hall',
      amenities: [
        'Parking',
        'Backup generator',
        'Air conditioning',
        'Changing room',
        'Restrooms',
        'Elevated stage',
        'Loading bay access',
      ],
      cateringPolicy: 'External catering allowed with designated prep area',
      decorationPolicy: 'Approved decorators allowed; no wall nails or staples',
      alcoholPolicy: 'Allowed',
      coverImageUrl: palmCourtCover,
      contactVisibility: 'after-enquiry' as const,
      acceptsEnquiries: true,
    },
    {
      id: 'lst_dev_effurun_garden_pavilion',
      listingType: 'venue' as const,
      name: 'Effurun Garden Pavilion (Dev Sample)',
      slug: 'effurun-garden-pavilion',
      headline:
        'Indoor-outdoor marquee and landscaped garden venue along PTI Road, Effurun',
      description:
        'A versatile marquee and open lawn setting in Effurun suitable for traditional marriages, outdoor receptions, anniversaries, and milestone celebrations.\n\nCombines a weather-protected 350-seat marquee tent with an adjoining manicured lawn for cocktail receptions or cultural performances.',
      categoryId: 'venue',
      city: 'Effurun' as const,
      addressDisplay: 'PTI Road Axis, Effurun, Delta State',
      serviceAreas: ['Effurun', 'Warri'],
      pricingModel: 'range' as const,
      minAmountMinor: 35000000, // ₦350,000
      maxAmountMinor: 60000000, // ₦600,000
      displayPriceText: '₦350,000 – ₦600,000',
      capacityMin: 80,
      capacityMax: 450,
      indoorOutdoor: 'both' as const,
      venueType: 'Garden & Marquee',
      amenities: [
        'Parking',
        'Backup generator',
        'Outdoor lawn',
        'Security post',
        'Restrooms',
      ],
      cateringPolicy: 'External catering allowed',
      decorationPolicy: 'Open flame restrictions apply under marquee canopy',
      alcoholPolicy: 'Allowed',
      coverImageUrl: effurunGardenCover,
      contactVisibility: 'public' as const,
      acceptsEnquiries: true,
    },
    {
      id: 'lst_dev_ugborikoko_banquet_centre',
      listingType: 'venue' as const,
      name: 'Ugborikoko Royal Banquet Centre (Dev Sample)',
      slug: 'ugborikoko-royal-banquet-centre-effurun',
      headline:
        'Modern 800-guest banquet and conference hall in Ugborikoko, Effurun',
      description:
        'Purpose-built banquet centre featuring acoustic ceiling treatment, private bridal and VIP suite, dual industrial generators, and paved parking for large weddings and conventions.',
      categoryId: 'venue',
      city: 'Effurun' as const,
      addressDisplay: 'Ugborikoko Road, Effurun, Delta State',
      serviceAreas: ['Effurun', 'Warri'],
      pricingModel: 'starting-at' as const,
      minAmountMinor: 65000000, // ₦650,000
      maxAmountMinor: 95000000,
      displayPriceText: 'From ₦650,000',
      capacityMin: 200,
      capacityMax: 800,
      indoorOutdoor: 'indoor' as const,
      venueType: 'Banquet Hall',
      amenities: [
        'Parking',
        'Dual backup generators',
        'Air conditioning',
        'Bridal suite',
        'Wheelchair access',
      ],
      cateringPolicy: 'External catering allowed',
      decorationPolicy: 'In-house or external decorators permitted',
      alcoholPolicy: 'Allowed',
      coverImageUrl: null, // Intentionally null to verify honest "Photo not yet uploaded" fallback
      contactVisibility: 'after-enquiry' as const,
      acceptsEnquiries: true,
    },
    {
      id: 'lst_dev_koko_lens_studios',
      listingType: 'service-provider' as const,
      name: 'Koko Lens Documentary Photography (Dev Sample)',
      slug: 'koko-lens-documentary-photography-warri',
      headline:
        'Wedding, traditional marriage, and corporate event photography across Warri & Effurun',
      description:
        'Full-day documentary coverage, high-resolution edited digital galleries, and custom print albums for weddings, burials, and corporate milestones in Delta State.\n\nWe work with dual-camera setups and on-location lighting assistants to capture both candid moments and formal family portraits.',
      categoryId: 'photographer',
      city: 'Warri' as const,
      addressDisplay: 'Airport Road, Warri, Delta State',
      serviceAreas: ['Warri', 'Effurun'],
      pricingModel: 'starting-at' as const,
      minAmountMinor: 18000000, // ₦180,000
      maxAmountMinor: null,
      displayPriceText: 'From ₦180,000',
      capacityMin: null,
      capacityMax: null,
      indoorOutdoor: 'not-specified' as const,
      venueType: null,
      amenities: [
        'Two photographers',
        'Edited digital gallery',
        'Drone coverage option',
        'Synthetic leather photobook',
      ],
      cateringPolicy: null,
      decorationPolicy: null,
      alcoholPolicy: null,
      coverImageUrl: kokoLensCover,
      contactVisibility: 'after-enquiry' as const,
      acceptsEnquiries: true,
    },
    {
      id: 'lst_dev_royal_feast_catering',
      listingType: 'service-provider' as const,
      name: 'Royal Feast Delta Catering (Dev Sample)',
      slug: 'royal-feast-delta-catering-effurun',
      headline:
        'Full-service Nigerian banquet, continental buffet, and small-chops catering in Effurun',
      description:
        'Experienced event catering team serving weddings, corporate luncheons, and family celebrations across Effurun and Warri with uniformed service staff and stainless chafing setups.',
      categoryId: 'caterer',
      city: 'Effurun' as const,
      addressDisplay: 'Jakpa Junction Axis, Effurun, Delta State',
      serviceAreas: ['Effurun', 'Warri'],
      pricingModel: 'custom-quote' as const,
      minAmountMinor: null,
      maxAmountMinor: null,
      displayPriceText: 'Contact for pricing',
      capacityMin: null,
      capacityMax: null,
      indoorOutdoor: 'not-specified' as const,
      venueType: null,
      amenities: ['Buffet setup', 'Uniformed servers', 'Custom menu tasting'],
      cateringPolicy: null,
      decorationPolicy: null,
      alcoholPolicy: null,
      coverImageUrl: null,
      contactVisibility: 'after-enquiry' as const,
      acceptsEnquiries: true,
    },
    {
      id: 'lst_dev_emerald_decor_planners',
      listingType: 'service-provider' as const,
      name: 'Emerald Stage & Floral Decor (Dev Sample)',
      slug: 'emerald-stage-floral-decor-warri',
      headline:
        'Bespoke stage design, floral installations, and ambient lighting in Warri & Effurun',
      description:
        'Transforms event halls and outdoor marquees with custom drapery, floral centerpieces, walkways, and warm ambient lighting tailored to your event palette.',
      categoryId: 'decorator',
      city: 'Warri' as const,
      addressDisplay: 'Okumagba Avenue, Warri, Delta State',
      serviceAreas: ['Warri', 'Effurun'],
      pricingModel: 'starting-at' as const,
      minAmountMinor: 25000000, // ₦250,000
      maxAmountMinor: null,
      displayPriceText: 'From ₦250,000',
      capacityMin: null,
      capacityMax: null,
      indoorOutdoor: 'not-specified' as const,
      venueType: null,
      amenities: [
        'Stage backdrop design',
        'Table centerpieces',
        'Mood lighting setup',
      ],
      cateringPolicy: null,
      decorationPolicy: null,
      alcoholPolicy: null,
      coverImageUrl: null,
      contactVisibility: 'after-enquiry' as const,
      acceptsEnquiries: true,
    },
  ];

  for (const item of fixtures) {
    try {
      await setDoc(doc(db, 'listings', item.id), {
        organizationId: orgId,
        ownerUid: actorUid,
        listingType: item.listingType,
        name: item.name,
        slug: item.slug,
        headline: item.headline,
        description: item.description,
        categoryId: item.categoryId,
        city: item.city,
        state: 'Delta',
        countryCode: 'NG',
        addressDisplay: item.addressDisplay,
        serviceAreas: item.serviceAreas,
        currency: 'NGN',
        pricingModel: item.pricingModel,
        minAmountMinor: item.minAmountMinor,
        maxAmountMinor: item.maxAmountMinor,
        displayPriceText: item.displayPriceText,
        capacityMin: item.capacityMin,
        capacityMax: item.capacityMax,
        indoorOutdoor: item.indoorOutdoor,
        venueType: item.venueType,
        amenities: item.amenities,
        cateringPolicy: item.cateringPolicy,
        decorationPolicy: item.decorationPolicy,
        alcoholPolicy: item.alcoholPolicy,
        coverImageUrl: item.coverImageUrl,
        contactVisibility: item.contactVisibility,
        acceptsEnquiries: item.acceptsEnquiries,
        publicationStatus: publishImmediatelyAsAdmin
          ? 'published'
          : 'pending_review',
        moderationStatus: publishImmediatelyAsAdmin ? 'approved' : 'pending',
        moderationNotes: 'Development fixture seeded for local testing.',
        createdBy: actorUid,
        updatedBy: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `listings/${item.id}`);
    }
  }

  // Seed structured packages/services (listingServices) for rich detail evaluation
  const sampleServices = [
    {
      id: 'srv_dev_palm_court_weekday',
      listingId: 'lst_dev_palm_court_warri',
      name: 'Weekday Conference & Seminar Hire (Mon–Thu)',
      description:
        'Full-day access (8:00 AM – 6:00 PM) to the main air-conditioned hall for corporate seminars, AGM meetings, or workshops up to 400 delegates.',
      categoryId: 'venue',
      inclusions: [
        '8 hours air-conditioned hall use',
        'Backup diesel generator allocation',
        'Banquet chairs & conference tables',
        'Podium & basic PA sound connection',
      ],
      pricingModel: 'fixed' as const,
      amountMinor: 45000000, // ₦450,000
      sortOrder: 1,
    },
    {
      id: 'srv_dev_palm_court_weekend',
      listingId: 'lst_dev_palm_court_warri',
      name: 'Weekend Wedding & Reception Full Package (Fri–Sun)',
      description:
        'Complete hall reservation for Saturday receptions or traditional marriages up to 600 seated guests, including bridal changing suite and 6-hour setup window.',
      categoryId: 'venue',
      inclusions: [
        'Full reception day access + 6hr decorator setup window',
        'Dual backup generator coverage',
        'Private air-conditioned bridal/VIP changing suite',
        '600 banquet chairs & 60 round tables',
        'On-site facility & parking marshals',
      ],
      pricingModel: 'fixed' as const,
      amountMinor: 75000000, // ₦750,000
      sortOrder: 2,
    },
    {
      id: 'srv_dev_effurun_garden_marquee',
      listingId: 'lst_dev_effurun_garden_pavilion',
      name: 'Garden Lawn Only (Up to 250 Guests)',
      description:
        'Exclusive use of the landscaped outdoor garden lawn for intimate receptions, engagement ceremonies, or evening celebrations.',
      categoryId: 'venue',
      inclusions: [
        'Manicured garden lawn access',
        'Perimeter security & paved parking',
        'Restroom facility attendant',
      ],
      pricingModel: 'starting-at' as const,
      amountMinor: 35000000, // ₦350,000
      sortOrder: 1,
    },
    {
      id: 'srv_dev_effurun_garden_full',
      listingId: 'lst_dev_effurun_garden_pavilion',
      name: 'Combined Marquee Pavilion + Garden Lawn (Up to 450 Guests)',
      description:
        'Full access to both the weather-protected marquee tent and adjoining outdoor lawn for large traditional and white wedding receptions.',
      categoryId: 'venue',
      inclusions: [
        'Air-cooled marquee pavilion + outdoor lawn',
        'Standby generator power',
        'Tables and chairs for up to 450 guests',
      ],
      pricingModel: 'fixed' as const,
      amountMinor: 60000000, // ₦600,000
      sortOrder: 2,
    },
    {
      id: 'srv_dev_koko_lens_essential',
      listingId: 'lst_dev_koko_lens_studios',
      name: 'Essential Single-Day Event Documentary',
      description:
        'Up to 8 hours of continuous photography coverage for traditional weddings, birthdays, or corporate events in Warri or Effurun.',
      categoryId: 'photographer',
      inclusions: [
        'Lead photographer + lighting assistant',
        '300+ color-graded high-resolution digital images',
        'Private online gallery delivery within 14 days',
      ],
      pricingModel: 'fixed' as const,
      amountMinor: 18000000, // ₦180,000
      sortOrder: 1,
    },
    {
      id: 'srv_dev_koko_lens_signature',
      listingId: 'lst_dev_koko_lens_studios',
      name: 'Signature Two-Day Traditional & White Wedding Coverage',
      description:
        'Comprehensive two-day coverage with two photographers, pre-wedding portrait session, and a handcrafted 12x18 synthetic leather photobook.',
      categoryId: 'photographer',
      inclusions: [
        '2 photographers across both event days',
        'Complimentary pre-event portrait session in Warri',
        '600+ edited digital photographs on USB & online gallery',
        '40-page 12x18 hardcover photobook + 2 framed wall prints',
      ],
      pricingModel: 'fixed' as const,
      amountMinor: 34000000, // ₦340,000
      sortOrder: 2,
    },
  ];

  for (const srv of sampleServices) {
    try {
      await setDoc(doc(db, 'listingServices', srv.id), {
        listingId: srv.listingId,
        organizationId: orgId,
        ownerUid: actorUid,
        name: srv.name,
        description: srv.description,
        categoryId: srv.categoryId,
        inclusions: srv.inclusions,
        currency: 'NGN',
        pricingModel: srv.pricingModel,
        amountMinor: srv.amountMinor,
        status: 'published',
        sortOrder: srv.sortOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `listingServices/${srv.id}`
      );
    }
  }

  // Seed structured gallery media items (listingMedia) for multi-image gallery testing
  const sampleMedia = [
    {
      id: 'med_dev_palm_court_1',
      listingId: 'lst_dev_palm_court_warri',
      imageUrl: palmCourtCover,
      altText: 'Palm Court Civic Hall main banquet floor layout in GRA Warri',
      caption: 'Main banquet floor configured for 600 seated guests with central walkway.',
      sortOrder: 1,
    },
    {
      id: 'med_dev_palm_court_2',
      listingId: 'lst_dev_palm_court_warri',
      imageUrl: createDevSampleSvgDataUri(
        'Palm Court Civic Hall — Elevated Stage & Lighting Rig',
        '12-meter wide elevated stage for high-table or conference panelists',
        '#4778D8'
      ),
      altText: 'Elevated stage and ceiling lighting trusses at Palm Court Civic Hall',
      caption: 'Elevated stage area with dedicated power points for decorators and sound engineers.',
      sortOrder: 2,
    },
    {
      id: 'med_dev_palm_court_3',
      listingId: 'lst_dev_palm_court_warri',
      imageUrl: createDevSampleSvgDataUri(
        'Palm Court Civic Hall — Paved Parking & Generator Yard',
        'On-site parking compound and twin standby acoustic generators',
        '#146C43'
      ),
      altText: 'Parking compound and standby generator bay at Palm Court Civic Hall',
      caption: 'Walled parking compound in GRA Phase 1 with dedicated catering loading bay.',
      sortOrder: 3,
    },
    {
      id: 'med_dev_effurun_garden_1',
      listingId: 'lst_dev_effurun_garden_pavilion',
      imageUrl: effurunGardenCover,
      altText: 'Effurun Garden Pavilion marquee and landscaped lawn along PTI Road',
      caption: 'Primary marquee tent opening directly onto the landscaped reception lawn.',
      sortOrder: 1,
    },
    {
      id: 'med_dev_effurun_garden_2',
      listingId: 'lst_dev_effurun_garden_pavilion',
      imageUrl: createDevSampleSvgDataUri(
        'Effurun Garden Pavilion — Evening Lawn Setup',
        'Outdoor reception area along PTI Road Axis, Effurun',
        '#142B4A'
      ),
      altText: 'Evening reception setup on the outdoor lawn at Effurun Garden Pavilion',
      caption: 'Outdoor garden lawn layout for traditional marriage ceremonies.',
      sortOrder: 2,
    },
    {
      id: 'med_dev_koko_lens_1',
      listingId: 'lst_dev_koko_lens_studios',
      imageUrl: kokoLensCover,
      altText: 'Koko Lens Documentary Photography portfolio overview',
      caption: 'Documentary wedding and traditional ceremony coverage across Warri and Effurun.',
      sortOrder: 1,
    },
    {
      id: 'med_dev_koko_lens_2',
      listingId: 'lst_dev_koko_lens_studios',
      imageUrl: createDevSampleSvgDataUri(
        'Koko Lens — Custom Print & Photobook Presentation',
        '12x18 synthetic leather wedding album and framed gallery prints',
        '#4778D8'
      ),
      altText: 'Custom print wedding album and presentation box by Koko Lens',
      caption: 'Handcrafted 12x18 photobook included in the Signature Two-Day package.',
      sortOrder: 2,
    },
  ];

  for (const media of sampleMedia) {
    try {
      await setDoc(doc(db, 'listingMedia', media.id), {
        listingId: media.listingId,
        organizationId: orgId,
        ownerUid: actorUid,
        imageUrl: media.imageUrl,
        altText: media.altText,
        caption: media.caption,
        sortOrder: media.sortOrder,
        moderationStatus: 'approved',
        publicationStatus: 'published',
        uploadedBy: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `listingMedia/${media.id}`
      );
    }
  }

  return fixtures.length;
}
