import React, { useState, useRef, useEffect } from 'react';
import { setConfig } from '../../db/db';
import './WelcomeSetup.css';

const BOOKS_DECORATION = ['📚', '📖', '🔖', '✒️', '🏛️'];

export function WelcomeSetup({ onComplete }) {
  const [nombre, setNombre] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep]     = useState(0); // 0=intro, 1=form
  const inputRef            = useRef(null);

  // Animar la entrada
  useEffect(() => {
    const timer = setTimeout(() => setStep(1), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (step === 1) inputRef.current?.focus();
  }, [step]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const limpio = nombre.trim();

    if (!limpio) {
      setError('Por favor escribe tu nombre para continuar.');
      inputRef.current?.focus();
      return;
    }

    if (limpio.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    if (limpio.length > 50) {
      setError('El nombre no puede superar los 50 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await setConfig('nombreUsuario', limpio);
      await setConfig('fechaRegistro', new Date().toISOString());
      localStorage.setItem('nombreUsuario', limpio);
      onComplete(limpio);
    } catch (err) {
      setError('Ocurrió un error al guardar. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="welcome-overlay">
      {/* Decoración de fondo */}
      <div className="welcome-bg-books" aria-hidden="true">
        {BOOKS_DECORATION.map((emoji, i) => (
          <span key={i} className="bg-book" style={{ '--i': i }}>
            {emoji}
          </span>
        ))}
      </div>

      {/* Tarjeta principal */}
      <div className={`welcome-card ${step >= 1 ? 'welcome-card--visible' : ''}`}>
        {/* Logo / ícono */}
        <div className="welcome-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8"  y="8"  width="28" height="40" rx="3" fill="currentColor" opacity="0.15"/>
            <rect x="10" y="10" width="28" height="40" rx="3" fill="currentColor" opacity="0.3"/>
            <rect x="12" y="12" width="28" height="40" rx="3" fill="var(--bg-card)"/>
            <rect x="12" y="12" width="6"  height="40" rx="2" fill="currentColor" opacity="0.4"/>
            <rect x="21" y="20" width="14" height="1.5" rx="0.75" fill="currentColor" opacity="0.5"/>
            <rect x="21" y="24" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.35"/>
            <rect x="21" y="28" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.35"/>
            <rect x="36" y="16" width="10" height="32" rx="2" fill="currentColor" opacity="0.6"/>
          </svg>
        </div>

        {/* Título */}
        <div className="welcome-heading">
          <h1>Librería Personal</h1>
          <p className="welcome-subtitle">
            Tu espacio para registrar cada libro leído, en progreso o por descubrir.
          </p>
        </div>

        {/* Separador decorativo */}
        <div className="welcome-ornament" aria-hidden="true">
          <span>❧</span>
        </div>

        {/* Formulario de nombre — RF1 */}
        <form className="welcome-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="welcome-name" className="welcome-form-label">
            ¿Cómo te llamas?
          </label>
          <p className="welcome-form-hint">
            Así podré saludarte cada vez que abras tu biblioteca.
          </p>

          <div className="welcome-input-wrapper">
            <input
              ref={inputRef}
              id="welcome-name"
              type="text"
              className={`welcome-input ${error ? 'welcome-input--error' : ''}`}
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Tu nombre aquí..."
              maxLength={50}
              autoComplete="given-name"
              aria-describedby={error ? 'name-error' : 'name-hint'}
              aria-invalid={!!error}
              disabled={loading}
            />
            <span className="welcome-input-char" aria-live="polite">
              {nombre.length}/50
            </span>
          </div>

          {error && (
            <p id="name-error" className="welcome-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="welcome-btn"
            disabled={loading || !nombre.trim()}
          >
            {loading ? (
              <>
                <span className="welcome-btn-spinner" aria-hidden="true" />
                Guardando…
              </>
            ) : (
              <>
                Comenzar mi biblioteca
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        <p className="welcome-privacy">
          🔒 Todo se guarda localmente en tu navegador. Sin cuentas, sin servidores.
        </p>
      </div>
    </div>
  );
}
