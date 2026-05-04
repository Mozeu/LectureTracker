import db from '../db/db';

/**
 * Exporta un libro a JSON descargable (RF20, RF26).
 * Incluye todos los campos + notas asociadas.
 * La portadaBase64 se incluye solo si `incluirPortada` es true.
 */
export async function exportarLibro(libroId, { incluirPortada = true } = {}) {
  const libro = await db.libros.get(libroId);
  if (!libro) throw new Error('Libro no encontrado.');

  const notas = await db.notas.where('libroId').equals(libroId).toArray();

  const payload = {
    _version:  1,
    _tipo:     'libro',
    _exportado: new Date().toISOString(),
    libro: {
      ...libro,
      portadaBase64: incluirPortada ? libro.portadaBase64 : undefined,
    },
    notas,
  };

  const json     = JSON.stringify(payload, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });
  const url      = URL.createObjectURL(blob);
  const filename = slugFilename(libro.titulo) + '.json';

  const a = document.createElement('a');
  a.href  = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

function slugFilename(titulo) {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'libro';
}
