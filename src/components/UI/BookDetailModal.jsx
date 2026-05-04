import React, { useEffect, useRef } from 'react';
import { CATEGORIAS } from '../Books/BookForm';
import { PanelNotas } from '../Notes/PanelNotas';
import './BookDetailModal.css';

/**
 * BookDetailModal — RF9 (acceso desde biblioteca)
 * Vista completa de todos los campos + acciones.
 * (RF20 completo — progreso actualizable — se implementa en Módulo 7)
 */
export function BookDetailModal({ libro, onCerrar, onEditar, onEliminar, onToggleFavorito, onCambiarCategoria }) {
  const closeRef = useRef(null);
  const portada  = libro.portadaBase64 || libro.portadaUrl || null;
  const categoria = CATEGORIAS.find((c) => c.value === libro.categoria);

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCerrar?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCerrar]);

  const progreso = calcularProgreso(libro);

  return (
    <div
      className="detail-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${libro.titulo}`}
    >
      <div className="detail-modal">
        {/* Botón cerrar */}
        <button
          ref={closeRef}
          className="detail-close"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* ── Cabecera: portada + info principal ── */}
        <div
          className="detail-header"
          style={{ '--cat-color': categoria?.color ?? 'var(--accent-primary)' }}
        >
          <div className="detail-cover-wrap">
            {portada ? (
              <img src={portada} alt={`Portada de ${libro.titulo}`} className="detail-cover-img" />
            ) : (
              <div className="detail-cover-fallback">
                <span>{libro.titulo}</span>
              </div>
            )}
          </div>

          <div className="detail-meta">
            <div className="detail-badges">
              <span
                className="badge detail-cat-badge"
                style={{ background: `color-mix(in srgb, ${categoria?.color} 15%, transparent)`, color: categoria?.color }}
              >
                {categoria?.emoji} {categoria?.label}
              </span>
              {libro.favorito && (
                <span className="badge detail-fav-badge">★ Favorito</span>
              )}
            </div>

            <h1 className="detail-titulo">{libro.titulo}</h1>

            {libro.autores && (
              <p className="detail-autores">{libro.autores}</p>
            )}

            {libro.saga && (
              <p className="detail-saga">
                📚 {libro.saga}{libro.numeroEnSaga ? ` #${libro.numeroEnSaga}` : ''}
              </p>
            )}

            {/* Progreso visual */}
            {progreso > 0 && (
              <div className="detail-progress-wrap">
                <div className="detail-progress-bar">
                  <div className="detail-progress-fill" style={{ width: `${progreso}%` }} />
                </div>
                <span className="detail-progress-label">{progreso.toFixed(0)}%</span>
              </div>
            )}

            {/* Acciones principales */}
            <div className="detail-actions">
              {/* RF12: Empezar a leer */}
              {(libro.categoria === 'leer-mas-tarde' || libro.categoria === 'lista-de-deseos') && (
                <button
                  className="btn btn-primary btn-sm detail-action-cta"
                  onClick={() => { onCambiarCategoria?.(libro, 'en-progreso'); onCerrar?.(); }}
                >
                  ▶ Empezar a leer
                </button>
              )}
              {/* RF21: Marcar terminado */}
              {libro.categoria === 'en-progreso' && (
                <button
                  className="btn btn-sm detail-action-cta detail-action-finish"
                  onClick={() => { onCambiarCategoria?.(libro, 'terminados'); onCerrar?.(); }}
                >
                  ✓ Marcar como terminado
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => onEditar?.(libro)}>
                ✏️ Editar
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onToggleFavorito?.(libro)}
              >
                {libro.favorito ? '★ Quitar favorito' : '☆ Favorito'}
              </button>
              <button
                className="btn btn-secondary btn-sm btn-danger-outline"
                onClick={() => onEliminar?.(libro)}
              >
                🗑 Eliminar
              </button>
            </div>
          </div>
        </div>

        {/* ── Cambiar categoría ── */}
        <div className="detail-section">
          <h3 className="detail-section-title">Mover a categoría</h3>
          <div className="detail-cat-pills">
            {CATEGORIAS.map((c) => (
              <button
                key={c.value}
                className={`detail-cat-pill ${libro.categoria === c.value ? 'detail-cat-pill--active' : ''}`}
                style={{ '--pill-color': c.color }}
                onClick={() => libro.categoria !== c.value && onCambiarCategoria?.(libro, c.value)}
                aria-current={libro.categoria === c.value ? 'true' : undefined}
                disabled={libro.categoria === c.value}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Información del libro ── */}
        <div className="detail-section">
          <h3 className="detail-section-title">Información</h3>
          <dl className="detail-fields">
            {libro.editorial && <DetailField label="Editorial" value={libro.editorial} />}
            {libro.fechaPublicacion && <DetailField label="Año" value={libro.fechaPublicacion} />}
            {libro.isbn && <DetailField label="ISBN" value={libro.isbn} />}
            {libro.idioma && <DetailField label="Idioma" value={IDIOMAS[libro.idioma] ?? libro.idioma} />}
            {libro.tipo && <DetailField label="Formato" value={TIPOS[libro.tipo] ?? libro.tipo} />}
            {libro.plataforma && <DetailField label="Plataforma" value={libro.plataforma} />}
            {libro.totalPaginas && <DetailField label="Páginas" value={`${libro.totalPaginas} páginas`} />}
            {libro.traductores && <DetailField label="Traducción" value={libro.traductores} />}
            {libro.ilustradores && <DetailField label="Ilustración" value={libro.ilustradores} />}
            {libro.narradores && <DetailField label="Narración" value={libro.narradores} />}
            {libro.fechaInicio && <DetailField label="Inicio" value={formatFecha(libro.fechaInicio)} />}
            {libro.fechaFin && <DetailField label="Finalizado" value={formatFecha(libro.fechaFin)} />}
          </dl>
        </div>

        {/* ── Progreso de lectura ── */}
        {(libro.progresoPaginas > 0 || libro.progresoPorc > 0 || libro.progresoEpisodio || libro.progresoTiempo) && (
          <div className="detail-section">
            <h3 className="detail-section-title">Progreso</h3>
            <dl className="detail-fields">
              {libro.formatoProgreso === 'paginas' && libro.progresoPaginas > 0 && (
                <DetailField
                  label="Página actual"
                  value={libro.totalPaginas
                    ? `${libro.progresoPaginas} / ${libro.totalPaginas}`
                    : String(libro.progresoPaginas)}
                />
              )}
              {libro.formatoProgreso === 'porcentaje' && libro.progresoPorc > 0 && (
                <DetailField label="Porcentaje" value={`${libro.progresoPorc}%`} />
              )}
              {libro.progresoEpisodio && <DetailField label="Episodio" value={libro.progresoEpisodio} />}
              {libro.progresoTiempo && <DetailField label="Tiempo" value={libro.progresoTiempo} />}
            </dl>
          </div>
        )}

        {/* ── Etiquetas ── */}
        {libro.etiquetas?.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section-title">Etiquetas</h3>
            <div className="detail-tags">
              {libro.etiquetas.map((tag) => (
                <span key={tag} className="badge detail-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Descripción ── */}
        {libro.descripcion && (
          <div className="detail-section">
            <h3 className="detail-section-title">Descripción</h3>
            <p className="detail-descripcion">{libro.descripcion}</p>
          </div>
        )}

        {/* ── Notas enriquecidas — RF17, RF18, RF19 ── */}
        <div className="detail-section">
          <PanelNotas
            libroId={libro.id}
            totalPaginas={libro.totalPaginas ?? null}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Sub-componente ── */
function DetailField({ label, value }) {
  return (
    <div className="detail-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/* ── Constantes de display ── */
const IDIOMAS = { es: 'Español', en: 'Inglés', fr: 'Francés', de: 'Alemán', it: 'Italiano', pt: 'Portugués', jp: 'Japonés', zh: 'Chino', otro: 'Otro' };
const TIPOS   = { 'tapa-blanda': 'Tapa blanda', 'tapa-dura': 'Tapa dura', electronico: 'Electrónico', bolsillo: 'Bolsillo', audiolibro: 'Audiolibro' };

function formatFecha(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function calcularProgreso(libro) {
  if (libro.categoria === 'terminados') return 100;
  if (libro.formatoProgreso === 'porcentaje' && libro.progresoPorc) return Math.min(100, Number(libro.progresoPorc));
  if (libro.formatoProgreso === 'paginas' && libro.progresoPaginas && libro.totalPaginas) {
    return Math.min(100, (libro.progresoPaginas / libro.totalPaginas) * 100);
  }
  return 0;
}
