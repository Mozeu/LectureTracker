import Dexie from 'dexie';

/**
 * Rastreador de Lectura — IndexedDB con Dexie.js
 * Esquema completo según especificación RF1–RF28
 */
export const db = new Dexie('RastreadorLectura');

db.version(1).stores({
  // Libros: todos los campos indexados relevantes
  libros: `
    ++id,
    titulo,
    categoria,
    favorito,
    saga,
    *etiquetas,
    fechaInicio,
    fechaFin,
    fechaCreacion,
    fechaActualizacion,
    isbn,
    progresoPaginas,
    totalPaginas,
    tipo,
    idioma
  `.replace(/\s+/g, ' ').trim(),

  // Colecciones / carpetas de libros
  colecciones: '++id, nombre, &slug',

  // Etiquetas personalizadas
  etiquetas: '++id, nombre, &slug',

  // Notas enriquecidas asignables a libro/página/fecha
  notas: '++id, libroId, pagina, fecha, fechaCreacion',

  // Configuración clave-valor (nombre de usuario, tema, etc.)
  configuracion: '&clave, valor',
});

// ─── Helpers de configuración ────────────────────────────────────────────────

export async function getConfig(clave, valorDefault = null) {
  try {
    const entry = await db.configuracion.get(clave);
    return entry ? entry.valor : valorDefault;
  } catch {
    return valorDefault;
  }
}

export async function setConfig(clave, valor) {
  await db.configuracion.put({ clave, valor });
}

// ─── Helpers de libros ───────────────────────────────────────────────────────

export async function crearLibro(datos) {
  const ahora = new Date().toISOString();
  const libroId = await db.libros.add({
    ...datos,
    categoria: datos.categoria ?? 'leer-mas-tarde',
    favorito: false,
    etiquetas: datos.etiquetas ?? [],
    progresoPaginas: 0,
    progresoPorc: 0,
    fechaCreacion: ahora,
    fechaActualizacion: ahora,
  });

  // RF15: Auto-crear colección si hay saga
  if (datos.saga?.trim()) {
    await sincronizarSaga(datos.saga.trim(), libroId);
  }

  return libroId;
}

export async function actualizarLibro(id, cambios) {
  const ahora = new Date().toISOString();
  const libroAntes = await db.libros.get(id);

  await db.libros.update(id, { ...cambios, fechaActualizacion: ahora });

  // RF15: Si cambió la saga, actualizar colecciones
  if (cambios.saga !== undefined && cambios.saga !== libroAntes?.saga) {
    if (cambios.saga?.trim()) {
      await sincronizarSaga(cambios.saga.trim(), id);
    }
  }
}

export async function eliminarLibro(id) {
  await db.transaction('rw', db.libros, db.notas, db.colecciones, async () => {
    // RF23: Borrar notas asociadas
    await db.notas.where('libroId').equals(id).delete();

    // RF23: Desvincular de colecciones
    const colecciones = await db.colecciones.toArray();
    for (const col of colecciones) {
      if (col.librosIds?.includes(id)) {
        await db.colecciones.update(col.id, {
          librosIds: col.librosIds.filter((lid) => lid !== id),
        });
      }
    }

    await db.libros.delete(id);
  });
}

/**
 * Returns note count + affected collection names for a book,
 * so the confirmation dialog can show meaningful impact — RF22.
 */
export async function getDeleteImpact(id) {
  const [noteCount, collections] = await Promise.all([
    db.notas.where('libroId').equals(id).count(),
    db.colecciones.filter((c) => c.librosIds?.includes(id)).toArray(),
  ]);
  return {
    noteCount,
    collectionNames: collections.map((c) => c.nombre),
  };
}

/**
 * Bulk delete — RF22, RF23.
 * Deletes all notes and unlinks from collections for every id in the array.
 * Returns total counts for the success toast.
 */
