import React, { useState } from 'react';
import { BookForm } from '../Books/BookForm';
import './Dashboard.css';

export function Dashboard({ nombreUsuario, onAddBook }) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const handleSuccess = (libroId, mensaje) => {
    setMostrarFormulario(false);
    onAddBook?.(libroId, mensaje);
  };

  if (mostrarFormulario) {
    return (
      <div className="dashboard-form-wrapper">
        <BookForm
          onSuccess={handleSuccess}
          onCancel={() => setMostrarFormulario(false)}
        />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Bienvenida — RF24 */}
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h1>
            ¡Hola, <span className="dashboard-name">{nombreUsuario}</span>!
          </h1>
          <p>¿Qué vamos a leer hoy?</p>
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={() => setMostrarFormulario(true)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Agregar libro
        </button>
      </div>

      {/* Placeholder estantes — se completan en Módulo 3 */}
      <div className="dashboard-placeholder">
        <div className="placeholder-shelves">
          {['📖 En Progreso', '🕐 Leer más tarde', '✅ Terminados', '✨ Lista de Deseos'].map((s) => (
            <div key={s} className="placeholder-shelf card">
              <h3>{s}</h3>
              <p className="placeholder-empty">
                Tu biblioteca está vacía. ¡Añade tu primer libro!
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
