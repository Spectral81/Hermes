import type { ReactNode } from 'react';

interface HCardProps {
  children: ReactNode;
  accent?: string;
  className?: string;
}

export function HCard({ children, accent, className = '' }: HCardProps) {
  return (
    <div
      className={`h-card ${className}`}
      style={accent ? { borderLeftColor: accent } : undefined}
    >
      {children}
    </div>
  );
}
