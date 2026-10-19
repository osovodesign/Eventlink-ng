import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

/**
 * PageContainer (Design_System.md Section 5 & Component_Specifications.md Section 3.1)
 * Centered content container with max-width 1280px, 16px mobile padding, 20-24px wider screen padding.
 */
export function PageContainer({
  children,
  className = '',
  as: Component = 'div',
}: PageContainerProps) {
  return (
    <Component
      className={`mx-auto w-full max-w-[1280px] px-4 sm:px-5 lg:px-6 ${className}`}
    >
      {children}
    </Component>
  );
}
