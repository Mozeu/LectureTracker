import { useState, useEffect, useCallback } from 'react';
import { getConfig, setConfig } from '../db/db';

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    // Lee inmediatamente de localStorage para evitar flash
    return localStorage.getItem('tema') ?? 'light';
  });

  // Sincroniza el atributo en <html> y guarda en localStorage + IndexedDB
  const applyTheme = useCallback((t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('tema', t);
    setConfig('tema', t).catch(() => {});
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Carga inicial desde IndexedDB (puede corregir si localStorage estaba vacío)
  useEffect(() => {
    getConfig('tema').then((temaGuardado) => {
      if (temaGuardado && temaGuardado !== theme) {
        setThemeState(temaGuardado);
      }
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      return next;
    });
  }, []);

  const setTheme = useCallback((t) => {
    setThemeState(t);
  }, []);

  return { theme, toggleTheme, setTheme };
}
