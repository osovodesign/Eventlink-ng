# EventLink — Build Plan

**Document type:** Phased product implementation plan  
**Product:** EventLink — *Every Event. The Right People.*  
**Status:** Proposed plan; confirm product and technology decisions before implementation.  
**Primary goal:** Build a reliable, secure, responsive event-services marketplace in small, testable increments.

---

## 1. Purpose

This plan turns the EventLink product and technical specifications into an ordered implementation sequence. It defines phase goals, dependencies, tasks, deliverables, acceptance criteria, and release gates.

Use this document alongside:

- `TRD.md`
- `Architecture.md`
- `Database_Schema.md`
- `userflow.md`
- `security_and_permissions.md`
- `Design_System.md`
- `Components_Specifications.md`

If any document conflicts with an explicitly approved decision, follow the approved decision and update the documents to match.

## 2. Product direction and guardrails

EventLink helps customers discover venues and event service providers and contact them about event requirements. The initial launch market is expected to focus on Warri and Effurun, Delta State, Nigeria.

Brand foundation:
- Tagline: **Every Event. The Right People.**
- Deep Navy: `#142B4A`
- Cobalt Blue: `#4778D8`
- Light Grey: `#F4F6F9`
- White: `#FFFFFF`
- Headings: Manrope
- Body/UI: Inter

### 2.1 Proposed technical baseline

The current documents describe a proposed stack of Next.js App Router, TypeScript strict mode, React, Tailwind CSS, accessible UI primitives, Firebase Authentication, Firestore, Firebase Storage, and Vercel or equivalent hosting.

**Before coding, inspect the existing repository and confirm the actual stack.** Do not replace an existing working stack just because this document describes a proposal. If the stack changes, update the architecture, data model, security design, and build plan first.

### 2.2 Launch guardrails

- Enquiries are not confirmed bookings.
- Do not imply live availability without a reliable availability feature.
- Do not invent reviews, ratings, verification, vendor response times, prices, inventory, or customer activity.
- Do not add payment processing, booking confirmation, in-app chat, paid vendor plans, or other optional capabilities without explicit approval.
- Do not let a public user grant themselves a vendor-admin or platform-admin role.
- Enforce access control on the server/data layer, not only in the UI.
- Use clearly marked development fixtures only outside production.
- Build for mobile-first use and test low-bandwidth and error conditions.

---

## 3. How to use this plan

Work from Phase 0 onward. Each phase must pass its exit criteria before dependent work begins.

For each task:
1. Inspect existing implementation and related specifications.
2. Confirm inputs, dependencies, and acceptance criteria.
3. Implement the smallest coherent change.
4. Run linting, type checks, unit tests, and relevant integration tests.
5. Test the UI at mobile and desktop sizes when applicable.
6. Review accessibility, privacy, and authorization implications.
7. Update documentation and mark the task complete only after verification.

Do not mark a task complete merely because code was generated. It must run and pass the relevant checks.

### Priority definitions

- **P0 — Launch blocker:** Required for a safe, functional MVP.
- **P1 — Important:** Needed for a coherent launch experience or shortly after launch.
- **P2 — Optional:** Implement only when approved and time/resources allow.

---

## 4. Phase overview

| Phase | Name | Priority | Depends on |
|---|---|---|---|
| 0 | Repository audit and product decisions | P0 | None |
| 1 | Project foundation and design tokens | P0 | Phase 0 |
| 2 | Authentication and access control | P0 | Phase 1 |
| 3 | Data model and security rules | P0 | Phases 0–2 |
| 4 | Public shell and core UI primitives | P0 | Phase 1 |
| 5 | Marketplace discovery and search | P0 | Phases 3–4 |
| 6 | Listing details and media | P0 | Phases 3–5 |
| 7 | Vendor onboarding and listing management | P0 | Phases 2–6 |
| 8 | Customer enquiries | P0 | Phases 2, 3, 6, 7 |
| 9 | Customer/vendor workspaces | P1 | Phases 7–8 |
| 10 | Optional enhancements | P2 | MVP stability |
| 11 | Quality, security, and launch readiness | P0 | Core MVP phases |
| 12 | Production release and monitoring | P0 | Phase 11 |

