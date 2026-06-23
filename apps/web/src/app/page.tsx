import Link from 'next/link';
import { HermesMark } from '@/components/ui/HermesLogo';

export default function WelcomePage() {
  return (
    <main className="hermes-welcome">
      <div className="hermes-welcome-hero">
        <div className="hermes-welcome-logo">
          <HermesMark size={56} color="#fff" accent="#1D4ED8" />
        </div>
        <h1 className="hermes-welcome-brand">HERMES</h1>
        <p className="hermes-welcome-tagline">Tu comunidad segura</p>
        <span className="hermes-welcome-pill">UTEQ · QUERÉTARO</span>
      </div>

      <div className="hermes-welcome-actions">
        <Link href="/login" className="hermes-welcome-btn-primary">
          Iniciar Sesión
        </Link>
        <Link href="/register" className="hermes-welcome-btn-outline">
          Crear Cuenta
        </Link>
        <p className="hermes-welcome-footer">
          Solo para estudiantes y staff con correo @uteq.edu.mx
        </p>
      </div>
    </main>
  );
}
