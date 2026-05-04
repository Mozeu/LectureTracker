import React, { useState, useEffect } from 'react';
import { actualizarProgreso } from '../../db/db';
import './ActualizadorProgreso.css';

const FORMATOS = [
  { value: 'paginas',    label: 'Páginas'    },
  { value: 'porcentaje', label: 'Porcentaje' },
  { value: 'episodio',   label: 'Episodio'   },
  { value: 'tiempo',     label: 'Tiempo'     },
];

/**
 * ActualizadorProgreso — RF20
 * Widget interactivo dentro de BookDetailModal.
 * Al guardar: actualiza DB, registra fechaUltimaLectura.
 * Si llega al 100% dispara RF21 (autoTerminado).
 *
 * Props:
 *   libro          — objeto libro en vivo (de useLiveQuery en el modal)
 *   onAutoTerminado — callback si el progreso llega a 100%
 *   onSuccess / onError — feedback
 */
export function ActualizadorProgreso({ libro, onAutoTerminado, onSuccess, onError }) {
  const [formato,   setFormato]   = useState(libro.formatoProgreso ?? 'paginas');
  const [pagina,    setPagina]    = useState(libro.progresoPaginas ? String(libro.progresoPaginas) : '');
  const [porc,      setPorc]      = useState(libro.progresoPorc    ? String(libro.progresoPorc)    : '');
  const [episodio,  setEpisodio]  = useState(libro.progresoEpisodio ?? '');
  const [tiempo,    setTiempo]    = useState(libro.progresoTiempo   ?? '');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [guardado,  setGuardado]  = useState(false);

  // Sincronizar si cambia el libro desde afuera (useLiveQuery)
  useEffect(() => {
    setFormato(libro.formatoProgreso ?? 'paginas');
    setPagina(libro.progresoPaginas ? String(libro.progresoPaginas) : '');
    setPorc(libro.progresoPorc ? String(libro.progresoPorc) : '');
    setEpisodio(libro.progresoEpisodio ?? '');
    setTiempo(libro.progresoTiempo ?? '');
  }, [libro.id]); // solo al cambiar de libro, no en cada render

  // Porcentaje calculado en tiempo real (para la barra)
  const porcCalculado = (() => {
    if (libro.categoria === 'terminados') return 100;
    if (formato === 'porcentaje') return Math.min(100, Number(porc) || 0);
    if (formato === 'paginas' && pagina && libro.totalPaginas) {
      return Math.min(100, Math.round((Number(pagina) / libro.totalPaginas) * 100));
    }
    return libro.progresoPorc ?? 0;
  })();

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (formato === 'paginas') {
      if (!pagina) { setError('Ingresa el número de página actual.'); return; }
      if (isNaN(pagina) || Number(pagina) < 0) { setError('La página debe ser un número positivo.'); return; }
      if (libro.totalPaginas && Number(pagina) > libro.totalPaginas) {
        setError(`Este libro tiene ${libro.totalPaginas} páginas.`); return;
      }
    }
    if (formato === 'porcentaje') {
      if (!porc && porc !== '0') { setError('Ingresa el porcentaje avanzado.'); return; }
      if (isNaN(porc) || Number(porc) < 0 || Number(porc) > 100) {
        setError('El porcentaje debe estar entre 0 y 100.'); return;
      }
    }

    setLoading(true);
    try {
      const { autoTerminado } = await actualizarProgreso(libro.id, {
        formatoProgreso:  formato,
        progresoPaginas:  pagina    ? Number(pagina)   : null,
        progresoPorc:     porc      ? Number(porc)     : null,
        progresoEpisodio: episodio  || null,
        progresoTiempo:   tiempo    || null,
        totalPaginas:     libro.totalPaginas ?? null,
      });

      setGuardado(true);
      setTimeout(() => setGuardado(false), 2000);

      if (autoTerminado) {
        onAutoTerminado?.();
        onSuccess?.('¡Libro marcado como terminado! 🎉');
      } else {
        onSuccess?.('Progreso actualizado.');
      }
    } catch (err) {
      setError(err.message ?? 'No se pudo guardar el progreso.');
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const esTerminado = libro.categoria === 'terminados';

  return (
    <div className="actualizador">
      <div className="actualizador-header">
        <h3 className="actualizador-title">Actualizar progreso</h3>
        {libro.fechaUltimaLectura && (
          <span className="actualizador-ultima">
            Última lectura: {formatFecha(libro.fechaUltimaLectura)}
          </span>
        )}
      </div>

      {/* Barra de progreso visual */}
      <div className="actualizador-barra-wrap" aria-hidden="true">
        <div className="actualizador-barra">
          <div
            className={`actualizador-barra-fill ${esTerminado ? 'actualizador-barra-fill--done' : ''}`}
            style={{ width: `${porcCalculado}%` }}
          />
        </div>
        <span className="actualizador-barra-pct">
          {porcCalculado}%
          {esTerminado && ' ✓'}
        </span>
      </div>

      {esTerminado ? (
        <div className="actualizador-done">
          <span>🎉</span>
          <div>
            <p className="actualizador-done-title">¡Libro terminado!</p>
            {libro.fechaFin && (
              <p className="actualizador-done-fecha">
                Finalizado el {formatFecha(libro.fechaFin)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <form className="actualizador-form" onSubmit={handleGuardar} noValidate>
          {/* Selector de formato */}
          <div className="actualizador-formatos" role="group" aria-label="Formato de progreso">
            {FORMATOS.map((f) => (
              <label
                key={f.value}
                className={`actualizador-formato-opt ${formato === f.value ? 'actualizador-formato-opt--active' : ''}`}
              >
                <input
                  type="radio"
                  name="formato"
                  value={f.value}
                  checked={formato === f.value}
                  onChange={() => { setFormato(f.value); setError(''); }}
                  className="visually-hidden"
                />
                {f.label}
              </label>
            ))}
          </div>

          {/* Input dinámico según formato */}
          <div className="actualizador-input-row">
            {formato === 'paginas' && (
              <div className="actualizador-input-group">
                <input
                  type="number"
                  className="form-input actualizador-input"
                  value={pagina}
                  onChange={(e) => { setPagina(e.target.value); setError(''); }}
                  placeholder="Página actual"
                  min="0"
                  max={libro.totalPaginas || undefined}
                  aria-label="Página actual"
                />
                {libro.totalPaginas && (
                  <span className="actualizador-de">de {libro.totalPaginas}</span>
                )}
              </div>
            )}

            {formato === 'porcentaje' && (
              <div className="actualizador-input-group">
                <input
                  type="number"
                  className="form-input actualizador-input"
                  value={porc}
                  onChange={(e) => { setPorc(e.target.value); setError(''); }}
                  placeholder="0"
                  min="0"
                  max="100"
                  aria-label="Porcentaje completado"
                />
                <span className="actualizador-de">%</span>
              </div>
            )}

            {formato === 'episodio' && (
              <input
                type="text"
                className="form-input actualizador-input actualizador-input--wide"
                value={episodio}
                onChange={(e) => { setEpisodio(e.target.value); setError(''); }}
                placeholder="Ej. Episodio 3 / Cap. 12"
                aria-label="Episodio o capítulo actual"
              />
            )}

            {formato === 'tiempo' && (
              <input
                type="text"
                className="form-input actualizador-input actualizador-input--wide"
                value={tiempo}
                onChange={(e) => { setTiempo(e.target.value); setError(''); }}
                placeholder="Ej. 3h 20min"
                aria-label="Tiempo de escucha o lectura"
              />
            )}

            <button
              type="submit"
              className={`btn btn-sm actualizador-btn ${guardado ? 'actualizador-btn--saved' : 'btn-primary'}`}
              disabled={loading}
              aria-label="Guardar progreso"
            >
              {loading   ? '…'
               : guardado ? '✓ Guardado'
               : 'Guardar'}
            </button>
          </div>

          {error && (
            <p className="form-error" role="alert">{error}</p>
          )}

          {/* Fechas de lectura */}
          <div className="actualizador-fechas">
            {libro.fechaInicio && (
              <span className="actualizador-fecha-item">
                📅 Inicio: {formatFecha(libro.fechaInicio)}
              </span>
            )}
            {libro.fechaFin && (
              <span className="actualizador-fecha-item">
                🏁 Fin: {formatFecha(libro.fechaFin)}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

/* ── Helpers ── */
function formatFecha(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
