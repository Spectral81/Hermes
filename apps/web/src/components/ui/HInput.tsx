import type { InputHTMLAttributes, ReactNode } from 'react';

interface HInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  valid?: boolean;
  error?: string | null;
  helper?: string;
  icon?: ReactNode;
  rightSlot?: ReactNode;
}

export function HInput({
  label,
  valid,
  error,
  helper,
  icon,
  rightSlot,
  className = '',
  ...rest
}: HInputProps) {
  const borderClass = error ? 'hermes-input-invalid' : valid ? 'hermes-input-valid' : '';

  return (
    <label className="hermes-field">
      {label && <span className="hermes-field-label">{label}</span>}
      <div className={`hermes-input-box ${borderClass} ${className}`}>
        {icon && <span className="hermes-input-icon">{icon}</span>}
        <input className="hermes-input" {...rest} />
        {valid && !rightSlot && (
          <span className="hermes-input-check" aria-hidden>✓</span>
        )}
        {rightSlot}
      </div>
      {error && <span className="hermes-field-error">{error}</span>}
      {helper && !error && <span className="hermes-field-helper">{helper}</span>}
    </label>
  );
}
