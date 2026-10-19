/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ErrorBoundary } from './components/feedback/error-boundary';
import { NotFoundPage } from './components/feedback/not-found-page';
import { AppShell } from './components/layout/app-shell';
import { AuthPage } from './components/auth/auth-page';
import { AccountProfilePage } from './components/auth/account-profile-page';
import { ProtectedRoute } from './components/auth/protected-route';
import { ComponentPreviewPage } from './components/ui/component-preview-page';
import { ToastProvider } from './components/ui/toast';
import { HomePage } from './features/discovery/home-page';
import { SearchPage } from './features/discovery/search-page';
import { ListingDetailPage } from './features/listings/listing-detail-page';
import { CustomerEnquiriesPage } from './features/enquiries/customer-enquiries-page';
import { SavedListingsPage } from './features/saved-items/saved-listings-page';
import { CompareVenuesPage } from './features/saved-items/compare-venues-page';
import { VendorWorkspacePage } from './features/vendor/vendor-workspace-page';
import { AdminModerationPage } from './features/admin/admin-moderation-page';
import { LegalAndTrustPage } from './features/legal/legal-and-trust-page';
import { SavedCompareProvider } from './features/saved-items/saved-compare-context';
import { AuthProvider } from './lib/auth/auth-context';
import { ENV } from './lib/config/env';
import {
  RouterProvider,
  useRouter,
} from './lib/router/router-context';

function AppRoutes() {
  const { pathname } = useRouter();

  const shellVariant = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/vendor')
    ? 'vendor'
    : pathname.startsWith('/account') ||
      pathname.startsWith('/enquiries') ||
      pathname.startsWith('/saved') ||
      pathname.startsWith('/compare')
    ? 'customer'
    : 'public';

  const categoryMatch = pathname.startsWith('/categories/')
    ? decodeURIComponent(pathname.replace('/categories/', '').split('/')[0] || '')
    : undefined;

  const venueSlugMatch = pathname.startsWith('/venues/')
    ? decodeURIComponent(pathname.replace('/venues/', '').split('/')[0] || '')
    : undefined;

  const vendorSlugMatch = pathname.startsWith('/vendors/')
    ? decodeURIComponent(pathname.replace('/vendors/', '').split('/')[0] || '')
    : undefined;

  return (
    <AppShell variant={shellVariant}>
      {pathname === '/' ? (
        <HomePage />
      ) : pathname === '/search' ? (
        <SearchPage />
      ) : categoryMatch ? (
        <SearchPage categorySlugFromRoute={categoryMatch} />
      ) : venueSlugMatch ? (
        <ListingDetailPage slugOrId={venueSlugMatch} routeType="venue" />
      ) : vendorSlugMatch ? (
        <ListingDetailPage
          slugOrId={vendorSlugMatch}
          routeType="service-provider"
        />
      ) : pathname === '/enquiries' ? (
        <ProtectedRoute requiredAccess="authenticated">
          <CustomerEnquiriesPage />
        </ProtectedRoute>
      ) : pathname === '/saved' ? (
        <ProtectedRoute requiredAccess="authenticated">
          <SavedListingsPage />
        </ProtectedRoute>
      ) : pathname === '/compare' ? (
        <ProtectedRoute requiredAccess="authenticated">
          <CompareVenuesPage />
        </ProtectedRoute>
      ) : pathname === '/privacy' ? (
        <LegalAndTrustPage section="privacy" />
      ) : pathname === '/terms' ? (
        <LegalAndTrustPage section="terms" />
      ) : pathname === '/support' ? (
        <LegalAndTrustPage section="support" />
      ) : pathname === '/ui-preview' && ENV.isDevelopment ? (
        <ComponentPreviewPage />
      ) : pathname === '/login' ? (
        <AuthPage mode="login" />
      ) : pathname === '/register' ? (
        <AuthPage mode="register" />
      ) : pathname === '/account' ? (
        <ProtectedRoute requiredAccess="authenticated">
          <AccountProfilePage />
        </ProtectedRoute>
      ) : pathname === '/vendor' ? (
        <ProtectedRoute requiredAccess="vendor">
          <VendorWorkspacePage />
        </ProtectedRoute>
      ) : pathname === '/admin' ? (
        <ProtectedRoute requiredAccess="admin">
          <AdminModerationPage />
        </ProtectedRoute>
      ) : (
        <NotFoundPage requestedPath={pathname} />
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider>
            <SavedCompareProvider>
              <AppRoutes />
            </SavedCompareProvider>
          </RouterProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
