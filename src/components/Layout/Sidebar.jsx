import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../../db/db';
import './Sidebar.css';

/**
 * Sidebar — Módulo 4 (RF10, RF11, RF24)
 * onNavegar(vista, filtro?) — filtro opcional para deep-link en Biblioteca
 */
export function Sidebar({ vista, filtro, onNavegar, nombreUsuario, theme, onToggleTheme, onMobileClose, className = '' }) {
  // Conteos reactivos para badges — RF10, RF11
  const conteos = useLiveQuery(async () => {
    const libros = await db.libros.toArray();
    return {
      total:      libros.length,
      progreso:   libros.filter((l) => l.categoria === 'en-progreso').length,
      terminados: libros.filter((l) => l.categoria === 'terminados').length,
      deseados:   libros.filter((l) => l.categoria === 'lista-de-deseos').length,
      masTarde:   libros.filter((l) => l.categoria === 'leer-mas-tarde').length,
      favoritos:  libros.filter((l) => l.favorito).length,
    };
  }, []);

  const esActivo = (v, f) => {
    if (v !== 'biblioteca') return vista === v;
    if (f === 'favoritos') return vista === 'biblioteca' && filtro === 'favoritos';
    if (f) return vista === 'biblioteca' && filtro === f;
    return vista === 'biblioteca' && !filtro;
  };

  return (
    <aside className={`sidebar ${className}`} aria-label="Navegación principal">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">📚</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">Librería</span>
          <span className="sidebar-logo-subtitle">Personal</span>
        </div>
        {onMobileClose && (
          <button className="sidebar-mobile-close" onClick={onMobileClose} aria-label="Cerrar menú">✕</button>
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

          {/* Inicio */}
          <NavItem
            activo={esActivo('dashboard')}
            emoji="🏠"
            label="Inicio"
            onClick={() => { onNavegar('dashboard'); onMobileClose?.(); }}
          />

          {/* Biblioteca — todas */}
          <NavItem
            activo={esActivo('biblioteca', null) || (vista === 'biblioteca' && !filtro)}
            emoji="📚"
            label="Biblioteca"
            badge={conteos?.total}
            onClick={() => { onNavegar('biblioteca'); onMobileClose?.(); }}
          />

          {/* Sub-items de categorías — RF10 */}
          <li className="sidebar-sub-group">
            <SubNavItem
              activo={esActivo('biblioteca', 'en-progreso')}
              emoji="📖"
              label="En Progreso"
              badge={conteos?.progreso}
              color="var(--cat-progress)"
              onClick={() => { onNavegar('biblioteca', 'en-progreso'); onMobileClose?.(); }}
            />
            <SubNavItem
              activo={esActivo('biblioteca', 'leer-mas-tarde')}
              emoji="🕐"
              label="Leer más tarde"
              badge={conteos?.masTarde}
              color="var(--cat-later)"
              onClick={() => { onNavegar('biblioteca', 'leer-mas-tarde'); onMobileClose?.(); }}
            />
            <SubNavItem
              activo={esActivo('biblioteca', 'lista-de-deseos')}
              emoji="✨"
              label="Lista de Deseos"
              badge={conteos?.deseados}
              color="var(--cat-wishlist)"
              onClick={() => { onNavegar('biblioteca', 'lista-de-deseos'); onMobileClose?.(); }}
            />
            <SubNavItem
              activo={esActivo('biblioteca', 'terminados')}
              emoji="✅"
              label="Terminados"
              badge={conteos?.terminados}
              color="var(--cat-finished)"
              onClick={() => { onNavegar('biblioteca', 'terminados'); onMobileClose?.(); }}
            />
          </li>

          {/* Favoritos — RF11 */}
          <NavItem
            activo={esActivo('biblioteca', 'favoritos')}
            emoji="★"
            label="Favoritos"
            badge={conteos?.favoritos || null}
            badgeColor="var(--accent-gold)"
            onClick={() => { onNavegar('biblioteca', 'favoritos'); onMobileClose?.(); }}
          />

          {/* Divisor */}
          <li className="sidebar-divider" role="separator" aria-hidden="true" />

          {/* Etiquetas y Colecciones — se implementan en Módulo 5 */}
          <NavItem
            activo={esActivo('etiquetas')}
            emoji="🏷️"
            label="Etiquetas"
            onClick={() => { onNavegar('etiquetas'); onMobileClose?.(); }}
          />
          <NavItem
            activo={esActivo('colecciones')}
            emoji="📂"
            label="Colecciones"
            onClick={() => { onNavegar('colecciones'); onMobileClose?.(); }}
          />

          <li className="sidebar-divider" role="separator" aria-hidden="true" />

          <NavItem
            activo={esActivo('configuracion')}
            emoji="⚙️"
            label="Ajustes"
            onClick={() => { onNavegar('configuracion'); onMobileClose?.(); }}
          />
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

/* ── Sub-componentes ── */

function NavItem({ activo, emoji, label, badge, badgeColor, onClick }) {
  return (
    <li>
      <button
        className={`sidebar-nav-item ${activo ? 'sidebar-nav-item--active' : ''}`}
        onClick={onClick}
        aria-current={activo ? 'page' : undefined}
      >
        <span className="sidebar-nav-emoji" aria-hidden="true">{emoji}</span>
        <span className="sidebar-nav-label">{label}</span>
        {badge > 0 && (
          <span
            className="sidebar-nav-badge"
            style={badgeColor ? { background: `color-mix(in srgb, ${badgeColor} 18%, transparent)`, color: badgeColor } : {}}
          >
            {badge}
          </span>
        )}
      </button>
    </li>
  );
}

function SubNavItem({ activo, emoji, label, badge, color, onClick }) {
  return (
    <button
      className={`sidebar-sub-item ${activo ? 'sidebar-sub-item--active' : ''}`}
      style={{ '--sub-color': color }}
      onClick={onClick}
      aria-current={activo ? 'page' : undefined}
    >
      <span className="sidebar-sub-dot" aria-hidden="true" />
      <span className="sidebar-sub-emoji" aria-hidden="true">{emoji}</span>
      <span className="sidebar-sub-label">{label}</span>
      {badge > 0 && <span className="sidebar-sub-badge">{badge}</span>}
    </button>
  );
}
