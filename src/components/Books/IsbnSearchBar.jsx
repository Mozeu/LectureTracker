import React, { useState, useRef, useCallback, useEffect } from 'react';
import { lookupByISBN, downloadCoverAsBase64, getISBNError, LookupError } from '../../utils/isbnLookup';
import './IsbnSearchBar.css';

/**
 * IsbnSearchBar — Module 12 (RF30–RF40)
 * Self-contained ISBN search widget inside BookForm.
 *
 * Props:
 *   initialValue   — current isbn from form
 *   onIsbnChange   — (value) => void  syncs form.isbn
 *   onAutocomplete — (fields) => void  fills form fields (RF34)
 *   disabled       — bool
 */
export function IsbnSearchBar({ initialValue = '', onIsbnChange, onAutocomplete, disabled }) {
  const [isbn,        setIsbn]        = useState(initialValue);
  const [status,      setStatus]      = useState('idle');
  // status: 'idle' | 'searching' | 'success' | 'error'
  const [result,      setResult]      = useState(null);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [coverStatus, setCoverStatus] = useState('idle');
  // coverStatus: 'idle' | 'loading' | 'ready' | 'failed'
  const [coverB64,    setCoverB64]    = useState(null);

  const inputRef   = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Sync if parent resets
  useEffect(() => { setIsbn(initialValue); }, [initialValue]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setErrorMsg('');
    setCoverStatus('idle');
    setCoverB64(null);
  }, []);

  const handleIsbnInput = useCallback((e) => {
    const val = e.target.value;
    setIsbn(val);
    onIsbnChange?.(val);
    if (status !== 'idle') reset();
  }, [status, onIsbnChange, reset]);

  // ── Search — RF32, RF33 ────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    // RF31: validate before calling API
    const fmtError = getISBNError(isbn);
    if (fmtError) {
      setErrorMsg(fmtError);
      setStatus('error');
      inputRef.current?.focus();
      return;
    }

    setStatus('searching');
    setErrorMsg('');
    setResult(null);
    setCoverStatus('idle');
    setCoverB64(null);

    try {
      const data = await lookupByISBN(isbn);
      if (!mountedRef.current) return;

      setResult(data);
      setStatus('success');

      // RF38: download cover in background (non-blocking)
      if (data._coverUrl) {
        setCoverStatus('loading');
        downloadCoverAsBase64(data._coverUrl).then((b64) => {
          if (!mountedRef.current) return;
          setCoverStatus(b64 ? 'ready' : 'failed');
          if (b64) setCoverB64(b64);
        });
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus('error');
      setErrorMsg(
        err instanceof LookupError
          ? err.message
          : 'Error de red. Comprueba tu conexión e inténtalo de nuevo.'  // RF37
      );
    }
  }, [isbn]);

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } };

  // RF39: confirm fills form but does NOT save
  const handleConfirm = useCallback(() => {
    if (!result) return;
    const fields = { ...result };
    delete fields._coverUrl;

    // Use best available cover: Base64 if ready, URL as fallback if still loading
    if (coverB64) {
      fields.portadaBase64 = coverB64;
      fields.portadaUrl    = '';
    } else if (result._coverUrl) {
      // Use URL as fallback — even if still loading, better than nothing
      fields.portadaUrl    = result._coverUrl;
      fields.portadaBase64 = '';
    }

    onAutocomplete?.(fields);
    reset();
  }, [result, coverB64, coverStatus, onAutocomplete, reset]);

  const isSearching = status === 'searching';

  return (
    <div className="isbn-search">
      {/* Label row */}
      <div className="isbn-label-row">
        <label htmlFor="isbn-field" className="form-label">ISBN</label>
        <span className="isbn-hint">10 o 13 dígitos · Open Library</span>
      </div>

      {/* Input + button — RF30 */}
      <div className="isbn-row">
        <input
          ref={inputRef}
          id="isbn-field"
          type="text"
          inputMode="numeric"
          className={`form-input isbn-input ${status === 'error' ? 'form-input--error' : ''}`}
          value={isbn}
          onChange={handleIsbnInput}
          onKeyDown={handleKeyDown}
          placeholder="978-XXXX-XXXX-X"
          maxLength={20}
          disabled={disabled || isSearching}
          aria-label="ISBN del libro"
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? 'isbn-err' : undefined}
        />

        <button
          type="button"
          className="btn btn-secondary isbn-btn"
          onClick={handleSearch}
          disabled={disabled || isSearching || !isbn.trim()}
          aria-label="Buscar libro por ISBN"
        >
          {isSearching ? (
            <><span className="isbn-spinner" aria-hidden="true" /> Buscando…</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Buscar ISBN
            </>
          )}
        </button>
      </div>

      {/* RF31, RF36, RF37: error states */}
      {status === 'error' && (
        <div className="isbn-error" id="isbn-err" role="alert">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{errorMsg}</span>
          {/* RF37: retry for network errors */}
          {(errorMsg.includes('red') || errorMsg.includes('conectar') || errorMsg.includes('Open Library')) && (
            <button type="button" className="isbn-retry-btn" onClick={handleSearch}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* RF34: result preview card */}
      {status === 'success' && result && (
        <div className="isbn-card" role="region" aria-label="Libro encontrado">

          <div className="isbn-card-head">
            <span className="isbn-found-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Encontrado en Open Library
            </span>
            <button type="button" className="isbn-dismiss" onClick={reset} aria-label="Cerrar">✕</button>
          </div>

          <div className="isbn-card-body">
            {/* RF38: cover preview */}
            <div className="isbn-cover-wrap" aria-hidden="true">
              {coverStatus === 'loading' && (
                <div className="isbn-cover-loader"><span className="isbn-spinner isbn-spinner--sm" /></div>
              )}
              {coverStatus === 'ready' && coverB64 && (
                <img src={coverB64} alt="Portada" className="isbn-cover-img" />
              )}
              {(coverStatus === 'failed' || (!result._coverUrl && coverStatus === 'idle')) && (
                <div className="isbn-cover-empty">📖</div>
              )}
            </div>

            <div className="isbn-card-info">
              <p className="isbn-card-title">{result.titulo || '—'}</p>

              {result.autores && (
                <p className="isbn-card-authors">{result.autores}</p>
              )}

              <div className="isbn-card-meta">
                {result.editorial        && <span>{result.editorial}</span>}
                {result.fechaPublicacion && <span>{result.fechaPublicacion}</span>}
                {result.totalPaginas     && <span>{result.totalPaginas} págs.</span>}
                {result.idioma           && <span className="isbn-card-lang">{result.idioma.toUpperCase()}</span>}
              </div>

              {result.descripcion && (
                <p className="isbn-card-desc">
                  {result.descripcion.slice(0, 200)}
                  {result.descripcion.length > 200 ? '…' : ''}
                </p>
              )}

              {result.etiquetas && (
                <div className="isbn-card-tags">
                  {result.etiquetas.split(',').filter(Boolean).map((t) => (
                    <span key={t} className="isbn-tag">{t.trim()}</span>
                  ))}
                </div>
              )}

              {/* Cover feedback */}
              {coverStatus === 'loading' && (
                <p className="isbn-cover-msg">Descargando portada…</p>
              )}
              {coverStatus === 'failed' && (
                <p className="isbn-cover-msg isbn-cover-msg--warn">
                  No se pudo descargar la portada. Puedes añadirla manualmente.
                </p>
              )}
            </div>
          </div>

          {/* RF35, RF39: confirm — fills form but does NOT save */}
          <div className="isbn-card-foot">
            <p className="isbn-editable-note">
              ✏️ Todos los campos son editables después del autocompletado.
            </p>
            <div className="isbn-card-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>
                Ignorar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirm}
              >
                ✓ Usar estos datos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RF40: attribution + privacy note */}
      <p className="isbn-attribution">
        Datos:{' '}
        <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer">
          Open Library
        </a>
        {' '}· Petición directa desde tu navegador, sin intermediarios.
      </p>
    </div>
  );
}
