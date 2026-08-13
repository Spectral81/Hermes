'use client';

import Link from 'next/link';
import { HermesLogoLockup } from '@/components/ui/HermesLogo';
import {
  PRIVACY_POLICY_FOOTER,
  PRIVACY_POLICY_INTRO,
  PRIVACY_POLICY_META,
  PRIVACY_POLICY_SECTIONS,
} from '@/lib/legal/privacy-policy';

export function PrivacyPolicyContent() {
  return (
    <div className="web-app my-reports-app">
      <header className="web-app-header">
        <HermesLogoLockup size={28} />
        <div className="web-app-header-actions">
          <Link className="web-header-link" href="/mapa">
            Mapa
          </Link>
          <Link className="web-header-link" href="/login">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="privacy-page">
        <header className="privacy-hero">
          <p className="privacy-kicker">HERMES · UTEQ</p>
          <h1>{PRIVACY_POLICY_META.title}</h1>
          <p className="privacy-sub">{PRIVACY_POLICY_META.subtitle}</p>
          <p className="privacy-meta">
            Versión {PRIVACY_POLICY_META.version} · Actualizada el {PRIVACY_POLICY_META.updatedAt}
          </p>
        </header>

        <div className="privacy-body">
          {PRIVACY_POLICY_INTRO.map((p) => (
            <p key={p}>{p}</p>
          ))}

          {PRIVACY_POLICY_SECTIONS.map((section) => (
            <section key={section.title} className="privacy-section">
              <h2>{section.title}</h2>
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul>
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <footer className="privacy-footer">
            {PRIVACY_POLICY_FOOTER.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              Contacto privacidad:{' '}
              <a href={`mailto:${PRIVACY_POLICY_META.contactEmail}`}>
                {PRIVACY_POLICY_META.contactEmail}
              </a>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
