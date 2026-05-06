import db, { crearLibro, actualizarLibro, slugify } from '../db/db';

const SCHEMA_VERSION = 1;

// ─── Export ─────────────────────────────────────────────────────────────────

/**
 * RF26 — Export a single book to a downloadable JSON file.
 * Includes all fields + notes. portadaBase64 included only if includeImage=true.
 */
export async function exportBook(bookId, { includeImage = true } = {}) {
  const book  = await db.libros.get(bookId);
  if (!book) throw new Error('Libro no encontrado.');

  const notes = await db.notas.where('libroId').equals(bookId).toArray();

  const payload = {
    _version:   SCHEMA_VERSION,
    _type:      'book',
    _exportedAt: new Date().toISOString(),
    book: {
      ...book,
      portadaBase64: includeImage ? book.portadaBase64 : undefined,
    },
    notes,
  };

  return triggerDownload(payload, slugFilename(book.titulo) + '.json');
}

/**
 * RF26 — Export everything: books, notes, tags, collections, config.
 */
export async function exportAll() {
  const [books, notes, tags, collections, configRows] = await Promise.all([
    db.libros.toArray(),
    db.notas.toArray(),
    db.etiquetas.toArray(),
    db.colecciones.toArray(),
    db.configuracion.toArray(),
  ]);

  const config = Object.fromEntries(configRows.map((r) => [r.clave, r.valor]));

  const payload = {
    _version:    SCHEMA_VERSION,
    _type:       'full',
    _exportedAt: new Date().toISOString(),
    books,
    notes,
    tags,
    collections,
    config,
  };

  const filename = `biblioteca-backup-${isoDate()}.json`;
  return triggerDownload(payload, filename);
}

// ─── Validation — RF28 ──────────────────────────────────────────────────────

/**
 * Parse and validate a JSON file from a File object.
 * Returns { payload, type } or throws a descriptive Error.
 */
export async function parseImportFile(file) {
  if (!file) throw new Error('No se seleccionó ningún archivo.');
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    throw new Error('Solo se aceptan archivos .json.');
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('El archivo supera el límite de 50 MB.');
  }

  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }

  // Structure validation
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Formato de archivo no reconocido.');
  }
  if (!payload._type || !payload._version) {
    throw new Error('El archivo no tiene la cabecera esperada (_type, _version).');
  }
  if (payload._version > SCHEMA_VERSION) {
    throw new Error(`Este archivo fue exportado con una versión más nueva (v${payload._version}) y no es compatible.`);
  }

  if (payload._type === 'book') {
    if (!payload.book || typeof payload.book !== 'object') {
      throw new Error('El campo "book" falta o no es válido.');
    }
    if (!payload.book.titulo) {
      throw new Error('El libro del archivo no tiene título.');
    }
    if (!Array.isArray(payload.notes)) {
      throw new Error('El campo "notes" debe ser un array.');
    }
  } else if (payload._type === 'full') {
    if (!Array.isArray(payload.books)) throw new Error('El campo "books" debe ser un array.');
    if (!Array.isArray(payload.notes)) throw new Error('El campo "notes" debe ser un array.');
    if (!Array.isArray(payload.tags))  throw new Error('El campo "tags" debe ser un array.');
    if (!Array.isArray(payload.collections)) throw new Error('El campo "collections" debe ser un array.');
  } else {
    throw new Error(`Tipo desconocido: "${payload._type}". Se esperaba "book" o "full".`);
  }

  return { payload, type: payload._type };
}

// ─── Import — RF27 ──────────────────────────────────────────────────────────

/**
 * Preview what a book import would do (before confirming).
 */
export async function previewBookImport(bookPayload) {
  const { book } = bookPayload;
  if (book.isbn) {
    const existing = await db.libros
      .filter((l) => l.isbn && l.isbn.replace(/[-\s]/g, '') === book.isbn.replace(/[-\s]/g, ''))
      .first();
    if (existing) return { duplicate: true, existingTitle: existing.titulo };
  }
  return { duplicate: false };
}

