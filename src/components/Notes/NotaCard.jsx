import React, { useState } from 'react';
import './NotaCard.css';

/**
 * NotaCard — RF18, RF19
 * Muestra el HTML de Quill renderizado, con acciones de editar y eliminar.
 */
export function NotaCard({ nota, onEditar, onEliminar }) {
  const [confirmando, setConfirmando] = useState(false);

  const tieneUbicacion = nota.pagina || nota.fecha;

  return (
    <article className="nota-card">
      {/* ── Metadatos (página / fecha) ── */}
      {tieneUbicacion && (
        <div className="nota-card-meta">
          {nota.pagina && (
            <span className="nota-card-pagina">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              Página {nota.pagina}
            </span>
          )}
          {nota.fecha && (
            <span className="nota-card-fecha">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {formatFecha(nota.fecha)}
            </span>
          )}
        </div>
      )}

      {/* ── Contenido HTML de Quill ── */}
      <div
        className="nota-card-contenido ql-editor"
        dangerouslySetInnerHTML={{ __html: sanitizar(nota.texto) }}
        aria-label="Contenido de la nota"
      />

      {/* ── Acciones ── */}
      {confirmando ? (
        <div className="nota-card-confirm">
          <span>¿Eliminar esta nota?</span>
          <button className="btn btn-danger btn-sm" onClick={() => { setConfirmando(false); onEliminar?.(nota); }}>
            Sí, eliminar
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setConfirmando(false)}>
            Cancelar
          </button>
        </div>
      ) : (
        <div className="nota-card-actions">
          <button
            className="nota-card-btn"
            onClick={() => onEditar?.(nota)}
            aria-label="Editar nota"
            title="Editar"
          >
            ✏️ Editar
          </button>
          <button
            className="nota-card-btn nota-card-btn--danger"
            onClick={() => setConfirmando(true)}
            aria-label="Eliminar nota"
            title="Eliminar"
          >
            🗑 Eliminar
          </button>
        </div>
      )}
    </article>
  );
}

/* ── Helpers ── */

function formatFecha(iso) {
  if (!iso) return '';
  try {
    // iso puede ser 'YYYY-MM-DD' o ISO completo
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// Sanitización básica: elimina scripts inyectados en el HTML de Quill
function sanitizar(html) {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-removed=');
}
