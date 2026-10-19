import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Button (Design_System.md Section 8.1 & Component_Specifications.md Section 3.4)
 * Enforces minimum 44px default touch height, verb-first labels, loading progress prevention
 * of duplicate clicks, and single-line text containment.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[#142B4A] text-white hover:bg-[#1c3a63] active:bg-[#0f2138] border border-transparent',
      secondary:
        'bg-white text-[#142B4A] border border-[#D7DEE8] hover:bg-[#F4F6F9] active:bg-[#E9EDF3]',
      ghost:
        'bg-transparent text-[#172B4D] hover:bg-[#E9EDF3]/70 active:bg-[#E9EDF3] border border-transparent',
      destructive:
        'bg-[#B42318] text-white hover:bg-[#912018] active:bg-[#7a1b14] border border-transparent',
      link: 'bg-transparent text-[#4778D8] hover:underline px-0 py-0 min-h-0 border-0',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: variant === 'link' ? 'text-xs' : 'min-h-[36px] px-3.5 py-1.5 text-xs rounded-[8px]',
      md: variant === 'link' ? 'text-sm' : 'min-h-[44px] px-4 py-2.5 text-sm rounded-[10px]',
      lg: variant === 'link' ? 'text-base' : 'min-h-[48px] px-5 py-3 text-base rounded-[10px]',
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={`inline-flex items-center justify-center gap-2 font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
