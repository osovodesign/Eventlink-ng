import React from 'react';
import { Lock, ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../../lib/auth/auth-context';
import {
  canAccessAdminWorkspace,
  canAccessCustomerWorkspace,
  canAccessVendorWorkspace,
} from '../../lib/permissions/access-control';
import { AppLink, useRouter } from '../../lib/router/router-context';
import { PageContainer } from '../layout/page-container';

export type RequiredAccessLevel = 'authenticated' | 'customer' | 'vendor' | 'admin';

export interface ProtectedRouteProps {
  requiredAccess: RequiredAccessLevel;
  children: React.ReactNode;
}

/**
 * ProtectedRoute (Build_Plan.md Phase 2 & Security_and_Permissions.md Section 5)
 * Enforces authentication, account status ('active'), and role/workspace access.
 * Preserves returnTo destination safely when prompting signed-out users to sign in.
 */
export function ProtectedRoute({
  requiredAccess,
  children,
}: ProtectedRouteProps) {
  const {
    isAuthReady,
    firebaseUser,
    userProfile,
    vendorOrganization,
    isAdmin,
    updateUserProfile,
  } = useAuth();
  const { pathname, search, navigate } = useRouter();

  if (!isAuthReady) {
    return (
      <PageContainer className="py-16">
        <div
          role="status"
          aria-live="polite"
          className="mx-auto max-w-md rounded-[14px] border border-[#D7DEE8] bg-white p-8 text-center"
        >
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#D7DEE8] border-t-[#142B4A] mb-3" />
          <p className="text-sm font-medium text-[#172B4D]">
            Verifying your session and permissions…
          </p>
        </div>
      </PageContainer>
    );
  }

  // 1. Unauthenticated user -> Prompt to sign in with safe returnTo URL
  if (!firebaseUser || !userProfile) {
    const returnUrl = encodeURIComponent(`${pathname}${search}`);
    return (
      <PageContainer className="py-12 sm:py-20">
        <div className="mx-auto max-w-lg rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#EFF8FF] text-[#175CD3] mb-4">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-medium text-[#697586] mb-1">
            Authentication required
          </p>
          <h1 className="text-2xl font-bold text-[#142B4A] mb-2">
            Sign in to continue
          </h1>
          <p className="text-base text-[#344054] mb-6 leading-relaxed">
            You need to be signed in to access this area. Once you sign in, you
            will be returned directly to your intended page.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <AppLink
              href={`/login?returnTo=${returnUrl}`}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] bg-[#142B4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign in or create account
            </AppLink>
            <AppLink
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2.5 text-sm font-medium text-[#142B4A] hover:bg-[#F4F6F9] transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </AppLink>
          </div>
        </div>
      </PageContainer>
    );
  }

  // 2. Non-active account state ('suspended', 'deletion_pending', 'deleted')
  if (userProfile.accountStatus !== 'active') {
    return (
      <PageContainer className="py-12 sm:py-20">
        <div
          role="alert"
          className="mx-auto max-w-lg rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#FFF5D6] text-[#8A5A00] mb-4">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-medium text-[#697586] mb-1">
            Account status: {userProfile.accountStatus.replace('_', ' ')}
          </p>
          <h1 className="text-2xl font-bold text-[#142B4A] mb-2">
            Protected actions are restricted
          </h1>
          <p className="text-base text-[#344054] mb-6 leading-relaxed">
            {userProfile.accountStatus === 'deletion_pending'
              ? 'Your account has a pending deletion request. Protected marketplace actions are disabled while your request is processed.'
              : 'Your account is not currently active for protected marketplace actions. Please visit your account settings or contact platform operations.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <AppLink
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#142B4A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors whitespace-nowrap shrink-0"
            >
              Return to public discovery
            </AppLink>
          </div>
        </div>
      </PageContainer>
    );
  }

  // 3. Admin access check
  if (
    requiredAccess === 'admin' &&
    !canAccessAdminWorkspace(userProfile, isAdmin)
  ) {
    return (
      <PageContainer className="py-12 sm:py-20">
        <div
          role="alert"
          className="mx-auto max-w-lg rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8"
        >
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#FEF3F2] text-[#B42318] mb-4">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-xs font-medium text-[#697586] mb-1">
            Access denied
          </p>
          <h1 className="text-2xl font-bold text-[#142B4A] mb-2">
            Administrator permission required
          </h1>
          <p className="text-base text-[#344054] mb-6 leading-relaxed">
            Your account ({userProfile.email}) is not authorized to access
            EventLink moderation and administration tools. Administrative
            permissions are verified on the server and cannot be self-assigned.
          </p>
          <AppLink
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#142B4A] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors whitespace-nowrap shrink-0"
          >
            Return to home
          </AppLink>
        </div>
      </PageContainer>
    );
  }

  // 4. Vendor capability check (AUTH-03: allows activating vendor capability under the same account)
  if (
    requiredAccess === 'vendor' &&
    !canAccessVendorWorkspace(userProfile, vendorOrganization)
  ) {
    const handleActivateVendor = async () => {
      await updateUserProfile({ intendedRole: 'both' });
      navigate('/vendor');
    };

    return (
      <PageContainer className="py-12 sm:py-20">
        <div className="mx-auto max-w-lg rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8">
          <p className="text-xs font-medium text-[#697586] mb-1">
            Vendor capability
          </p>
          <h1 className="text-2xl font-bold text-[#142B4A] mb-2">
            Activate vendor tools on your account
          </h1>
          <p className="text-base text-[#344054] mb-6 leading-relaxed">
            EventLink lets you plan events as a customer and manage a venue or
            event-service business under one account. Activate vendor capability
            to create your business profile and submit listings for review.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleActivateVendor}
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#142B4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Activate vendor workspace
            </button>
            <AppLink
              href="/account"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2.5 text-sm font-medium text-[#142B4A] hover:bg-[#F4F6F9] transition-colors whitespace-nowrap shrink-0"
            >
              Manage account settings
            </AppLink>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (
    requiredAccess === 'customer' &&
    !canAccessCustomerWorkspace(userProfile)
  ) {
    return null;
  }

  return <>{children}</>;
}
