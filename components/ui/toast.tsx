"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id:      number;
  type:    ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _id = 0;

const ICON = { success: CheckCircle, error: AlertCircle, info: Info } as const;

const BORDER = {
  success: "border-l-green-500",
  error:   "border-l-red-500",
  info:    "border-l-indigo-500",
} as const;

const ICON_COLOR = {
  success: "text-green-500",
  error:   "text-red-500",
  info:    "text-indigo-400",
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = ICON[t.type];
          return (
            <div
              key={t.id}
              className={`toast-enter flex items-start gap-3 bg-surface border border-edge border-l-4 ${BORDER[t.type]} rounded-lg shadow-2xl p-4 w-[320px] pointer-events-auto`}
            >
              <Icon size={15} className={`shrink-0 mt-0.5 ${ICON_COLOR[t.type]}`} />
              <p className="flex-1 text-sm text-white leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-fg3 hover:text-fg2 transition-colors"
              >
                <X size={13} />
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
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
