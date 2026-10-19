/**
 * EventLink Environment & Platform Configuration
 * Validates environment modes and defines canonical launch market constants.
 * Never store secrets or privileged credentials in client-accessible modules.
 */

export type AppEnvironment = 'development' | 'staging' | 'production';

function resolveAppEnvironment(): AppEnvironment {
  const rawEnv = import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development';
  if (rawEnv === 'production') return 'production';
  if (rawEnv === 'staging') return 'staging';
  return 'development';
}

export const ENV = {
  appEnv: resolveAppEnvironment(),
  isDevelopment: resolveAppEnvironment() === 'development',
  isStaging: resolveAppEnvironment() === 'staging',
  isProduction: resolveAppEnvironment() === 'production',
  defaultCurrency: (import.meta.env.VITE_DEFAULT_CURRENCY as 'NGN') || 'NGN',
  defaultTimezone: (import.meta.env.VITE_DEFAULT_TIMEZONE as string) || 'Africa/Lagos',
  defaultLocale: 'en-NG',
} as const;

export const LAUNCH_LOCATIONS = [
  {
    id: 'warri',
    city: 'Warri',
    state: 'Delta',
    countryCode: 'NG',
    label: 'Warri, Delta State',
  },
  {
    id: 'effurun',
    city: 'Effurun',
    state: 'Delta',
    countryCode: 'NG',
    label: 'Effurun, Delta State',
  },
] as const;

export const LAUNCH_CATEGORIES = [
  { id: 'venue', slug: 'venue', label: 'Venues & Event Halls', listingType: 'venue' as const },
  { id: 'photographer', slug: 'photographer', label: 'Photographers', listingType: 'service-provider' as const },
  { id: 'videographer', slug: 'videographer', label: 'Videographers', listingType: 'service-provider' as const },
  { id: 'caterer', slug: 'caterer', label: 'Caterers', listingType: 'service-provider' as const },
  { id: 'decorator', slug: 'decorator', label: 'Decorators', listingType: 'service-provider' as const },
  { id: 'event-planner', slug: 'event-planner', label: 'Event Planners', listingType: 'service-provider' as const },
  { id: 'dj', slug: 'dj', label: 'DJs & Sound', listingType: 'service-provider' as const },
  { id: 'mc', slug: 'mc', label: 'MCs & Hosts', listingType: 'service-provider' as const },
  { id: 'makeup-artist', slug: 'makeup-artist', label: 'Makeup Artists', listingType: 'service-provider' as const },
  { id: 'cake-vendor', slug: 'cake-vendor', label: 'Cake Vendors', listingType: 'service-provider' as const },
  { id: 'rentals', slug: 'rentals', label: 'Event Rentals', listingType: 'service-provider' as const },
] as const;

export const EVENT_TYPES = [
  { slug: 'wedding', label: 'Wedding & Traditional Marriage' },
  { slug: 'birthday', label: 'Birthday & Milestone Celebration' },
  { slug: 'corporate', label: 'Corporate Event & Seminar' },
  { slug: 'burial', label: 'Funeral & Reception' },
  { slug: 'anniversary', label: 'Anniversary' },
  { slug: 'religious', label: 'Religious Gathering' },
  { slug: 'conference', label: 'Conference & AGM' },
  { slug: 'other', label: 'Other Event' },
] as const;

/**
 * Formats integer minor units (e.g. kobo) into human-readable currency string.
 * Returns "Not provided" when amountMinor is null/undefined to prevent ₦0 fabrication.
 */
export function formatMinorCurrency(
  amountMinor: number | null | undefined,
  currency: string = ENV.defaultCurrency
): string {
  if (amountMinor === null || amountMinor === undefined || Number.isNaN(amountMinor)) {
    return 'Not provided';
  }
  const majorAmount = amountMinor / 100;
  try {
    return new Intl.NumberFormat(ENV.defaultLocale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(majorAmount);
  } catch {
    return `₦${majorAmount.toLocaleString()}`;
  }
}
