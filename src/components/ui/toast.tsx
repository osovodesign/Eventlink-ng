import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'info' | 'warning' | 'danger';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * ToastProvider (Design_System.md Section 8.12 & Component_Specifications.md Section 4.18)
 * Renders brief, non-blocking confirmations after server operations succeed.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((t) => {
          const icon =
            t.tone === 'success' ? (
              <CheckCircle2
                className="h-4 w-4 text-[#16794B] shrink-0 mt-0.5"
                aria-hidden="true"
              />
            ) : t.tone === 'danger' || t.tone === 'warning' ? (
              <AlertTriangle
                className="h-4 w-4 text-[#B42318] shrink-0 mt-0.5"
                aria-hidden="true"
              />
            ) : (
              <Info
                className="h-4 w-4 text-[#175CD3] shrink-0 mt-0.5"
                aria-hidden="true"
              />
            );

          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-start justify-between gap-3 rounded-[10px] border border-[#D7DEE8] bg-white p-3.5 shadow-md"
            >
              <div className="flex items-start gap-2.5 text-sm">
                {icon}
                <div>
                  <p className="font-semibold text-[#142B4A]">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-[#344054] mt-0.5">
                      {t.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(t.id)}
                className="rounded-[6px] p-1 text-[#697586] hover:bg-[#F4F6F9] hover:text-[#172B4D] cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
