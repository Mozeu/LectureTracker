import { useState, useCallback } from 'react';
import { actualizarLibro, eliminarLibro, deleteBooksInBulk } from '../db/db';

/**
 * useLibroActions
 * Centralizes CRUD actions for books used across Biblioteca and Dashboard.
 * Now exposes bulk delete state and handlers — RF22, RF23.
 */
export function useLibroActions({ onSuccess, onError }) {
  const [libroParaEliminar, setLibroParaEliminar] = useState(null); // single book
  const [bulkIdsToDelete,   setBulkIdsToDelete]   = useState([]);   // bulk ids
  const [libroDetalle,      setLibroDetalle]       = useState(null);
  const [libroEditar,       setLibroEditar]        = useState(null);

  /* ── Toggle favorito — RF11 ── */
  const handleToggleFavorito = useCallback(async (libro) => {
    try {
      await actualizarLibro(libro.id, { favorito: !libro.favorito });
      onSuccess?.(libro.favorito ? 'Quitado de favoritos' : '¡Marcado como favorito! ★');
    } catch {
      onError?.('No se pudo actualizar el favorito.');
    }
  }, [onSuccess, onError]);

  /* ── Cambiar categoría — RF9, RF12 ── */
  const handleCambiarCategoria = useCallback(async (libro, nuevaCategoria) => {
    try {
      const cambios = { categoria: nuevaCategoria };
      if (nuevaCategoria === 'en-progreso' && !libro.fechaInicio) {
        cambios.fechaInicio = new Date().toISOString().split('T')[0];
      }
      if (nuevaCategoria === 'terminados') {
        cambios.fechaFin     = cambios.fechaFin ?? new Date().toISOString().split('T')[0];
        cambios.progresoPorc = 100;
        if (libro.totalPaginas) cambios.progresoPaginas = libro.totalPaginas;
      }
      await actualizarLibro(libro.id, cambios);
      if (libroDetalle?.id === libro.id) {
        setLibroDetalle((prev) => ({ ...prev, ...cambios }));
      }
      const labels = {
        'leer-mas-tarde': 'Leer más tarde',
        'lista-de-deseos': 'Lista de Deseos',
        'en-progreso': 'En Progreso',
        terminados: 'Terminados',
      };
      onSuccess?.(`Movido a "${labels[nuevaCategoria]}"`);
    } catch {
      onError?.('No se pudo cambiar la categoría.');
    }
  }, [libroDetalle, onSuccess, onError]);

  /* ── Single delete — RF22 ── */
  const handleSolicitarEliminar = useCallback((libro) => {
    setLibroParaEliminar(libro);
  }, []);

  const handleConfirmarEliminar = useCallback(async () => {
    if (!libroParaEliminar) return;
    await eliminarLibro(libroParaEliminar.id);
    const titulo = libroParaEliminar.titulo;
    if (libroDetalle?.id === libroParaEliminar.id) setLibroDetalle(null);
    setLibroParaEliminar(null);
    onSuccess?.(`"${titulo}" eliminado.`);
  }, [libroParaEliminar, libroDetalle, onSuccess]);

  const handleCancelarEliminar = useCallback(() => {
    setLibroParaEliminar(null);
  }, []);

  /* ── Bulk delete — RF22, RF23 ── */
  const handleSolicitarBulkDelete = useCallback((ids) => {
    setBulkIdsToDelete(ids);
  }, []);

  const handleConfirmarBulkDelete = useCallback(async () => {
    if (!bulkIdsToDelete.length) return;
    const { deleted, notesDeleted } = await deleteBooksInBulk(bulkIdsToDelete);
    if (libroDetalle && bulkIdsToDelete.includes(libroDetalle.id)) setLibroDetalle(null);
    setBulkIdsToDelete([]);
    const notesMsg = notesDeleted > 0 ? ` y ${notesDeleted} nota(s)` : '';
    onSuccess?.(`${deleted} libro(s)${notesMsg} eliminados.`);
  }, [bulkIdsToDelete, libroDetalle, onSuccess]);

  const handleCancelarBulkDelete = useCallback(() => {
    setBulkIdsToDelete([]);
  }, []);

  return {
    // Modal state
    libroParaEliminar,
    bulkIdsToDelete,
    libroDetalle,
    libroEditar,

    // Setters
    setLibroDetalle,
    setLibroEditar,

    // Single handlers
    handleToggleFavorito,
    handleCambiarCategoria,
    handleSolicitarEliminar,
    handleConfirmarEliminar,
    handleCancelarEliminar,

    // Bulk handlers
    handleSolicitarBulkDelete,
    handleConfirmarBulkDelete,
    handleCancelarBulkDelete,
  };
}