/**
 * Import a single book.
 * strategy: 'add' (always add) | 'skip' (skip if duplicate ISBN)
 */
export async function importBook(bookPayload, { strategy = 'skip' } = {}) {
  const { book, notes = [] } = bookPayload;
  const preview = await previewBookImport(bookPayload);

  if (preview.duplicate && strategy === 'skip') {
    return { skipped: true, reason: `Ya existe "${preview.existingTitle}"` };
  }

  // Strip internal DB id so Dexie assigns a new one
  const { id: _id, ...bookData } = book;
  const newBookId = await crearLibro({
    ...bookData,
    titulo: bookData.titulo ?? 'Sin título',
  });

  // Import associated notes
  const ahora = new Date().toISOString();
  for (const note of notes) {
    const { id: _nid, libroId: _lid, ...noteData } = note;
    await db.notas.add({ ...noteData, libroId: newBookId, fechaActualizacion: ahora });
  }

  return { skipped: false, bookId: newBookId, title: book.titulo };
}

/**
 * RF27 — Import a full backup.
 * strategy: 'merge' (add new, keep existing) | 'replace' (wipe and restore)
 */
export async function importAll(payload, { strategy = 'merge' } = {}) {
  const { books, notes, tags, collections, config } = payload;
  const stats = { books: 0, notes: 0, tags: 0, collections: 0 };

  if (strategy === 'replace') {
    // Wipe all data first
    await db.transaction('rw', db.libros, db.notas, db.etiquetas, db.colecciones, db.configuracion, async () => {
      await db.libros.clear();
      await db.notas.clear();
      await db.etiquetas.clear();
      await db.colecciones.clear();
      // Keep 'nombreUsuario' and 'tema' config keys so the app doesn't reset to welcome screen
      const preserve = await db.configuracion.where('clave').anyOf(['nombreUsuario', 'tema']).toArray();
      await db.configuracion.clear();
      for (const row of preserve) await db.configuracion.put(row);
    });
  }

  // Build id-remapping tables so notes can reference the correct new book ids
  const bookIdMap = new Map(); // oldId → newId

  for (const book of books) {
    const { id: oldId, ...bookData } = book;
    try {
      const newId = await db.libros.add({ ...bookData });
      bookIdMap.set(oldId, newId);
      stats.books++;
    } catch {
      // On merge, skip books that violate unique constraints
    }
  }

  for (const note of notes) {
    const { id: _id, libroId: oldBookId, ...noteData } = note;
    const newBookId = bookIdMap.get(oldBookId) ?? oldBookId;
    const bookExists = await db.libros.get(newBookId);
    if (!bookExists) continue; // orphan note — skip
    try {
      await db.notas.add({ ...noteData, libroId: newBookId });
      stats.notes++;
    } catch { /* skip duplicates */ }
  }

  for (const tag of tags) {
    const { id: _id, ...tagData } = tag;
    try {
      await db.etiquetas.add({ ...tagData });
      stats.tags++;
    } catch { /* skip name/slug conflicts */ }
  }

  for (const col of collections) {
    const { id: _id, librosIds: oldIds, ...colData } = col;
    const newIds = (oldIds ?? []).map((oid) => bookIdMap.get(oid) ?? oid).filter((nid) => nid != null);
    try {
      await db.colecciones.add({ ...colData, librosIds: newIds });
      stats.collections++;
    } catch { /* skip slug conflicts */ }
  }

  // Restore non-critical config (skip name + theme which we preserve)
  if (config && strategy === 'replace') {
    for (const [clave, valor] of Object.entries(config)) {
      if (clave !== 'nombreUsuario' && clave !== 'tema') {
        await db.configuracion.put({ clave, valor });
      }
    }
  }

  return stats;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function triggerDownload(payload, filename) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

function slugFilename(title) {
  return (title ?? 'libro')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'libro';
}

function isoDate() {
  return new Date().toISOString().split('T')[0];
}
