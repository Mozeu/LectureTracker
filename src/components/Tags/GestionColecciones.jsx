import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, {
  crearColeccion,
  actualizarColeccion,
  eliminarColeccion,
  agregarLibroAColeccion,
  quitarLibroDeColeccion,
} from '../../db/db';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import './GestionColecciones.css';

/* ── Componente principal ── */
export function GestionColecciones({ onSuccess, onError }) {
  const colecciones = useLiveQuery(() => db.colecciones.orderBy('nombre').toArray(), []);
  const libros      = useLiveQuery(() => db.libros.orderBy('titulo').toArray(), []);

  const [formNuevaAbierto, setFormNuevaAbierto]     = useState(false);
  const [coleccionExpandida, setColeccionExpandida] = useState(null); // id
  const [editandoNombre, setEditandoNombre]         = useState(null); // id
  const [colAEliminar, setColAEliminar]             = useState(null);
  const [selectorAbierto, setSelectorAbierto]       = useState(null); // id coleccion
  const [loading, setLoading]                       = useState(false);

  /* Índice de libros por id para búsqueda O(1) */
  const librosById = useMemo(() => {
    const map = new Map();
    (libros ?? []).forEach((l) => map.set(l.id, l));
    return map;
  }, [libros]);

  const librosEnColeccion = (col) =>
    (col.librosIds ?? []).map((id) => librosById.get(id)).filter(Boolean);

  /* Crear colección */
  const handleCrear = async (nombre) => {
    setLoading(true);
    try {
      await crearColeccion({ nombre });
      onSuccess?.(`Colección "${nombre}" creada.`);
      setFormNuevaAbierto(false);
    } catch (e) {
      onError?.(e.message ?? 'Error al crear la colección.');
    } finally {
      setLoading(false);
    }
  };

  /* Renombrar colección */
  const handleRenombrar = async (id, nuevoNombre) => {
    setLoading(true);
    try {
      await actualizarColeccion(id, { nombre: nuevoNombre });
      onSuccess?.('Nombre actualizado.');
      setEditandoNombre(null);
    } catch (e) {
      onError?.(e.message ?? 'Error al renombrar.');
    } finally {
      setLoading(false);
    }
  };

  /* Eliminar colección — RF16 */
  const handleEliminar = async () => {
    if (!colAEliminar) return;
    setLoading(true);
    try {
      await eliminarColeccion(colAEliminar.id);
      onSuccess?.(`Colección "${colAEliminar.nombre}" eliminada.`);
      setColAEliminar(null);
      if (coleccionExpandida === colAEliminar.id) setColeccionExpandida(null);
    } catch {
      onError?.('No se pudo eliminar.');
    } finally {
      setLoading(false);
    }
  };

  /* Añadir libro a colección */
  const handleAgregarLibro = async (colId, libroId) => {
    try {
      await agregarLibroAColeccion(colId, libroId);
    } catch {
      onError?.('No se pudo añadir el libro.');
    }
  };

  /* Quitar libro de colección */
  const handleQuitarLibro = async (colId, libroId) => {
    try {
      await quitarLibroDeColeccion(colId, libroId);
    } catch {
      onError?.('No se pudo quitar el libro.');
    }
  };

  if (colecciones === undefined) return <div className="gc-loading">Cargando colecciones…</div>;

  return (
    <div className="gc-container">
      {/* Cabecera */}
      <div className="gc-header">
        <div>
          <h1 className="gc-title">📂 Colecciones</h1>
          <p className="gc-subtitle">
            {colecciones.length === 0
              ? 'Agrupa tus libros en colecciones y sagas.'
              : `${colecciones.length} ${colecciones.length === 1 ? 'colección' : 'colecciones'}`}
          </p>
        </div>
        {!formNuevaAbierto && (
          <button className="btn btn-primary" onClick={() => setFormNuevaAbierto(true)}>
            + Nueva colección
          </button>
        )}
      </div>

      {/* Formulario nueva colección */}
      {formNuevaAbierto && (
        <NombreForm
          placeholder="Nombre de la colección…"
          labelOk="Crear"
          onGuardar={handleCrear}
          onCancelar={() => setFormNuevaAbierto(false)}
          loading={loading}
        />
      )}

      {/* Lista vacía */}
      {colecciones.length === 0 && !formNuevaAbierto && (
        <div className="gc-empty">
          <p className="gc-empty-emoji">📂</p>
          <h2>Sin colecciones todavía</h2>
          <p>
            Crea colecciones para agrupar libros manualmente.<br />
            Las sagas se crean automáticamente al añadir un libro con ese campo.
          </p>
          <button className="btn btn-primary" onClick={() => setFormNuevaAbierto(true)}>
            Crear primera colección
          </button>
        </div>
      )}

      {/* Tarjetas de colecciones */}
      <div className="gc-list">
        {colecciones.map((col) => {
          const librosDeEsta = librosEnColeccion(col);
          const expandida    = coleccionExpandida === col.id;

          return (
            <div key={col.id} className={`gc-card ${expandida ? 'gc-card--expanded' : ''}`}>
              {/* Cabecera de la colección */}
              <div className="gc-card-header" onClick={() =>
                setColeccionExpandida(expandida ? null : col.id)
              }>
                <div className="gc-card-icon" aria-hidden="true">
                  {col.esSaga ? '📚' : '📂'}
                </div>

                <div className="gc-card-meta">
                  {editandoNombre === col.id ? (
                    <NombreForm
                      inicial={col.nombre}
                      placeholder="Nuevo nombre…"
                      labelOk="Guardar"
                      onGuardar={(nombre) => handleRenombrar(col.id, nombre)}
                      onCancelar={() => setEditandoNombre(null)}
                      loading={loading}
                      compact
                    />
                  ) : (
                    <>
                      <span className="gc-card-nombre">{col.nombre}</span>
                      {col.esSaga && (
                        <span className="gc-saga-badge">Saga automática</span>
                      )}
                    </>
                  )}
                  <span className="gc-card-count">
                    {librosDeEsta.length} {librosDeEsta.length === 1 ? 'libro' : 'libros'}
                  </span>
                </div>

                {/* Acciones */}
                <div className="gc-card-actions" onClick={(e) => e.stopPropagation()}>
                  {!col.esSaga && (
                    <button
                      className="ge-card-btn"
                      onClick={() => setEditandoNombre(editandoNombre === col.id ? null : col.id)}
                      aria-label="Renombrar"
                      title="Renombrar"
                    >
                      ✏️
                    </button>
                  )}
                  <button
                    className="ge-card-btn ge-card-btn--danger"
                    onClick={() => setColAEliminar(col)}
                    aria-label="Eliminar colección"
                    title="Eliminar"
                  >
                    🗑
                  </button>
                  <button
                    className="gc-expand-btn"
                    aria-expanded={expandida}
                    aria-label={expandida ? 'Contraer' : 'Expandir'}
                  >
                    <svg
                      width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ transform: expandida ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
                    >
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contenido expandido */}
              {expandida && (
                <div className="gc-card-body">
                  {/* Portadas en fila */}
                  {librosDeEsta.length > 0 && (
                    <div className="gc-book-strip">
                      {librosDeEsta.map((libro) => (
                        <LibroChip
                          key={libro.id}
                          libro={libro}
                          onQuitar={() => handleQuitarLibro(col.id, libro.id)}
                        />
                      ))}
                    </div>
                  )}

                  {librosDeEsta.length === 0 && (
                    <p className="gc-empty-books">Esta colección no tiene libros aún.</p>
                  )}

                  {/* Botón para añadir libros */}
                  {selectorAbierto === col.id ? (
                    <SelectorLibros
                      libros={libros ?? []}
                      idsEnColeccion={col.librosIds ?? []}
                      onAgregar={(libroId) => handleAgregarLibro(col.id, libroId)}
                      onCerrar={() => setSelectorAbierto(null)}
                    />
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm gc-add-book-btn"
                      onClick={() => setSelectorAbierto(col.id)}
                    >
                      + Añadir libros
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirm eliminar */}
      {colAEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar esta colección?"
          mensaje={`"${colAEliminar.nombre}" será eliminada. Los ${librosEnColeccion(colAEliminar).length} libro(s) que contiene no serán afectados.`}
          labelOk="Eliminar colección"
          onConfirm={handleEliminar}
          onCancel={() => setColAEliminar(null)}
        />
      )}
    </div>
  );
}

/* ── Chip de libro dentro de colección ── */
function LibroChip({ libro, onQuitar }) {
  const portada = libro.portadaBase64 || libro.portadaUrl || null;

  return (
    <div className="gc-libro-chip">
      <div className="gc-libro-cover">
        {portada
          ? <img src={portada} alt={libro.titulo} className="gc-libro-cover-img" />
          : <div className="gc-libro-cover-fallback">{libro.titulo[0]}</div>
        }
        <button
          className="gc-libro-quitar"
          onClick={onQuitar}
          aria-label={`Quitar "${libro.titulo}" de la colección`}
          title="Quitar"
        >
          ✕
        </button>
      </div>
      <p className="gc-libro-titulo">{libro.titulo}</p>
    </div>
  );
}

/* ── Selector de libros para añadir ── */
function SelectorLibros({ libros, idsEnColeccion, onAgregar, onCerrar }) {
  const [busqueda, setBusqueda] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const librosDisponibles = useMemo(() =>
    libros
      .filter((l) => !idsEnColeccion.includes(l.id))
      .filter((l) => !busqueda || l.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
        l.autores?.toLowerCase().includes(busqueda.toLowerCase()))
  , [libros, idsEnColeccion, busqueda]);

  return (
    <div className="gc-selector">
      <div className="gc-selector-header">
        <h4>Añadir libros</h4>
        <button className="ge-card-btn" onClick={onCerrar} aria-label="Cerrar selector">✕</button>
      </div>

      <div className="gc-selector-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="search"
          className="gc-selector-search"
          placeholder="Buscar libro…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="gc-selector-list">
        {librosDisponibles.length === 0 ? (
          <p className="gc-selector-empty">
            {busqueda ? 'Sin resultados.' : 'Todos los libros ya están en esta colección.'}
          </p>
        ) : (
          librosDisponibles.map((libro) => (
            <button
              key={libro.id}
              className="gc-selector-item"
              onClick={() => onAgregar(libro.id)}
            >
              <div className="gc-selector-cover">
                {libro.portadaBase64 || libro.portadaUrl
                  ? <img src={libro.portadaBase64 || libro.portadaUrl} alt="" />
                  : <div className="gc-selector-cover-fallback">{libro.titulo[0]}</div>
                }
              </div>
              <div className="gc-selector-info">
                <span className="gc-selector-titulo">{libro.titulo}</span>
                {libro.autores && <span className="gc-selector-autor">{libro.autores.split(',')[0].trim()}</span>}
              </div>
              <span className="gc-selector-add" aria-hidden="true">+</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Formulario de nombre reutilizable ── */
function NombreForm({ inicial = '', placeholder, labelOk, onGuardar, onCancelar, loading, compact }) {
  const [valor, setValor] = useState(inicial);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!valor.trim()) { setError('El nombre es obligatorio.'); return; }
    if (valor.trim().length > 60) { setError('Máximo 60 caracteres.'); return; }
    onGuardar(valor.trim());
  };

  return (
    <form
      className={`gc-nombre-form ${compact ? 'gc-nombre-form--compact' : ''}`}
      onSubmit={handleSubmit}
      noValidate
      onClick={(e) => e.stopPropagation()}
    >
      <div className="gc-nombre-form-row">
        <input
          ref={inputRef}
          type="text"
          className={`form-input gc-nombre-input ${error ? 'form-input--error' : ''}`}
          value={valor}
          onChange={(e) => { setValor(e.target.value); setError(''); }}
          placeholder={placeholder}
          maxLength={60}
        />
        <div className="gc-nombre-form-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? '…' : labelOk}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelar} disabled={loading}>
            Cancelar
          </button>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
