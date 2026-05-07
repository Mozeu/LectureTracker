/**
 * isbnSearch.js — Módulo 12 (RF30–RF40)
 * Google Books API lookup, field mapping, cover download.
 * All calls go directly from the browser — no intermediaries (RF40).
 */

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';
const TIMEOUT_MS       = 8000;

// ─── Validation — RF31 ──────────────────────────────────────────────────────

/**
 * Strips formatting (spaces, hyphens) and validates ISBN-10 or ISBN-13.
 * Returns { valid, cleaned, error? }
 */
export function validateISBN(raw) {
  const cleaned = String(raw ?? '').replace(/[\s\-]/g, '');

  if (!cleaned) {
    return { valid: false, cleaned, error: 'Ingresa un ISBN para buscar.' };
  }

  if (!/^\d{9}[\dX]$/.test(cleaned) && !/^\d{13}$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      error: 'El ISBN debe tener 10 o 13 dígitos (guiones opcionales).',
    };
  }

  return { valid: true, cleaned };
}

// ─── API call — RF32, RF33, RF36, RF37 ──────────────────────────────────────

/**
 * Fetches book metadata from Google Books by ISBN.
 * Returns { volumeInfo, coverUrl } or throws a typed error.
 *
 * Throws:
 *   { type: 'not_found' }   — totalItems === 0 (RF36)
 *   { type: 'rate_limit' }  — HTTP 429
 *   { type: 'network' }     — fetch/timeout error (RF37)
 *   { type: 'api_error' }   — non-200 response
 */
export async function searchByISBN(isbnCleaned) {
  const url = `${GOOGLE_BOOKS_API}?q=isbn:${isbnCleaned}&maxResults=1&fields=totalItems,items(volumeInfo)`;

  let response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw { type: 'network', message: 'La búsqueda tardó demasiado. Verifica tu conexión e intenta de nuevo.' };
    }
    throw { type: 'network', message: 'Error de red. Verifica tu conexión e intenta de nuevo.' };
  }

  if (response.status === 429) {
    throw { type: 'rate_limit', message: 'Límite de búsquedas alcanzado. Espera unos minutos o ingresa los datos manualmente.' };
  }
  if (!response.ok) {
    throw { type: 'api_error', message: `Error del servidor (${response.status}). Intenta de nuevo o ingresa los datos manualmente.` };
  }

  const data = await response.json();

  if (!data.totalItems || data.totalItems === 0 || !data.items?.length) {
    throw { type: 'not_found', message: 'No se encontró ningún libro con ese ISBN. Por favor, ingresa los datos manualmente.' };
  }

  const volumeInfo = data.items[0].volumeInfo;

  // Fix mixed-content: Google returns http:// thumbnails (RF38 analysis)
  const rawCoverUrl =
    volumeInfo.imageLinks?.thumbnail ||
    volumeInfo.imageLinks?.smallThumbnail ||
    null;

  const coverUrl = rawCoverUrl
    ? rawCoverUrl.replace(/^http:\/\//, 'https://')
    : null;

  return { volumeInfo, coverUrl };
}

// ─── Field mapping — RF34 ───────────────────────────────────────────────────

/**
 * Maps a Google Books volumeInfo object to our form field names.
 * Returns only fields that have values — never overwrites with empty.
 */
export function mapVolumeInfoToForm(volumeInfo) {
  const mapped = {};

  if (volumeInfo.title) {
    mapped.titulo = volumeInfo.subtitle
      ? `${volumeInfo.title}: ${volumeInfo.subtitle}`
      : volumeInfo.title;
  }

  if (volumeInfo.authors?.length) {
    mapped.autores = volumeInfo.authors.join(', ');
  }

  if (volumeInfo.publisher) {
    mapped.editorial = volumeInfo.publisher;
  }

  if (volumeInfo.publishedDate) {
    // publishedDate can be "2019", "2019-05", or "2019-05-15" — extract year
    const year = parseInt(volumeInfo.publishedDate, 10);
    if (year >= 1000 && year <= new Date().getFullYear() + 5) {
      mapped.fechaPublicacion = String(year);
    }
  }

  if (volumeInfo.description) {
    mapped.descripcion = volumeInfo.description;
  }

  if (volumeInfo.pageCount > 0) {
    mapped.totalPaginas = String(volumeInfo.pageCount);
  }

  // Map language code to our IDIOMAS list
  if (volumeInfo.language) {
    const langMap = { es: 'es', en: 'en', fr: 'fr', de: 'de', it: 'it', pt: 'pt', ja: 'jp', zh: 'zh' };
    const mapped_lang = langMap[volumeInfo.language];
    if (mapped_lang) mapped.idioma = mapped_lang;
  }

  // First category as an etiqueta suggestion
  if (volumeInfo.categories?.length) {
    mapped._generoSugerido = volumeInfo.categories[0];
  }

  return mapped;
}

// ─── Cover download — RF38 ──────────────────────────────────────────────────

/**
 * Downloads a cover image URL and converts it to Base64.
 * Returns the Base64 data URL string, or null if download fails.
 * Maintains compatibility with existing portadaBase64 field (RF38 analysis).
 */
export async function downloadCoverAsBase64(url) {
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) return null;

    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch {
    return null;
  }
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}
