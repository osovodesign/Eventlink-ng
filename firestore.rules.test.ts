/**
 * Firestore Security Rules Test Suite — Verifies all "Dirty Dozen" payloads return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'PII Blanket Read on another user profile',
    operation: 'get',
    path: '/users/user_A',
    auth: { uid: 'user_B', email: 'b@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Privilege Escalation on own user profile',
    operation: 'update',
    path: '/users/user_A',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { isAdmin: true, globalRoles: ['admin'] },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Vendor Self-Approval on listing creation',
    operation: 'create',
    path: '/listings/listing_1',
    auth: { uid: 'vendor_A', email: 'vendor@example.com', email_verified: true },
    payload: {
      publicationStatus: 'published',
      moderationStatus: 'approved',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Cross-Organization Listing Hijack',
    operation: 'update',
    path: '/listings/listing_owned_by_A',
    auth: { uid: 'vendor_B', email: 'vendorb@example.com', email_verified: true },
    payload: { name: 'Hijacked Venue Name' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unpublished Listing Public Scrape',
    operation: 'get',
    path: '/listings/draft_listing_1',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Enquiry Identity Spoofing',
    operation: 'create',
    path: '/enquiries/enq_1',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { customerUid: 'user_B' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Enquiry Cross-Tenant Snooping',
    operation: 'list',
    path: '/enquiries',
    auth: { uid: 'vendor_B', email: 'vendorb@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Terminal Enquiry Mutation after closed state',
    operation: 'update',
    path: '/enquiries/enq_closed',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { status: 'submitted' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Customer Self-Quote Forgery',
    operation: 'create',
    path: '/quotes/quote_1',
    auth: { uid: 'customer_A', email: 'cust@example.com', email_verified: true },
    payload: { vendorOwnerUid: 'vendor_A', customerUid: 'customer_A' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Spoofed Admin Email with email_verified == false',
    operation: 'update',
    path: '/listings/listing_1',
    auth: {
      uid: 'spoof_uid',
      email: 'osovoyoronogheneovo@gmail.com',
      email_verified: false,
    },
    payload: { publicationStatus: 'published', moderationStatus: 'approved' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Timestamp Forgery on savedListings creation',
    operation: 'create',
    path: '/savedListings/user_A_listing_1',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: {
      uid: 'user_A',
      listingId: 'listing_1',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Audit Log Tampering (delete/update)',
    operation: 'delete',
    path: '/auditLogs/log_1',
    auth: {
      uid: 'admin_uid',
      email: 'osovoyoronogheneovo@gmail.com',
      email_verified: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];
