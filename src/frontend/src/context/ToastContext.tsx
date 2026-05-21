import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType }

interface ToastCtx { toast: (msg: string, type?: ToastType) => void }
const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let counter = 0;

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const colors: Record<ToastType, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`${colors[t.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs animate-fade-in`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
