import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/db';
import { BookCard } from '../Books/BookCard';
import { BookForm, CATEGORIAS } from '../Books/BookForm';
import { DeleteConfirmDialog } from '../UI/DeleteConfirmDialog';
import { BookDetailModal } from '../UI/BookDetailModal';
import { useLibroActions } from '../../hooks/useLibroActions';
import './Dashboard.css';

/**
 * Dashboard — RF24, RF25
 *
 * Props:
 *   nombreUsuario  — string
 *   onAddBook      — (libroId, msg) => void  (feedback toasts)
 *   onNavegar      — (vista, filtro?) => void  (unified navigation, RF25)
 *   theme          — 'light' | 'dark'
 *   onToggleTheme  — () => void  (RF24: theme selector on dashboard)
 */
export function Dashboard({ nombreUsuario, onAddBook, onNavegar, theme, onToggleTheme }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const libros      = useLiveQuery(() => db.libros.toArray(), []);
  const colecciones = useLiveQuery(() => db.colecciones.toArray(), []);
  const etiquetas   = useLiveQuery(() => db.etiquetas.toArray(), []);

  const {
    libroParaEliminar, libroDetalle, libroEditar,
    setLibroDetalle, setLibroEditar,
    handleToggleFavorito, handleCambiarCategoria,
    handleSolicitarEliminar, handleConfirmarEliminar, handleCancelarEliminar,
  } = useLibroActions({
    onSuccess: (msg) => onAddBook?.(null, msg),
    onError:   (msg) => onAddBook?.(null, msg),
  });

  const handleFormSuccess = (libroId, mensaje) => {
    setMostrarFormulario(false);
    setLibroEditar(null);
    onAddBook?.(libroId, mensaje);
  };

  if (mostrarFormulario || libroEditar) {
    return (
      <div className="dashboard-form-wrapper">
        <BookForm
          libro={libroEditar ?? null}
          onSuccess={handleFormSuccess}
          onCancel={() => { setMostrarFormulario(false); setLibroEditar(null); }}
        />
      </div>
    );
  }

  const totalLibros = libros?.length ?? 0;

  const enProgreso = (libros ?? [])
    .filter((l) => l.categoria === 'en-progreso')
    .sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion))
    .slice(0, 5);

  const cardProps = (libro) => ({
    libro,
    onVerDetalle:      setLibroDetalle,
    onEditar:          setLibroEditar,
    onEliminar:        handleSolicitarEliminar,
    onToggleFavorito:  handleToggleFavorito,
    onCambiarCategoria: handleCambiarCategoria,
  });

  return (
    <div className="dashboard">

      {/* ── Welcome + Theme toggle — RF24 ── */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h1>
            ¡Hola, <span className="dashboard-name">{nombreUsuario}</span>!
          </h1>
          <p>
            {totalLibros === 0
              ? '¿Qué vamos a leer hoy?'
              : `Tienes ${totalLibros} ${totalLibros === 1 ? 'libro' : 'libros'} en tu colección.`}
          </p>
        </div>

        <div className="dashboard-welcome-actions">
          {/* RF24: theme selector on dashboard */}
          <button
            className="dashboard-theme-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          </button>

          <button className="btn btn-primary btn-lg" onClick={() => setMostrarFormulario(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Agregar libro
          </button>

          {totalLibros > 0 && (
            <button className="btn btn-secondary" onClick={() => onNavegar('biblioteca')}>
              Ver biblioteca →
            </button>
          )}
        </div>
      </div>

      {/* ── Stats cards — RF24, each navigates to its category ── */}
      {totalLibros > 0 && (
        <div className="dashboard-stats">
          {CATEGORIAS.map((c) => {
            const count = (libros ?? []).filter((l) => l.categoria === c.value).length;
            return (
              <button
                key={c.value}
                className="dashboard-stat-card"
                style={{ '--cat-color': c.color }}
                onClick={() => onNavegar('biblioteca', c.value)}
                aria-label={`${c.label}: ${count} libro${count !== 1 ? 's' : ''}`}
              >
                <span className="dashboard-stat-emoji">{c.emoji}</span>
                <span className="dashboard-stat-count">{count}</span>
                <span className="dashboard-stat-label">{c.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── En Progreso — RF24 (max 5) ── */}
      {enProgreso.length > 0 && (
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>📖 En Progreso</h2>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onNavegar('biblioteca', 'en-progreso')}
            >
              Ver todos
            </button>
          </div>
          <div className="dashboard-progress-list">
            {enProgreso.map((libro) => (
              <ProgressRow key={libro.id} libro={libro} onVerDetalle={setLibroDetalle} />
            ))}
          </div>
        </section>
      )}

      {/* ── Shelves per category — RF24 (last 6, skip En Progreso) ── */}
      {CATEGORIAS.filter((c) => c.value !== 'en-progreso').map((cat) => {
        const librosCategoria = (libros ?? [])
          .filter((l) => l.categoria === cat.value)
          .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
          .slice(0, 6);

        // Hide empty shelves when the library has books (less noise) 
        if (librosCategoria.length === 0 && totalLibros > 0) return null;

        return (
          <section key={cat.value} className="dashboard-section">
            <div className="dashboard-section-header">
              <h2 style={{ '--cat-color': cat.color }}>
                {cat.emoji} {cat.label}
                <span className="dashboard-section-count">
                  {(libros ?? []).filter((l) => l.categoria === cat.value).length}
                </span>
              </h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onNavegar('biblioteca', cat.value)}
              >
                Ver todos
              </button>
            </div>

            {librosCategoria.length === 0 ? (
              <p className="dashboard-shelf-empty">
                {cat.value === 'leer-mas-tarde'  && 'Los libros que quieres leer aparecerán aquí.'}
                {cat.value === 'lista-de-deseos'  && 'Guarda libros que quieres conseguir.'}
                {cat.value === 'terminados'        && 'Tus libros completados aparecerán aquí.'}
              </p>
            ) : (
              <div className="dashboard-shelf">
                {librosCategoria.map((libro) => (
                  <BookCard key={libro.id} {...cardProps(libro)} />
                ))}
                {/* "More" pill if there are more than 6 */}
                {(libros ?? []).filter((l) => l.categoria === cat.value).length > 6 && (
                  <button
                    className="dashboard-shelf-more"
                    onClick={() => onNavegar('biblioteca', cat.value)}
                    aria-label={`Ver todos los libros en ${cat.label}`}
                  >
                    <span>+{(libros ?? []).filter((l) => l.categoria === cat.value).length - 6}</span>
                    <span className="dashboard-shelf-more-label">más</span>
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* ── Collections — RF24 summary + quick access ── */}
      {colecciones?.length > 0 && (
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>📂 Colecciones</h2>
            {/* RF25: direct access to collection management */}
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onNavegar('colecciones')}
            >
              Gestionar
            </button>
          </div>
          <div className="dashboard-collections">
            {colecciones.slice(0, 8).map((col) => (
              <button
                key={col.id}
                className="dashboard-collection-chip"
                onClick={() => onNavegar('colecciones')}
                aria-label={`Colección ${col.nombre}, ${col.librosIds?.length ?? 0} libros`}
              >
                <span aria-hidden="true">{col.esSaga ? '📚' : '📂'}</span>
                <span className="dashboard-collection-name">{col.nombre}</span>
                <span className="dashboard-collection-count">{col.librosIds?.length ?? 0}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick Access — RF25 ── */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <h2 className="dashboard-quicknav-title">Acceso rápido</h2>
        </div>
        <div className="dashboard-quicknav">
          <QuickNavCard
            emoji="📚"
            title="Biblioteca"
            description={`${totalLibros} libro${totalLibros !== 1 ? 's' : ''} en tu colección`}
            onClick={() => onNavegar('biblioteca')}
            accent="var(--accent-primary)"
          />
          <QuickNavCard
            emoji="🏷️"
            title="Etiquetas"
            description={`${etiquetas?.length ?? 0} etiqueta${(etiquetas?.length ?? 0) !== 1 ? 's' : ''} creada${(etiquetas?.length ?? 0) !== 1 ? 's' : ''}`}
            onClick={() => onNavegar('etiquetas')}
            accent="var(--cat-wishlist)"
          />
          <QuickNavCard
            emoji="📂"
            title="Colecciones"
            description={`${colecciones?.length ?? 0} colección${(colecciones?.length ?? 0) !== 1 ? 'es' : ''}`}
            onClick={() => onNavegar('colecciones')}
            accent="var(--cat-later)"
          />
          <QuickNavCard
            emoji="⚙️"
            title="Ajustes"
            description="Nombre, tema y más"
            onClick={() => onNavegar('configuracion')}
            accent="var(--text-muted)"
          />
        </div>
      </section>

      {/* ── Empty state ── */}
      {totalLibros === 0 && (
        <div className="dashboard-empty">
          <p className="dashboard-empty-emoji">📚</p>
          <h2>Tu biblioteca te espera</h2>
          <p>Añade tu primer libro y empieza a rastrear tu lectura.</p>
          <button className="btn btn-primary" onClick={() => setMostrarFormulario(true)}>
            Añadir primer libro
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {libroDetalle && (
        <BookDetailModal
          libro={libroDetalle}
          onCerrar={() => setLibroDetalle(null)}
          onEditar={(l) => { setLibroDetalle(null); setLibroEditar(l); }}
          onEliminar={(l) => { setLibroDetalle(null); handleSolicitarEliminar(l); }}
          onToggleFavorito={async (l) => {
            await handleToggleFavorito(l);
            setLibroDetalle((p) => ({ ...p, favorito: !p.favorito }));
          }}
          onCambiarCategoria={handleCambiarCategoria}
          onSuccess={(msg) => onAddBook?.(null, msg)}
          onError={(msg) => onAddBook?.(null, msg)}
        />
      )}

      {libroParaEliminar && (
        <DeleteConfirmDialog
          bookIds={[libroParaEliminar.id]}
          bookTitle={libroParaEliminar.titulo}
          onConfirm={handleConfirmarEliminar}
          onCancel={handleCancelarEliminar}
        />
      )}
    </div>
  );
}

/* ── Quick nav card — RF25 ── */
function QuickNavCard({ emoji, title, description, onClick, accent }) {
  return (
    <button
      className="quicknav-card"
      style={{ '--qn-accent': accent }}
      onClick={onClick}
      aria-label={`Ir a ${title}`}
    >
      <span className="quicknav-emoji" aria-hidden="true">{emoji}</span>
      <div className="quicknav-text">
        <span className="quicknav-title">{title}</span>
        <span className="quicknav-desc">{description}</span>
      </div>
      <svg
        className="quicknav-arrow"
        width="14" height="14" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5"
        aria-hidden="true"
      >
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </button>
  );
}

/* ── Progress row ── */
function ProgressRow({ libro, onVerDetalle }) {
  const portada  = libro.portadaBase64 || libro.portadaUrl || null;
  const progreso = calcularProgreso(libro);

  return (
    <div
      className="progress-row"
      onClick={() => onVerDetalle?.(libro)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onVerDetalle?.(libro)}
      aria-label={`Ver detalles de ${libro.titulo}`}
    >
      <div className="progress-row-cover">
        {portada
          ? <img src={portada} alt="" className="progress-row-cover-img" />
          : <div className="progress-row-cover-fallback">{libro.titulo[0]}</div>
        }
      </div>
      <div className="progress-row-info">
        <p className="progress-row-titulo">{libro.titulo}</p>
        {libro.autores && (
          <p className="progress-row-autor">{libro.autores.split(',')[0].trim()}</p>
        )}
        {progreso > 0 && (
          <div className="progress-row-bar-wrap">
            <div className="progress-row-bar">
              <div className="progress-row-bar-fill" style={{ width: `${progreso}%` }} />
            </div>
            <span>{progreso.toFixed(0)}%</span>
          </div>
        )}
        {libro.fechaUltimaLectura && (
          <p className="progress-row-ultima">
            Última lectura: {formatFecha(libro.fechaUltimaLectura)}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */
function calcularProgreso(libro) {
  if (libro.formatoProgreso === 'porcentaje' && libro.progresoPorc) {
    return Math.min(100, Number(libro.progresoPorc));
  }
  if (libro.formatoProgreso === 'paginas' && libro.progresoPaginas && libro.totalPaginas) {
    return Math.min(100, (libro.progresoPaginas / libro.totalPaginas) * 100);
  }
  return 0;
}

function formatFecha(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  } catch { return iso; }
}
