import React, { useState, useRef, useCallback } from 'react';
import {
  validateISBN,
  searchByISBN,
  mapVolumeInfoToForm,
  downloadCoverAsBase64,
} from '../../utils/isbnSearch';
import './IsbnSearchBar.css';

/**
 * IsbnSearchBar — RF30–RF40
 *
 * A self-contained ISBN lookup widget that sits inside BookForm.
 * It manages its own search state and calls onAutocomplete(fields)
 * with the mapped data — BookForm decides how to merge it.
 *
 * Props:
 *   initialValue    — current ISBN value from form state
 *   onIsbnChange    — (value) => void  keep form.isbn in sync
 *   onAutocomplete  — (fields: Partial<FormState>) => void
 *   disabled        — bool
 */
export function IsbnSearchBar({ initialValue = '', onIsbnChange, onAutocomplete, disabled }) {
  const [isbn,    setIsbn]    = useState(initialValue);
  const [status,  setStatus]  = useState('idle'); // idle | loading | success | not_found | error
  const [message, setMessage] = useState('');
  const [filledFields, setFilledFields] = useState([]); // field names autocompleted
  const [coverLoading, setCoverLoading] = useState(false);

  const inputRef = useRef(null);

  const handleIsbnInput = useCallback((e) => {
    const value = e.target.value;
    setIsbn(value);
    onIsbnChange?.(value);
    // Clear status when user edits
    if (status !== 'idle') {
      setStatus('idle');
      setMessage('');
      setFilledFields([]);
    }
  }, [onIsbnChange, status]);

  const handleSearch = useCallback(async () => {
    // RF31 — validate before calling API
    const { valid, cleaned, error } = validateISBN(isbn);
    if (!valid) {
      setStatus('error');
      setMessage(error);
      inputRef.current?.focus();
      return;
    }

    setStatus('loading');
    setMessage('');
    setFilledFields([]);

    try {
      // RF32, RF33 — fetch from Google Books
      const { volumeInfo, coverUrl } = await searchByISBN(cleaned);

      // RF34 — map fields
      const mappedFields = mapVolumeInfoToForm(volumeInfo);

      // RF38 — download cover as Base64 (async, non-blocking)
      let coverBase64 = null;
      if (coverUrl) {
        setCoverLoading(true);
        coverBase64 = await downloadCoverAsBase64(coverUrl);
        setCoverLoading(false);

        if (!coverBase64) {
          // RF38 — download failed, notify but don't block
          setMessage('Datos autoccompletados. No se pudo descargar la portada (se puede subir manualmente).');
        }
      }

      // Build autocomplete payload
      const autocompleteData = { ...mappedFields };
      if (coverBase64) autocompleteData.portadaBase64 = coverBase64;

      // Track which fields were filled for the success badge
      const filled = Object.keys(autocompleteData).filter((k) => k !== '_generoSugerido');
      setFilledFields(filled);

      // RF34, RF35 — pass to parent; parent applies non-destructively
      onAutocomplete?.(autocompleteData);

      setStatus('success');
      if (!message) setMessage(''); // clear any leftover

    } catch (err) {
      setCoverLoading(false);
      setStatus(err.type === 'not_found' ? 'not_found' : 'error');
      setMessage(err.message ?? 'Error inesperado. Intenta de nuevo o ingresa los datos manualmente.');
    }
  }, [isbn, onAutocomplete, message]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  const handleReset = useCallback(() => {
    setStatus('idle');
    setMessage('');
    setFilledFields([]);
    inputRef.current?.focus();
  }, []);

  const isLoading = status === 'loading' || coverLoading;

  return (
    <div className="isbn-bar" aria-label="Buscar libro por ISBN">
      {/* ── Input + button row — RF30 ── */}
      <div className="isbn-bar-row">
        <div className="isbn-bar-input-wrap">
          <label htmlFor="isbn-search-input" className="form-label">
            ISBN
            <span className="isbn-bar-hint-label"> (10 o 13 dígitos)</span>
          </label>
          <div className="isbn-bar-input-group">
            <input
              ref={inputRef}
              id="isbn-search-input"
              type="text"
              className={`form-input isbn-bar-input ${status === 'error' || status === 'not_found' ? 'form-input--error' : ''} ${status === 'success' ? 'isbn-bar-input--success' : ''}`}
              value={isbn}
              onChange={handleIsbnInput}
              onKeyDown={handleKeyDown}
              placeholder="978-XXXXXXXXXX"
              maxLength={20}
              disabled={disabled || isLoading}
              aria-label="Número ISBN del libro"
              aria-describedby={message ? 'isbn-feedback' : undefined}
              autoComplete="off"
            />

            {/* RF32 — search button */}
            <button
              type="button"
              className={`btn btn-secondary isbn-bar-btn ${isLoading ? 'isbn-bar-btn--loading' : ''}`}
              onClick={handleSearch}
              disabled={disabled || isLoading || !isbn.trim()}
              aria-label="Buscar libro por ISBN en Google Books"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  {/* RF33 — spinner */}
                  <span className="isbn-spinner" aria-hidden="true" />
                  <span>{coverLoading ? 'Descargando portada…' : 'Buscando…'}</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  Buscar por ISBN
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Feedback area — RF36, RF37, RF38 ── */}
      {status !== 'idle' && (
        <div
          id="isbn-feedback"
          className={`isbn-bar-feedback isbn-bar-feedback--${status}`}
          role={status === 'error' || status === 'not_found' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {status === 'success' && (
            <>
              <span className="isbn-feedback-icon" aria-hidden="true">✓</span>
              <div className="isbn-feedback-body">
                <p className="isbn-feedback-title">
                  ¡Libro encontrado!
                  {filledFields.length > 0 && (
                    <span className="isbn-feedback-count">
                      {' '}{filledFields.length} campo{filledFields.length !== 1 ? 's' : ''} completado{filledFields.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
                {/* RF35 — hint about manual editing */}
                <p className="isbn-feedback-sub">
                  Puedes editar cualquier campo antes de guardar.
                  {message && ` ${message}`}
                </p>
                {filledFields.length > 0 && (
                  <div className="isbn-filled-tags">
                    {filledFields.map((f) => (
                      <span key={f} className="isbn-filled-tag">{FIELD_LABELS[f] ?? f}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="isbn-retry-btn"
                onClick={handleReset}
                aria-label="Buscar otro ISBN"
              >
                Buscar otro
              </button>
            </>
          )}

          {/* RF36 — not found */}
          {status === 'not_found' && (
            <>
              <span className="isbn-feedback-icon" aria-hidden="true">🔍</span>
              <div className="isbn-feedback-body">
                <p className="isbn-feedback-title">No encontrado</p>
                <p className="isbn-feedback-sub">{message}</p>
              </div>
              <button type="button" className="isbn-retry-btn" onClick={handleReset}>
                Reintentar
              </button>
            </>
          )}

          {/* RF37 — network / api error */}
          {status === 'error' && (
            <>
              <span className="isbn-feedback-icon" aria-hidden="true">⚠️</span>
              <div className="isbn-feedback-body">
                <p className="isbn-feedback-title">Error en la búsqueda</p>
                <p className="isbn-feedback-sub">{message}</p>
              </div>
              <button type="button" className="isbn-retry-btn" onClick={handleReset}>
                Reintentar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Field label map for the success badge ── */
const FIELD_LABELS = {
  titulo:           'Título',
  autores:          'Autores',
  editorial:        'Editorial',
  fechaPublicacion: 'Año',
  descripcion:      'Descripción',
  totalPaginas:     'Páginas',
  idioma:           'Idioma',
  portadaBase64:    'Portada',
};
