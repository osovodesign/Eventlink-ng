/**
 * Domain Access Control & Permission Policies (Security_and_Permissions.md Section 5 & 6)
 * Enforces the 7-condition authorization rule in application domain logic.
 * Note: Firestore Security Rules remain the authoritative enforcement layer.
 */

export type AccountStatus = 'active' | 'suspended' | 'deletion_pending' | 'deleted';
export type OnboardingStatus = 'incomplete' | 'in_progress' | 'complete';
export type IntendedRole = 'customer' | 'vendor' | 'both';
export type VendorRole = 'owner' | 'manager' | 'editor' | 'viewer';

export interface UserProfileRecord {
  uid: string;
  displayName: string;
  email: string;
  phone?: string | null;
  photoPath?: string | null;
  preferredLocale: 'en-NG' | 'en-GB' | 'en-US';
  accountStatus: AccountStatus;
  onboardingStatus: OnboardingStatus;
  intendedRole: IntendedRole;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastLoginAt?: unknown;
}

export interface VendorOrganizationRecord {
  id: string;
  name: string;
  slug: string;
  businessType: 'sole-proprietor' | 'registered-company' | 'partnership' | 'not-specified';
  description: string;
  ownerUid: string;
  logoImageUrl?: string | null;
  publicEmail?: string | null;
  publicPhone?: string | null;
  whatsappNumber?: string | null;
  websiteUrl?: string | null;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected' | null;
  city: 'Warri' | 'Effurun';
  state: string;
  countryCode: 'NG';
  status: 'active' | 'suspended' | 'archived';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VendorMembershipRecord {
  id: string;
  organizationId: string;
  uid: string;
  role: VendorRole;
  status: 'active' | 'revoked';
  createdAt?: unknown;
  updatedAt?: unknown;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'osovoyoronogheneovo@gmail.com';

export function isAccountActive(profile: UserProfileRecord | null): boolean {
  return Boolean(profile && profile.accountStatus === 'active');
}

export function isVerifiedAdminIdentity(
  email: string | null | undefined,
  emailVerified: boolean | null | undefined,
  hasAdminRecord: boolean
): boolean {
  if (!emailVerified) return false;
  if (email && email.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  return hasAdminRecord;
}

export function canAccessCustomerWorkspace(profile: UserProfileRecord | null): boolean {
  return isAccountActive(profile);
}

export function canAccessVendorWorkspace(
  profile: UserProfileRecord | null,
  vendorOrg: VendorOrganizationRecord | null
): boolean {
  if (!isAccountActive(profile)) return false;
  if (vendorOrg && vendorOrg.status !== 'suspended') return true;
  return profile?.intendedRole === 'vendor' || profile?.intendedRole === 'both';
}

export function canManageOrganizationListings(
  profile: UserProfileRecord | null,
  vendorOrg: VendorOrganizationRecord | null,
  membership: VendorMembershipRecord | null
): boolean {
  if (!isAccountActive(profile) || !vendorOrg) return false;
  if (vendorOrg.status !== 'active') return false;
  if (vendorOrg.ownerUid === profile?.uid) return true;
  if (!membership || membership.status !== 'active') return false;
  return ['owner', 'manager', 'editor'].includes(membership.role);
}

export function canAccessAdminWorkspace(
  profile: UserProfileRecord | null,
  isAdmin: boolean
): boolean {
  return isAccountActive(profile) && isAdmin;
}

/**
 * Synchronized input constraints matching firebase-blueprint.json and firestore.rules
 */
export const USER_PROFILE_CONSTRAINTS = {
  DISPLAY_NAME_MIN: 1,
  DISPLAY_NAME_MAX: 100,
  PHONE_MAX: 32,
  PHOTO_PATH_MAX: 300000,
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
} as const;

export function sanitizeDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'EventLink Member';
  return trimmed.slice(0, USER_PROFILE_CONSTRAINTS.DISPLAY_NAME_MAX);
}

export function sanitizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, USER_PROFILE_CONSTRAINTS.PHONE_MAX);
}
