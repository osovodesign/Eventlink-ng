import React, { useState, useEffect } from 'react';
import {
  LogIn,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
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
import { TextInput } from '../ui/inputs';

export interface AuthPageProps {
  mode: 'login' | 'register';
}

/**
 * AuthForm & RoleSelector (Component_Specifications.md Section 4.12 & User_Flows.md Flow 3)
 * Supports both Email/Password authentication and Google Sign-In, role intent selection
 * ('customer' | 'vendor' | 'both'), open-redirect prevention via sanitizeInternalPath,
 * and password reset.
 */
export function AuthPage({ mode }: AuthPageProps) {
  const {
    firebaseUser,
    userProfile,
    isSigningIn,
    authError,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    sendPasswordReset,
    clearAuthError,
  } = useAuth();
  const { searchParams, navigate } = useRouter();

  const rawReturnTo = searchParams.get('returnTo') || '';
  const initialRoleParam = searchParams.get('role');
  const [selectedIntent, setSelectedIntent] = useState<IntendedRole>(
    initialRoleParam === 'vendor' ? 'vendor' : 'customer'
  );

  // Email & Password Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localValidationError, setLocalValidationError] = useState<
    string | null
  >(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

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
    setLocalValidationError(null);
    setResetEmailSent(false);
  }, [mode, clearAuthError]);

  // If already signed in and profile is ready, redirect to safe destination
  useEffect(() => {
    if (firebaseUser && userProfile) {
      const target = getSafeDestination(userProfile.intendedRole);
      navigate(target, { replace: true });
    }
  }, [firebaseUser, userProfile]);

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidationError(null);
    setResetEmailSent(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalValidationError('Please enter your email address.');
      return;
    }

    if (mode === 'register') {
      if (displayName.trim().length < 2) {
        setLocalValidationError(
          'Please enter your full name or business contact name (at least 2 characters).'
        );
        return;
      }
      if (password.length < 6) {
        setLocalValidationError(
          'Password must be at least 6 characters long.'
        );
        return;
      }
      if (password !== confirmPassword) {
        setLocalValidationError('Passwords do not match.');
        return;
      }

      const profile = await signUpWithEmail({
        displayName: displayName.trim(),
        email: trimmedEmail,
        password,
        intendedRole: selectedIntent,
      });
      if (profile) {
        const target = getSafeDestination(
          selectedIntent === 'vendor' ? 'vendor' : profile.intendedRole
        );
        navigate(target, { replace: true });
      }
    } else {
      if (!password) {
        setLocalValidationError('Please enter your password.');
        return;
      }

      const profile = await signInWithEmail({
        email: trimmedEmail,
        password,
        intendedRole: selectedIntent,
      });
      if (profile) {
        const target = getSafeDestination(
          selectedIntent === 'vendor' ? 'vendor' : profile.intendedRole
        );
        navigate(target, { replace: true });
      }
    }
  };

  const handleGoogleAuth = async () => {
    setLocalValidationError(null);
    setResetEmailSent(false);
    const profile = await signInWithGoogle({ intendedRole: selectedIntent });
    if (profile) {
      const target = getSafeDestination(
        selectedIntent === 'vendor' ? 'vendor' : profile.intendedRole
      );
      navigate(target, { replace: true });
    }
  };

  const handleForgotPassword = async () => {
    setLocalValidationError(null);
    setResetEmailSent(false);
    if (!email.trim()) {
      setLocalValidationError(
        'Enter your email address above first, then click "Forgot password?".'
      );
      return;
    }
    setIsSendingReset(true);
    try {
      const sent = await sendPasswordReset(email.trim());
      if (sent) {
        setResetEmailSent(true);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  const activeError = localValidationError || authError;

  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="mx-auto max-w-md rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8 shadow-xs">
        <div className="mb-6">
          <EventLinkLogo size="md" className="mb-4" />
          <h1 className="text-2xl font-bold text-[#142B4A]">
            {mode === 'register'
              ? 'Create your EventLink account'
              : 'Sign in to EventLink'}
          </h1>
          <p className="text-sm text-[#344054] mt-1.5">
            {mode === 'register'
              ? 'Sign up with your email and password or Google to plan events in Warri and Effurun or list your venue and services.'
              : 'Sign in with your email and password or Google to access your saved listings, event workspaces, enquiries, or vendor dashboard.'}
          </p>
        </div>

        {rawReturnTo && (
          <div className="mb-5 flex items-start gap-2.5 rounded-[10px] bg-[#EFF8FF] p-3.5 text-xs text-[#175CD3]">
            <CheckCircle2
              className="h-4 w-4 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              After signing in, you’ll be returned directly to your previous
              action.
            </span>
          </div>
        )}

        {resetEmailSent && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2.5 rounded-[10px] bg-[#EAF7F0] p-3.5 text-xs text-[#16794B]"
          >
            <CheckCircle2
              className="h-4 w-4 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              Password reset link sent to <strong>{email.trim()}</strong>. Check
              your inbox and spam folder.
            </span>
          </div>
        )}

        {activeError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-[10px] bg-[#FEF3F2] p-3.5 text-sm text-[#B42318]"
          >
            <AlertCircle
              className="h-4 w-4 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{activeError}</span>
          </div>
        )}

        {/* RoleSelector (Component_Specifications.md Section 4.12) */}
        <fieldset className="space-y-2.5 mb-6">
          <legend className="text-sm font-semibold text-[#172B4D]">
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
                  <Calendar
                    className="h-4 w-4 text-[#4778D8]"
                    aria-hidden="true"
                  />
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
                  <Building2
                    className="h-4 w-4 text-[#4778D8]"
                    aria-hidden="true"
                  />
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

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-display-name"
                className="block text-xs font-semibold text-[#172B4D] mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#697586]"
                  aria-hidden="true"
                />
                <TextInput
                  id="auth-display-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Eseoghene Okoro"
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-[#172B4D] mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#697586]"
                aria-hidden="true"
              />
              <TextInput
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="auth-password"
                className="block text-xs font-semibold text-[#172B4D]"
              >
                Password
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  disabled={isSendingReset || isSigningIn}
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-[#4778D8] hover:underline cursor-pointer disabled:opacity-60"
                >
                  {isSendingReset ? 'Sending reset link…' : 'Forgot password?'}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#697586]"
                aria-hidden="true"
              />
              <TextInput
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={
                  mode === 'register' ? 'new-password' : 'current-password'
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === 'register'
                    ? 'At least 6 characters'
                    : 'Enter your password'
                }
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-3 text-[#697586] hover:text-[#172B4D] cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="block text-xs font-semibold text-[#172B4D] mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#697586]"
                  aria-hidden="true"
                />
                <TextInput
                  id="auth-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSigningIn}
            className="w-full inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[10px] bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1c3a63] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {isSigningIn
              ? mode === 'register'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'register'
              ? 'Create account with Email'
              : 'Sign in with Email'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-[#D7DEE8]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wider">
            <span className="bg-white px-3 font-semibold text-[#697586]">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Sign-In / Sign-Up Button */}
        <button
          type="button"
          disabled={isSigningIn}
          onClick={handleGoogleAuth}
          className="w-full inline-flex min-h-[46px] items-center justify-center gap-2.5 rounded-[10px] border border-[#D7DEE8] bg-white px-5 py-2.5 text-sm font-semibold text-[#172B4D] hover:bg-[#F4F6F9] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
        >
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
            />
          </svg>
          <span>
            {mode === 'register'
              ? 'Sign up with Google'
              : 'Sign in with Google'}
          </span>
        </button>

        <div className="mt-6 pt-5 border-t border-[#E9EDF3] space-y-3 text-xs text-[#697586]">
          <div className="flex items-start gap-2">
            <ShieldCheck
              className="h-4 w-4 text-[#16794B] shrink-0 mt-0.5"
              aria-hidden="true"
            />
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
