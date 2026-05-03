import React from 'react';
import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Inicio',      emoji: '🏠' },
  { id: 'biblioteca', label: 'Biblioteca',   emoji: '📚' },
  { id: 'progreso',   label: 'En Progreso',  emoji: '📖' },
  { id: 'etiquetas',  label: 'Etiquetas',    emoji: '🏷️' },
  { id: 'colecciones', label: 'Colecciones', emoji: '📂' },
  { id: 'configuracion', label: 'Ajustes',   emoji: '⚙️' },
];

export function Sidebar({ vista, onNavegar, nombreUsuario, theme, onToggleTheme, onMobileClose }) {
  return (
    <aside className="sidebar" aria-label="Navegación principal">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">📚</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">Librería</span>
          <span className="sidebar-logo-subtitle">Personal</span>
        </div>
        {onMobileClose && (
          <button
            className="sidebar-mobile-close"
            onClick={onMobileClose}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        )}
      </div>

      {/* Saludo */}
      {nombreUsuario && (
        <div className="sidebar-greeting">
          <span>¡Hola, <strong>{nombreUsuario}</strong>!</span>
        </div>
      )}

      {/* Navegación */}
      <nav className="sidebar-nav">
        <ul role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                className={`sidebar-nav-item ${vista === item.id ? 'sidebar-nav-item--active' : ''}`}
                onClick={() => { onNavegar(item.id); onMobileClose?.(); }}
                aria-current={vista === item.id ? 'page' : undefined}
              >
                <span className="sidebar-nav-emoji" aria-hidden="true">{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer: tema */}
      <div className="sidebar-footer">
        <button
          className="sidebar-theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
        </button>
      </div>
    </aside>
  );
}
