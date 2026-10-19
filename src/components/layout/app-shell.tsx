import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { EventLinkLogo } from './eventlink-logo';
import { PageContainer } from './page-container';
import { SkipLink } from './skip-link';
import { Drawer } from '../ui/overlays';
import { AppLink, useRouter } from '../../lib/router/router-context';
import { useAuth } from '../../lib/auth/auth-context';

export type AppShellVariant = 'public' | 'customer' | 'vendor' | 'admin';

export interface SiteHeaderProps {
  variant?: AppShellVariant;
}

/**
 * SiteHeader & MobileNavigation (Component_Specifications.md Section 4.2 & Frontend Design Top Bar Contract)
 * Follows the strict 3-zone Top Bar contract:
 * Zone 1: Brand wordmark/logo
 * Zone 2: 4–5 concise single-line navigation links
 * Zone 3: 1 primary action (+ accessible mobile menu button on small viewports)
 */
export function SiteHeader({ variant = 'public' }: SiteHeaderProps) {
  const { pathname, search } = useRouter();
  const { userProfile, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile navigation drawer automatically on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, search]);

  const navLinks = [
    { href: '/', label: 'Discover', active: pathname === '/' },
    {
      href: '/search?type=venue',
      label: 'Venues',
      active: pathname === '/search' && search.includes('type=venue'),
    },
    {
      href: '/search?type=service-provider',
      label: 'Services',
      active:
        pathname === '/search' && search.includes('type=service-provider'),
    },
    ...(userProfile
      ? [
          {
            href: '/enquiries',
            label: 'Enquiries',
            active: pathname.startsWith('/enquiries'),
          },
          {
            href: '/vendor',
            label: 'Vendor Workspace',
            active: pathname.startsWith('/vendor'),
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            href: '/admin',
            label: 'Admin',
            active: pathname.startsWith('/admin'),
          },
        ]
      : []),
  ].slice(0, 5);

  return (
    <header
      data-shell-variant={variant}
      className="sticky top-0 z-30 bg-white border-b border-[#D7DEE8]"
    >
      <PageContainer className="flex items-center justify-between gap-8 h-16">
        {/* Zone 1: Brand Mark */}
        <AppLink
          href="/"
          aria-label="EventLink home"
          className="whitespace-nowrap shrink-0"
        >
          <EventLinkLogo size="md" />
        </AppLink>

        {/* Zone 2: 4–5 Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#344054]"
        >
          {navLinks.map((link) => (
            <AppLink
              key={link.href}
              href={link.href}
              className={`hover:text-[#142B4A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                link.active ? 'text-[#142B4A] font-semibold underline' : ''
              }`}
            >
              {link.label}
            </AppLink>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {userProfile ? (
            <AppLink
              href="/account"
              className="inline-flex min-h-[40px] items-center justify-center rounded-[10px] bg-[#142B4A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors whitespace-nowrap shrink-0"
            >
              {userProfile.displayName}
            </AppLink>
          ) : (
            <AppLink
              href="/login"
              className="inline-flex min-h-[40px] items-center justify-center rounded-[10px] bg-[#142B4A] px-4 py-2 text-sm font-medium text-white hover:bg-[#1c3a63] transition-colors whitespace-nowrap shrink-0"
            >
              Sign in
            </AppLink>
          )}

          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#D7DEE8] bg-white text-[#142B4A] hover:bg-[#F4F6F9] cursor-pointer"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </PageContainer>

      {/* MobileNavigation Drawer */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Navigation"
      >
        <nav aria-label="Mobile navigation" className="space-y-1.5">
          {navLinks.map((link) => (
            <AppLink
              key={link.href}
              href={link.href}
              className={`block rounded-[10px] px-3.5 py-2.5 text-base font-medium transition-colors ${
                link.active
                  ? 'bg-[#EFF8FF] text-[#142B4A]'
                  : 'text-[#172B4D] hover:bg-[#F4F6F9]'
              }`}
            >
              {link.label}
            </AppLink>
          ))}
          <div className="pt-4 mt-4 border-t border-[#E9EDF3] space-y-2">
            {userProfile ? (
              <AppLink
                href="/account"
                className="block rounded-[10px] px-3.5 py-2.5 text-base font-medium text-[#142B4A] hover:bg-[#F4F6F9]"
              >
                Account settings ({userProfile.displayName})
              </AppLink>
            ) : (
              <>
                <AppLink
                  href="/login"
                  className="block rounded-[10px] bg-[#142B4A] px-4 py-2.5 text-center text-sm font-medium text-white"
                >
                  Sign in
                </AppLink>
                <AppLink
                  href="/register"
                  className="block rounded-[10px] border border-[#D7DEE8] bg-white px-4 py-2.5 text-center text-sm font-medium text-[#142B4A]"
                >
                  Create account
                </AppLink>
              </>
            )}
          </div>
        </nav>
      </Drawer>
    </header>
  );
}

/**
 * Footer (Component_Specifications.md Section 3.1)
 */
export function Footer() {
  return (
    <footer className="bg-white border-t border-[#D7DEE8] py-8 mt-12">
      <PageContainer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-[#697586]">
        <div className="flex flex-wrap items-center gap-3">
          <EventLinkLogo size="sm" />
          <span aria-hidden="true">·</span>
          <span>Every Event. The Right People.</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#697586]">
          <AppLink href="/search" className="hover:text-[#142B4A] hover:underline">
            Explore listings
          </AppLink>
          <span aria-hidden="true">·</span>
          <AppLink
            href="/privacy"
            className="hover:text-[#142B4A] hover:underline"
          >
            Privacy
          </AppLink>
          <span aria-hidden="true">·</span>
          <AppLink
            href="/terms"
            className="hover:text-[#142B4A] hover:underline"
          >
            Terms
          </AppLink>
          <span aria-hidden="true">·</span>
          <AppLink
            href="/support"
            className="hover:text-[#142B4A] hover:underline"
          >
            Support &amp; Trust
          </AppLink>
          <span aria-hidden="true">·</span>
          <span>Warri &amp; Effurun, Delta State</span>
        </div>
      </PageContainer>
    </footer>
  );
}

export interface AppShellProps {
  variant?: AppShellVariant;
  children: React.ReactNode;
}

/**
 * AppShell (Component_Specifications.md Section 4.1)
 * Provides a consistent frame with SkipLink, SiteHeader, exactly one <main> landmark, and Footer.
 */
export function AppShell({ variant = 'public', children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-[#172B4D]">
      <SkipLink targetId="main-content" />
      <SiteHeader variant={variant} />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
    </div>
  );
}
