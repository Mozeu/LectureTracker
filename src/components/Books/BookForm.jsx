import React, { useState, useRef, useCallback } from 'react';
import { crearLibro, actualizarLibro } from '../../db/db';
import './BookForm.css';

/* ─── Constantes ─────────────────────────────────── */

export const CATEGORIAS = [
  { value: 'leer-mas-tarde', label: 'Leer más tarde',   emoji: '🕐', color: 'var(--cat-later)'    },
  { value: 'lista-de-deseos', label: 'Lista de Deseos', emoji: '✨', color: 'var(--cat-wishlist)'  },
  { value: 'en-progreso',    label: 'En Progreso',      emoji: '📖', color: 'var(--cat-progress)'  },
  { value: 'terminados',     label: 'Terminados',       emoji: '✅', color: 'var(--cat-finished)'  },
];

const TIPOS_ENCUADERNADO = [
  { value: 'tapa-blanda',  label: 'Tapa blanda'  },
  { value: 'tapa-dura',    label: 'Tapa dura'    },
  { value: 'electronico',  label: 'Electrónico'  },
  { value: 'bolsillo',     label: 'Bolsillo'     },
  { value: 'audiolibro',   label: 'Audiolibro'   },
];

const PLATAFORMAS = [
  { value: '',             label: 'Sin especificar' },
  { value: 'kindle',       label: 'Kindle'          },
  { value: 'kobo',         label: 'Kobo'            },
  { value: 'google-books', label: 'Google Books'    },
  { value: 'audible',      label: 'Audible'         },
  { value: 'storytel',     label: 'Storytel'        },
  { value: 'apple-books',  label: 'Apple Books'     },
  { value: 'otra',         label: 'Otra plataforma' },
];

const IDIOMAS = [
  { value: 'es', label: 'Español'    },
  { value: 'en', label: 'Inglés'     },
  { value: 'fr', label: 'Francés'    },
  { value: 'de', label: 'Alemán'     },
  { value: 'it', label: 'Italiano'   },
  { value: 'pt', label: 'Portugués'  },
  { value: 'jp', label: 'Japonés'    },
  { value: 'zh', label: 'Chino'      },
  { value: 'otro', label: 'Otro'     },
];

const FORMATOS_PROGRESO = [
  { value: 'paginas',   label: 'Páginas'     },
  { value: 'porcentaje', label: 'Porcentaje' },
  { value: 'episodio',  label: 'Episodio'    },
  { value: 'tiempo',    label: 'Tiempo'      },
];

/* ─── Estado inicial del formulario ─────────────── */

const ESTADO_INICIAL = {
  // Campos esenciales
  titulo: '',
  autores: '',
  isbn: '',
  editorial: '',
  fechaPublicacion: '',
  idioma: 'es',
  categoria: 'leer-mas-tarde',

  // Tipo y plataforma
  tipo: 'tapa-blanda',
  plataforma: '',

  // Páginas y progreso
  totalPaginas: '',
  formatoProgreso: 'paginas',
  progresoPaginas: '',
  progresoPorc: '',
  progresoEpisodio: '',
  progresoTiempo: '',

  // Equipo creativo
  traductores: '',
  ilustradores: '',
  narradores: '',

  // Serie y clasificación
  saga: '',
  numeroEnSaga: '',
  etiquetas: '',

  // Portada
  portadaUrl: '',
  portadaBase64: '',

  // Meta
  descripcion: '',
  notas: '',

  // Fechas de lectura
  fechaInicio: '',
  fechaFin: '',
};

/* ─── Componente principal ───────────────────────── */

/**
 * BookForm — Módulo 2 (RF4–RF6)
 * Props:
 *   libro     → libro existente para edición (opcional)
 *   onSuccess → callback(libroId, mensaje)
 *   onCancel  → callback para cerrar/cancelar
 */