The sequence can be adjusted if the existing codebase already contains working parts. Avoid rebuilding completed features without a clear reason.

---

## 5. Phase 0 — Repository audit and product decisions

**Goal:** Understand what already exists and resolve decisions that would otherwise cause rework.

### Tasks

- [ ] Inspect the repository structure, package manager, framework, routing, styling, and existing component library.
- [ ] Identify current authentication, database, storage, hosting, and environment setup.
- [ ] Run the existing app and record known failures before changing code.
- [ ] Review existing routes and components; identify what can be reused.
- [ ] Compare the current codebase with the TRD and architecture.
- [ ] Confirm MVP account roles and vendor onboarding process.
- [ ] Confirm the listing categories and required/optional fields for each category.
- [ ] Confirm whether listing moderation is required before publication.
- [ ] Confirm whether saves, comparison, quotes, enquiry history, and reporting are in the MVP.
- [ ] Confirm the initial contact channel(s) for customer enquiries.
- [ ] Define media formats, size limits, and listing image limits.
- [ ] Confirm currency and date/time presentation rules.
- [ ] Record unresolved questions in a decision log.

### Deliverables

- Repository audit notes.
- Updated architecture/technical assumptions.
- MVP scope decision list.
- Prioritized backlog with acceptance criteria.
- Local development setup instructions.

### Exit criteria

- The application starts using documented steps.
- The team knows which stack and existing code will be retained.
- Launch scope and unresolved decisions are explicit.
- No major implementation dependency remains hidden.

---

## 6. Phase 1 — Project foundation and design tokens

**Goal:** Establish a stable, consistent base for development.

### Tasks

- [ ] Confirm runtime, package manager, environment configuration, and supported versions.
- [ ] Configure strict TypeScript or equivalent type checking.
- [ ] Configure linting, formatting, and automated checks.
- [ ] Establish the route/layout structure without duplicating existing routes.
- [ ] Implement design tokens from `Design_System.md`.
- [ ] Load Manrope and Inter with suitable fallback fonts.
- [ ] Configure global typography, colors, spacing, borders, focus rings, and responsive breakpoints.
- [ ] Create shared page container and layout primitives.
- [ ] Add a reusable error boundary and not-found page.
- [ ] Add environment-variable validation and a safe example environment file.
- [ ] Establish separate development, preview/staging, and production configuration.
- [ ] Add a README with setup, test, and build commands.

### Deliverables

- Stable local application.
- Design token foundation.
- Shared layout primitives.
- Lint/type-check/build commands.
- Documented environment setup.

### Acceptance criteria

- [ ] The app builds without type or lint errors.
- [ ] Brand colors and typography are token-driven.
- [ ] No secrets are committed to the repository.
- [ ] A missing route displays a designed not-found page.
- [ ] The base layout is usable on mobile and desktop.

---

## 7. Phase 2 — Authentication and access control

**Goal:** Support account identity and safe protected-route behavior.

### Tasks

- [ ] Implement the approved authentication provider.
- [ ] Build sign-up, sign-in, sign-out, and password recovery flows as supported by the chosen provider.
- [ ] Define session handling and route protection.
- [ ] Build loading and error states for authentication.
- [ ] Define user profile creation/update behavior.
- [ ] Implement role assignment through trusted server-side logic.
- [ ] Ensure a user cannot assign themselves platform-admin privileges.
- [ ] Define vendor membership/onboarding permissions if vendors are represented as organizations.
- [ ] Redirect authenticated users to the correct authorized destination.
- [ ] Validate return URLs to prevent unsafe redirects.
- [ ] Add tests for signed-out, customer, vendor, and admin access as applicable.

### Deliverables

- Working authentication.
- Protected-route strategy.
- User profile and role model.
- Authentication test coverage.

