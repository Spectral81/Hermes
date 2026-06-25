import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'white' | 'danger' | 'success';

interface HButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function HButton({
  variant = 'primary',
  full,
  loading,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: HButtonProps) {
  return (
    <button
      type={type}
      className={`hermes-btn hermes-btn-${variant} ${full ? 'hermes-btn-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? 'Cargando…' : children}
    </button>
  );
}
