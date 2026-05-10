/**
 * isbnLookup.js — Module 12 (RF30–RF40)
 * Open Library API — book lookup by ISBN.
 *
 * Fixes applied:
 *   1. Removed `fields` param — was causing incomplete responses from Open Library
 *   2. Removed blocking `await fetchDescription()` — was adding up to 5s delay
 *   3. Added ISBN-based cover fallback (covers.openlibrary.org/b/isbn/{isbn}-M.jpg)
 *   4. Cleaner error propagation
 */

// ─── ISBN validation — RF31 ──────────────────────────────────────────────────

export function cleanAndValidateISBN(raw) {
  if (!raw) return null;
  const clean = raw.replace(/[\s\-]/g, '').toUpperCase();
  if (clean.length === 10) return isValidISBN10(clean) ? clean : null;
  if (clean.length === 13) return isValidISBN13(clean) ? clean : null;
  return null;
}

export function getISBNError(raw) {
  if (!raw || !raw.trim()) return 'Ingresa un ISBN para buscar.';

  const clean = raw.replace(/[\s\-]/g, '').toUpperCase();

  if (!/^[\dX]+$/.test(clean)) {
    return 'El ISBN solo puede contener números, guiones y la letra X.';
  }
  if (clean.length < 10) {
    return `ISBN demasiado corto (${clean.length} dígitos). Debe tener 10 o 13.`;
  }
  if (clean.length > 13) {
    return `ISBN demasiado largo (${clean.length} dígitos). Debe tener 10 o 13.`;
  }
  if (clean.length === 11 || clean.length === 12) {
    return `ISBN inválido (${clean.length} dígitos). Debe tener exactamente 10 o 13.`;
  }
  if (clean.length === 10 && !isValidISBN10(clean)) {
    return 'ISBN-10 inválido (dígito de control incorrecto).';
  }
  if (clean.length === 13 && !isValidISBN13(clean)) {
    return 'ISBN-13 inválido (dígito de control incorrecto).';
  }
  return null;
}

function isValidISBN10(isbn) {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(isbn[i], 10);
    if (isNaN(digit)) return false;
    sum += digit * (10 - i);
  }
  const check = isbn[9] === 'X' ? 10 : parseInt(isbn[9], 10);
  if (isNaN(check)) return false;
  return (sum + check) % 11 === 0;
}

function isValidISBN13(isbn) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn[i], 10);
    if (isNaN(digit)) return false;
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(isbn[12], 10);
}

// ─── API constants ───────────────────────────────────────────────────────────

const SEARCH_URL = 'https://openlibrary.org/search.json';
const COVERS_URL = 'https://covers.openlibrary.org/b';
const TIMEOUT_MS = 10000;

// ─── Main lookup — RF32, RF36, RF37 ─────────────────────────────────────────

/**
 * FIX 1: No `fields` param → full response with all fields every time.
 * FIX 2: No blocking description fetch → returns immediately after search.
 */
export async function lookupByISBN(rawISBN) {
  const isbn = cleanAndValidateISBN(rawISBN);
  if (!isbn) throw new LookupError('invalid_isbn', getISBNError(rawISBN));

  let searchData;
  try {
    // NOTE: No `fields` parameter — Open Library returns incomplete data with it
    const url = `${SEARCH_URL}?isbn=${isbn}`;
    const res  = await fetchWithTimeout(url, TIMEOUT_MS);

    if (!res.ok) {
      throw new LookupError(
        'network_error',
        `Open Library respondió con código ${res.status}. Inténtalo de nuevo.`
      );
    }

    searchData = await res.json();
  } catch (err) {
    if (err instanceof LookupError) throw err;
    // AbortError (timeout) or network failure
    const isTimeout = err?.name === 'AbortError';
    throw new LookupError(
      'network_error',
      isTimeout
        ? 'La búsqueda tardó demasiado. Verifica tu conexión e inténtalo de nuevo.'
        : 'No se pudo conectar con Open Library. Verifica tu conexión e inténtalo de nuevo.'
    );
  }

  // RF36: no results
  if (!searchData?.numFound || searchData.numFound === 0 || !searchData.docs?.length) {
    throw new LookupError(
      'not_found',
      'No se encontró ningún libro con ese ISBN. Por favor, ingresa los datos manualmente.'
    );
  }

  const doc = searchData.docs[0];

  // FIX 3: Cover URL — prefer cover_i (from works index), fallback to ISBN-based URL
  const coverUrl = buildCoverUrl(doc, isbn);

  // Return mapped data immediately — no blocking description fetch
  return mapDocToBookData(doc, coverUrl, isbn);
}

