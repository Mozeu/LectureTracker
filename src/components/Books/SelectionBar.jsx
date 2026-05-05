import React from 'react';
import './SelectionBar.css';

/**
 * SelectionBar — RF22
 * Floating bar that appears when books are selected in Biblioteca.
 * Shows count, select-all, and the bulk delete action.
 */
export function SelectionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onExit,
}) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="selection-bar" role="toolbar" aria-label="Barra de selección múltiple">
      {/* Left: count + select-all toggle */}
      <div className="selection-bar-left">
        <button
          className="selection-bar-check"
          onClick={allSelected ? onClearSelection : onSelectAll}
          aria-label={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
          title={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
        >
          <span className={`selection-bar-check-box ${allSelected ? 'selection-bar-check-box--all' : selectedCount > 0 ? 'selection-bar-check-box--some' : ''}`} aria-hidden="true" />
        </button>

        <span className="selection-bar-count">
          {selectedCount === 0
            ? 'Selecciona libros'
            : `${selectedCount} ${selectedCount === 1 ? 'libro seleccionado' : 'libros seleccionados'}`}
        </span>
      </div>

      {/* Right: actions */}
      <div className="selection-bar-right">
        {selectedCount > 0 && (
          <button
            className="btn btn-danger btn-sm"
            onClick={onDeleteSelected}
            aria-label={`Eliminar ${selectedCount} libros seleccionados`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="3 6 5 6 21 6"/>
              <path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Eliminar{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        )}

        <button
          className="btn btn-secondary btn-sm"
          onClick={onExit}
          aria-label="Salir del modo selección"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
