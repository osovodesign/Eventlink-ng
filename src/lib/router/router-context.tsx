import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface RouteState {
  pathname: string;
  search: string;
  searchParams: URLSearchParams;
}

interface RouterContextValue extends RouteState {
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

/**
 * Validates internal navigation paths to prevent open redirects (TRD Section 5 & Security Section 8.4).
 */
export function sanitizeInternalPath(inputPath: string): string {
  const trimmed = inputPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/';
  }
  return trimmed;
}

function readWindowLocation(): RouteState {
  if (typeof window === 'undefined') {
    return {
      pathname: '/',
      search: '',
      searchParams: new URLSearchParams(),
    };
  }
  return {
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
    searchParams: new URLSearchParams(window.location.search || ''),
  };
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<RouteState>(readWindowLocation);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(readWindowLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const safeTarget = sanitizeInternalPath(to);
    if (options?.replace) {
      window.history.replaceState(null, '', safeTarget);
    } else {
      window.history.pushState(null, '', safeTarget);
    }
    setRoute(readWindowLocation());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <RouterContext.Provider value={{ ...route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return ctx;
}

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  replace?: boolean;
}

export function AppLink({ href, replace, onClick, children, ...rest }: LinkProps) {
  const { navigate } = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(event);
    }
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      rest.target === '_blank'
    ) {
      return;
    }
    if (href.startsWith('/') && !href.startsWith('//')) {
      event.preventDefault();
      navigate(href, { replace });
    }
  };

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