// ─── Cover URL builder — RF38 ────────────────────────────────────────────────

function buildCoverUrl(doc, isbn) {
  // Primary: cover_i is the most reliable when present
  if (doc.cover_i) {
    return `${COVERS_URL}/id/${doc.cover_i}-M.jpg`;
  }
  // FIX 3 fallback: Open Library also serves covers by ISBN directly
  return `${COVERS_URL}/isbn/${isbn}-M.jpg`;
}

// ─── Cover download — RF38 ───────────────────────────────────────────────────

export async function downloadCoverAsBase64(url) {
  if (!url) return null;
  try {
    const res = await fetchWithTimeout(url, 12000);
    if (!res.ok) return null;

    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    // Open Library returns a 1-pixel GIF when no cover exists (~43 bytes)
    // Reject anything under 1 KB as likely a placeholder
    if (blob.size < 1000) return null;

    return await blobToBase64(blob);
  } catch {
    return null;
  }
}

// ─── Field mapping ───────────────────────────────────────────────────────────

const LANG_MAP = {
  spa: 'es', cas: 'es',
  eng: 'en',
  fre: 'fr', fra: 'fr',
  ger: 'de', deu: 'de',
  ita: 'it',
  por: 'pt',
  jpn: 'jp',
  zho: 'zh', chi: 'zh',
};

function mapDocToBookData(doc, coverUrl, cleanedISBN) {
  // Title: combine title + subtitle if present
  const baseTitulo = doc.title ?? '';
  const subtitulo  = doc.subtitle ? ` — ${doc.subtitle}` : '';
  const titulo     = (baseTitulo + subtitulo).trim();

  // Authors: Open Library returns these as a plain string array ✓
  const autores = Array.isArray(doc.author_name)
    ? doc.author_name.slice(0, 4).join(', ')
    : '';

  // Publisher: take first from array
  const editorial = Array.isArray(doc.publisher)
    ? (doc.publisher[0] ?? '').slice(0, 100)  // cap length
    : typeof doc.publisher === 'string'
      ? doc.publisher.slice(0, 100)
      : '';

  // Year: number in search results
  const fechaPublicacion = doc.first_publish_year
    ? String(doc.first_publish_year)
    : '';

  // Pages: median across editions (may be absent for rare books)
  const totalPaginas = doc.number_of_pages_median
    ? String(Math.round(doc.number_of_pages_median))
    : '';

  // Language: first language code, mapped to our values
  const rawLang = Array.isArray(doc.language) ? doc.language[0] : null;
  const idioma  = rawLang ? (LANG_MAP[rawLang.toLowerCase()] ?? 'otro') : '';

  // Subjects → etiquetas (first 4 clean subjects, max 30 chars each)
  const etiquetas = Array.isArray(doc.subject)
    ? [...new Set(
        doc.subject
          .slice(0, 10)
          .map((s) => s.toLowerCase().trim().slice(0, 30))
          .filter((s) => s.length > 2 && !s.includes('accessible book'))
      )].slice(0, 4).join(', ')
    : '';

  return {
    isbn:             cleanedISBN,
    titulo:           titulo || '',
    autores:          autores || '',
    editorial:        editorial || '',
    fechaPublicacion: fechaPublicacion || '',
    totalPaginas:     totalPaginas || '',
    idioma:           idioma || '',
    descripcion:      '',   // Not available from search endpoint; user fills manually (RF35)
    etiquetas:        etiquetas || '',
    _coverUrl:        coverUrl,  // Internal — component downloads it as Base64
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class LookupError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'LookupError';
  }
}
