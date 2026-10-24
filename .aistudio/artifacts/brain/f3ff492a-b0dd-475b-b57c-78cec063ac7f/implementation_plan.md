# Vendor Credibility Profile Photos & Product Package Imagery

This upgrade introduces mandatory vendor profile photography during business onboarding, adds direct product and service package image uploads for vendor offerings, and displays the user's profile picture with a compact name label in the top-right navigation bar and across marketplace trust touchpoints.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core product preferences have been confirmed from your answers and are baked into this plan:

- **Confirmed Decision 1 — Mandatory Vendor Profile Picture During Setup**: Vendors must upload a profile picture or business logo (portrait or brand mark) when creating their business profile to establish immediate visual credibility.
- **Confirmed Decision 2 — Full Product & Package Image Uploads**: Vendors can upload photos directly for both **Main Listing Cover & Gallery** (including direct file upload during initial listing creation before saving a draft) and **Individual Service / Product Packages** (so each package tier or product item showcases its own photo).
- **Confirmed Decision 3 — Top-Right Navbar Profile Avatar + Marketplace Trust Display**: When signed in, the top-right navigation bar displays the user's circular profile picture with their name written in compact text directly underneath, alongside vendor profile photos on listing detail pages and admin moderation views.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Credibility-First Vendor Onboarding**: Requires vendors to upload a verified profile photo or brand logo when registering their business profile, automatically compressing and storing it in Firestore and syncing it to their user profile avatar.
  2. **Streamlined Listing & Product Package Imagery**: Enables vendors to upload a primary cover photo directly while creating a new listing (without having to save a text-only draft first) and attach dedicated product/service photos to every individual package or deliverable tier.
  3. **Persistent Navbar Identity & Marketplace Trust**: Replaces the text-only account button in the top-right header with a stacked circular avatar and compact name label, while surfacing the vendor's profile picture on listing detail pages and package cards.
- **Target Audience / Persona**:
  - **Event Vendors & Venue Owners in Warri & Effurun**: Photographers, caterers, decorators, rental providers, and hall managers who want to visually showcase individual packages and prove business legitimacy.
  - **Event Organizers & Customers**: Individuals planning weddings, receptions, and corporate events who rely on visual proof of products and a trustworthy vendor identity before requesting quotes.
- **Key Value**: Eliminates anonymous or text-only vendor profiles and gives customers clear visual expectations of every service package and product tier.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Vendor Business Profile Onboarding (Mandatory Credibility Photo)**:
   - When a vendor opens the onboarding flow, the first visual step is an interactive **Profile Picture / Business Logo Upload** control with live circular and square preview frames.
   - Attempting to submit the onboarding form without uploading a profile photo displays an inline validation message guiding the vendor to select a JPG, PNG, or WebP image (up to 5 MB, automatically compressed client-side).
   - Once saved, the photo is stored on the vendor organization record and synced to the user's account avatar so it immediately appears in the top-right navbar.

2. **Top-Right Navigation Bar Profile Display**:
   - When signed in, Zone 3 of the top navigation bar displays an accessible profile link leading to Account Settings.
   - It features a crisp `32px × 32px` circular profile image (showing the vendor's profile photo, user's uploaded avatar, or Google profile photo, with a clean initials fallback for new customers) and the user's display name rendered in compact, single-line `11px` typography directly beneath the avatar.
   - In Account Settings, any signed-in user can also upload or replace their profile picture at any time.

3. **Direct Listing Cover Upload & Product/Package Photo Upload**:
   - **Listing Editor Cover Photo**: Inside step 1 of creating or editing a listing, vendors can directly upload a cover photo file from their device (with instant thumbnail preview and replace/remove controls) so listings have rich imagery from the moment they are created.
   - **Service & Hire Package Photos**: In the Service & Hire Packages manager, the package creation form includes an optional **Package / Product Photo Upload** button. Uploaded package images appear as `4:3` thumbnails alongside each package's title, inclusions, and NGN price in both the Vendor Workspace and the public Listing Detail Page.

