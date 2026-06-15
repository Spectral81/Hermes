import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UTEQ Seguridad',
  description: 'Gestión de incidentes — Universidad Tecnológica de Querétaro',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
