import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HERMES UTEQ',
  description: 'Tu comunidad segura — Universidad Tecnológica de Querétaro',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
