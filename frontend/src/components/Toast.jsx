// Toast system  [P1]
// Provides ToastProvider + useToast hook.
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);
let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(({ message, duration = 4000 }) => {
    const id = ++toastId;
    setToasts(ts => [...ts, { id, message }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <div key={t.id} className="toast" role="status">
            <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
              {t.message}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