export async function deleteBooksInBulk(ids) {
  if (!ids.length) return { deleted: 0, notesDeleted: 0 };

  let notesDeleted = 0;

  await db.transaction('rw', db.libros, db.notas, db.colecciones, async () => {
    // Delete notes for all books in one pass
    for (const id of ids) {
      const n = await db.notas.where('libroId').equals(id).count();
      notesDeleted += n;
      await db.notas.where('libroId').equals(id).delete();
    }

    // Unlink from collections — RF23
    const allCollections = await db.colecciones.toArray();
    for (const col of allCollections) {
      const before = col.librosIds?.length ?? 0;
      const after  = (col.librosIds ?? []).filter((lid) => !ids.includes(lid));
      if (after.length !== before) {
        await db.colecciones.update(col.id, { librosIds: after });
      }
    }

    // Delete the books
    await db.libros.bulkDelete(ids);
  });

  return { deleted: ids.length, notesDeleted };
}

// ─── Helpers de colecciones (sagas) ─────────────────────────────────────────

async function sincronizarSaga(nombreSaga, libroId) {
  const slug = slugify(nombreSaga);
  let coleccion = await db.colecciones.where('slug').equals(slug).first();

  if (!coleccion) {
    await db.colecciones.add({
      nombre: nombreSaga,
      slug,
      librosIds: [libroId],
      fechaCreacion: new Date().toISOString(),
      esSaga: true,
    });
  } else {
    const librosIds = [...new Set([...(coleccion.librosIds ?? []), libroId])];
    await db.colecciones.update(coleccion.id, { librosIds });
  }
}

// ─── Helpers de progreso — RF20, RF21 ───────────────────────────────────────

/**
 * Actualiza el progreso de un libro y registra fechaUltimaLectura.
 * Si el progreso llega a 100%, mueve automáticamente a "terminados" (RF21).
 * Retorna { autoTerminado: bool } para que la UI pueda reaccionar.
 */
export async function actualizarProgreso(id, { formatoProgreso, progresoPaginas, progresoPorc, progresoEpisodio, progresoTiempo, totalPaginas }) {
  const ahora   = new Date().toISOString();
  const hoy     = ahora.split('T')[0];
  const libro   = await db.libros.get(id);
  if (!libro) throw new Error('Libro no encontrado.');

  // Calcular porcentaje canónico
  let porc = libro.progresoPorc ?? 0;
  if (formatoProgreso === 'paginas' && progresoPaginas != null && totalPaginas) {
    porc = Math.min(100, Math.round((Number(progresoPaginas) / Number(totalPaginas)) * 100));
  } else if (formatoProgreso === 'porcentaje' && progresoPorc != null) {
    porc = Math.min(100, Number(progresoPorc));
  }

  const patch = {
    formatoProgreso,
    progresoPaginas: progresoPaginas != null ? Number(progresoPaginas) : libro.progresoPaginas,
    progresoPorc:    porc,
    progresoEpisodio: progresoEpisodio ?? libro.progresoEpisodio,
    progresoTiempo:   progresoTiempo   ?? libro.progresoTiempo,
    fechaUltimaLectura: hoy,
    fechaActualizacion: ahora,
  };

  // RF21: si llega a 100% y aún no está terminado → marcar como terminado
  let autoTerminado = false;
  if (porc >= 100 && libro.categoria !== 'terminados') {
    patch.categoria = 'terminados';
    patch.fechaFin  = patch.fechaFin ?? hoy;
    if (totalPaginas) patch.progresoPaginas = Number(totalPaginas);
    autoTerminado = true;
  }

  // Registrar fechaInicio si era el primer avance real
  if (!libro.fechaInicio && (progresoPaginas > 0 || porc > 0)) {
    patch.fechaInicio = hoy;
    if (libro.categoria === 'leer-mas-tarde' || libro.categoria === 'lista-de-deseos') {
      patch.categoria = 'en-progreso';
    }
  }

  await db.libros.update(id, patch);
  return { autoTerminado };
}

// ─── Helpers de notas — RF17, RF18, RF19 ────────────────────────────────────

export async function crearNota({ libroId, pagina, fecha, texto, textoPlano }) {
  const ahora = new Date().toISOString();
  return db.notas.add({
    libroId,
    pagina:     pagina  ? Number(pagina)  : null,
    fecha:      fecha   ? fecha           : ahora.split('T')[0],
    texto,       // HTML de Quill
    textoPlano,  // texto sin formato para búsquedas
    fechaCreacion:     ahora,
    fechaActualizacion: ahora,
  });
}

export async function actualizarNota(id, { pagina, fecha, texto, textoPlano }) {
  await db.notas.update(id, {
    pagina:     pagina ? Number(pagina) : null,
    fecha,
    texto,
    textoPlano,
    fechaActualizacion: new Date().toISOString(),
  });
}

