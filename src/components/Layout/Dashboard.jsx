import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/db';
import { BookCard } from '../Books/BookCard';
import { BookForm, CATEGORIAS } from '../Books/BookForm';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import { BookDetailModal } from '../UI/BookDetailModal';
import { useLibroActions } from '../../hooks/useLibroActions';
import './Dashboard.css';

export function Dashboard({ nombreUsuario, onAddBook, onIrBiblioteca }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const libros      = useLiveQuery(() => db.libros.toArray(), []);
  const colecciones = useLiveQuery(() => db.colecciones.toArray(), []);

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

  const enProgreso = (libros ?? [])
    .filter((l) => l.categoria === 'en-progreso')
    .sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion))
    .slice(0, 5);

  const totalLibros = libros?.length ?? 0;

  const cardProps = (libro) => ({
    libro,
    onVerDetalle: setLibroDetalle,
    onEditar: setLibroEditar,
    onEliminar: handleSolicitarEliminar,
    onToggleFavorito: handleToggleFavorito,
    onCambiarCategoria: handleCambiarCategoria,
  });

  return (
    <div className="dashboard">
      {/* Bienvenida RF24 */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h1>¡Hola, <span className="dashboard-name">{nombreUsuario}</span>!</h1>
          <p>
            {totalLibros === 0
              ? '¿Qué vamos a leer hoy?'
              : `Tienes ${totalLibros} ${totalLibros === 1 ? 'libro' : 'libros'} en tu colección.`}
          </p>
        </div>
        <div className="dashboard-welcome-actions">
          <button className="btn btn-primary btn-lg" onClick={() => setMostrarFormulario(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Agregar libro
          </button>
          {totalLibros > 0 && (
            <button className="btn btn-secondary" onClick={onIrBiblioteca}>Ver biblioteca →</button>
          )}
        </div>
      </div>

      {/* Stats */}
      {totalLibros > 0 && (
        <div className="dashboard-stats">
          {CATEGORIAS.map((c) => {
            const count = (libros ?? []).filter((l) => l.categoria === c.value).length;
            return (
              <button key={c.value} className="dashboard-stat-card" style={{ '--cat-color': c.color }} onClick={onIrBiblioteca}>
                <span className="dashboard-stat-emoji">{c.emoji}</span>
                <span className="dashboard-stat-count">{count}</span>
                <span className="dashboard-stat-label">{c.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* En Progreso RF24 */}
      {enProgreso.length > 0 && (
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>📖 En Progreso</h2>
            <button className="btn btn-ghost btn-sm" onClick={onIrBiblioteca}>Ver todos</button>
          </div>
          <div className="dashboard-progress-list">
            {enProgreso.map((libro) => (
              <ProgressRow key={libro.id} libro={libro} onVerDetalle={setLibroDetalle} />
            ))}
          </div>
        </section>
      )}

      {/* Estantes por categoría RF24 */}
      {CATEGORIAS.filter((c) => c.value !== 'en-progreso').map((cat) => {
        const librosCategoria = (libros ?? [])
          .filter((l) => l.categoria === cat.value)
          .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
          .slice(0, 6);

        return (
          <section key={cat.value} className="dashboard-section">
            <div className="dashboard-section-header">
              <h2 style={{ '--cat-color': cat.color }}>
                {cat.emoji} {cat.label}
                <span className="dashboard-section-count">
                  {(libros ?? []).filter((l) => l.categoria === cat.value).length}
                </span>
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={onIrBiblioteca}>Ver todos</button>
            </div>
            {librosCategoria.length === 0 ? (
              <p className="dashboard-shelf-empty">
                {cat.value === 'leer-mas-tarde' && 'Los libros que quieres leer aparecerán aquí.'}
                {cat.value === 'lista-de-deseos' && 'Guarda libros que quieres conseguir.'}
                {cat.value === 'terminados' && 'Tus libros completados aparecerán aquí.'}
              </p>
            ) : (
              <div className="dashboard-shelf">
                {librosCategoria.map((libro) => (
                  <BookCard key={libro.id} {...cardProps(libro)} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Colecciones RF24 */}
      {colecciones?.length > 0 && (
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>📂 Colecciones</h2>
          </div>
          <div className="dashboard-collections">
            {colecciones.map((col) => (
              <div key={col.id} className="dashboard-collection-chip" onClick={onIrBiblioteca}>
                <span>{col.esSaga ? '📚' : '📂'}</span>
                <span className="dashboard-collection-name">{col.nombre}</span>
                <span className="dashboard-collection-count">{col.librosIds?.length ?? 0}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Vacío total */}
      {totalLibros === 0 && (
        <div className="dashboard-empty">
          <p className="dashboard-empty-emoji">📚</p>
          <h2>Tu biblioteca te espera</h2>
          <p>Añade tu primer libro y empieza a rastrear tu lectura.</p>
          <button className="btn btn-primary" onClick={() => setMostrarFormulario(true)}>Añadir primer libro</button>
        </div>
      )}

      {libroDetalle && (
        <BookDetailModal
          libro={libroDetalle}
          onCerrar={() => setLibroDetalle(null)}
          onEditar={(l) => { setLibroDetalle(null); setLibroEditar(l); }}
          onEliminar={(l) => { setLibroDetalle(null); handleSolicitarEliminar(l); }}
          onToggleFavorito={async (l) => { await handleToggleFavorito(l); setLibroDetalle((p) => ({ ...p, favorito: !p.favorito })); }}
          onCambiarCategoria={handleCambiarCategoria}
        />
      )}

      {libroParaEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar este libro?"
          mensaje={`"${libroParaEliminar.titulo}" y todas sus notas serán eliminados permanentemente.`}
          labelOk="Sí, eliminar"
          onConfirm={handleConfirmarEliminar}
          onCancel={handleCancelarEliminar}
        />
      )}
    </div>
  );
}

function ProgressRow({ libro, onVerDetalle }) {
  const portada = libro.portadaBase64 || libro.portadaUrl || null;
  const progreso = calcularProgreso(libro);
  return (
    <div className="progress-row" onClick={() => onVerDetalle?.(libro)} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onVerDetalle?.(libro)}>
      <div className="progress-row-cover">
        {portada
          ? <img src={portada} alt="" className="progress-row-cover-img" />
          : <div className="progress-row-cover-fallback">{libro.titulo[0]}</div>}
      </div>
      <div className="progress-row-info">
        <p className="progress-row-titulo">{libro.titulo}</p>
        {libro.autores && <p className="progress-row-autor">{libro.autores.split(',')[0].trim()}</p>}
        {progreso > 0 && (
          <div className="progress-row-bar-wrap">
            <div className="progress-row-bar">
              <div className="progress-row-bar-fill" style={{ width: `${progreso}%` }} />
            </div>
            <span>{progreso.toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function calcularProgreso(libro) {
  if (libro.formatoProgreso === 'porcentaje' && libro.progresoPorc) return Math.min(100, Number(libro.progresoPorc));
  if (libro.formatoProgreso === 'paginas' && libro.progresoPaginas && libro.totalPaginas) {
    return Math.min(100, (libro.progresoPaginas / libro.totalPaginas) * 100);
  }
  return 0;
}
