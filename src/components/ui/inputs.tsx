import React from 'react';

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ hasError = false, className = '', ...rest }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={hasError || undefined}
        className={`w-full min-h-[44px] rounded-[10px] border bg-white px-3.5 py-2 text-base text-[#172B4D] placeholder:text-[#697586] transition-colors outline-none disabled:bg-[#F4F6F9] disabled:text-[#697586] disabled:cursor-not-allowed ${
          hasError
            ? 'border-[#B42318] focus:border-[#B42318]'
            : 'border-[#D7DEE8] focus:border-[#4778D8]'
        } ${className}`}
        {...rest}
      />
    );
  }
);
TextInput.displayName = 'TextInput';

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ hasError = false, rows = 4, className = '', ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={hasError || undefined}
        className={`w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-base text-[#172B4D] placeholder:text-[#697586] transition-colors outline-none disabled:bg-[#F4F6F9] disabled:text-[#697586] disabled:cursor-not-allowed ${
          hasError
            ? 'border-[#B42318] focus:border-[#B42318]'
            : 'border-[#D7DEE8] focus:border-[#4778D8]'
        } ${className}`}
        {...rest}
      />
    );
  }
);
TextArea.displayName = 'TextArea';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: ReadonlyArray<SelectOption>;
  placeholderOption?: string;
  hasError?: boolean;
}

export const SelectField = React.forwardRef<
  HTMLSelectElement,
  SelectFieldProps
>(
  (
    {
      options,
      placeholderOption,
      hasError = false,
      className = '',
      ...rest
    },
    ref
  ) => {
    return (
      <select
        ref={ref}
        aria-invalid={hasError || undefined}
        className={`w-full min-h-[44px] rounded-[10px] border bg-white px-3.5 py-2 text-base text-[#172B4D] transition-colors outline-none disabled:bg-[#F4F6F9] disabled:text-[#697586] disabled:cursor-not-allowed ${
          hasError
            ? 'border-[#B42318] focus:border-[#B42318]'
            : 'border-[#D7DEE8] focus:border-[#4778D8]'
        } ${className}`}
        {...rest}
      >
        {placeholderOption && <option value="">{placeholderOption}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);
SelectField.displayName = 'SelectField';

export interface CheckboxFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export function CheckboxField({
  id,
  label,
  description,
  className = '',
  ...rest
}: CheckboxFieldProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-[10px] border border-[#D7DEE8] bg-white p-3.5 cursor-pointer hover:bg-[#F4F6F9] transition-colors ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded accent-[#142B4A] shrink-0"
        {...rest}
      />
      <span className="text-sm">
        <span className="block font-medium text-[#172B4D]">{label}</span>
        {description && (
          <span className="block text-xs text-[#697586] mt-0.5">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface RadioGroupFieldProps {
  name: string;
  legend: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<RadioOption>;
  hint?: string;
}

export function RadioGroupField({
  name,
  legend,
  value,
  onChange,
  options,
  hint,
}: RadioGroupFieldProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-[#172B4D]">{legend}</legend>
      {hint && <p className="text-xs text-[#697586]">{hint}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-[10px] border p-3.5 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-[#4778D8] bg-[#EFF8FF]/60'
                  : 'border-[#D7DEE8] bg-white hover:bg-[#F4F6F9]'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                className="mt-0.5 h-4 w-4 accent-[#142B4A] shrink-0"
              />
              <span className="text-sm">
                <span className="block font-medium text-[#142B4A]">
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="block text-xs text-[#344054] mt-0.5">
                    {opt.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
