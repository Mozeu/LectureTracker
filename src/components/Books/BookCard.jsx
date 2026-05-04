import React, { useState, useRef, useEffect } from 'react';
import { CATEGORIAS } from './BookForm';
import './BookCard.css';

/**
 * BookCard — RF7, RF9
 * Muestra portada (o título como fallback).
 * Hover: acciones rápidas (detalle, editar, cambiar categoría, eliminar, favorito).
 */
export function BookCard({ libro, onVerDetalle, onEditar, onEliminar, onToggleFavorito, onCambiarCategoria }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);

  const portada = libro.portadaBase64 || libro.portadaUrl || null;
  const categoria = CATEGORIAS.find((c) => c.value === libro.categoria);

  // Cerrar menú al clicar fuera
  useEffect(() => {
    if (!menuAbierto) return;
    const handler = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuAbierto]);

  // Porcentaje de progreso calculado
  const progreso = calcularProgreso(libro);

  return (
    <div
      className="book-card"
      style={{ '--cat-color': categoria?.color ?? 'var(--accent-primary)' }}
      role="article"
      aria-label={`${libro.titulo}${libro.autores ? ` de ${libro.autores}` : ''}`}
    >
      {/* ── Portada o fallback ── */}
      <div
        className="book-card-cover"
        onClick={() => onVerDetalle?.(libro)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onVerDetalle?.(libro)}
        aria-label={`Ver detalles de ${libro.titulo}`}
      >
        {portada ? (
          <img
            src={portada}
            alt={`Portada de ${libro.titulo}`}
            className="book-card-cover-img"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}

        {/* Fallback siempre presente, oculto si hay imagen */}
        <div
          className="book-card-cover-fallback"
          style={{ display: portada ? 'none' : 'flex' }}
          aria-hidden={!!portada}
        >
          <div className="book-card-spine" />
          <span className="book-card-fallback-title">{libro.titulo}</span>
          {libro.autores && (
            <span className="book-card-fallback-author">{primerAutor(libro.autores)}</span>
          )}
        </div>

        {/* Barra de progreso superpuesta si está en progreso */}
        {progreso > 0 && progreso < 100 && (
          <div className="book-card-progress">
            <div className="book-card-progress-fill" style={{ width: `${progreso}%` }} />
          </div>
        )}

        {/* Badge categoría */}
        <div className="book-card-cat-dot" title={categoria?.label} aria-label={`Categoría: ${categoria?.label}`} />
      </div>

      {/* ── Acciones overlay (hover) ── */}
      <div className="book-card-actions" role="toolbar" aria-label="Acciones del libro">
        {/* Favorito */}
        <button
          className={`book-card-action-btn book-card-fav ${libro.favorito ? 'book-card-fav--active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFavorito?.(libro); }}
          aria-label={libro.favorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          aria-pressed={libro.favorito}
        >
          {libro.favorito ? '★' : '☆'}
        </button>

        {/* Menú ⋯ */}
        <div className="book-card-menu-wrapper" ref={menuRef}>
          <button
            className="book-card-action-btn"
            onClick={(e) => { e.stopPropagation(); setMenuAbierto((v) => !v); }}
            aria-label="Más opciones"
            aria-expanded={menuAbierto}
            aria-haspopup="menu"
          >
            ⋯
          </button>

          {menuAbierto && (
            <ul className="book-card-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              <li role="menuitem">
                <button onClick={() => { setMenuAbierto(false); onVerDetalle?.(libro); }}>
                  <span>👁</span> Ver detalle
                </button>
              </li>
              <li role="menuitem">
                <button onClick={() => { setMenuAbierto(false); onEditar?.(libro); }}>
                  <span>✏️</span> Editar
                </button>
              </li>

              {/* Cambiar categoría — RF9, RF12 */}
              <li role="separator" aria-hidden="true" className="book-card-menu-divider" />
              <li className="book-card-menu-section-label" aria-hidden="true">Mover a…</li>
              {CATEGORIAS.filter((c) => c.value !== libro.categoria).map((c) => (
                <li key={c.value} role="menuitem">
                  <button onClick={() => { setMenuAbierto(false); onCambiarCategoria?.(libro, c.value); }}>
                    <span>{c.emoji}</span> {c.label}
                  </button>
                </li>
              ))}

              <li role="separator" aria-hidden="true" className="book-card-menu-divider" />
              <li role="menuitem">
                <button
                  className="book-card-menu-danger"
                  onClick={() => { setMenuAbierto(false); onEliminar?.(libro); }}
                >
                  <span>🗑</span> Eliminar
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* ── Info básica debajo ── */}
      <div className="book-card-info" onClick={() => onVerDetalle?.(libro)}>
        <p className="book-card-title" title={libro.titulo}>{libro.titulo}</p>
        {libro.autores && (
          <p className="book-card-author">{primerAutor(libro.autores)}</p>
        )}
      </div>

      {/* ── CTA rápida según categoría — RF12, RF21 ── */}
      {libro.categoria === 'leer-mas-tarde' || libro.categoria === 'lista-de-deseos' ? (
        <button
          className="book-card-cta book-card-cta--start"
          onClick={(e) => { e.stopPropagation(); onCambiarCategoria?.(libro, 'en-progreso'); }}
          title="Empezar a leer"
          aria-label="Empezar a leer este libro"
        >
          ▶ Empezar
        </button>
      ) : libro.categoria === 'en-progreso' ? (
        <button
          className="book-card-cta book-card-cta--finish"
          onClick={(e) => { e.stopPropagation(); onCambiarCategoria?.(libro, 'terminados'); }}
          title="Marcar como terminado"
          aria-label="Marcar como terminado"
        >
          ✓ Terminado
        </button>
      ) : libro.categoria === 'terminados' ? (
        <div className="book-card-cta book-card-cta--done" aria-label="Libro terminado">
          ✓ Leído
        </div>
      ) : null}
    </div>
  );
}

/* ── Utilidades ── */

function primerAutor(autores) {
  return autores.split(',')[0].trim();
}

function calcularProgreso(libro) {
  if (libro.categoria === 'terminados') return 100;
  if (libro.formatoProgreso === 'porcentaje' && libro.progresoPorc) {
    return Math.min(100, Number(libro.progresoPorc));
  }
  if (libro.formatoProgreso === 'paginas' && libro.progresoPaginas && libro.totalPaginas) {
    return Math.min(100, (libro.progresoPaginas / libro.totalPaginas) * 100);
  }
  return 0;
}
