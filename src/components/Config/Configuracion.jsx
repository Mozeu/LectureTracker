import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getConfig, setConfig } from '../../db/db';
import db from '../../db/db';
import { ExportImportPanel } from './ExportImportPanel';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import { useStorageQuota } from '../../hooks/useStorageQuota';
import './Configuracion.css';

/* ── AboutStat sub-component ── */
function AboutStat({ emoji, value, label }) {
  return (
    <div className="config-about-stat">
      <span className="config-about-stat-emoji" aria-hidden="true">{emoji}</span>
      <span className="config-about-stat-value">{value ?? '—'}</span>
      <span className="config-about-stat-label">{label}</span>
    </div>
  );
}

const PROGRESS_FORMATS = [
  { value: 'paginas',    label: 'Páginas',    desc: 'Seguimiento por número de página' },
  { value: 'porcentaje', label: 'Porcentaje', desc: 'Seguimiento por % completado' },
  { value: 'episodio',   label: 'Episodio',   desc: 'Para series o audiolibros por episodio' },
  { value: 'tiempo',     label: 'Tiempo',     desc: 'Horas / minutos escuchados o leídos' },
];

/**
 * Configuracion — RF29 (Module 11) + hosts ExportImportPanel (Module 10)
 *
 * Props:
 *   nombreUsuario    — current name
 *   theme            — 'light' | 'dark'
 *   onToggleTheme    — () => void
 *   onCambiarNombre  — (newName) => void
 *   onSuccess        — (msg) => void
 *   onError          — (msg) => void
 *   onResetComplete  — () => void  (called after full data reset)
 */
