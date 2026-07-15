'use client';

import { useEffect, useState } from 'react';
import {
  INCIDENT_LABELS,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  type CreateIncidentInput,
  type Incident,
  type IncidentType,
  type InfraCategory,
  type Severity,
} from '@uteq/shared';
import { IncidentTypeGlyph } from '@/components/IncidentTypeGlyph';
import { HButton } from '@/components/ui/HButton';
import { CloseIcon, MapPinIcon } from '@/components/ui/icons';
import { createIncident } from '@/lib/incidents';
import { CATEGORY } from '@/lib/theme';

interface Props {
  open: boolean;
  coords: { lat: number; lng: number } | null;
  initialType?: IncidentType | null;
  onClose: () => void;
  onCreated: (incident: Incident) => void;
}

const TYPE_OPTIONS: IncidentType[] = ['robo', 'accidente', 'infraestructura', 'panico'];
const INFRA_OPTIONS = Object.keys(INFRA_CATEGORY_LABELS) as InfraCategory[];
const SEVERITY_OPTIONS = Object.keys(SEVERITY_LABELS) as Severity[];
const MAX_DESC = 500;

export function ReportSheet({ open, coords, initialType, onClose, onCreated }: Props) {
  const [type, setType] = useState<IncidentType | null>(null);
  const [category, setCategory] = useState<InfraCategory | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType(initialType ?? null);
      setCategory(null);
      setSeverity(null);
      setDescription('');
      setError(null);
      setLoading(false);
    }
  }, [open, initialType]);

  if (!open) return null;

  const isSos = type === 'panico';

  function handleClose() {
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) {
      setError('Selecciona una categoría.');
      return;
    }
    if (!coords) {
      setError('No se pudo obtener tu ubicación. Activa el GPS del navegador.');
      return;
    }
    if (type === 'infraestructura' && !category) {
      setError('Selecciona una categoría de falla.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: CreateIncidentInput = {
      type,
      description: description.trim(),
      lat: coords.lat,
      lng: coords.lng,
      category: type === 'infraestructura' ? category : null,
      severity: type === 'accidente' ? severity : null,
    };

    try {
      const created = await createIncident(payload);
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el reporte.');
      setLoading(false);
    }
  }

  return (
    <div className="report-backdrop" onClick={handleClose} role="presentation">
      <div className="report-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="report-handle" />
        <div className="report-title-row">
          <h2>{isSos ? 'Emergencia SOS' : 'Nuevo reporte'}</h2>
          <button type="button" className="report-close" onClick={handleClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error ? <p className="report-error">{error}</p> : null}

          <p className="report-section-label">CATEGORÍA</p>
          <div className="report-type-grid">
            {TYPE_OPTIONS.map((opt) => {
              const meta = CATEGORY[opt];
              const active = type === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`report-type-card${active ? ' active' : ''}`}
                  style={{
                    borderColor: active ? meta.color : undefined,
                    backgroundColor: active ? meta.bg : undefined,
                  }}
                  onClick={() => {
                    setType(opt);
                    setCategory(null);
                    setSeverity(null);
                  }}
                >
                  <span
                    className="report-type-glyph"
                    style={{
                      backgroundColor: opt === 'robo' ? '#fff' : meta.color,
                      border: opt === 'robo' ? `1.5px solid ${meta.color}` : undefined,
                    }}
                  >
                    <IncidentTypeGlyph type={opt} size={26} />
                  </span>
                  <span style={{ color: active ? meta.color : undefined }}>
                    {opt === 'panico' ? 'SOS' : INCIDENT_LABELS[opt]}
                  </span>
                </button>
              );
            })}
          </div>

          {type === 'infraestructura' && (
            <>
              <p className="report-section-label">TIPO DE FALLA</p>
              <div className="report-chips">
                {INFRA_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`report-chip${category === cat ? ' active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {INFRA_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </>
          )}

          {type === 'accidente' && (
            <>
              <p className="report-section-label">GRAVEDAD</p>
              <div className="report-chips">
                {SEVERITY_OPTIONS.map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    className={`report-chip${severity === sev ? ' active' : ''}`}
                    onClick={() => setSeverity(sev)}
                  >
                    {SEVERITY_LABELS[sev]}
                  </button>
                ))}
              </div>
            </>
          )}

          <p className="report-section-label">DESCRIPCIÓN</p>
          <div className="report-desc-box">
            <textarea
              className="report-textarea"
              value={description}
              onChange={(e) => e.target.value.length <= MAX_DESC && setDescription(e.target.value)}
              placeholder={isSos ? '¿Qué está pasando? (opcional)' : 'Describe brevemente lo que pasó'}
              rows={3}
            />
            <span className="report-counter">{description.length} / {MAX_DESC}</span>
          </div>

          <div className="report-location-pill">
            <MapPinIcon />
            <div>
              <p className="report-location-title">
                {coords ? 'Tu ubicación actual' : 'Obteniendo ubicación…'}
              </p>
              <p className="report-location-sub">
                {coords ? `GPS · ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Activa el GPS'}
              </p>
            </div>
          </div>

          <div className="report-actions">
            <HButton variant="ghost" full onClick={handleClose}>
              Cancelar
            </HButton>
            <HButton type="submit" variant={isSos ? 'danger' : 'primary'} full loading={loading}>
              {isSos ? 'Enviar SOS' : 'Enviar reporte'}
            </HButton>
          </div>
        </form>
      </div>
    </div>
  );
}