export function BookForm({ libro = null, onSuccess, onCancel }) {
  const esEdicion  = Boolean(libro);
  const [form, setForm]       = useState(() => libro ? mapLibroAForm(libro) : ESTADO_INICIAL);
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('basico'); // 'basico' | 'detalles' | 'progreso' | 'extra'
  const fileInputRef          = useRef(null);
  const tituloRef             = useRef(null);

  /* ── Helpers ── */

  const update = useCallback((campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErrors((prev) => {
      if (!prev[campo]) return prev;
      const next = { ...prev };
      delete next[campo];
      return next;
    });
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    update(name, type === 'checkbox' ? checked : value);
  }, [update]);

  /* ── Portada imagen ── */

  const handlePortadaFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, portada: 'Solo se admiten imágenes (jpg, png, webp…)' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, portada: 'La imagen no puede superar 5 MB.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      update('portadaBase64', ev.target.result);
      update('portadaUrl', ''); // URL y base64 son mutuamente excluyentes
    };
    reader.readAsDataURL(file);
  }, [update]);

  const handlePortadaUrl = useCallback((e) => {
    update('portadaUrl', e.target.value);
    update('portadaBase64', ''); // Limpiar base64 si se escribe URL
  }, [update]);

  const clearPortada = useCallback(() => {
    update('portadaBase64', '');
    update('portadaUrl', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [update]);

  /* ── Validación RF6 ── */

  const validar = useCallback(() => {
    const errs = {};

    if (!form.titulo.trim()) {
      errs.titulo = 'El título es obligatorio.';
    }

    if (form.totalPaginas && (isNaN(form.totalPaginas) || Number(form.totalPaginas) < 1)) {
      errs.totalPaginas = 'Debe ser un número mayor que 0.';
    }

    if (form.isbn && !/^[\d\-X ]{9,17}$/.test(form.isbn.replace(/\s/g, ''))) {
      errs.isbn = 'ISBN no válido (10 o 13 dígitos).';
    }

    if (form.portadaUrl && !/^https?:\/\/.+/.test(form.portadaUrl)) {
      errs.portadaUrl = 'Introduce una URL válida (http:// o https://).';
    }

    if (form.fechaPublicacion) {
      const y = Number(form.fechaPublicacion);
      if (isNaN(y) || y < 1000 || y > new Date().getFullYear() + 5) {
        errs.fechaPublicacion = 'Año de publicación no válido.';
      }
    }

    return errs;
  }, [form]);

  /* ── Submit ── */

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const errs = validar();

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Ir a la sección con el primer error
      const campoError = Object.keys(errs)[0];
      const seccionError = getSectionForField(campoError);
      setSection(seccionError);
      return;
    }

    setLoading(true);
    try {
      const datos = formALibro(form);

      if (esEdicion) {
        await actualizarLibro(libro.id, datos);
        onSuccess?.(libro.id, '¡Libro actualizado correctamente!');
      } else {
        const id = await crearLibro(datos);
        onSuccess?.(id, '¡Libro añadido a tu biblioteca!');
      }
    } catch (err) {
      console.error('Error al guardar libro:', err);
      setErrors({ _global: 'Ocurrió un error al guardar. Inténtalo de nuevo.' });
    } finally {
      setLoading(false);
    }
  }, [form, esEdicion, libro, onSuccess, validar]);

  /* ── Portada preview ── */
  const portadaPreview = form.portadaBase64 || form.portadaUrl || null;
  const requierePlataforma = ['electronico', 'audiolibro'].includes(form.tipo);

  /* ── Render ── */

  return (
    <div className="book-form-container">
      <div className="book-form-header">
        <div className="book-form-title-row">
          <h2 className="book-form-title">
            {esEdicion ? 'Editar libro' : 'Añadir nuevo libro'}
          </h2>
          {onCancel && (
            <button
              type="button"
              className="book-form-close"
              onClick={onCancel}
              aria-label="Cancelar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Tabs de secciones */}
        <div className="book-form-tabs" role="tablist">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={section === s.id}
              className={`book-form-tab ${section === s.id ? 'book-form-tab--active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              <span aria-hidden="true">{s.emoji}</span>
              <span>{s.label}</span>
              {/* Indicador de error en la pestaña */}
              {SECTION_FIELDS[s.id]?.some((f) => errors[f]) && (
                <span className="book-form-tab-error" aria-label="Hay errores en esta sección">!</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="book-form">
        {/* ── Error global ── */}
        {errors._global && (
          <div className="book-form-global-error" role="alert">
            {errors._global}
          </div>
        )}

        {/* ────────────────────────────────────────────────
            SECCIÓN: BÁSICO
        ─────────────────────────────────────────────── */}
        <div className={`book-form-section ${section === 'basico' ? 'book-form-section--visible' : ''}`} role="tabpanel">
          <div className="book-form-grid">
            {/* Portada */}
            <div className="book-form-cover-area">
              <div className="cover-preview-wrapper">
                {portadaPreview ? (
                  <div className="cover-preview">
                    <img
                      src={portadaPreview}
                      alt="Portada del libro"
                      className="cover-img"
                      onError={() => clearPortada()}
                    />
                    <button
                      type="button"
                      className="cover-remove"
                      onClick={clearPortada}
                      aria-label="Quitar portada"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className="cover-placeholder"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    aria-label="Subir portada"
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="m21 15-5-5L5 21"/>
                    </svg>
                    <span>Subir portada</span>
                    <span className="cover-placeholder-hint">JPG, PNG, WEBP · max 5 MB</span>
                  </div>
                )}
              </div>

              {/* Input de archivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={handlePortadaFile}
                aria-label="Seleccionar imagen de portada"
              />

              <div className="form-group">
                <label htmlFor="portadaUrl" className="form-label">O URL de portada</label>
                <input
                  id="portadaUrl"
                  name="portadaUrl"
                  type="url"
                  className={`form-input ${errors.portadaUrl ? 'form-input--error' : ''}`}
                  value={form.portadaUrl}
                  onChange={handlePortadaUrl}
                  placeholder="https://..."
                  disabled={!!form.portadaBase64}
                />
                {errors.portadaUrl && <p className="form-error">{errors.portadaUrl}</p>}
                {errors.portada   && <p className="form-error">{errors.portada}</p>}
              </div>
            </div>

            {/* Campos básicos */}
            <div className="book-form-fields">
              {/* Título — obligatorio RF4, RF6 */}
              <div className="form-group">
                <label htmlFor="titulo" className="form-label required">Título</label>
                <input
                  ref={tituloRef}
                  id="titulo"
                  name="titulo"
                  type="text"
                  className={`form-input ${errors.titulo ? 'form-input--error' : ''}`}
                  value={form.titulo}
                  onChange={handleChange}
                  placeholder="Nombre del libro…"
                  maxLength={300}
                  aria-required="true"
                />
                {errors.titulo && <p className="form-error" role="alert">{errors.titulo}</p>}
              </div>

              {/* Autores */}
              <div className="form-group">
                <label htmlFor="autores" className="form-label">Autor(es)</label>
                <input
                  id="autores"
                  name="autores"
                  type="text"
                  className="form-input"
                  value={form.autores}
                  onChange={handleChange}
                  placeholder="Nombre Apellido, Otro Autor…"
                />
                <span className="form-hint">Separa varios autores con comas.</span>
              </div>

              {/* ISBN */}
              <div className="form-group">
                <label htmlFor="isbn" className="form-label">ISBN</label>
                <input
                  id="isbn"
                  name="isbn"
                  type="text"
                  className={`form-input ${errors.isbn ? 'form-input--error' : ''}`}
                  value={form.isbn}
                  onChange={handleChange}
                  placeholder="978-XXXXXXXXXX"
                  maxLength={20}
                />
                {errors.isbn && <p className="form-error">{errors.isbn}</p>}
              </div>

              {/* Editorial y año */}
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="editorial" className="form-label">Editorial</label>
                  <input
                    id="editorial"
                    name="editorial"
                    type="text"
                    className="form-input"
                    value={form.editorial}
                    onChange={handleChange}
                    placeholder="Nombre editorial…"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fechaPublicacion" className="form-label">Año publicación</label>
                  <input
                    id="fechaPublicacion"
                    name="fechaPublicacion"
                    type="number"
                    className={`form-input ${errors.fechaPublicacion ? 'form-input--error' : ''}`}
                    value={form.fechaPublicacion}
                    onChange={handleChange}
                    placeholder={String(new Date().getFullYear())}
                    min="1000"
                    max={new Date().getFullYear() + 5}
                  />
                  {errors.fechaPublicacion && (
                    <p className="form-error">{errors.fechaPublicacion}</p>
                  )}
                </div>
              </div>

              {/* Idioma y categoría */}
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="idioma" className="form-label">Idioma</label>
                  <select
                    id="idioma"
                    name="idioma"
                    className="form-select"
                    value={form.idioma}
                    onChange={handleChange}
                  >
                    {IDIOMAS.map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>

                {/* Categoría — RF5 default "leer más tarde" */}
                <div className="form-group">
                  <label htmlFor="categoria" className="form-label">Categoría</label>
                  <select
                    id="categoria"
                    name="categoria"
                    className="form-select"
                    value={form.categoria}
                    onChange={handleChange}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────
            SECCIÓN: DETALLES
        ─────────────────────────────────────────────── */}
        <div className={`book-form-section ${section === 'detalles' ? 'book-form-section--visible' : ''}`} role="tabpanel">

          {/* Tipo de encuadernado */}
          <div className="form-group">
            <label className="form-label">Tipo de encuadernado / formato</label>
            <div className="tipo-grid">
              {TIPOS_ENCUADERNADO.map((t) => (
                <label
                  key={t.value}
                  className={`tipo-option ${form.tipo === t.value ? 'tipo-option--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={t.value}
                    checked={form.tipo === t.value}
                    onChange={handleChange}
                    className="visually-hidden"
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Plataforma — solo si es electrónico/audiolibro */}
          {requierePlataforma && (
            <div className="form-group">
              <label htmlFor="plataforma" className="form-label">Plataforma</label>
              <select
                id="plataforma"
                name="plataforma"
                className="form-select"
                value={form.plataforma}
                onChange={handleChange}
              >
                {PLATAFORMAS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Creadores */}
          <div className="form-group">
            <label htmlFor="traductores" className="form-label">Traductor(es)</label>
            <input
              id="traductores"
              name="traductores"
              type="text"
              className="form-input"
              value={form.traductores}
              onChange={handleChange}
              placeholder="Nombre Traductor, Otro…"
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="ilustradores" className="form-label">Ilustrador(es)</label>
              <input
                id="ilustradores"
                name="ilustradores"
                type="text"
                className="form-input"
                value={form.ilustradores}
                onChange={handleChange}
                placeholder="Nombre Ilustrador…"
              />
            </div>

            <div className="form-group">
              <label htmlFor="narradores" className="form-label">Narrador(es)</label>
              <input
                id="narradores"
                name="narradores"
                type="text"
                className="form-input"
                value={form.narradores}
                onChange={handleChange}
                placeholder="Nombre Narrador…"
              />
            </div>
          </div>

          {/* Serie / Saga — RF15 */}
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="saga" className="form-label">Serie / Saga</label>
              <input
                id="saga"
                name="saga"
                type="text"
                className="form-input"
                value={form.saga}
                onChange={handleChange}
                placeholder="Nombre de la saga…"
              />
              <span className="form-hint">Se creará una colección automáticamente.</span>
            </div>

            <div className="form-group">
              <label htmlFor="numeroEnSaga" className="form-label">Número en saga</label>
              <input
                id="numeroEnSaga"
                name="numeroEnSaga"
                type="number"
                className="form-input"
                value={form.numeroEnSaga}
                onChange={handleChange}
                placeholder="1, 2, 3…"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          {/* Etiquetas — RF13 */}
          <div className="form-group">
            <label htmlFor="etiquetas" className="form-label">Etiquetas</label>
            <input
              id="etiquetas"
              name="etiquetas"
              type="text"
              className="form-input"
              value={form.etiquetas}
              onChange={handleChange}
              placeholder="fantasía, clásico, favorito…"
            />
            <span className="form-hint">Separa etiquetas con comas.</span>
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label htmlFor="descripcion" className="form-label">Descripción / Sinopsis</label>
            <textarea
              id="descripcion"
              name="descripcion"
              className="form-textarea"
              value={form.descripcion}
              onChange={handleChange}
              placeholder="Breve descripción del libro…"
              rows={4}
            />
          </div>
        </div>

        {/* ────────────────────────────────────────────────
            SECCIÓN: PROGRESO
        ─────────────────────────────────────────────── */}
        <div className={`book-form-section ${section === 'progreso' ? 'book-form-section--visible' : ''}`} role="tabpanel">

          {/* Total de páginas */}
          <div className="form-group">
            <label htmlFor="totalPaginas" className="form-label">Total de páginas / duración</label>
            <input
              id="totalPaginas"
              name="totalPaginas"
              type="number"
              className={`form-input ${errors.totalPaginas ? 'form-input--error' : ''}`}
              value={form.totalPaginas}
              onChange={handleChange}
              placeholder="350"
              min="1"
            />
            {errors.totalPaginas && <p className="form-error">{errors.totalPaginas}</p>}
          </div>

          {/* Formato de progreso */}
          <div className="form-group">
            <label className="form-label">Formato de seguimiento del progreso</label>
            <div className="tipo-grid tipo-grid--small">
              {FORMATOS_PROGRESO.map((fp) => (
                <label
                  key={fp.value}
                  className={`tipo-option ${form.formatoProgreso === fp.value ? 'tipo-option--selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="formatoProgreso"
                    value={fp.value}
                    checked={form.formatoProgreso === fp.value}
                    onChange={handleChange}
                    className="visually-hidden"
                  />
                  <span>{fp.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Campo de progreso dinámico */}
          {form.formatoProgreso === 'paginas' && (
            <div className="form-group">
              <label htmlFor="progresoPaginas" className="form-label">Página actual</label>
              <input
                id="progresoPaginas"
                name="progresoPaginas"
                type="number"
                className="form-input"
                value={form.progresoPaginas}
                onChange={handleChange}
                placeholder="0"
                min="0"
              />
              {form.totalPaginas && form.progresoPaginas && (
                <div className="progress-bar-wrapper">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.min(100, (form.progresoPaginas / form.totalPaginas) * 100).toFixed(1)}%` }}
                  />
                  <span className="progress-bar-label">
                    {Math.min(100, ((form.progresoPaginas / form.totalPaginas) * 100)).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {form.formatoProgreso === 'porcentaje' && (
            <div className="form-group">
              <label htmlFor="progresoPorc" className="form-label">Porcentaje completado</label>
              <input
                id="progresoPorc"
                name="progresoPorc"
                type="number"
                className="form-input"
                value={form.progresoPorc}
                onChange={handleChange}
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
          )}

          {form.formatoProgreso === 'episodio' && (
            <div className="form-group">
              <label htmlFor="progresoEpisodio" className="form-label">Episodio actual</label>
              <input
                id="progresoEpisodio"
                name="progresoEpisodio"
                type="text"
                className="form-input"
                value={form.progresoEpisodio}
                onChange={handleChange}
                placeholder="Ej. Episodio 3 / Capítulo 12"
              />
            </div>
          )}

          {form.formatoProgreso === 'tiempo' && (
            <div className="form-group">
              <label htmlFor="progresoTiempo" className="form-label">Tiempo escuchado / leído</label>
              <input
                id="progresoTiempo"
                name="progresoTiempo"
                type="text"
                className="form-input"
                value={form.progresoTiempo}
                onChange={handleChange}
                placeholder="2h 30min"
              />
            </div>
          )}

          {/* Fechas de lectura */}
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="fechaInicio" className="form-label">Fecha de inicio</label>
              <input
                id="fechaInicio"
                name="fechaInicio"
                type="date"
                className="form-input"
                value={form.fechaInicio}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fechaFin" className="form-label">Fecha de finalización</label>
              <input
                id="fechaFin"
                name="fechaFin"
                type="date"
                className="form-input"
                value={form.fechaFin}
                onChange={handleChange}
                min={form.fechaInicio || undefined}
              />
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────
            SECCIÓN: EXTRA / NOTAS RÁPIDAS
        ─────────────────────────────────────────────── */}
        <div className={`book-form-section ${section === 'extra' ? 'book-form-section--visible' : ''}`} role="tabpanel">
          <div className="form-group">
            <label htmlFor="notas" className="form-label">Notas personales rápidas</label>
            <textarea
              id="notas"
              name="notas"
              className="form-textarea"
              value={form.notas}
              onChange={handleChange}
              placeholder="Pensamientos iniciales, recordatorios, por qué quieres leer este libro…"
              rows={6}
            />
            <span className="form-hint">
              Puedes añadir notas enriquecidas (con formato, por página/fecha) desde la vista detalle del libro.
            </span>
          </div>

          {/* Resumen de lo que se va a crear */}
          <div className="book-form-summary">
            <h3>Resumen</h3>
            <dl className="summary-list">
              <div>
                <dt>Título</dt>
                <dd>{form.titulo || <em>Sin título</em>}</dd>
              </div>
              {form.autores && (
                <div>
                  <dt>Autor(es)</dt>
                  <dd>{form.autores}</dd>
                </div>
              )}
              <div>
                <dt>Categoría</dt>
                <dd>{CATEGORIAS.find((c) => c.value === form.categoria)?.label}</dd>
              </div>
              <div>
                <dt>Formato</dt>
                <dd>{TIPOS_ENCUADERNADO.find((t) => t.value === form.tipo)?.label}</dd>
              </div>
              {form.saga && (
                <div>
                  <dt>Saga</dt>
                  <dd>{form.saga}{form.numeroEnSaga ? ` #${form.numeroEnSaga}` : ''}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* ── Acciones ── */}
        <div className="book-form-actions">
          {section !== 'basico' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSection(prevSection(section))}
            >
              ← Anterior
            </button>
          )}

          {section !== 'extra' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSection(nextSection(section))}
            >
              Siguiente →
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="welcome-btn-spinner" aria-hidden="true" />
                  Guardando…
                </>
              ) : (
                <>{esEdicion ? '💾 Guardar cambios' : '📚 Añadir a biblioteca'}</>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ─── Utilidades del componente ─────────────────── */

const SECTIONS = [
  { id: 'basico',   label: 'Básico',   emoji: '📖' },
  { id: 'detalles', label: 'Detalles', emoji: '🔍' },
  { id: 'progreso', label: 'Progreso', emoji: '📊' },
  { id: 'extra',    label: 'Extra',    emoji: '✏️' },
];

const SECTION_FIELDS = {
  basico:   ['titulo', 'isbn', 'portadaUrl', 'fechaPublicacion'],
  detalles: ['tipo', 'plataforma', 'saga'],
  progreso: ['totalPaginas', 'progresoPaginas', 'progresoPorc'],
  extra:    [],
};

const SECTION_ORDER = SECTIONS.map((s) => s.id);

function nextSection(current) {
  const idx = SECTION_ORDER.indexOf(current);
  return SECTION_ORDER[Math.min(idx + 1, SECTION_ORDER.length - 1)];
}

function prevSection(current) {
  const idx = SECTION_ORDER.indexOf(current);
  return SECTION_ORDER[Math.max(idx - 1, 0)];
}

function getSectionForField(campo) {
  for (const [sec, fields] of Object.entries(SECTION_FIELDS)) {
    if (fields.includes(campo)) return sec;
  }
  return 'basico';
}

function mapLibroAForm(libro) {
  return {
    titulo: libro.titulo ?? '',
    autores: libro.autores ?? '',
    isbn: libro.isbn ?? '',
    editorial: libro.editorial ?? '',
    fechaPublicacion: libro.fechaPublicacion ? String(libro.fechaPublicacion) : '',
    idioma: libro.idioma ?? 'es',
    categoria: libro.categoria ?? 'leer-mas-tarde',
    tipo: libro.tipo ?? 'tapa-blanda',
    plataforma: libro.plataforma ?? '',
    totalPaginas: libro.totalPaginas ? String(libro.totalPaginas) : '',
    formatoProgreso: libro.formatoProgreso ?? 'paginas',
    progresoPaginas: libro.progresoPaginas ? String(libro.progresoPaginas) : '',
    progresoPorc: libro.progresoPorc ? String(libro.progresoPorc) : '',
    progresoEpisodio: libro.progresoEpisodio ?? '',
    progresoTiempo: libro.progresoTiempo ?? '',
    traductores: libro.traductores ?? '',
    ilustradores: libro.ilustradores ?? '',
    narradores: libro.narradores ?? '',
    saga: libro.saga ?? '',
    numeroEnSaga: libro.numeroEnSaga ? String(libro.numeroEnSaga) : '',
    etiquetas: Array.isArray(libro.etiquetas) ? libro.etiquetas.join(', ') : (libro.etiquetas ?? ''),
    portadaUrl: libro.portadaUrl ?? '',
    portadaBase64: libro.portadaBase64 ?? '',
    descripcion: libro.descripcion ?? '',
    notas: libro.notas ?? '',
    fechaInicio: libro.fechaInicio ?? '',
    fechaFin: libro.fechaFin ?? '',
  };
}

function formALibro(form) {
  return {
    titulo: form.titulo.trim(),
    autores: form.autores.trim(),
    isbn: form.isbn.trim(),
    editorial: form.editorial.trim(),
    fechaPublicacion: form.fechaPublicacion ? Number(form.fechaPublicacion) : null,
    idioma: form.idioma,
    categoria: form.categoria,
    tipo: form.tipo,
    plataforma: form.plataforma,
    totalPaginas: form.totalPaginas ? Number(form.totalPaginas) : null,
    formatoProgreso: form.formatoProgreso,
    progresoPaginas: form.progresoPaginas ? Number(form.progresoPaginas) : 0,
    progresoPorc: form.progresoPorc ? Number(form.progresoPorc) : 0,
    progresoEpisodio: form.progresoEpisodio.trim(),
    progresoTiempo: form.progresoTiempo.trim(),
    traductores: form.traductores.trim(),
    ilustradores: form.ilustradores.trim(),
    narradores: form.narradores.trim(),
    saga: form.saga.trim(),
    numeroEnSaga: form.numeroEnSaga ? Number(form.numeroEnSaga) : null,
    etiquetas: form.etiquetas
      ? form.etiquetas.split(',').map((e) => e.trim()).filter(Boolean)
      : [],
    portadaUrl: form.portadaUrl.trim(),
    portadaBase64: form.portadaBase64,
    descripcion: form.descripcion.trim(),
    notas: form.notas.trim(),
    fechaInicio: form.fechaInicio || null,
    fechaFin: form.fechaFin || null,
  };
}
