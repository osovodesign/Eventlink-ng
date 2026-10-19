# EventLink — Phase 11 Quality, Security & Launch Readiness Report

**Launch Market:** Warri & Effurun, Delta State, Nigeria  
**Default Currency & Timezone:** `NGN` (integer minor units / kobo) · `Africa/Lagos`  
**Firestore Database:** `ai-studio-eventlink-f3ff492a-b0dd-475b-b57c-78cec063ac7f`

---

## 1. Functional Verification Summary

| User Journey (`userflow.md`) | Implementation & Route | Status |
|---|---|---|
| Public discovery & rich search suggestions | `/` (`HomePage`), `/search`, `/categories/:slug` (`SearchPage`, `HeroSearch`) | Verified |
| Public venue & service-provider detail pages | `/venues/:slug`, `/vendors/:slug` (`ListingDetailPage`, `StickyActionCard`, `Gallery`) | Verified |
| Sign-in, registration, Google sign-in, password recovery | `/login`, `/register` (`AuthPage`), `/account` (`AccountProfilePage`) | Verified |
| Customer shortlist & side-by-side comparison | `/saved` (`SavedListingsPage`), `/compare` (`CompareVenuesPage`), `ComparisonFloatingBar` | Verified |
| Customer enquiries, planned events & vendor quotes | `/enquiries` (`CustomerEnquiriesPage`, `EnquiryForm`, `QuoteCard`) | Verified |
| Vendor onboarding, listing editor, services & media | `/vendor` (`VendorWorkspacePage`, `VendorEnquiriesPanel`) | Verified |
| Admin moderation, community reports, audit trail & smoke suite | `/admin` (`AdminModerationPage`) | Verified |
| Privacy, Terms of Service & Support/Trust pages | `/privacy`, `/terms`, `/support` (`LegalAndTrustPage`) | Verified |

---

## 2. Security & Privacy Verification

- **Database Rules (`firestore.rules` & `security_spec.md`):**
  - Enforces all 12 "Dirty Dozen" adversarial payloads (`firestore.rules.test.ts`).
  - Public `get`/`list` access on `/listings/{listingId}` is restricted strictly to `publicationStatus == 'published' && moderationStatus == 'approved'`.
  - Vendors cannot self-publish or self-approve listings; only verified administrators (`isAdmin()`) can transition listings to `published` and `approved`.
  - `/users/{userId}` denies `list` for non-admins and blocks privilege-escalation fields (`globalRoles`, `isAdmin`).
  - `/enquiries/{enquiryId}` and `/quotes/{quoteId}` are isolated strictly to `customerUid`, `vendorOwnerUid`, and `isAdmin()`. Terminal enquiries (`closed`, `cancelled`) are immutable to non-admins.
  - `/auditLogs/{logId}` is append-only (`allow update, delete: if false;`).
- **Rate Limits & Abuse Controls:**
  - Duplicate enquiries to the same listing for the same event date within a 30-minute window are rejected prior to creation (`createCustomerEnquiry`).
  - External vendor URLs are sanitized via `getSafeExternalHref` to permit only `http:` and `https:` protocols.
- **Personal Data & NDPA Portability:**
  - Direct vendor contact details (`publicPhone`, `whatsappNumber`, `publicEmail`) are gated behind `getUnlockedVendorContactForEnquiry` when `contactVisibility === 'unlocked_after_response'`.
  - Authenticated users can export their complete personal data archive as JSON or delete their account from `/account`.

---

## 3. Accessibility & Performance Verification

- **Keyboard Navigation & Focus Management:**
  - `SkipLink` (`a[href="#main-content"]`) and `<main id="main-content" tabIndex={-1}>` are present across all shell variants.
  - `Dialog`, `Drawer`, and `ConfirmDialog` trap focus, support `Escape` key dismissal, and restore focus on close.
  - `HeroSearch` implements WAI-ARIA combobox (`role="combobox"`, `aria-expanded`, `aria-controls`, `ArrowDown`/`ArrowUp`/`Enter`/`Escape`).
