import { useState, useCallback } from 'react';
import { actualizarLibro, eliminarLibro } from '../db/db';

/**
 * useLibroActions
 * Centraliza las acciones CRUD sobre libros usadas en Biblioteca y Dashboard.
 * Retorna handlers + estado de confirmación + libro seleccionado para modal.
 */
export function useLibroActions({ onSuccess, onError }) {
  const [libroParaEliminar, setLibroParaEliminar] = useState(null);
  const [libroDetalle, setLibroDetalle]           = useState(null);
  const [libroEditar, setLibroEditar]             = useState(null);

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
      // RF12: al mover a "en-progreso" registrar fecha de inicio si no hay
      if (nuevaCategoria === 'en-progreso' && !libro.fechaInicio) {
        cambios.fechaInicio = new Date().toISOString().split('T')[0];
      }
      // RF21: al marcar como terminado registrar fecha de fin y progreso 100%
      if (nuevaCategoria === 'terminados') {
        cambios.fechaFin   = cambios.fechaFin   ?? new Date().toISOString().split('T')[0];
        cambios.progresoPorc = 100;
        if (libro.totalPaginas) cambios.progresoPaginas = libro.totalPaginas;
      }
      await actualizarLibro(libro.id, cambios);
      // Actualizar el libro en detalle si estaba abierto
      if (libroDetalle?.id === libro.id) {
        setLibroDetalle((prev) => ({ ...prev, ...cambios }));
      }
      const labels = { 'leer-mas-tarde': 'Leer más tarde', 'lista-de-deseos': 'Lista de Deseos', 'en-progreso': 'En Progreso', terminados: 'Terminados' };
      onSuccess?.(`Movido a "${labels[nuevaCategoria]}"`);
    } catch {
      onError?.('No se pudo cambiar la categoría.');
    }
  }, [libroDetalle, onSuccess, onError]);

  /* ── Confirmar eliminación — RF22 ── */
  const handleSolicitarEliminar = useCallback((libro) => {
    setLibroParaEliminar(libro);
  }, []);

  const handleConfirmarEliminar = useCallback(async () => {
    if (!libroParaEliminar) return;
    try {
      await eliminarLibro(libroParaEliminar.id);
      const titulo = libroParaEliminar.titulo;
      setLibroParaEliminar(null);
      // Cerrar detalle si era el libro eliminado
      if (libroDetalle?.id === libroParaEliminar.id) setLibroDetalle(null);
      onSuccess?.(`"${titulo}" eliminado.`);
    } catch {
      onError?.('No se pudo eliminar el libro.');
    }
  }, [libroParaEliminar, libroDetalle, onSuccess, onError]);

  const handleCancelarEliminar = useCallback(() => {
    setLibroParaEliminar(null);
  }, []);

  return {
    // Estado de modales
    libroParaEliminar,
    libroDetalle,
    libroEditar,

    // Setters directos
    setLibroDetalle,
    setLibroEditar,

    // Handlers
    handleToggleFavorito,
    handleCambiarCategoria,
    handleSolicitarEliminar,
    handleConfirmarEliminar,
    handleCancelarEliminar,
  };
}
