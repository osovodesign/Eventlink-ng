import React from 'react';

export interface EventLinkLogoProps {
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Official EventLink Brand Mark (PRD Section 10 & Design_System.md Section 7):
 * Four kite-shaped diamonds arranged around a central gap:
 * - Top & Bottom kites in Deep Navy (#142B4A)
 * - Left & Right kites in Cobalt Blue (#4778D8)
 */
export function EventLinkLogo({
  showWordmark = true,
  size = 'md',
  className = '',
}: EventLinkLogoProps) {
  const dimensions = {
    sm: { icon: 24, text: 'text-base' },
    md: { icon: 30, text: 'text-lg' },
    lg: { icon: 38, text: 'text-2xl' },
  }[size];

  return (
    <span className={`inline-flex items-center gap-2.5 select-none whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width={dimensions.icon}
        height={dimensions.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Top Kite — Deep Navy (#142B4A) */}
        <polygon points="20,2 25.5,11 20,17 14.5,11" fill="#142B4A" />
        {/* Bottom Kite — Deep Navy (#142B4A) */}
        <polygon points="20,23 25.5,29 20,38 14.5,29" fill="#142B4A" />
        {/* Left Kite — Cobalt Blue (#4778D8) */}
        <polygon points="2,20 11,14.5 17,20 11,25.5" fill="#4778D8" />
        {/* Right Kite — Cobalt Blue (#4778D8) */}
        <polygon points="23,20 29,14.5 38,20 29,25.5" fill="#4778D8" />
      </svg>
      {showWordmark && (
        <span
          className={`font-bold tracking-tight text-[#142B4A] ${dimensions.text}`}
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          EventLink
        </span>
      )}
    </span>
  );
}