### Acceptance criteria

- [ ] Users can complete supported auth flows.
- [ ] Invalid or expired sessions are handled safely.
- [ ] Protected data is not exposed to signed-out users.
- [ ] Role changes cannot be forged through client requests.
- [ ] Unauthorized users receive a safe denial or redirect.

---

## 8. Phase 3 — Data model and security rules

**Goal:** Implement a data layer that supports the approved MVP and protects user information.

### Tasks

- [ ] Compare `Database_Schema.md` to the confirmed launch scope.
- [ ] Finalize collections/tables, indexes, field types, and ownership rules.
- [ ] Create schema/type definitions and input validation schemas.
- [ ] Implement database access through a controlled service/repository layer.
- [ ] Configure least-privilege database rules.
- [ ] Configure storage access rules for listing media.
- [ ] Define server-side validation for listing lifecycle changes.
- [ ] Implement ownership and vendor-membership checks.
- [ ] Define safe pagination and query limits.
- [ ] Add seed fixtures for local development only.
- [ ] Add automated security-rule tests, including cross-account access attempts.
- [ ] Document migration or schema-change practices.

### Deliverables

- Confirmed data model.
- Database/storage rules.
- Validation schemas.
- Development seed process.
- Data-access and security tests.

### Acceptance criteria

- [ ] A user cannot read or modify another user’s private records without permission.
- [ ] A vendor cannot edit another vendor’s listing.
- [ ] A vendor cannot self-approve or self-verify a listing.
- [ ] Client-supplied IDs, roles, and status values are validated.
- [ ] Query patterns have the necessary indexes and limits.
- [ ] Development fixtures cannot be mistaken for production data.

---

## 9. Phase 4 — Public shell and core UI primitives

**Goal:** Build reusable, accessible UI building blocks before implementing full pages.

### Tasks

- [ ] Build `AppShell`, `SiteHeader`, mobile navigation, footer, and page container.
- [ ] Build buttons, links, text inputs, text areas, selects, checkboxes, and radio groups.
- [ ] Build `FormField`, inline alerts, toasts, dialogs, drawers, dropdown menus, and status badges.
- [ ] Build skeletons, spinners, empty states, and error states.
- [ ] Implement visible focus, accessible names, keyboard navigation, and dialog focus management.
- [ ] Build breadcrumbs, page headings, and section headers.
- [ ] Create a small component preview/test route or story environment if suitable for the repository.
- [ ] Add component tests for important interactions.

### Deliverables

- Shared component library.
- Public page shell.
- Reusable feedback and form primitives.
- Component accessibility/interaction tests.

### Acceptance criteria

- [ ] Components match the design system.
- [ ] Common controls work with keyboard and screen readers.
- [ ] Components have appropriate loading/error/disabled states.
- [ ] No unnecessary duplicate UI primitives are created.

---

## 10. Phase 5 — Marketplace discovery and search

**Goal:** Let visitors discover relevant published listings.

### Tasks

- [ ] Build the homepage and discovery entry point.
- [ ] Implement search by approved keyword, category, and location fields.
- [ ] Implement only the filters supported by the actual data model.
- [ ] Implement supported sorting and pagination/load-more behavior.
- [ ] Build listing grid and responsive listing cards.
- [ ] Add active-filter chips and a clear-filters action.
- [ ] Keep search state in the URL when supported by the routing design.
- [ ] Build loading, empty, and error states.
- [ ] Prevent unpublished, archived, or otherwise non-public listings from appearing in public results.
- [ ] Add query indexes, limits, and safe input handling.
- [ ] Test slow network and no-result cases.

### Deliverables

- Homepage discovery experience.
- Search results page.
- Working search/filter/sort behavior.
- Responsive listing cards.

### Acceptance criteria

- [ ] Results reflect actual database records.
- [ ] Search parameters survive refresh when encoded in the URL.
- [ ] Filters do not claim to work when they are not implemented.
- [ ] No fake ratings, reviews, verification, or availability are displayed.
- [ ] Empty results explain the state and offer a useful next action.
- [ ] Search is usable on mobile and keyboard accessible.

