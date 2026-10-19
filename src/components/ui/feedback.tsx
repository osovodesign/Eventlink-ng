import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Loader2,
  Inbox,
  RotateCcw,
} from 'lucide-react';
import { Button } from './button';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface InlineAlertProps {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/**
 * InlineAlert (Component_Specifications.md Section 4.18)
 * Persistent contextual feedback with non-color icon cues.
 */
export function InlineAlert({
  tone = 'info',
  title,
  children,
  action,
  className = '',
}: InlineAlertProps) {
  const config: Record<
    AlertTone,
    { bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    info: {
      bg: 'bg-[#EFF8FF]',
      text: 'text-[#175CD3]',
      border: 'border-[#4778D8]/30',
      icon: <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />,
    },
    success: {
      bg: 'bg-[#EAF7F0]',
      text: 'text-[#16794B]',
      border: 'border-[#16794B]/30',
      icon: (
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      ),
    },
    warning: {
      bg: 'bg-[#FFF5D6]',
      text: 'text-[#8A5A00]',
      border: 'border-[#8A5A00]/30',
      icon: (
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
      ),
    },
    danger: {
      bg: 'bg-[#FEF3F2]',
      text: 'text-[#B42318]',
      border: 'border-[#B42318]/30',
      icon: <XCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />,
    },
  };

  const style = config[tone];

  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={`flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-[10px] border p-4 ${style.bg} ${style.border} ${className}`}
    >
      <div className={`flex items-start gap-2.5 text-sm ${style.text}`}>
        {style.icon}
        <div className="space-y-1">
          {title && <p className="font-semibold">{title}</p>}
          <div className="text-[#172B4D]">{children}</div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Skeleton (Component_Specifications.md Section 4.19)
 * Matches geometry of final content and is hidden from assistive technology.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[10px] bg-[#E9EDF3] ${className}`}
    />
  );
}

/**
 * Spinner (Component_Specifications.md Section 4.19)
 */
export function Spinner({
  label = 'Loading…',
  size = 'md',
}: {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  }[size];

  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 text-sm text-[#344054]"
    >
      <Loader2
        className={`${sizeClass} animate-spin text-[#4778D8] shrink-0`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionSlot?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * EmptyState (Component_Specifications.md Section 4.19)
 * Explains what is empty and offers the next useful action without looking like an error.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  actionSlot,
  icon,
}: EmptyStateProps) {
  return (
    <div className="rounded-[14px] border border-[#D7DEE8] bg-white p-8 sm:p-10 text-center max-w-xl mx-auto">
      <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#F4F6F9] text-[#4778D8] mb-3.5">
        {icon || <Inbox className="h-5 w-5" aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-semibold text-[#142B4A] mb-1.5">{title}</h3>
      <p className="text-sm text-[#344054] mb-5 leading-relaxed">
        {description}
      </p>
      {actionSlot ? (
        <div className="flex justify-center">{actionSlot}</div>
      ) : (
        actionLabel &&
        onAction && (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * ErrorState (Component_Specifications.md Section 4.19)
 * Plain-language failure state with safe retry action.
 */
export function ErrorState({
  title = 'Unable to load content',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-[14px] border border-[#D7DEE8] bg-white p-6 sm:p-8 text-center max-w-xl mx-auto"
    >
      <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#FEF3F2] text-[#B42318] mb-3.5">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[#142B4A] mb-1.5">{title}</h3>
      <p className="text-sm text-[#344054] mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