export async function eliminarNota(id) {
  await db.notas.delete(id);
}

// RF18: notas de un libro ordenadas por página (nulls al final) y luego fecha
export async function getNotasDeLibro(libroId) {
  const notas = await db.notas.where('libroId').equals(libroId).toArray();
  return notas.sort((a, b) => {
    // Primero por página (null al final)
    if (a.pagina !== null && b.pagina !== null) return a.pagina - b.pagina;
    if (a.pagina !== null) return -1;
    if (b.pagina !== null) return 1;
    // Luego por fecha
    return new Date(a.fecha) - new Date(b.fecha);
  });
}

// ─── Helpers de etiquetas — RF13, RF16 ──────────────────────────────────────

export async function crearEtiqueta({ nombre, color }) {
  const slug = slugify(nombre);
  const existe = await db.etiquetas.where('slug').equals(slug).first();
  if (existe) throw new Error(`Ya existe una etiqueta llamada "${nombre}".`);
  return db.etiquetas.add({ nombre: nombre.trim(), slug, color, fechaCreacion: new Date().toISOString() });
}

export async function actualizarEtiqueta(id, { nombre, color }) {
  const antes = await db.etiquetas.get(id);
  const slug  = slugify(nombre);

  // Si cambió el nombre, actualizar todos los libros que la tienen — RF16
  if (antes && antes.nombre !== nombre.trim()) {
    const librosConEtiqueta = await db.libros
      .filter((l) => Array.isArray(l.etiquetas) && l.etiquetas.includes(antes.nombre))
      .toArray();
    for (const libro of librosConEtiqueta) {
      const nuevasEtiquetas = libro.etiquetas.map((e) => (e === antes.nombre ? nombre.trim() : e));
      await db.libros.update(libro.id, { etiquetas: nuevasEtiquetas, fechaActualizacion: new Date().toISOString() });
    }
  }

  await db.etiquetas.update(id, { nombre: nombre.trim(), slug, color });
}

export async function eliminarEtiqueta(id) {
  const etiqueta = await db.etiquetas.get(id);
  if (!etiqueta) return;

  // RF16: eliminar de todos los libros que la tienen
  const libros = await db.libros
    .filter((l) => Array.isArray(l.etiquetas) && l.etiquetas.includes(etiqueta.nombre))
    .toArray();
  for (const libro of libros) {
    await db.libros.update(libro.id, {
      etiquetas: libro.etiquetas.filter((e) => e !== etiqueta.nombre),
      fechaActualizacion: new Date().toISOString(),
    });
  }

  await db.etiquetas.delete(id);
}

// ─── Helpers de colecciones manuales — RF14, RF16 ───────────────────────────

export async function crearColeccion({ nombre }) {
  const slug = slugify(nombre);
  const existe = await db.colecciones.where('slug').equals(slug).first();
  if (existe) throw new Error(`Ya existe una colección llamada "${nombre}".`);
  return db.colecciones.add({
    nombre: nombre.trim(),
    slug,
    librosIds: [],
    esSaga: false,
    fechaCreacion: new Date().toISOString(),
  });
}

export async function actualizarColeccion(id, cambios) {
  const patch = { ...cambios };
  if (cambios.nombre) {
    patch.nombre = cambios.nombre.trim();
    patch.slug   = slugify(cambios.nombre.trim());
  }
  await db.colecciones.update(id, patch);
}

export async function eliminarColeccion(id) {
  // RF16: solo borra la colección, los libros quedan intactos
  await db.colecciones.delete(id);
}

export async function agregarLibroAColeccion(coleccionId, libroId) {
  const col = await db.colecciones.get(coleccionId);
  if (!col) return;
  const librosIds = [...new Set([...(col.librosIds ?? []), libroId])];
  await db.colecciones.update(coleccionId, { librosIds });
}

export async function quitarLibroDeColeccion(coleccionId, libroId) {
  const col = await db.colecciones.get(coleccionId);
  if (!col) return;
  await db.colecciones.update(coleccionId, {
    librosIds: (col.librosIds ?? []).filter((id) => id !== libroId),
  });
}

// ─── Utilidades ─────────────────────────────────────────────────────────────

export function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default db;