4. **Public Listing Detail & Admin Moderation Display**:
   - On public Venue and Service Provider detail pages, the **Managed by Vendor Organization** section displays the vendor's circular/rounded profile photo next to their business name, city, and verification status.
   - Each itemized service package card displays its product/package photo (when provided) in a clean `4:3` frame beside the package breakdown and "Enquire about package" button.

### Visual Identity & Theme

- **Aesthetic Direction**: Trust-focused, editorial marketplace precision tailored for Nigerian event commerce—clean structural surfaces, generous whitespace, and zero visual clutter.
- **Color Palette & Mood (60-30-10 Discipline)**:
  - *60% Dominant Neutral Canvas*: Cool Alabaster (`#F4F6F9`) page canvas and pure white (`#FFFFFF`) primary surfaces.
  - *30% Structural Surfaces & Typography*: Deep Navy (`#142B4A`) headings, Slate (`#344054`) body prose, and hairline borders (`#D7DEE8` / `#E9EDF3`).
  - *10% Accent Budget*: Royal Event Blue (`#4778D8`) for interactive upload affordances and focus rings; Emerald (`#146C43`) paired with explicit text labels for verified/primary states; Crimson (`#B42318`) for validation alerts.
- **Typography & Hierarchy**:
  - *Display & Headings*: `Manrope` (600/700) with balanced headline wrapping.
  - *Body & Controls*: `Inter` (400/500/600) with single-line control discipline (`whitespace-nowrap shrink-0`) and `tabular-nums` for all NGN (`₦`) package prices and file size limits.
