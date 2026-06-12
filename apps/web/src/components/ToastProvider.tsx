"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastItem = {
  id: number;
  message: string;
  leaving?: boolean;
};

type ToastContextValue = {
  toast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message }]);

    window.setTimeout(() => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, leaving: true } : item))
      );
    }, 2600);

    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 2900);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toastViewport" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className="toast" data-leaving={item.leaving ? "true" : "false"}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
