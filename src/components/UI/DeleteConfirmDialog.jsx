import React, { useEffect, useRef, useState } from 'react';
import { getDeleteImpact } from '../../db/db';
import './DeleteConfirmDialog.css';

/**
 * DeleteConfirmDialog — RF22, RF23
 * Fetches real impact data (note count, affected collections) before rendering
 * so the user knows exactly what will be destroyed.
 *
 * Props:
 *   bookIds   — array of book ids to delete (1 or many)
 *   bookTitle — display title for single-book confirmation
 *   onConfirm — async () => void
 *   onCancel  — () => void
 */
export function DeleteConfirmDialog({ bookIds = [], bookTitle, onConfirm, onCancel }) {
  const cancelRef               = useRef(null);
  const [impact, setImpact]     = useState(null);   // { noteCount, collectionNames }
  const [loading, setLoading]   = useState(true);
  const [confirming, setConfirming] = useState(false);

  const isBulk  = bookIds.length > 1;
  const isEmpty = bookIds.length === 0;

  // Fetch impact for the affected books
  useEffect(() => {
    if (isEmpty) return;

    let cancelled = false;

    const fetchImpact = async () => {
      try {
        if (isBulk) {
          // Aggregate impact across all selected books
          const results = await Promise.all(bookIds.map((id) => getDeleteImpact(id)));
          const totalNotes = results.reduce((sum, r) => sum + r.noteCount, 0);
          const allCollections = [...new Set(results.flatMap((r) => r.collectionNames))];
          if (!cancelled) setImpact({ noteCount: totalNotes, collectionNames: allCollections });
        } else {
          const result = await getDeleteImpact(bookIds[0]);
          if (!cancelled) setImpact(result);
        }
      } catch {
        if (!cancelled) setImpact({ noteCount: 0, collectionNames: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchImpact();
    return () => { cancelled = true; };
  }, [bookIds, isBulk, isEmpty]);

  // Focus management + ESC
  useEffect(() => {
    cancelRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !confirming) onCancel?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel, confirming]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm?.();
    } finally {
      setConfirming(false);
    }
  };

  const hasNotes       = impact?.noteCount > 0;
  const hasCollections = impact?.collectionNames?.length > 0;

  return (
    <div
      className="dcd-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget && !confirming) onCancel?.(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dcd-title"
    >
      <div className="dcd-dialog">
        {/* Icon */}
        <div className="dcd-icon" aria-hidden="true">
          {isBulk ? '🗑️' : '⚠️'}
        </div>

        {/* Title */}
        <h2 id="dcd-title" className="dcd-title">
          {isBulk
            ? `¿Eliminar ${bookIds.length} libros?`
            : '¿Eliminar este libro?'}
        </h2>

        {/* Book name for single */}
        {!isBulk && bookTitle && (
          <p className="dcd-book-name">"{bookTitle}"</p>
        )}

        {/* Impact section */}
        <div className="dcd-impact">
          {loading ? (
            <div className="dcd-impact-loading">
              <div className="dcd-spinner" aria-hidden="true" />
              <span>Calculando impacto…</span>
            </div>
          ) : (
            <>
              {/* Always-on: the book(s) themselves */}
              <div className="dcd-impact-row dcd-impact-row--primary">
                <span className="dcd-impact-icon">📚</span>
                <span>
                  {isBulk
                    ? `${bookIds.length} libros eliminados permanentemente`
                    : 'El libro será eliminado permanentemente'}
                </span>
              </div>

              {/* Notes cascade — RF23 */}
              {hasNotes && (
                <div className="dcd-impact-row">
                  <span className="dcd-impact-icon">📝</span>
                  <span>
                    {impact.noteCount} {impact.noteCount === 1 ? 'nota' : 'notas'} asociadas serán eliminadas
                  </span>
                </div>
              )}

              {/* Collection unlink — RF23 */}
              {hasCollections && (
                <div className="dcd-impact-row">
                  <span className="dcd-impact-icon">📂</span>
                  <span>
                    Desvinculado de{' '}
                    {impact.collectionNames.length === 1
                      ? `la colección "${impact.collectionNames[0]}"`
                      : `${impact.collectionNames.length} colecciones`}
                  </span>
                </div>
              )}

              {!hasNotes && !hasCollections && (
                <div className="dcd-impact-row dcd-impact-row--minor">
                  <span className="dcd-impact-icon">✓</span>
                  <span>Sin notas ni colecciones asociadas</span>
                </div>
              )}
            </>
          )}
        </div>

        <p className="dcd-warning">Esta acción no se puede deshacer.</p>

        {/* Actions */}
        <div className="dcd-actions">
          <button
            ref={cancelRef}
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={confirming}
          >
            Cancelar
          </button>
          <button
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={loading || confirming}
          >
            {confirming
              ? 'Eliminando…'
              : isBulk
                ? `Eliminar ${bookIds.length} libros`
                : 'Eliminar libro'}
          </button>
        </div>
      </div>
    </div>
  );
}
