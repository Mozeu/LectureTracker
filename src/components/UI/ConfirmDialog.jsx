import React, { useEffect, useRef } from 'react';
import './ConfirmDialog.css';

/**
 * ConfirmDialog — RF22
 * Props:
 *   titulo    — título del diálogo
 *   mensaje   — cuerpo descriptivo
 *   labelOk   — texto del botón de confirmar (default: "Eliminar")
 *   peligroso — si true, botón ok es rojo (default: true)
 *   onConfirm — callback al confirmar
 *   onCancel  — callback al cancelar
 */
export function ConfirmDialog({
  titulo = '¿Estás seguro?',
  mensaje,
  labelOk = 'Eliminar',
  peligroso = true,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null);

  // Focus trap: enfocar el botón cancelar al abrir
  useEffect(() => {
    cancelRef.current?.focus();
    // Bloquear scroll del body
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="confirm-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-titulo"
    >
      <div className="confirm-dialog">
        <div className="confirm-icon" aria-hidden="true">⚠️</div>
        <h2 id="confirm-titulo">{titulo}</h2>
        {mensaje && <p className="confirm-mensaje">{mensaje}</p>}
        <div className="confirm-actions">
          <button
            ref={cancelRef}
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className={`btn ${peligroso ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {labelOk}
          </button>
        </div>
      </div>
    </div>
  );
}
