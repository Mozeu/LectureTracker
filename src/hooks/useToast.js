import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const success = useCallback(
    (message) => addToast({ message, type: 'success' }),
    [addToast]
  );

  const error = useCallback(
    (message) => addToast({ message, type: 'error', duration: 5000 }),
    [addToast]
  );

  const info = useCallback(
    (message) => addToast({ message, type: 'info' }),
    [addToast]
  );

  return { toasts, success, error, info };
}