---

## 11. Phase 6 — Listing details and media

**Goal:** Give customers enough accurate information to evaluate a venue or service provider.

### Tasks

- [ ] Build the listing detail route and not-found/unavailable states.
- [ ] Build the image gallery with keyboard-accessible controls.
- [ ] Display title, category, location, description, and supported facts.
- [ ] Display prices, capacity, amenities, and service details only when provided.
- [ ] Add vendor/business profile summary.
- [ ] Implement responsive image delivery and image fallback states.
- [ ] Implement canonical share URL behavior if approved.
- [ ] Confirm public visibility and listing status on every request.
- [ ] Add metadata/SEO for public listings where appropriate.
- [ ] Test long descriptions, missing data, broken images, and unavailable listings.

### Deliverables

- Public listing detail pages.
- Media gallery and fallbacks.
- Accurate price/facts presentation.
- Shareable listing URLs where supported.

### Acceptance criteria

- [ ] Listing details display only trusted, available data.
- [ ] Missing price is not represented as free.
- [ ] The page does not imply booking or live availability.
- [ ] Broken images do not break the page layout.
- [ ] Unpublished listings are not accessible publicly unless a specific preview permission allows it.

---

## 12. Phase 7 — Vendor onboarding and listing management

**Goal:** Let authorized vendors create and maintain their business profiles and listings.

### Tasks

- [ ] Build vendor onboarding and membership checks.
- [ ] Build the business profile form.
- [ ] Build category-aware listing creation/edit forms.
- [ ] Implement draft saving if drafts are in the approved lifecycle.
- [ ] Implement authorized media upload, reorder, and removal.
- [ ] Build listing preview.
- [ ] Implement server-side listing lifecycle transitions.
- [ ] Implement submission for review if moderation is required.
- [ ] Show status and actionable feedback to the vendor.
- [ ] Prevent vendors from changing protected fields such as moderation/verification status.
- [ ] Add tests for ownership, validation, upload errors, and unauthorized edits.

### Deliverables

- Vendor onboarding.
- Business profile management.
- Listing create/edit workflow.
- Media management.
- Listing status experience.

### Acceptance criteria

- [ ] A vendor can manage only records they own or are authorized to manage.
- [ ] Invalid or oversized uploads are rejected.
- [ ] Required fields are validated on both client and server.
- [ ] Publication follows the approved lifecycle.
- [ ] Listing status cannot be forged through client-side changes.

---

## 13. Phase 8 — Customer enquiries

**Goal:** Enable customers to contact a vendor about a specific event requirement.

### Tasks

- [ ] Confirm enquiry fields and contact channels.
- [ ] Build the enquiry form from the component specification.
- [ ] Validate fields and apply spam/rate-limit protection.
- [ ] Create enquiries through a trusted server operation.
- [ ] Associate each enquiry with the correct listing, customer, and vendor.
- [ ] Notify the vendor through an approved channel if notifications are in scope.
- [ ] Provide a clear submission confirmation and recoverable failure state.
- [ ] Prevent duplicate submissions where possible.
- [ ] Ensure customer/vendor access to enquiry records is correctly scoped.
- [ ] Add tests for failed submission, repeated submission, and cross-account access.

### Deliverables

- Working customer enquiry flow.
- Secure enquiry records.
- Clear success/error feedback.
- Optional notifications only if approved and configured.

### Acceptance criteria

- [ ] An enquiry is created only after server-side validation succeeds.
- [ ] Only authorized parties can view enquiry details.
- [ ] A failed submission does not silently discard the user’s message.
- [ ] The UI states clearly that an enquiry is not a confirmed booking.
- [ ] Contact details are shared only as required by the approved workflow.

---

## 14. Phase 9 — Customer and vendor workspaces

**Goal:** Provide a practical place for users to manage their marketplace activity.

