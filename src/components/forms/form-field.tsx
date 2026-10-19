import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormField (Component_Specifications.md Section 4.11)
 * Associates persistent visible labels, hint text, and error messages with form controls.
 * Shows required indicators in text ("Required"), never color alone.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  required = false,
  children,
  className = '',
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[#172B4D]"
        >
          {label}
        </label>
        <span className="text-xs text-[#697586] shrink-0">
          {required ? 'Required' : 'Optional'}
        </span>
      </div>

      {hint && (
        <p id={hintId} className="text-xs text-[#697586] leading-relaxed">
          {hint}
        </p>
      )}

      <div>{children}</div>

      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs font-medium text-[#B42318] pt-0.5"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
