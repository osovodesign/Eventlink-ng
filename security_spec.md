# EventLink — Security Specification (Payload-First Security TDD)

## 1. Data Invariants

1. **PII & User Isolation (`/users/{userId}`):**
   - Only `request.auth.uid == userId` or `isAdmin()` may read a user document.
   - No `list` access for non-admins.
   - Users cannot self-assign `accountStatus: "suspended"` on creation or inject `globalRoles`/`isAdmin` shadow fields.
   - `createdAt` must equal `request.time` on creation and remain immutable on update.

2. **Admin Registry (`/admins/{adminId}`):**
   - Only bootstrapped admin (`osovoyoronogheneovo@gmail.com` with `email_verified == true`) or existing `isAdmin()` can read/write `/admins/{adminId}`.

3. **Vendor Organization & Membership Integrity (`/vendorOrganizations/{organizationId}`, `/vendorMemberships/{membershipId}`):**
   - A vendor organization's `ownerUid` must equal `request.auth.uid` on creation and cannot be mutated by non-admins.
   - A membership document requires an existing parent `/vendorOrganizations/{organizationId}` owned by `request.auth.uid` (or `isAdmin()`).

4. **Listing Publication & Moderation Gate (`/listings/{listingId}`):**
   - Public (`allow get, list`) access is strictly restricted to listings where `resource.data.publicationStatus == 'published' && resource.data.moderationStatus == 'approved'`.
   - Vendors creating a listing must own the referenced `organizationId` (`get(.../vendorOrganizations/$(incoming().organizationId)).data.ownerUid == request.auth.uid`) and can only create listings with `publicationStatus in ['draft', 'pending_review']` and `moderationStatus in ['not_submitted', 'pending']`.
   - Vendors can NEVER self-publish (`publicationStatus == 'published'`) or self-approve (`moderationStatus == 'approved'`). Only `isAdmin()` can transition a listing to `published` and `approved`.

5. **Enquiries & Quotes Isolation (`/enquiries/{enquiryId}`, `/quotes/{quoteId}`):**
   - An enquiry can only be created by an authenticated verified user where `incoming().customerUid == request.auth.uid`, targeting an existing published listing (`exists(.../listings/$(incoming().listingId))`).
   - An enquiry can only be read (`get`/`list`) by `resource.data.customerUid == request.auth.uid`, `resource.data.vendorOwnerUid == request.auth.uid`, or `isAdmin()`.
   - Once an enquiry reaches terminal status `closed` or `cancelled`, non-admins cannot mutate it.
   - Quotes can only be created by `incoming().vendorOwnerUid == request.auth.uid` for an existing enquiry, and accepted/declined only by `resource.data.customerUid == request.auth.uid` while `resource.data.status == 'sent'`.

6. **Customer Private Collections (`/savedListings`, `/comparisons`, `/events`, `/notifications`):**
   - Strictly isolated to the owner (`uid == request.auth.uid` / `ownerUid == request.auth.uid` / `recipientUid == request.auth.uid`).
   - Every `allow list` rule explicitly enforces ownership on `resource.data` without delegating filtering to the client.

7. **Audit Logs (`/auditLogs/{logId}`):**
   - Append-only (`allow update, delete: if false;`), readable and creatable strictly by `isAdmin()`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (PII Blanket Read):** Authenticated `user_B` attempts `get` on `/users/user_A`.
2. **Payload 2 (Shadow Privilege Escalation):** `user_A` updates `/users/user_A` with `{ isAdmin: true, globalRoles: ['admin'] }`.
3. **Payload 3 (Vendor Self-Approval):** Vendor creates `/listings/list_1` with `publicationStatus: 'published', moderationStatus: 'approved'`.
4. **Payload 4 (Cross-Organization Listing Hijack):** `vendor_B` attempts to update `/listings/list_owned_by_A`.
5. **Payload 5 (Unpublished Listing Public Scrape):** Unauthenticated visitor attempts `get` on `/listings/draft_listing_1` (`publicationStatus: 'draft'`).
6. **Payload 6 (Enquiry Identity Spoofing):** `user_A` creates `/enquiries/enq_1` with `customerUid: 'user_B'`.
7. **Payload 7 (Enquiry Cross-Tenant Snooping):** `vendor_B` queries `list` on `/enquiries` belonging to `vendor_A`.
8. **Payload 8 (Terminal Enquiry Mutation):** Customer attempts to update `/enquiries/enq_closed` after `status == 'closed'`.
9. **Payload 9 (Customer Self-Quote Forgery):** Customer attempts to create `/quotes/quote_1` pretending to be `vendorOwnerUid`.
10. **Payload 10 (Spoofed Admin Email without Verification):** Attacker with `email: 'osovoyoronogheneovo@gmail.com'` and `email_verified: false` attempts to approve `/listings/list_1`.
11. **Payload 11 (Timestamp Forgery):** User creates `/savedListings/user_A_list_1` with a past/future `createdAt` instead of `request.time`.
12. **Payload 12 (Audit Log Tampering):** Admin or user attempts `delete` or `update` on `/auditLogs/log_1`.
