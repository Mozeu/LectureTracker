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
