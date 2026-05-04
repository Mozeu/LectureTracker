import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import 'quill/dist/quill.snow.css';
import './RichEditor.css';

const TOOLBAR_OPTIONS = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote'],
  ['clean'],
];

/**
 * RichEditor — editor Quill.js montado imperativamente.
 * Evita los problemas de react-quill con React 18 StrictMode.
 *
 * Ref API:
 *   ref.current.getHTML()      → string HTML
 *   ref.current.getText()      → string plano
 *   ref.current.setHTML(html)  → void
 *   ref.current.focus()        → void
 */
export const RichEditor = forwardRef(function RichEditor(
  { placeholder = 'Escribe tu nota aquí…', initialHTML = '', onChange },
  ref
) {
  const containerRef = useRef(null);
  const quillRef     = useRef(null);

  useEffect(() => {
    // Evitar doble-montaje en StrictMode
    if (quillRef.current) return;

    import('quill').then(({ default: Quill }) => {
      if (!containerRef.current || quillRef.current) return;

      const quill = new Quill(containerRef.current, {
        theme: 'snow',
        placeholder,
        modules: { toolbar: TOOLBAR_OPTIONS },
      });

      quillRef.current = quill;

      // Cargar contenido inicial
      if (initialHTML) {
        quill.root.innerHTML = initialHTML;
      }

      // Notificar cambios hacia arriba
      quill.on('text-change', () => {
        onChange?.({
          html:  quill.root.innerHTML,
          text:  quill.getText().trim(),
        });
      });
    });

    return () => {
      // Quill no tiene destroy() limpio, pero al desmontar React libera el DOM
      quillRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exponer API al padre
  useImperativeHandle(ref, () => ({
    getHTML:  () => quillRef.current?.root.innerHTML ?? '',
    getText:  () => quillRef.current?.getText().trim() ?? '',
    setHTML:  (html) => {
      if (quillRef.current) quillRef.current.root.innerHTML = html ?? '';
    },
    focus:    () => quillRef.current?.focus(),
    isEmpty:  () => {
      const text = quillRef.current?.getText().trim() ?? '';
      return text === '' || text === '\n';
    },
  }), []);

  return (
    <div className="rich-editor-wrapper">
      <div ref={containerRef} className="rich-editor-container" />
    </div>
  );
});