export function Configuracion({
  nombreUsuario,
  theme,
  onToggleTheme,
  onCambiarNombre,
  onSuccess,
  onError,
  onResetComplete,
}) {
  const [nombreInput, setNombreInput]         = useState(nombreUsuario ?? '');
  const [savingNombre, setSavingNombre]       = useState(false);
  const [nombreError,  setNombreError]        = useState('');
  const [nombreSaved,  setNombreSaved]        = useState(false);

  const [defaultFormat, setDefaultFormat]     = useState('paginas');
  const [savingFormat,  setSavingFormat]      = useState(false);

  const [confirmReset, setConfirmReset]       = useState(false);
  const [resetting,    setResetting]          = useState(false);

  const inputRef = useRef(null);

  // RNF7 — storage quota monitoring
  const quota = useStorageQuota();

  // Live DB counts for the About section
  const dbStats = useLiveQuery(async () => ({
    books:       await db.libros.count(),
    notes:       await db.notas.count(),
    tags:        await db.etiquetas.count(),
    collections: await db.colecciones.count(),
  }), []);

  // Load saved defaultProgressFormat
  useEffect(() => {
    getConfig('defaultProgressFormat', 'paginas').then(setDefaultFormat);
  }, []);

  // ── Save name — RF29 ────────────────────────────────────────────────────────
  const handleGuardarNombre = async (e) => {
    e?.preventDefault();
    const limpio = nombreInput.trim();
    if (!limpio) { setNombreError('El nombre no puede estar vacío.'); return; }
    if (limpio.length < 2) { setNombreError('Mínimo 2 caracteres.'); return; }
    if (limpio.length > 50) { setNombreError('Máximo 50 caracteres.'); return; }
    setSavingNombre(true);
    try {
      await onCambiarNombre(limpio);
      setNombreSaved(true);
      setNombreError('');
      setTimeout(() => setNombreSaved(false), 2000);
    } catch {
      setNombreError('No se pudo guardar.');
    } finally {
      setSavingNombre(false);
    }
  };

  // ── Save default progress format — RF29 ─────────────────────────────────────
  const handleFormatChange = async (value) => {
    setDefaultFormat(value);
    setSavingFormat(true);
    try {
      await setConfig('defaultProgressFormat', value);
      onSuccess?.('Formato predeterminado guardado.');
    } catch {
      onError?.('No se pudo guardar la preferencia.');
    } finally {
      setSavingFormat(false);
    }
  };

  // ── Reset all data — RF29 ───────────────────────────────────────────────────
  const handleReset = async () => {
    setResetting(true);
    try {
      const preserve = await db.configuracion
        .where('clave').anyOf(['nombreUsuario', 'tema'])
        .toArray();
      await db.transaction('rw', db.libros, db.notas, db.etiquetas, db.colecciones, db.configuracion, async () => {
        await db.libros.clear();
        await db.notas.clear();
        await db.etiquetas.clear();
        await db.colecciones.clear();
        await db.configuracion.clear();
        for (const row of preserve) await db.configuracion.put(row);
      });
      setConfirmReset(false);
      onSuccess?.('Todos los datos han sido eliminados.');
      onResetComplete?.();
    } catch {
      onError?.('No se pudo restablecer.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="config-container">
      <div className="config-header">
        <h1 className="config-title">⚙️ Ajustes</h1>
        <p className="config-subtitle">Personaliza tu experiencia de lectura.</p>
      </div>

      {/* ── Nombre de usuario — RF29 ── */}
      <section className="config-section">
        <h2 className="config-section-title">Perfil</h2>
        <form className="config-card" onSubmit={handleGuardarNombre} noValidate>
          <div className="config-field">
            <label htmlFor="config-nombre" className="form-label">
              Tu nombre
            </label>
            <div className="config-input-row">
              <input
                ref={inputRef}
                id="config-nombre"
                type="text"
                className={`form-input config-nombre-input ${nombreError ? 'form-input--error' : ''}`}
                value={nombreInput}
                onChange={(e) => { setNombreInput(e.target.value); setNombreError(''); setNombreSaved(false); }}
                maxLength={50}
                placeholder="¿Cómo te llamas?"
              />
              <button
                type="submit"
                className={`btn btn-sm config-save-btn ${nombreSaved ? 'config-save-btn--saved' : 'btn-primary'}`}
                disabled={savingNombre || nombreInput.trim() === nombreUsuario}
              >
                {savingNombre ? '…' : nombreSaved ? '✓ Guardado' : 'Guardar'}
              </button>
            </div>
            {nombreError && <p className="form-error">{nombreError}</p>}
          </div>
        </form>
      </section>

      {/* ── Tema — RF29 ── */}
      <section className="config-section">
        <h2 className="config-section-title">Apariencia</h2>
        <div className="config-card">
          <div className="config-row">
            <div className="config-row-info">
              <p className="config-row-label">Tema de la interfaz</p>
              <p className="config-row-desc">
                Actualmente: modo {theme === 'dark' ? 'oscuro 🌙' : 'claro ☀️'}
              </p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Default progress format — RF29 ── */}
      <section className="config-section">
        <h2 className="config-section-title">Preferencias de lectura</h2>
        <div className="config-card">
          <p className="config-field-label">Formato de progreso predeterminado</p>
          <p className="config-field-desc config-field-desc--mb">
            Se usará como valor inicial al añadir nuevos libros.
          </p>
          <div className="config-format-grid">
            {PROGRESS_FORMATS.map((f) => (
              <label
                key={f.value}
                className={`config-format-opt ${defaultFormat === f.value ? 'config-format-opt--active' : ''}`}
              >
                <input
                  type="radio"
                  name="defaultFormat"
                  value={f.value}
                  checked={defaultFormat === f.value}
                  onChange={() => handleFormatChange(f.value)}
                  className="visually-hidden"
                  disabled={savingFormat}
                />
                <span className="config-format-name">{f.label}</span>
                <span className="config-format-desc">{f.desc}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* ── Export / Import — RF29, RF26–RF28 ── */}
      <section className="config-section">
        <h2 className="config-section-title">Exportar e importar</h2>
        <div className="config-card">
          <ExportImportPanel onSuccess={onSuccess} onError={onError} />
        </div>
      </section>

      {/* ── Storage quota — RNF7 ── */}
      {quota.supported && (
        <section className="config-section">
          <h2 className="config-section-title">Almacenamiento local</h2>
          <div className={`config-card config-card--storage ${quota.isCritical ? 'config-card--critical' : quota.isWarning ? 'config-card--warning' : ''}`}>
            <div className="config-storage-header">
              <div className="config-storage-labels">
                <span className="config-storage-used">
                  {quota.usageLabel ?? '…'} usados
                </span>
                <span className="config-storage-total">
                  de {quota.quotaLabel ?? '…'} disponibles
                </span>
              </div>
              <span className="config-storage-pct" aria-live="polite">
                {quota.percentage != null ? `${quota.percentage}%` : '—'}
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="config-storage-bar"
              role="progressbar"
              aria-valuenow={quota.percentage ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Uso del almacenamiento local"
            >
              <div
                className="config-storage-bar-fill"
                style={{ width: `${Math.min(100, quota.percentage ?? 0)}%` }}
              />
            </div>

            {/* Warning messages — RNF7 */}
            {quota.isCritical && (
              <p className="config-storage-alert config-storage-alert--critical" role="alert">
                ⚠️ <strong>Almacenamiento casi lleno.</strong> Exporta un backup y elimina libros para liberar espacio.
              </p>
            )}
            {quota.isWarning && !quota.isCritical && (
              <p className="config-storage-alert config-storage-alert--warning" role="alert">
                ⚠️ Estás usando más del 70% del almacenamiento disponible. Considera exportar un backup.
              </p>
            )}

            <button
              className="btn btn-ghost btn-sm config-storage-refresh"
              onClick={quota.refresh}
              aria-label="Actualizar información de almacenamiento"
            >
              ↻ Actualizar
            </button>
          </div>
        </section>
      )}

      {/* ── About / stats ── */}
      <section className="config-section">
        <h2 className="config-section-title">Acerca de</h2>
        <div className="config-card config-card--about">
          <div className="config-about-header">
            <span className="config-about-icon" aria-hidden="true">📚</span>
            <div>
              <p className="config-about-name">Librería Personal</p>
              <p className="config-about-version">v1.0.0 — Módulos 1–11 completos</p>
            </div>
          </div>

          {dbStats && (
            <div className="config-about-stats">
              <AboutStat emoji="📖" value={dbStats.books}       label="Libros" />
              <AboutStat emoji="📝" value={dbStats.notes}       label="Notas" />
              <AboutStat emoji="🏷️" value={dbStats.tags}        label="Etiquetas" />
              <AboutStat emoji="📂" value={dbStats.collections} label="Colecciones" />
            </div>
          )}

          <p className="config-about-desc">
            Aplicación 100% local — sin servidores, sin cuentas, sin publicidad.
            Todo tu datos viven en IndexedDB en tu navegador.
          </p>

          <div className="config-about-links">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="config-about-link"
            >
              ↗ Ver código fuente
            </a>
          </div>
        </div>
      </section>

      {/* ── Reset — RF29 ── */}
      <section className="config-section">
        <h2 className="config-section-title config-section-title--danger">Zona de peligro</h2>
        <div className="config-card config-card--danger">
          <div className="config-row">
            <div className="config-row-info">
              <p className="config-row-label config-row-label--danger">Borrar todos los datos</p>
              <p className="config-row-desc">
                Elimina todos los libros, notas, etiquetas y colecciones. Tu nombre y tema se conservan.
              </p>
            </div>
            <button
              className="btn btn-danger"
              onClick={() => setConfirmReset(true)}
            >
              🗑 Restablecer
            </button>
          </div>
        </div>
      </section>

      {/* ── Reset confirm dialog ── */}
      {confirmReset && (
        <ConfirmDialog
          titulo="¿Borrar todos los datos?"
          mensaje="Se eliminarán todos los libros, notas, etiquetas y colecciones. Tu nombre de usuario y el tema actual se conservarán. Esta acción no se puede deshacer."
          labelOk={resetting ? 'Borrando…' : 'Sí, borrar todo'}
          onConfirm={handleReset}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}
