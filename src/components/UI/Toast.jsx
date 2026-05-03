import React from 'react';
import './Toast.css';

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const COLORS = {
  success: 'var(--accent-sage)',
  error: '#c0392b',
  info: 'var(--accent-reading)',
};

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast"
          style={{ '--toast-accent': COLORS[toast.type] }}
          role="alert"
        >
          <span className="toast-icon">{ICONS[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