Implement only the workspace features included in the approved MVP.

### Potential tasks

- [ ] Build customer account/profile settings.
- [ ] Build enquiry history for customers, if included.
- [ ] Build vendor dashboard and listing management overview.
- [ ] Build vendor enquiry list/detail views, if included.
- [ ] Build save-listing workflow, if approved.
- [ ] Build listing comparison, if approved.
- [ ] Build quote creation and response workflow, if approved.
- [ ] Build notifications, if a real notification system is implemented.
- [ ] Build account deletion/export behavior according to the privacy policy and data model.
- [ ] Test permissions, empty states, and account switching.

### Deliverables

- Approved customer workspace.
- Approved vendor workspace.
- Optional saves, comparisons, quotes, or notifications only where explicitly in scope.

### Acceptance criteria

- [ ] Every workspace displays only data the current user may access.
- [ ] Dashboard figures are derived from real records.
- [ ] No fake activity, metrics, or notifications appear in production.
- [ ] Optional features remain excluded if not approved.

---

## 15. Phase 10 — Optional enhancements

**Goal:** Add only validated features that improve the product after the MVP is stable.

Potential enhancements, each requiring explicit approval and its own acceptance criteria:

- [ ] Saved listings.
- [ ] Listing comparison.
- [ ] Vendor quotes and quote responses.
- [ ] Notifications by email or another supported channel.
- [ ] Listing reports and moderation workflow.
- [ ] Rich search suggestions.
- [ ] Availability management.
- [ ] Booking and payment workflows.
- [ ] Public reviews and ratings.
- [ ] Vendor subscriptions or promoted listings.

These are not automatic launch commitments. Features involving payment, bookings, availability, reviews, or vendor verification require additional product, legal, operational, and security design before implementation.

---

## 16. Phase 11 — Quality, security, and launch readiness

**Goal:** Verify the complete MVP against product, quality, accessibility, privacy, and security expectations.

### Functional testing
- [ ] Test every primary user journey from `userflow.md`.
- [ ] Test sign-up, sign-in, sign-out, and password recovery.
- [ ] Test search, filters, listing details, and unavailable listings.
- [ ] Test vendor onboarding, listing creation, editing, and media management.
- [ ] Test enquiry submission and access boundaries.
- [ ] Test all error, empty, loading, and permission-denied states.

### Security and privacy
- [ ] Test unauthorized and cross-account access.
- [ ] Review database and storage rules.
- [ ] Verify server-side role and ownership checks.
- [ ] Test input validation and upload restrictions.
- [ ] Check rate limits and abuse controls.
- [ ] Confirm secrets are not present in client bundles, logs, or repository history.
- [ ] Review personal data collection, visibility, retention, and deletion.
- [ ] Ensure public pages do not expose private vendor/customer records.

### Accessibility and UX
- [ ] Complete keyboard-only testing.
- [ ] Test forms and dialogs with a screen reader.
- [ ] Verify focus management and visible focus.
- [ ] Check contrast, zoom, and responsive reflow.
- [ ] Test on narrow mobile screens and common desktop widths.
- [ ] Verify reduced-motion behavior.

### Performance and reliability
- [ ] Test on slow mobile network conditions.
- [ ] Check image sizes, loading behavior, and layout shift.
- [ ] Review query limits, indexes, and pagination.
- [ ] Test recoverable backend errors and retry behavior.
- [ ] Check application logs and monitoring for sensitive data leakage.
- [ ] Verify backups/export and recovery expectations for the selected services.

### Release preparation
- [ ] Configure production environment variables.
- [ ] Configure domain, HTTPS, and redirects.
- [ ] Verify production authentication and database configuration.
- [ ] Remove development fixtures and debug-only UI.
- [ ] Confirm privacy policy, terms, support contact, and any required legal pages are ready.
- [ ] Prepare a rollback plan.
- [ ] Create a smoke-test checklist for the deployed app.

### Exit criteria

