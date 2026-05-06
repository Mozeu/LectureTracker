import React, { useState, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/db';
import {
  exportAll,
  parseImportFile,
  previewBookImport,
  importBook,
  importAll,
} from '../../utils/exportImport';
import './ExportImportPanel.css';

/**
 * ExportImportPanel — RF26, RF27, RF28
 * Handles full backup export, file selection, validation, preview, and import.
 */
export function ExportImportPanel({ onSuccess, onError }) {
  const bookCount = useLiveQuery(() => db.libros.count(), []);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Import state machine: idle → parsed → previewing → importing → done
  const [importStep, setImportStep]     = useState('idle');
  const [importFile, setImportFile]     = useState(null);
  const [importPayload, setImportPayload] = useState(null);
  const [importType,    setImportType]    = useState(null);   // 'book' | 'full'
  const [importPreview, setImportPreview] = useState(null);   // book duplicate info
  const [importStrategy, setImportStrategy] = useState('merge'); // 'merge' | 'replace' | 'add' | 'skip'
  const [importError,   setImportError]   = useState('');
  const [importing,     setImporting]     = useState(false);
  const [importResult,  setImportResult]  = useState(null);

  const fileInputRef = useRef(null);
  const dropRef      = useRef(null);

  // ── Export all — RF26 ──────────────────────────────────────────────────────
  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      const filename = await exportAll();
      onSuccess?.(`Backup exportado como ${filename}`);
    } catch (e) {
      onError?.(e.message ?? 'Error al exportar.');
    } finally {
      setExporting(false);
    }
  }, [onSuccess, onError]);

  // ── File selection / drop ──────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (file) => {
    setImportError('');
    setImportResult(null);
    setImportPayload(null);
    setImportType(null);
    setImportPreview(null);

    try {
      const { payload, type } = await parseImportFile(file); // RF28 validation
      setImportFile(file);
      setImportPayload(payload);
      setImportType(type);

      // Pre-compute preview for book imports
      if (type === 'book') {
        const preview = await previewBookImport(payload);
        setImportPreview(preview);
        setImportStrategy(preview.duplicate ? 'skip' : 'add');
      } else {
        setImportStrategy('merge');
      }

      setImportStep('previewing');
    } catch (e) {
      setImportError(e.message);
      setImportStep('idle');
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = ''; // reset so same file can be re-selected
  }, [handleFileSelect]);

  // Drag & drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dropRef.current?.classList.remove('eip-drop--over');
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    dropRef.current?.classList.add('eip-drop--over');
  }, []);

  const handleDragLeave = useCallback(() => {
    dropRef.current?.classList.remove('eip-drop--over');
  }, []);

  // ── Confirm import — RF27 ──────────────────────────────────────────────────
  const handleConfirmImport = useCallback(async () => {
    setImporting(true);
    setImportError('');
    try {
      let result;
      if (importType === 'book') {
        result = await importBook(importPayload, { strategy: importStrategy });
        if (result.skipped) {
          onSuccess?.(`Importación omitida: ${result.reason}`);
        } else {
          onSuccess?.(`"${result.title}" añadido a la biblioteca.`);
        }
      } else {
        result = await importAll(importPayload, { strategy: importStrategy });
        onSuccess?.(
          `Backup importado: ${result.books} libro(s), ${result.notes} nota(s), ` +
          `${result.tags} etiqueta(s), ${result.collections} colección/es.`
        );
      }
      setImportResult(result);
      setImportStep('done');
    } catch (e) {
      setImportError(e.message ?? 'Error durante la importación.');
    } finally {
      setImporting(false);
    }
  }, [importType, importPayload, importStrategy, onSuccess, onError]);

  const resetImport = useCallback(() => {
    setImportStep('idle');
    setImportFile(null);
    setImportPayload(null);
    setImportType(null);
    setImportPreview(null);
    setImportStrategy('merge');
    setImportError('');
    setImportResult(null);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="eip-container">

      {/* ── Export section — RF26 ── */}
      <div className="eip-section">
        <h3 className="eip-section-title">Exportar</h3>

        <div className="eip-export-cards">
          {/* Full backup */}
          <div className="eip-export-card">
            <div className="eip-export-card-icon" aria-hidden="true">💾</div>
            <div className="eip-export-card-info">
              <p className="eip-export-card-name">Backup completo</p>
              <p className="eip-export-card-desc">
                Todos los libros, notas, etiquetas, colecciones y configuración
                {bookCount != null ? ` — ${bookCount} libro${bookCount !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleExportAll}
              disabled={exporting || !bookCount}
            >
              {exporting ? '…' : '⬇ Exportar todo'}
            </button>
          </div>

          {/* Per-book note */}
          <div className="eip-export-card eip-export-card--note">
            <div className="eip-export-card-icon" aria-hidden="true">📖</div>
            <div className="eip-export-card-info">
              <p className="eip-export-card-name">Exportar un libro</p>
              <p className="eip-export-card-desc">
                Disponible en la vista detalle de cada libro (botón "⬇ Exportar JSON").
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Import section — RF27, RF28 ── */}
      <div className="eip-section">
        <h3 className="eip-section-title">Importar</h3>

        {importStep === 'idle' && (
          <>
            {/* Drop zone */}
            <div
              ref={dropRef}
              className="eip-drop"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              aria-label="Seleccionar archivo JSON para importar"
            >
              <span className="eip-drop-icon" aria-hidden="true">📂</span>
              <p className="eip-drop-label">Arrastra aquí o haz clic para seleccionar</p>
              <p className="eip-drop-hint">Archivos .json exportados desde esta app</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="visually-hidden"
              onChange={handleInputChange}
              aria-label="Seleccionar archivo JSON"
            />

            {/* RF28 — validation error */}
            {importError && (
              <div className="eip-error" role="alert">
                <span aria-hidden="true">⚠️</span>
                <div>
                  <p className="eip-error-title">Archivo no válido</p>
                  <p className="eip-error-desc">{importError}</p>
                </div>
              </div>
            )}
          </>
        )}

        {importStep === 'previewing' && importPayload && (
          <div className="eip-preview">
            {/* File info */}
            <div className="eip-preview-file">
              <span aria-hidden="true">{importType === 'full' ? '💾' : '📖'}</span>
              <div>
                <p className="eip-preview-filename">{importFile?.name}</p>
                <p className="eip-preview-meta">
                  {importType === 'full'
                    ? `Backup completo — ${importPayload.books?.length ?? 0} libro(s), ${importPayload.notes?.length ?? 0} nota(s)`
                    : `Libro — "${importPayload.book?.titulo}"`}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={resetImport}>
                ✕
              </button>
            </div>

            {/* Strategy selector */}
            {importType === 'full' ? (
              <div className="eip-strategy">
                <p className="eip-strategy-label">Estrategia de importación:</p>
                <div className="eip-strategy-opts">
                  <label className={`eip-strategy-opt ${importStrategy === 'merge' ? 'eip-strategy-opt--active' : ''}`}>
                    <input
                      type="radio"
                      name="strategy"
                      value="merge"
                      checked={importStrategy === 'merge'}
                      onChange={() => setImportStrategy('merge')}
                      className="visually-hidden"
                    />
                    <span className="eip-strategy-icon">🔀</span>
                    <div>
                      <span className="eip-strategy-name">Fusionar</span>
                      <span className="eip-strategy-desc">Añade lo nuevo, mantiene lo existente</span>
                    </div>
                  </label>
                  <label className={`eip-strategy-opt ${importStrategy === 'replace' ? 'eip-strategy-opt--active eip-strategy-opt--danger' : ''}`}>
                    <input
                      type="radio"
                      name="strategy"
                      value="replace"
                      checked={importStrategy === 'replace'}
                      onChange={() => setImportStrategy('replace')}
                      className="visually-hidden"
                    />
                    <span className="eip-strategy-icon">🔄</span>
                    <div>
                      <span className="eip-strategy-name">Reemplazar</span>
                      <span className="eip-strategy-desc">Borra todo y restaura el backup</span>
                    </div>
                  </label>
                </div>

                {importStrategy === 'replace' && (
                  <div className="eip-danger-warning" role="alert">
                    ⚠️ <strong>Atención:</strong> todos los libros, notas, etiquetas y colecciones actuales serán eliminados permanentemente antes de importar.
                  </div>
                )}
              </div>
            ) : (
              importPreview?.duplicate && (
                <div className="eip-strategy">
                  <p className="eip-strategy-label">ISBN duplicado detectado:</p>
                  <div className="eip-strategy-opts">
                    <label className={`eip-strategy-opt ${importStrategy === 'skip' ? 'eip-strategy-opt--active' : ''}`}>
                      <input type="radio" name="strategy-book" value="skip"
                        checked={importStrategy === 'skip'}
                        onChange={() => setImportStrategy('skip')}
                        className="visually-hidden"
                      />
                      <span className="eip-strategy-icon">⏭</span>
                      <div>
                        <span className="eip-strategy-name">Omitir</span>
                        <span className="eip-strategy-desc">No importar (ya existe "{importPreview.existingTitle}")</span>
                      </div>
                    </label>
                    <label className={`eip-strategy-opt ${importStrategy === 'add' ? 'eip-strategy-opt--active' : ''}`}>
                      <input type="radio" name="strategy-book" value="add"
                        checked={importStrategy === 'add'}
                        onChange={() => setImportStrategy('add')}
                        className="visually-hidden"
                      />
                      <span className="eip-strategy-icon">➕</span>
                      <div>
                        <span className="eip-strategy-name">Añadir igualmente</span>
                        <span className="eip-strategy-desc">Crea un segundo ejemplar</span>
                      </div>
                    </label>
                  </div>
                </div>
              )
            )}

            {importError && (
              <div className="eip-error" role="alert">
                <span aria-hidden="true">⚠️</span>
                <div>
                  <p className="eip-error-title">Error al importar</p>
                  <p className="eip-error-desc">{importError}</p>
                </div>
              </div>
            )}

            <div className="eip-preview-actions">
              <button className="btn btn-secondary btn-sm" onClick={resetImport} disabled={importing}>
                Cancelar
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleConfirmImport} disabled={importing}>
                {importing ? 'Importando…' : `✓ Confirmar importación`}
              </button>
            </div>
          </div>
        )}

        {importStep === 'done' && (
          <div className="eip-done">
            <span className="eip-done-icon" aria-hidden="true">✅</span>
            <p className="eip-done-title">¡Importación completada!</p>
            {importType === 'full' && importResult && (
              <p className="eip-done-desc">
                {importResult.books} libro(s) · {importResult.notes} nota(s) · {importResult.tags} etiqueta(s) · {importResult.collections} colección/es
              </p>
            )}
            {importType === 'book' && importResult && (
              <p className="eip-done-desc">
                {importResult.skipped ? `Omitido: ${importResult.reason}` : `"${importResult.title}" añadido.`}
              </p>
            )}
            <button className="btn btn-secondary btn-sm" onClick={resetImport}>
              Importar otro archivo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
