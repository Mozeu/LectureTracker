import React, { useState, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { crearNota, actualizarNota, eliminarNota } from '../../db/db';
import { RichEditor } from './RichEditor';
import { NotaCard } from './NotaCard';
import './PanelNotas.css';

/**
 * PanelNotas — RF17, RF18, RF19
 * Panel completo de notas enriquecidas para un libro.
 * Se monta dentro de BookDetailModal.
 */
export function PanelNotas({ libroId, totalPaginas }) {
  const notas = useLiveQuery(
    async () => {
      const todas = await db.notas.where('libroId').equals(libroId).toArray();
      return todas.sort((a, b) => {
        if (a.pagina !== null && b.pagina !== null) return a.pagina - b.pagina;
        if (a.pagina !== null) return -1;
        if (b.pagina !== null) return 1;
        return new Date(a.fecha) - new Date(b.fecha);
      });
    },
    [libroId]
  );

  const [formAbierto, setFormAbierto]   = useState(false);
  const [notaEditando, setNotaEditando] = useState(null); // nota completa para editar

  const handleGuardar = useCallback(async (datos) => {
    if (notaEditando) {
      await actualizarNota(notaEditando.id, datos);
      setNotaEditando(null);
    } else {
      await crearNota({ libroId, ...datos });
      setFormAbierto(false);
    }
  }, [libroId, notaEditando]);

  const handleEliminar = useCallback(async (nota) => {
    await eliminarNota(nota.id);
  }, []);

  const handleEditar = useCallback((nota) => {
    setNotaEditando(nota);
    setFormAbierto(false);
  }, []);

  const handleCancelar = useCallback(() => {
    setFormAbierto(false);
    setNotaEditando(null);
  }, []);

  if (notas === undefined) {
    return <div className="panel-notas-loading">Cargando notas…</div>;
  }

  return (
    <div className="panel-notas">
      {/* ── Cabecera ── */}
      <div className="panel-notas-header">
        <div className="panel-notas-title-row">
          <h3 className="panel-notas-title">
            Notas
            {notas.length > 0 && (
              <span className="panel-notas-count">{notas.length}</span>
            )}
          </h3>
          {!formAbierto && !notaEditando && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setFormAbierto(true)}
            >
              + Nueva nota
            </button>
          )}
        </div>
        <p className="panel-notas-hint">
          Las notas se pueden asociar a una página concreta o a una fecha de lectura.
        </p>
      </div>

      {/* ── Formulario de nueva nota / edición ── */}
      {(formAbierto || notaEditando) && (
        <FormNota
          inicial={notaEditando}
          totalPaginas={totalPaginas}
          onGuardar={handleGuardar}
          onCancelar={handleCancelar}
        />
      )}

      {/* ── Lista de notas — RF18 ── */}
      {notas.length === 0 && !formAbierto ? (
        <div className="panel-notas-empty">
          <p>✍️</p>
          <p>Aún no hay notas para este libro.</p>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setFormAbierto(true)}
          >
            Añadir primera nota
          </button>
        </div>
      ) : (
        <div className="panel-notas-lista">
          {notas.map((nota) =>
            notaEditando?.id === nota.id ? null : (
              <NotaCard
                key={nota.id}
                nota={nota}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ── Formulario de nota — RF17 ── */
function FormNota({ inicial, totalPaginas, onGuardar, onCancelar }) {
  const editorRef               = useRef(null);
  const [pagina, setPagina]     = useState(inicial?.pagina ? String(inicial.pagina) : '');
  const [fecha, setFecha]       = useState(inicial?.fecha ?? hoy());
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editorRef.current || editorRef.current.isEmpty()) {
      setError('Escribe algo en la nota antes de guardar.');
      editorRef.current?.focus();
      return;
    }

    if (pagina && (isNaN(pagina) || Number(pagina) < 1)) {
      setError('El número de página debe ser un entero mayor que 0.');
      return;
    }

    if (totalPaginas && pagina && Number(pagina) > totalPaginas) {
      setError(`Este libro tiene ${totalPaginas} páginas.`);
      return;
    }

    setLoading(true);
    try {
      await onGuardar({
        pagina:     pagina ? Number(pagina) : null,
        fecha,
        texto:      editorRef.current.getHTML(),
        textoPlano: editorRef.current.getText(),
      });
    } catch {
      setError('No se pudo guardar la nota. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form-nota" onSubmit={handleSubmit} noValidate>
      {/* Meta: página + fecha */}
      <div className="form-nota-meta">
        <div className="form-group form-nota-pagina">
          <label htmlFor="nota-pagina" className="form-label">Página</label>
          <input
            id="nota-pagina"
            type="number"
            className="form-input"
            value={pagina}
            onChange={(e) => { setPagina(e.target.value); setError(''); }}
            placeholder="—"
            min="1"
            max={totalPaginas || undefined}
          />
        </div>

        <div className="form-group form-nota-fecha">
          <label htmlFor="nota-fecha" className="form-label">Fecha</label>
          <input
            id="nota-fecha"
            type="date"
            className="form-input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
      </div>

      {/* Editor enriquecido — RF17 */}
      <div className="form-nota-editor">
        <RichEditor
          ref={editorRef}
          placeholder="Escribe tu nota, reflexión o cita favorita…"
          initialHTML={inicial?.texto ?? ''}
          onChange={() => { if (error) setError(''); }}
        />
      </div>

      {error && (
        <p className="form-error form-nota-error" role="alert">{error}</p>
      )}

      {/* Acciones */}
      <div className="form-nota-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
          {loading ? '…' : (inicial ? '💾 Guardar cambios' : '✓ Guardar nota')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelar} disabled={loading}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/* ── Utilidades ── */
function hoy() {
  return new Date().toISOString().split('T')[0];
}
