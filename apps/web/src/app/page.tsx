import Link from 'next/link';
import { HermesMark, HermesWordmark } from '@/components/ui/HermesLogo';

const FEATURES = [
  {
    glyph: '⚠',
    color: '#EF4444',
    bg: '#FEF2F2',
    title: 'Reportes en tiempo real',
    text: 'Robos, accidentes, fallas de infraestructura y alertas SOS visibles para toda la comunidad UTEQ.',
  },
  {
    glyph: '✓',
    color: '#10B981',
    bg: '#ECFDF5',
    title: 'Confirmación comunitaria',
    text: 'Los estudiantes validan incidentes con confirmaciones para mantener la información actualizada.',
  },
  {
    glyph: '⚡',
    color: '#3B82F6',
    bg: '#EFF6FF',
    title: 'Web y móvil conectados',
    text: 'Los reportes creados desde la app o el portal web se sincronizan al instante en el mismo mapa.',
  },
];

export default function HomePage() {
  return (
    <main className="hermes-landing">
      <header className="hermes-landing-nav">
        <div className="hermes-lockup">
          <HermesMark size={32} />
          <HermesWordmark size={16} />
        </div>
        <nav className="hermes-landing-nav-links">
          <a href="#nosotros">Nosotros</a>
          <a href="#mision">Misión</a>
          <a href="#app">La app</a>
          <Link href="/login" className="hermes-landing-nav-cta">Iniciar sesión</Link>
        </nav>
      </header>

      <section className="hermes-landing-hero">
        <div className="hermes-landing-hero-inner">
          <div className="hermes-welcome-logo">
            <HermesMark size={56} color="#fff" accent="#1D4ED8" />
          </div>
          <h1>HERMES</h1>
          <p className="hermes-landing-tagline">Tu comunidad segura en el campus UTEQ</p>
          <span className="hermes-welcome-pill">UTEQ · QUERÉTARO</span>
          <div className="hermes-landing-hero-actions">
            <Link href="/login" className="hermes-welcome-btn-primary">Iniciar sesión</Link>
            <Link href="/register" className="hermes-welcome-btn-outline">Crear cuenta</Link>
          </div>
          <p className="hermes-landing-note">Solo para estudiantes y staff con correo @uteq.edu.mx</p>
        </div>
      </section>

      <section id="nosotros" className="hermes-landing-section">
        <div className="hermes-landing-container">
          <p className="hermes-landing-eyebrow">QUIÉNES SOMOS</p>
          <h2>Una red de seguridad hecha por y para la comunidad UTEQ</h2>
          <p className="hermes-landing-lead">
            HERMES es la plataforma de seguridad comunitaria de la Universidad Tecnológica de Querétaro.
            Conectamos a estudiantes, docentes y personal para compartir alertas, reportar incidentes
            y mantener un entorno más seguro dentro y alrededor del campus.
          </p>
        </div>
      </section>

      <section id="mision" className="hermes-landing-section hermes-landing-section-alt">
        <div className="hermes-landing-container hermes-landing-grid-2">
          <article className="hermes-landing-card">
            <p className="hermes-landing-eyebrow">MISIÓN</p>
            <h3>Proteger a nuestra comunidad con información oportuna</h3>
            <p>
              Facilitar la comunicación inmediata de incidentes y riesgos en el campus UTEQ,
              empoderando a cada miembro de la comunidad para reportar, confirmar y actuar
              con base en datos confiables y en tiempo real.
            </p>
          </article>
          <article className="hermes-landing-card">
            <p className="hermes-landing-eyebrow">VISIÓN</p>
            <h3>El campus más seguro e informado de la región</h3>
            <p>
              Ser la referencia en seguridad universitaria colaborativa, donde la tecnología
              y la participación ciudadana del alumnado generen un ecosistema de confianza,
              prevención y respuesta rápida ante cualquier emergencia.
            </p>
          </article>
        </div>
      </section>

      <section className="hermes-landing-section">
        <div className="hermes-landing-container">
          <p className="hermes-landing-eyebrow">NUESTROS VALORES</p>
          <div className="hermes-landing-values">
            {['Transparencia', 'Comunidad', 'Rapidez', 'Responsabilidad'].map((v) => (
              <span key={v} className="hermes-landing-value-pill">{v}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="app" className="hermes-landing-section hermes-landing-section-alt">
        <div className="hermes-landing-container">
          <p className="hermes-landing-eyebrow">LA APLICACIÓN</p>
          <h2>Todo lo que necesitas para estar informado</h2>
          <div className="hermes-landing-features">
            {FEATURES.map((f) => (
              <article key={f.title} className="hermes-landing-feature">
                <span className="hermes-landing-feature-icon" style={{ backgroundColor: f.bg, color: f.color }}>
                  {f.glyph}
                </span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="hermes-landing-footer">
        <div className="hermes-landing-container hermes-landing-footer-inner">
          <div className="hermes-lockup">
            <HermesMark size={28} color="#fff" accent="#1D4ED8" />
            <HermesWordmark size={14} color="#fff" />
          </div>
          <p>Universidad Tecnológica de Querétaro · HERMES UTEQ</p>
          <div className="hermes-landing-footer-links">
            <Link href="/login">Iniciar sesión</Link>
            <Link href="/register">Registrarse</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