- **Component Styling & Layout**:
  - Single-elevation containers (`rounded-[14px] border border-[#D7DEE8] bg-white`) with no nested card-in-card clutter or static pill badge sandwiches.
  - Resilient image containers with `referrerPolicy="no-referrer"`, descriptive `alt` text, and graceful fallback frames so no broken image icon can ever appear.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Canvas Compression for Profile & Package Photos**
  - *Chosen Approach*: Extend the client-side HTML5 Canvas compression pipeline (`image/jpeg`, `image/png`, `image/webp` up to 5 MB raw input) with profile avatar (`400px` max dimension, compact data URL) and package photo (`800px` max dimension, `< 250 KB` data URL) presets stored directly in Firestore documents.
  - *Why*: Works instantaneously across mobile and desktop browsers without external storage bucket CORS issues, while staying well within Firestore's 1 MB document limit and security rule size guards (`<= 300,000` characters).
  - *Alternatives Considered*: Uncompressed raw base64 strings (rejected because high-resolution phone photos exceed Firestore's 1 MB document ceiling).

- **Decision 2: Mandatory Profile Photo on Onboarding with Graceful Edit Support**
  - *Chosen Approach*: Enforce profile photo presence when creating a new vendor business profile and when updating an existing business profile that lacks one, while pre-populating any existing `logoImageUrl` or user `photoPath` so returning vendors have a seamless experience.
  - *Why*: Ensures 100% of newly onboarded vendors have a visible credibility photo without breaking existing database records.

- **Decision 3: Stacked Avatar + Compact Name in Top Bar Zone 3**
  - *Chosen Approach*: Render a compact vertical stack (`flex-col items-center justify-center`) inside the header's primary action slot containing a `32px` circular avatar image and a truncated `11px` display name label underneath, fitting cleanly within the `64px` (`h-16`) header height.
  - *Why*: Honors your exact layout preference while preserving the 3-zone Top Bar Contract and mobile viewport sticky height cap ($\le 15\%$).

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT IMAGE COMPRESSION LAYER                       │
│  • Avatar Preset (400×400 max, JPEG Data URL <= 150 KB)                     │
│  • Package / Cover Preset (800–1200px max, JPEG Data URL <= 280 KB)         │
└───────────────────┬─────────────────────────────────────┬───────────────────┘
                    │                                     │
                    ▼                                     ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────┐
│     FIRESTORE DATA & SECURITY LAYER   │ │     AUTH & PROFILE CONTEXT        │
│  • /users/{uid} (photoPath <= 300KB)  │ │  • Syncs uploaded avatar across   │
│  • /vendorOrganizations/{id}          │ │    userProfile & vendorOrg        │
│    (logoImageUrl <= 300KB)            │ │  • Provides active avatar URL to  │
│  • /listings/{id} (coverImageUrl)     │ │    SiteHeader & Account Workspace │
│  • /listingServices/{id}              │ └─────────────────┬─────────────────┘
│    (imageUrl <= 300KB)                │                   │
└───────────────────┬───────────────────┘                   │
                    │                                       │
        ┌───────────┴───────────────┬───────────────────────┘
        ▼                           ▼                       ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────────┐
│   TOP NAVIGATION BAR  │ │   VENDOR WORKSPACE    │ │  PUBLIC MARKETPLACE UI  │
│  • Circular Avatar    │ │  • Mandatory Profile  │ │  • Listing Detail Page  │
│  • Small Name Label   │ │    Photo in Onboarding│ │    Vendor Credibility   │
│    Underneath         │ │  • Direct Cover Photo │ │    Avatar               │
│  • Account Settings   │ │    File Upload        │ │  • Service Package Card │
│    Avatar Uploader    │ │  • Package Photo      │ │    4:3 Product Photos   │
│                       │ │    Upload & Preview   │ │  • Admin Review Queue   │
└───────────────────────┘ └───────────────────────┘ └─────────────────────────┘
```

### Data Model & State Updates

1. **`VendorOrganization` Entity (`/vendorOrganizations/{organizationId}`)**:
   - Add `logoImageUrl` (`string`, optional in schema for backward compatibility with existing docs, up to `300,000` chars; enforced as required in the Vendor Onboarding & Business Profile UI).
   - Expose `logoImageUrl` in `PublicVendorProfileSummary` so public listing detail pages can render the vendor's profile picture.

2. **`ListingService` Entity (`/listingServices/{serviceId}`)**:
   - Add `imageUrl` (`string | null`, up to `300,000` chars) to represent the product or service package photograph.

3. **`User` Entity (`/users/{userId}`)**:
   - Expand `photoPath` max length in `firebase-blueprint.json` and `firestore.rules` from `500` to `300,000` characters so users and vendors can upload custom compressed profile photos directly in addition to external OAuth avatar URLs.

### Interactive Component & State Mapping

- **Top Navigation Bar (`SiteHeader`)**:
  - Resolves `activeAvatarUrl = vendorOrganization?.logoImageUrl || userProfile?.photoPath || firebaseUser?.photoURL`.
  - Renders a circular `<img>` (or high-contrast initials badge if no photo is set yet) above a compact `<span className="text-[11px] font-medium leading-none truncate max-w-[96px]">` displaying `userProfile.displayName`.
- **Vendor Onboarding & Business Profile Form (`VendorWorkspacePage`)**:
  - Adds a dedicated **Vendor Profile Picture / Business Logo** file picker (`accept="image/jpeg,image/png,image/webp"`), live avatar preview, and validation gate requiring `orgLogoUrl` before profile creation completes.
  - Automatically updates both `vendorOrganizations.logoImageUrl` and `users.photoPath` on save so the navbar reflects the photo immediately.
- **Listing Editor Cover & Package Manager (`VendorWorkspacePage`)**:
  - Adds a **Primary Cover Photo** upload section directly inside the main listing form so vendors can upload or replace the cover image before or during initial draft creation.
  - Adds a **Product / Package Photo** upload control inside the "Service & Hire Packages" form with thumbnail preview, saving `imageUrl` on `listingServices` documents.
- **Public Listing Detail Page (`ListingDetailPage`)**:
  - Renders `vendorSummary.logoImageUrl` inside the Vendor Organization credibility card.
  - Renders `service.imageUrl` inside each Service / Hire Package card with a responsive `4:3` aspect frame.
