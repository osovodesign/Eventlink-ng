import React, { useState, useEffect } from 'react';
import {
  LogIn,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../lib/auth/auth-context';
import { IntendedRole } from '../../lib/permissions/access-control';
import {
  AppLink,
  sanitizeInternalPath,
  useRouter,
} from '../../lib/router/router-context';
import { PageContainer } from '../layout/page-container';
import { EventLinkLogo } from '../layout/eventlink-logo';

export interface AuthPageProps {
  mode: 'login' | 'register';
}

/**
 * AuthForm & RoleSelector (Component_Specifications.md Section 4.12 & User_Flows.md Flow 3)
 * Uses verified Firebase Google Sign-In, supports role intent selection ('customer' | 'vendor' | 'both'),
 * prevents open redirects via sanitizeInternalPath, and resumes intended actions.
 */
export function AuthPage({ mode }: AuthPageProps) {
  const {
    firebaseUser,
    userProfile,
    isSigningIn,
    authError,
    signInWithGoogle,
    clearAuthError,
  } = useAuth();
  const { searchParams, navigate } = useRouter();

  const rawReturnTo = searchParams.get('returnTo') || '';
  const initialRoleParam = searchParams.get('role');
  const [selectedIntent, setSelectedIntent] = useState<IntendedRole>(
    initialRoleParam === 'vendor' ? 'vendor' : 'customer'
  );

  // Compute safe destination after authentication
  const getSafeDestination = (role: IntendedRole): string => {
    if (rawReturnTo) {
      return sanitizeInternalPath(decodeURIComponent(rawReturnTo));
    }
    if (role === 'vendor') {
      return '/vendor';
    }
    return '/account';
  };

  useEffect(() => {
    clearAuthError();
  }, [mode, clearAuthError]);

  // If already signed in and profile is ready, redirect to safe destination
  useEffect(() => {
    if (firebaseUser && userProfile) {
      const target = getSafeDestination(userProfile.intendedRole);
      navigate(target, { replace: true });
    }
  }, [firebaseUser, userProfile]);

  const handleGoogleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const profile = await signInWithGoogle({ intendedRole: selectedIntent });
    if (profile) {
      const target = getSafeDestination(
        selectedIntent === 'vendor' ? 'vendor' : profile.intendedRole
      );
      navigate(target, { replace: true });
    }
  };

  return (
    <PageContainer className="py-10 sm:py-16">
      <div className="mx-auto max-w-md rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8">
        <div className="mb-6">
          <EventLinkLogo size="md" className="mb-4" />
          <h1 className="text-2xl font-bold text-[#142B4A]">
            {mode === 'register'
              ? 'Create your EventLink account'
              : 'Sign in to EventLink'}
          </h1>
          <p className="text-sm text-[#344054] mt-1.5">
            {mode === 'register'
              ? 'One account lets you plan events in Warri and Effurun or list your venue and event services.'
              : 'Access your saved listings, event workspaces, enquiries, or vendor dashboard.'}
          </p>
        </div>

        {rawReturnTo && (
          <div className="mb-5 flex items-start gap-2.5 rounded-[10px] bg-[#EFF8FF] p-3.5 text-xs text-[#175CD3]">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              After signing in, you’ll be returned directly to your previous
              action.
            </span>
          </div>
        )}

        {authError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-[10px] bg-[#FEF3F2] p-3.5 text-sm text-[#B42318]"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleGoogleAuth} className="space-y-6">
          {/* RoleSelector (Component_Specifications.md Section 4.12) */}
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-medium text-[#172B4D]">
              How do you plan to use EventLink?
            </legend>
            <p className="text-xs text-[#697586]">
              You can use both customer and vendor tools from the same account at
              any time.
            </p>
            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <label
                className={`flex items-start gap-3 rounded-[10px] border p-3.5 cursor-pointer transition-colors ${
                  selectedIntent === 'customer'
                    ? 'border-[#4778D8] bg-[#EFF8FF]/50'
                    : 'border-[#D7DEE8] bg-white hover:bg-[#F4F6F9]'
                }`}
              >
                <input
                  type="radio"
                  name="intendedRole"
                  value="customer"
                  checked={selectedIntent === 'customer'}
                  onChange={() => setSelectedIntent('customer')}
                  className="mt-1 h-4 w-4 accent-[#142B4A]"
                />
                <div className="text-sm">
                  <div className="flex items-center gap-1.5 font-semibold text-[#142B4A]">
                    <Calendar className="h-4 w-4 text-[#4778D8]" aria-hidden="true" />
                    <span>I’m planning an event (Customer)</span>
                  </div>
                  <p className="text-xs text-[#344054] mt-0.5">
                    Save venues and vendors, compare options, and send enquiries.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-[10px] border p-3.5 cursor-pointer transition-colors ${
                  selectedIntent === 'vendor'
                    ? 'border-[#4778D8] bg-[#EFF8FF]/50'
                    : 'border-[#D7DEE8] bg-white hover:bg-[#F4F6F9]'
                }`}
              >
                <input
                  type="radio"
                  name="intendedRole"
                  value="vendor"
                  checked={selectedIntent === 'vendor'}
                  onChange={() => setSelectedIntent('vendor')}
                  className="mt-1 h-4 w-4 accent-[#142B4A]"
                />
                <div className="text-sm">
                  <div className="flex items-center gap-1.5 font-semibold text-[#142B4A]">
                    <Building2 className="h-4 w-4 text-[#4778D8]" aria-hidden="true" />
                    <span>I own a venue or offer event services (Vendor)</span>
                  </div>
                  <p className="text-xs text-[#344054] mt-0.5">
                    Create a business profile, list venues or services, and
                    respond to customer enquiries.
                  </p>
                </div>
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full inline-flex min-h-[46px] items-center justify-center gap-2.5 rounded-[10px] bg-[#142B4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1c3a63] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {isSigningIn
              ? 'Connecting with Google…'
              : mode === 'register'
              ? 'Continue with Google'
              : 'Sign in with Google'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E9EDF3] space-y-3 text-xs text-[#697586]">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-[#16794B] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Your private email and phone number are never shown publicly on
              customer enquiries without your explicit action.
            </span>
          </div>
          <p className="text-center pt-1 text-sm text-[#344054]">
            {mode === 'register' ? (
              <>
                Already have an account?{' '}
                <AppLink
                  href={
                    rawReturnTo
                      ? `/login?returnTo=${encodeURIComponent(rawReturnTo)}`
                      : '/login'
                  }
                  className="font-semibold text-[#4778D8] hover:underline"
                >
                  Sign in
                </AppLink>
              </>
            ) : (
              <>
                New to EventLink?{' '}
                <AppLink
                  href={
                    rawReturnTo
                      ? `/register?returnTo=${encodeURIComponent(rawReturnTo)}`
                      : '/register'
                  }
                  className="font-semibold text-[#4778D8] hover:underline"
                >
                  Create an account
                </AppLink>
              </>
            )}
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
