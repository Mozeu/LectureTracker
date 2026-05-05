import React, { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/db';
import { BookCard } from '../Books/BookCard';
import { BookForm, CATEGORIAS } from '../Books/BookForm';
import { DeleteConfirmDialog } from '../UI/DeleteConfirmDialog';
import { BookDetailModal } from '../UI/BookDetailModal';
import { useLibroActions } from '../../hooks/useLibroActions';
import './Biblioteca.css';

/**
 * Biblioteca — RF7, RF8, RF9, RF10, RF11, RF22, RF23
 * filtroInicial: 'todas' | 'favoritos' | category value
 */
export function Biblioteca({ onSuccess, onError, filtroInicial = 'todas' }) {
  const [filtroCategoria, setFiltroCategoria] = useState(
    filtroInicial === 'favoritos' ? 'todas' : (filtroInicial ?? 'todas')
  );
  const [filtroFavoritos, setFiltroFavoritos] = useState(filtroInicial === 'favoritos');
  const [filtroEtiqueta,  setFiltroEtiqueta]  = useState('');
  const [busqueda,        setBusqueda]        = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Selection state — RF22 bulk delete
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState(new Set());

  /* ── Live data ── */
  const libros = useLiveQuery(
    () => db.libros.orderBy('fechaCreacion').reverse().toArray(), []
  );
  const etiquetasDisponibles = useMemo(() => {
    if (!libros) return [];
    const set = new Set();
    libros.forEach((l) => l.etiquetas?.forEach((e) => set.add(e)));
    return [...set].sort();
  }, [libros]);

  /* ── Actions ── */
  const {
    libroParaEliminar, bulkIdsToDelete, libroDetalle, libroEditar,
    setLibroDetalle, setLibroEditar,
    handleToggleFavorito, handleCambiarCategoria,
    handleSolicitarEliminar, handleConfirmarEliminar, handleCancelarEliminar,
    handleSolicitarBulkDelete, handleConfirmarBulkDelete, handleCancelarBulkDelete,
  } = useLibroActions({ onSuccess, onError });

  /* ── Filtering — RF8 ── */
  const librosFiltrados = useMemo(() => {
    if (!libros) return [];
    return libros.filter((l) => {
      if (filtroCategoria !== 'todas' && l.categoria !== filtroCategoria) return false;
      if (filtroFavoritos && !l.favorito) return false;
      if (filtroEtiqueta && !l.etiquetas?.includes(filtroEtiqueta)) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        if (!l.titulo?.toLowerCase().includes(q) &&
            !l.autores?.toLowerCase().includes(q) &&
            !l.saga?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [libros, filtroCategoria, filtroFavoritos, filtroEtiqueta, busqueda]);

  /* ── Selection helpers ── */
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(librosFiltrados.map((l) => l.id)));
  }, [librosFiltrados]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }, []);

  const handleFormSuccess = (libroId, mensaje) => {
    setMostrarFormulario(false);
    setLibroEditar(null);
    onSuccess?.(mensaje);
  };

  if (libros === undefined) {
    return <div className="biblioteca-loading">Cargando biblioteca…</div>;
  }

  if (mostrarFormulario || libroEditar) {
    return (
      <div className="biblioteca-form-wrap">
        <BookForm
          libro={libroEditar ?? null}
          onSuccess={handleFormSuccess}
          onCancel={() => { setMostrarFormulario(false); setLibroEditar(null); }}
        />
      </div>
    );
  }

  const selectedCount = selectedIds.size;
  const allSelected   = librosFiltrados.length > 0 && selectedCount === librosFiltrados.length;

  return (
    <div className="biblioteca">
      {/* ── Header ── */}
      <div className="biblioteca-header">
        <div>
          <h1 className="biblioteca-title">
            {filtroFavoritos
              ? '★ Favoritos'
              : filtroCategoria !== 'todas'
                ? `${CATEGORIAS.find((c) => c.value === filtroCategoria)?.emoji} ${CATEGORIAS.find((c) => c.value === filtroCategoria)?.label}`
                : 'Mi Biblioteca'}
          </h1>
          <p className="biblioteca-subtitle">
            {librosFiltrados.length === 0 && libros.length > 0
              ? 'Sin libros en esta sección.'
              : libros.length === 0
                ? 'Aún no has añadido libros.'
                : `${librosFiltrados.length} ${librosFiltrados.length === 1 ? 'libro' : 'libros'}${filtroCategoria !== 'todas' || filtroFavoritos ? '' : ' en tu colección'}`}
          </p>
        </div>
        <div className="biblioteca-header-actions">
          {!selectionMode && libros.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={enterSelectionMode}>
              ☑ Seleccionar
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setMostrarFormulario(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Añadir libro
          </button>
        </div>
      </div>

      {/* ── Bulk selection toolbar — RF22 ── */}
      {selectionMode && (
        <div className="biblioteca-bulk-bar" role="toolbar" aria-label="Barra de selección">
          <div className="biblioteca-bulk-left">
            <input
              type="checkbox"
              id="select-all"
              className="biblioteca-bulk-checkbox"
              checked={allSelected}
              onChange={allSelected ? clearSelection : selectAll}
              aria-label={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
            />
            <label htmlFor="select-all" className="biblioteca-bulk-label">
              {selectedCount === 0
                ? 'Ninguno seleccionado'
                : `${selectedCount} ${selectedCount === 1 ? 'libro' : 'libros'} seleccionado${selectedCount !== 1 ? 's' : ''}`}
            </label>
          </div>
          <div className="biblioteca-bulk-right">
            {selectedCount > 0 && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleSolicitarBulkDelete([...selectedIds])}
              >
                🗑 Eliminar {selectedCount}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={exitSelectionMode}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Filters — RF8 ── */}
      <div className="biblioteca-filtros">
        <div className="biblioteca-search-wrap">
          <svg className="biblioteca-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="search"
            className="biblioteca-search"
            placeholder="Buscar por título, autor, saga…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar libros"
          />
          {busqueda && (
            <button className="biblioteca-search-clear" onClick={() => setBusqueda('')} aria-label="Borrar búsqueda">✕</button>
          )}
        </div>

        <div className="biblioteca-cats" role="tablist" aria-label="Filtrar por categoría">
          <button
            role="tab"
            aria-selected={filtroCategoria === 'todas'}
            className={`biblioteca-cat-tab ${filtroCategoria === 'todas' ? 'biblioteca-cat-tab--active' : ''}`}
            onClick={() => setFiltroCategoria('todas')}
          >
            Todas <span className="biblioteca-cat-count">{libros.length}</span>
          </button>
          {CATEGORIAS.map((c) => {
            const count = libros.filter((l) => l.categoria === c.value).length;
            return (
              <button
                key={c.value}
                role="tab"
                aria-selected={filtroCategoria === c.value}
                className={`biblioteca-cat-tab ${filtroCategoria === c.value ? 'biblioteca-cat-tab--active' : ''}`}
                style={{ '--cat-color': c.color }}
                onClick={() => setFiltroCategoria(c.value)}
              >
                {c.emoji} {c.label}
                {count > 0 && <span className="biblioteca-cat-count">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="biblioteca-filtros-extra">
          <button
            className={`biblioteca-filter-chip ${filtroFavoritos ? 'biblioteca-filter-chip--active' : ''}`}
            onClick={() => setFiltroFavoritos((v) => !v)}
            aria-pressed={filtroFavoritos}
          >
            ★ Solo favoritos
          </button>
          {etiquetasDisponibles.map((et) => (
            <button
              key={et}
              className={`biblioteca-filter-chip ${filtroEtiqueta === et ? 'biblioteca-filter-chip--active' : ''}`}
              onClick={() => setFiltroEtiqueta((v) => v === et ? '' : et)}
              aria-pressed={filtroEtiqueta === et}
            >
              🏷 {et}
            </button>
          ))}
        </div>
      </div>

      {/* ── Book grid — RF7 ── */}
      {librosFiltrados.length === 0 ? (
        <EmptyState
          hayLibros={libros.length > 0}
          onAgregar={() => setMostrarFormulario(true)}
          onLimpiar={() => {
            setFiltroCategoria('todas');
            setFiltroFavoritos(false);
            setFiltroEtiqueta('');
            setBusqueda('');
          }}
        />
      ) : (
        <div className="biblioteca-grid" role="list" aria-label="Libros en la biblioteca">
          {librosFiltrados.map((libro) => (
            <div key={libro.id} role="listitem">
              <BookCard
                libro={libro}
                onVerDetalle={selectionMode ? undefined : setLibroDetalle}
                onEditar={selectionMode ? undefined : setLibroEditar}
                onEliminar={selectionMode ? undefined : handleSolicitarEliminar}
                onToggleFavorito={selectionMode ? undefined : handleToggleFavorito}
                onCambiarCategoria={selectionMode ? undefined : handleCambiarCategoria}
                selectionMode={selectionMode}
                isSelected={selectedIds.has(libro.id)}
                onToggleSelect={toggleSelect}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Detail modal — RF9 ── */}
      {libroDetalle && (
        <BookDetailModal
          libro={libroDetalle}
          onCerrar={() => setLibroDetalle(null)}
          onEditar={(l) => { setLibroDetalle(null); setLibroEditar(l); }}
          onEliminar={(l) => { setLibroDetalle(null); handleSolicitarEliminar(l); }}
          onToggleFavorito={async (l) => { await handleToggleFavorito(l); setLibroDetalle((p) => ({ ...p, favorito: !p.favorito })); }}
          onCambiarCategoria={handleCambiarCategoria}
          onSuccess={onSuccess}
          onError={onError}
        />
      )}

      {/* ── Single delete confirm — RF22 ── */}
      {libroParaEliminar && (
        <DeleteConfirmDialog
          bookIds={[libroParaEliminar.id]}
          bookTitle={libroParaEliminar.titulo}
          onConfirm={handleConfirmarEliminar}
          onCancel={handleCancelarEliminar}
        />
      )}

      {/* ── Bulk delete confirm — RF22, RF23 ── */}
      {bulkIdsToDelete.length > 0 && (
        <DeleteConfirmDialog
          bookIds={bulkIdsToDelete}
          onConfirm={async () => {
            await handleConfirmarBulkDelete();
            exitSelectionMode();
          }}
          onCancel={handleCancelarBulkDelete}
        />
      )}
    </div>
  );
}

/* ── Empty State ── */
function EmptyState({ hayLibros, onAgregar, onLimpiar }) {
  return (
    <div className="biblioteca-empty">
      <p className="biblioteca-empty-emoji">{hayLibros ? '🔍' : '📚'}</p>
      <h2>{hayLibros ? 'Sin resultados' : 'Tu biblioteca está vacía'}</h2>
      <p>
        {hayLibros
          ? 'Ningún libro coincide con los filtros actuales.'
          : 'Comienza añadiendo tu primer libro a la colección.'}
      </p>
      {hayLibros ? (
        <button className="btn btn-secondary" onClick={onLimpiar}>Limpiar filtros</button>
      ) : (
        <button className="btn btn-primary" onClick={onAgregar}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Añadir mi primer libro
        </button>
      )}
    </div>
  );
}