No unresolved critical security issue, data leak, broken core user journey, or fabricated product claim remains. All launch-blocking issues are fixed or explicitly accepted by the responsible owner.

---

## 17. Phase 12 — Production release and monitoring

**Goal:** Release in a controlled way and respond quickly to issues.

### Tasks

- [ ] Deploy the approved release to production.
- [ ] Run smoke tests on the deployed domain.
- [ ] Verify authentication, public search, listing details, vendor listing flow, and enquiries.
- [ ] Verify database and storage permissions in the production environment.
- [ ] Confirm error reporting and operational logs work.
- [ ] Monitor application failures, latency, failed submissions, and unusual abuse.
- [ ] Gather feedback from a small group of real users/vendors.
- [ ] Track issues and prioritize by severity and user impact.
- [ ] Keep a rollback or recovery path ready.
- [ ] Document the deployed version and known limitations.

### Launch-day smoke test

- [ ] Homepage loads.
- [ ] Search and filters work with real records.
- [ ] Public listing detail loads correctly.
- [ ] Unpublished listing is not publicly visible.
- [ ] A vendor can create or update an authorized listing.
- [ ] Unauthorized listing edits are denied.
- [ ] A customer can submit an enquiry.
- [ ] The vendor/customer can see only authorized enquiry information.
- [ ] Mobile navigation and forms work.
- [ ] No development fixtures or fake reviews are visible.

---

## 18. Cross-phase definition of done

A task is complete only when all applicable checks pass:

- [ ] Acceptance criteria are met.
- [ ] The code runs in the actual repository and approved stack.
- [ ] Types, linting, and build checks pass.
- [ ] Relevant automated tests pass.
- [ ] Mobile and desktop behavior has been checked.
- [ ] Accessibility has been considered and tested.
- [ ] Security and authorization boundaries are verified.
- [ ] Error, loading, empty, and success states are handled.
- [ ] Documentation is updated.
- [ ] No unapproved feature or fake production data was introduced.

---

## 19. Suggested implementation order for an AI coding tool

Use this order for incremental work:

1. **Audit first:** inspect the repository and report what exists before changing files.
2. **Propose a short plan:** identify files to change, dependencies, risks, and acceptance criteria.
3. **Make one coherent change:** avoid generating the whole application in one large pass.
4. **Verify:** run available checks and inspect the actual result.
5. **Fix regressions:** do not continue while a core build or type check is broken.
6. **Report accurately:** state what was implemented, which tests ran, their results, and what remains.
7. **Update docs:** keep this plan and the relevant specifications aligned with implementation.

Do not claim a test passed unless it was actually run. If a command cannot be run in the environment, state that explicitly.

---

## 20. Decision log template

Record product/technical decisions before they affect implementation.

| ID | Decision | Options considered | Owner | Status | Date | Documents to update |
|---|---|---|---|---|---|---|
| D-001 | Final application stack | Existing stack / proposed stack / alternative | TBD | Open | TBD | TRD, Architecture, Build Plan |
| D-002 | MVP roles and vendor onboarding | To be defined | TBD | Open | TBD | PRD, userflow, Security |
| D-003 | Launch listing categories | To be defined | TBD | Open | TBD | PRD, Database Schema, Components |
| D-004 | Enquiry channels and required fields | To be defined | TBD | Open | TBD | PRD, userflow, Database Schema |
| D-005 | Optional MVP features | Saves, comparison, quotes, reports | TBD | Open | TBD | PRD, userflow, TRD |
| D-006 | Listing moderation lifecycle | To be defined | TBD | Open | TBD | Database Schema, Security, userflow |
| D-007 | Media limits and policy | To be defined | TBD | Open | TBD | TRD, Security, Components |

---

## 21. Final implementation instruction

Treat this plan as a sequence of verified milestones, not a prompt to build every feature at once. Inspect the current codebase first, preserve working functionality, resolve critical product decisions, and implement the smallest useful MVP. Security, accurate listing information, accessibility, and reliable enquiry handling take priority over optional features and visual polish.
