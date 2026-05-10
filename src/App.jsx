import React, { useState, useEffect, useCallback } from 'react';
import { getConfig, setConfig } from './db/db';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { useStorageQuota } from './hooks/useStorageQuota';
import { WelcomeSetup } from './components/Setup/WelcomeSetup';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './components/Layout/Dashboard';
import { Biblioteca } from './components/Books/Biblioteca';
import { GestionEtiquetas } from './components/Tags/GestionEtiquetas';
import { GestionColecciones } from './components/Tags/GestionColecciones';
import { Configuracion } from './components/Config/Configuracion';
import { ToastContainer } from './components/UI/Toast';
import './styles/global.css';

/* ─── Estados de carga ─────────────────────────── */
const ESTADO = {
  CARGANDO: 'cargando',
  SETUP:    'setup',   // Módulo 1: sin nombre de usuario
  APP:      'app',     // App principal
};

export default function App() {
  const [estado, setEstado]             = useState(ESTADO.CARGANDO);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [vista, setVista]               = useState('dashboard');
  const [filtro, setFiltro]             = useState(null); // filtro activo en Biblioteca
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { toasts, success, error: toastError } = useToast();
  const storageQuota = useStorageQuota();

  /* ── Verificar si ya hay nombre guardado (RF1) ── */
  useEffect(() => {
    const init = async () => {
      try {
        // Intentar localStorage primero (respuesta inmediata)
        const localNombre = localStorage.getItem('nombreUsuario');
        if (localNombre) {
          setNombreUsuario(localNombre);
          setEstado(ESTADO.APP);
          return;
        }

        // Fallback a IndexedDB
        const dbNombre = await getConfig('nombreUsuario');
        if (dbNombre) {
          setNombreUsuario(dbNombre);
          localStorage.setItem('nombreUsuario', dbNombre);
          setEstado(ESTADO.APP);
        } else {
          setEstado(ESTADO.SETUP);
        }
      } catch (err) {
        console.error('Error al inicializar:', err);
        setEstado(ESTADO.SETUP);
      }
    };

    init();
  }, []);

  /* ── Completar setup ── */
  const handleSetupComplete = useCallback((nombre) => {
    setNombreUsuario(nombre);
    setEstado(ESTADO.APP);
    success(`¡Bienvenido/a, ${nombre}! Tu biblioteca está lista.`);
  }, [success]);

  /* ── Añadir libro (callback desde Dashboard) ── */
  const handleAddBook = useCallback((libroId, mensaje) => {
    success(mensaje ?? '¡Libro añadido!');
  }, [success]);

  /* ── Navegar a Biblioteca con filtro opcional ── */
  const navegarBiblioteca = useCallback((f = null) => {
    setFiltro(f);
    setVista('biblioteca');
  }, []);

  /* ── Navegar genérico desde sidebar ── */
  const handleNavegar = useCallback((v, f = null) => {
    setFiltro(v === 'biblioteca' ? f : null);
    setVista(v);
  }, []);
  const handleCambiarNombre = useCallback(async (nuevoNombre) => {
    try {
      await setConfig('nombreUsuario', nuevoNombre);
      localStorage.setItem('nombreUsuario', nuevoNombre);
      setNombreUsuario(nuevoNombre);
      success('Nombre actualizado correctamente.');
    } catch {
      toastError('No se pudo actualizar el nombre.');
    }
  }, [success, toastError]);

  /* ── Renders ── */

  if (estado === ESTADO.CARGANDO) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          flexDirection: 'column',
          gap: '16px',
          color: 'var(--text-muted)',
        }}
        aria-label="Cargando aplicación"
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border-medium)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 700ms linear infinite',
          }}
        />
        <p style={{ fontSize: '0.875rem' }}>Cargando tu biblioteca…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (estado === ESTADO.SETUP) {
    return (
      <>
        <WelcomeSetup onComplete={handleSetupComplete} />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  return (
    <>
      <div className="app-layout">
        {/* Overlay para sidebar en móvil */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--bg-overlay)',
              zIndex: 150,
            }}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          vista={vista}
          filtro={filtro}
          onNavegar={handleNavegar}
          nombreUsuario={nombreUsuario}
          theme={theme}
          onToggleTheme={toggleTheme}
          onMobileClose={() => setSidebarOpen(false)}
          className={sidebarOpen ? 'sidebar--open' : ''}
        />

        {/* Contenido principal */}
        <main className="app-main">
          {/* Header móvil */}
          <header className="mobile-header" aria-label="Cabecera de navegación móvil">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={sidebarOpen}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <span className="mobile-header-title">📚 Librería Personal</span>
          </header>

          {/* Critical storage warning — RNF7 */}
        {storageQuota.isCritical && (
          <div className="app-storage-warning" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>
              Almacenamiento casi lleno ({storageQuota.percentage}% usado).
              <button
                className="app-storage-warning-link"
                onClick={() => handleNavegar('configuracion')}
              >
                Exporta un backup
              </button>
              para evitar perder datos.
            </span>
          </div>
        )}

        {/* Vistas */}
          <div className="page-content">
            {vista === 'dashboard' && (
              <Dashboard
                nombreUsuario={nombreUsuario}
                onAddBook={handleAddBook}
                onNavegar={handleNavegar}
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            )}

            {vista === 'biblioteca' && (
              <Biblioteca
                key={filtro ?? 'todas'}
                filtroInicial={filtro ?? 'todas'}
                onSuccess={(msg) => success(msg ?? '¡Hecho!')}
                onError={(msg) => toastError(msg ?? 'Error')}
              />
            )}

            {vista === 'etiquetas' && (
              <GestionEtiquetas
                onSuccess={(msg) => success(msg ?? '¡Hecho!')}
                onError={(msg) => toastError(msg ?? 'Error')}
              />
            )}

            {vista === 'colecciones' && (
              <GestionColecciones
                onSuccess={(msg) => success(msg ?? '¡Hecho!')}
                onError={(msg) => toastError(msg ?? 'Error')}
              />
            )}

            {vista === 'configuracion' && (
              <Configuracion
                nombreUsuario={nombreUsuario}
                theme={theme}
                onToggleTheme={toggleTheme}
                onCambiarNombre={handleCambiarNombre}
                onSuccess={(msg) => success(msg ?? '¡Hecho!')}
                onError={(msg) => toastError(msg ?? 'Error')}
                onResetComplete={() => setVista('dashboard')}
              />
            )}

            {!['dashboard', 'biblioteca', 'etiquetas', 'colecciones', 'configuracion'].includes(vista) && (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '80px' }}>
                <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🚧</p>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: '8px' }}>
                  Próximamente
                </h2>
                <p>Este módulo se desarrollará en la siguiente iteración.</p>
                <button
                  className="btn btn-ghost"
                  style={{ marginTop: '24px' }}
                  onClick={() => setVista('dashboard')}
                >
                  ← Volver al inicio
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <ToastContainer toasts={toasts} />

      <style>{`
        .mobile-header {
          display: none;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-light);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .mobile-menu-btn {
          padding: 10px;
          min-width: 44px;
          min-height: 44px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          transition: background var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mobile-menu-btn:hover {
          background: var(--bg-tertiary);
        }

        .mobile-header-title {
          font-family: var(--font-display);
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .mobile-header { display: flex; }
        }
      `}</style>
    </>
  );
}
