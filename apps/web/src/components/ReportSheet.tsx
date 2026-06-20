'use client';

import { useState } from 'react';
import {
  INCIDENT_COLORS,
  INCIDENT_EMOJI,
  INCIDENT_LABELS,
  INFRA_CATEGORY_LABELS,
  SEVERITY_LABELS,
  type CreateIncidentInput,
  type Incident,
  type IncidentType,
  type InfraCategory,
  type Severity,
} from '@uteq/shared';
import { createIncident } from '@/lib/incidents';

interface Props {
  open: boolean;
  coords: { lat: number; lng: number } | null;
  onClose: () => void;
  onCreated: (incident: Incident) => void;
}

type ReportType = Exclude<IncidentType, 'panico'>;

const TYPE_OPTIONS: ReportType[] = ['robo', 'accidente', 'infraestructura'];
const INFRA_OPTIONS = Object.keys(INFRA_CATEGORY_LABELS) as InfraCategory[];
const SEVERITY_OPTIONS = Object.keys(SEVERITY_LABELS) as Severity[];

export function ReportSheet({ open, coords, onClose, onCreated }: Props) {
  const [type, setType] = useState<ReportType | null>(null);
  const [category, setCategory] = useState<InfraCategory | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setType(null);
    setCategory(null);
    setSeverity(null);
    setDescription('');
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type) return;
    if (!coords) {
      setError('No se pudo obtener tu ubicación. Activa el GPS del navegador.');
      return;
    }
    if (type === 'infraestructura' && !category) {
      setError('Selecciona una categoría.');
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
      reset();
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
          <h2>Reportar incidente</h2>
          <button type="button" className="report-close" onClick={handleClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error ? <p className="alert alert-error">{error}</p> : null}

          <p className="report-label">Tipo</p>
          <div className="report-type-row">
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`report-type-card${active ? ' active' : ''}`}
                  style={active ? { borderColor: INCIDENT_COLORS[opt] } : undefined}
                  onClick={() => {
                    setType(opt);
                    setCategory(null);
                    setSeverity(null);
                  }}
                >
                  <span
                    className="report-type-icon"
                    style={{ backgroundColor: INCIDENT_COLORS[opt] }}
                  >
                    {INCIDENT_EMOJI[opt]}
                  </span>
                  <span>{INCIDENT_LABELS[opt]}</span>
                </button>
              );
            })}
          </div>

          {type === 'infraestructura' && (
            <>
              <p className="report-label">Categoría</p>
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
              <p className="report-label">Gravedad</p>
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

          <label className="report-label" htmlFor="report-desc">Descripción</label>
          <textarea
            id="report-desc"
            className="report-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe brevemente lo que pasó"
            rows={3}
          />

          <p className="report-location">
            📍{' '}
            {coords
              ? `Ubicación: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
              : 'Obteniendo ubicación…'}
          </p>

          <button type="submit" className="btn-primary report-submit" disabled={!type || loading}>
            {loading ? 'Enviando…' : 'Enviar reporte'}
          </button>
        </form>
      </div>
    </div>
  );
}
