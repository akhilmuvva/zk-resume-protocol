"use client";

import { createContext, useContext, useCallback, useState, ReactNode } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  txHash?: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, txHash?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
  error:   <XCircle    className="w-5 h-5 text-red-400    flex-shrink-0" />,
  info:    <Info       className="w-5 h-5 text-cyan-400   flex-shrink-0" />,
};

const BORDERS = {
  success: "border-l-emerald-500",
  error:   "border-l-red-500",
  info:    "border-l-cyan-500",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (message: string, type: ToastType = "info", txHash?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type, txHash }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl border border-white/10 border-l-4 ${BORDERS[t.type]} bg-[#10162A]/90 backdrop-blur-md shadow-2xl animate-in slide-in-from-right-full duration-300`}
          >
            {ICONS[t.type]}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">{t.message}</p>
              {t.txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${t.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:underline mt-1 block font-mono truncate"
                >
                  {t.txHash.slice(0, 20)}...
                </a>
              )}
            </div>
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((x) => x.id !== t.id))
              }
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
