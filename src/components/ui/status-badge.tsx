import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
} from 'lucide-react';
import {
  ModerationStatus,
  PublicationStatus,
} from '../../types/marketplace';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StatusBadgeProps {
  status: string;
  label: string;
  tone?: StatusTone;
  className?: string;
}

/**
 * StatusBadge (Design_System.md Section 8.9 & Component_Specifications.md Section 4.16)
 * Pairs semantic color with an icon and readable text so state is never communicated by color alone.
 */
export function StatusBadge({
  status,
  label,
  tone = 'neutral',
  className = '',
}: StatusBadgeProps) {
  const toneStyles: Record<
    StatusTone,
    { classes: string; icon: React.ReactNode }
  > = {
    neutral: {
      classes: 'bg-[#F4F6F9] text-[#344054] border-[#D7DEE8]',
      icon: <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    info: {
      classes: 'bg-[#EFF8FF] text-[#175CD3] border-[#4778D8]/30',
      icon: <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    success: {
      classes: 'bg-[#EAF7F0] text-[#16794B] border-[#16794B]/30',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    warning: {
      classes: 'bg-[#FFF5D6] text-[#8A5A00] border-[#8A5A00]/30',
      icon: (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ),
    },
    danger: {
      classes: 'bg-[#FEF3F2] text-[#B42318] border-[#B42318]/30',
      icon: <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
  };

  const resolved = toneStyles[tone] || toneStyles.neutral;

  return (
    <span
      data-status={status}
      className={`inline-flex items-center gap-1.5 rounded-[999px] border px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 ${resolved.classes} ${className}`}
    >
      {resolved.icon}
      <span>{label}</span>
    </span>
  );
}

/**
 * ListingStatusBadge (Component_Specifications.md Section 3.5 & 4.13)
 * Maps canonical publicationStatus + moderationStatus to human-readable status and helper copy.
 */
export function ListingStatusBadge({
  publicationStatus,
  moderationStatus,
}: {
  publicationStatus: PublicationStatus;
  moderationStatus: ModerationStatus;
}) {
  if (publicationStatus === 'published' && moderationStatus === 'approved') {
    return (
      <StatusBadge
        status="published"
        label="Published"
        tone="success"
      />
    );
  }
  if (moderationStatus === 'changes_requested') {
    return (
      <StatusBadge
        status="changes_requested"
        label="Changes requested"
        tone="warning"
      />
    );
  }
  if (publicationStatus === 'rejected' || moderationStatus === 'rejected') {
    return (
      <StatusBadge
        status="rejected"
        label="Rejected"
        tone="danger"
      />
    );
  }
  if (publicationStatus === 'pending_review' || moderationStatus === 'pending') {
    return (
      <StatusBadge
        status="pending_review"
        label="In review"
        tone="info"
      />
    );
  }
  if (publicationStatus === 'archived') {
    return (
      <StatusBadge
        status="archived"
        label="Archived"
        tone="neutral"
      />
    );
  }
  return <StatusBadge status="draft" label="Draft" tone="neutral" />;
}
