import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { crearEtiqueta, actualizarEtiqueta, eliminarEtiqueta } from '../../db/db';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import './GestionEtiquetas.css';

/* ── Paleta de colores predefinidos ── */
const COLORES = [
  '#8B4513', '#C4783C', '#D4A847', '#6B8C6E', '#4A7FA5',
  '#7B68A0', '#C0392B', '#27AE60', '#2980B9', '#8E44AD',
  '#D35400', '#16A085', '#2C3E50', '#7F8C8D', '#E74C3C',
];

/* ── Componente principal ── */
export function GestionEtiquetas({ onSuccess, onError }) {
  const etiquetas   = useLiveQuery(() => db.etiquetas.orderBy('nombre').toArray(), []);
  const libros      = useLiveQuery(() => db.libros.toArray(), []);

  const [formAbierto, setFormAbierto]           = useState(false);
  const [editando, setEditando]                 = useState(null); // etiqueta siendo editada
  const [etiquetaAEliminar, setEtiquetaAEliminar] = useState(null);
  const [loading, setLoading]                   = useState(false);

  /* Conteo de libros por etiqueta */
  const conteoLibros = (nombreTag) =>
    (libros ?? []).filter((l) => l.etiquetas?.includes(nombreTag)).length;

  const handleEliminar = async () => {
    if (!etiquetaAEliminar) return;
    setLoading(true);
    try {
      await eliminarEtiqueta(etiquetaAEliminar.id);
      onSuccess?.(`Etiqueta "${etiquetaAEliminar.nombre}" eliminada.`);
      setEtiquetaAEliminar(null);
    } catch {
      onError?.('No se pudo eliminar la etiqueta.');
    } finally {
      setLoading(false);
    }
  };

  if (etiquetas === undefined) return <div className="ge-loading">Cargando etiquetas…</div>;

  return (
    <div className="ge-container">
      {/* Cabecera */}
      <div className="ge-header">
        <div>
          <h1 className="ge-title">🏷️ Etiquetas</h1>
          <p className="ge-subtitle">
            {etiquetas.length === 0
              ? 'Crea etiquetas para organizar tu biblioteca.'
              : `${etiquetas.length} ${etiquetas.length === 1 ? 'etiqueta' : 'etiquetas'}`}
          </p>
        </div>
        {!formAbierto && !editando && (
          <button className="btn btn-primary" onClick={() => setFormAbierto(true)}>
            + Nueva etiqueta
          </button>
        )}
      </div>

      {/* Formulario de nueva etiqueta */}
      {formAbierto && (
        <EtiquetaForm
          onGuardar={async ({ nombre, color }) => {
            setLoading(true);
            try {
              await crearEtiqueta({ nombre, color });
              onSuccess?.(`Etiqueta "${nombre}" creada.`);
              setFormAbierto(false);
            } catch (e) {
              onError?.(e.message ?? 'Error al crear la etiqueta.');
            } finally {
              setLoading(false);
            }
          }}
          onCancelar={() => setFormAbierto(false)}
          loading={loading}
        />
      )}

      {/* Lista de etiquetas */}
      {etiquetas.length === 0 && !formAbierto ? (
        <div className="ge-empty">
          <p className="ge-empty-emoji">🏷️</p>
          <h2>Sin etiquetas todavía</h2>
          <p>Las etiquetas te ayudan a clasificar libros de forma flexible,<br />independientemente de su categoría.</p>
          <button className="btn btn-primary" onClick={() => setFormAbierto(true)}>
            Crear primera etiqueta
          </button>
        </div>
      ) : (
        <div className="ge-grid">
          {etiquetas.map((et) => (
            editando?.id === et.id ? (
              <EtiquetaForm
                key={et.id}
                inicial={et}
                onGuardar={async ({ nombre, color }) => {
                  setLoading(true);
                  try {
                    await actualizarEtiqueta(et.id, { nombre, color });
                    onSuccess?.(`Etiqueta actualizada.`);
                    setEditando(null);
                  } catch (e) {
                    onError?.(e.message ?? 'Error al actualizar.');
                  } finally {
                    setLoading(false);
                  }
                }}
                onCancelar={() => setEditando(null)}
                loading={loading}
              />
            ) : (
              <EtiquetaCard
                key={et.id}
                etiqueta={et}
                count={conteoLibros(et.nombre)}
                onEditar={() => setEditando(et)}
                onEliminar={() => setEtiquetaAEliminar(et)}
              />
            )
          ))}
        </div>
      )}

      {/* Confirm eliminar */}
      {etiquetaAEliminar && (
        <ConfirmDialog
          titulo="¿Eliminar esta etiqueta?"
          mensaje={
            conteoLibros(etiquetaAEliminar.nombre) > 0
              ? `Se eliminará "${etiquetaAEliminar.nombre}" de ${conteoLibros(etiquetaAEliminar.nombre)} libro(s). Los libros no serán eliminados.`
              : `Se eliminará la etiqueta "${etiquetaAEliminar.nombre}".`
          }
          labelOk="Eliminar etiqueta"
          onConfirm={handleEliminar}
          onCancel={() => setEtiquetaAEliminar(null)}
        />
      )}
    </div>
  );
}

/* ── Tarjeta de etiqueta ── */
function EtiquetaCard({ etiqueta, count, onEditar, onEliminar }) {
  return (
    <div className="ge-card" style={{ '--et-color': etiqueta.color }}>
      <div className="ge-card-dot" aria-hidden="true" />
      <div className="ge-card-body">
        <span className="ge-card-nombre">{etiqueta.nombre}</span>
        <span className="ge-card-count">
          {count} {count === 1 ? 'libro' : 'libros'}
        </span>
      </div>
      <div className="ge-card-actions">
        <button
          className="ge-card-btn"
          onClick={onEditar}
          aria-label={`Editar etiqueta ${etiqueta.nombre}`}
          title="Editar"
        >
          ✏️
        </button>
        <button
          className="ge-card-btn ge-card-btn--danger"
          onClick={onEliminar}
          aria-label={`Eliminar etiqueta ${etiqueta.nombre}`}
          title="Eliminar"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

/* ── Formulario inline de etiqueta ── */
function EtiquetaForm({ inicial, onGuardar, onCancelar, loading }) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [color,  setColor]  = useState(inicial?.color  ?? COLORES[0]);
  const [error,  setError]  = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (nombre.trim().length > 40) { setError('Máximo 40 caracteres.'); return; }
    onGuardar({ nombre: nombre.trim(), color });
  };

  return (
    <form className="ge-form" onSubmit={handleSubmit} noValidate>
      <div className="ge-form-row">
        {/* Preview del color seleccionado */}
        <div className="ge-form-preview" style={{ background: color }} aria-hidden="true" />

        <div className="ge-form-field">
          <input
            ref={inputRef}
            type="text"
            className={`form-input ge-form-input ${error ? 'form-input--error' : ''}`}
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setError(''); }}
            placeholder="Nombre de la etiqueta…"
            maxLength={40}
            aria-label="Nombre de la etiqueta"
          />
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="ge-form-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? '…' : (inicial ? 'Guardar' : 'Crear')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelar} disabled={loading}>
            Cancelar
          </button>
        </div>
      </div>

      {/* Paleta de colores */}
      <div className="ge-color-palette" role="group" aria-label="Elige un color">
        {COLORES.map((c) => (
          <button
            key={c}
            type="button"
            className={`ge-color-swatch ${color === c ? 'ge-color-swatch--active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
            title={c}
          />
        ))}
      </div>
    </form>
  );
}