- **Reduced Motion & Contrast:**
  - `@media (prefers-reduced-motion: reduce)` disables non-essential transitions and animations in `src/index.css`.
  - All status badges pair semantic colors with explicit text labels and icons.
- **Query Limits & Media Performance:**
  - Firestore queries enforce explicit `limit(...)` bounds and composite indexes (`firestore.indexes.json`).
  - Listing images use lazy loading (`loading="lazy"`), explicit aspect ratios (`aspect-[16/10]`), and graceful fallback states without layout shift.

---

## 4. Resolved Decision Log (`Build_Plan.md` Section 20)

| ID | Decision | Resolution | Status |
|---|---|---|---|
| D-001 | Final application stack | React 19 + TypeScript (strict) + Vite 8 + Tailwind CSS v4 + Firebase Auth & Firestore | Closed |
| D-002 | MVP roles and vendor onboarding | Customer by default; self-service vendor workspace activation on `/account` or `/vendor`; verified admin registry | Closed |
| D-003 | Launch listing categories | 11 launch categories (`venue`, `photographer`, `videographer`, `caterer`, `decorator`, `event-planner`, `dj`, `mc`, `makeup-artist`, `cake-vendor`, `rentals`) in Warri & Effurun | Closed |
| D-004 | Enquiry channels and required fields | Structured in-app enquiry (`eventType`, `eventDate`, `guestCount`, `message`, optional `budgetAmountMinor` & `eventId`) with clear non-reservation disclosure | Closed |
| D-005 | Approved optional enhancements | Saved listings (`/saved`), venue comparison (`/compare`), structured NGN vendor quotes, customer event plans, community reports, and rich search suggestions | Closed |
| D-006 | Listing moderation lifecycle | `draft` → `pending_review` (`pending` moderation) → Admin `approve` (`published`), `changes_requested`, or `reject` with immutable `/auditLogs` entry | Closed |
| D-007 | Media limits and policy | HTTPS image URL validation, alt-text requirement, primary cover designation, and up to 15 ordered gallery items per listing | Closed |

---

## 5. Production Rollback & Recovery Plan

1. **Application Bundle Rollback:**
   - Run `npm run build` from the last known-good commit tag and redeploy the static/SPA artifact.
   - Debug-only routes (`/ui-preview`) are automatically disabled when `VITE_APP_ENV="production"`.
2. **Firestore Security Rules Rollback:**
   - `firestore.rules` is version-controlled alongside `firebase-blueprint.json` and `security_spec.md`.
   - Validate rules locally via `npx eslint firestore.rules` before any rule deployment, and redeploy the previous rule revision immediately if a regression is detected.
3. **Data Integrity & Audit Recovery:**
   - All administrative moderation and report actions write immutable records to `/auditLogs/{logId}` with `beforeSummary` and `afterSummary`, allowing any erroneous listing status change to be reversed accurately.

---

## 6. Launch-Day Smoke-Test Checklist

- [x] Homepage (`/`) loads with Warri & Effurun hero search, category cards, and published listings.
- [x] Search (`/search`) and filters (`type`, `category`, `city`, `eventType`, `capacity`, `price`, `indoorOutdoor`) work with real Firestore records.
- [x] Public listing detail (`/venues/:slug`, `/vendors/:slug`) loads accurately and never fabricates `₦0` prices or fake reviews.
- [x] Unpublished (`draft`, `pending_review`) listings are blocked from public discovery.
- [x] Authorized vendors can create and update listings and respond to enquiries in `/vendor`.
- [x] Cross-account and unauthorized edits are denied by `firestore.rules`.
- [x] Customers can submit enquiries, link planned events, save listings (`/saved`), and compare venues (`/compare`).
- [x] Legal & support pages (`/privacy`, `/terms`, `/support`) are live in the global footer, and `/ui-preview` is removed from public navigation.
