"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error";

type Toast = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const regionRef = useRef<HTMLDivElement>(null);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = generateId();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push],
  );

  useEffect(() => {
    const region = regionRef.current;
    if (!region || typeof region.showPopover !== "function") {
      return;
    }
    if (toasts.length > 0) {
      if (!region.matches(":popover-open")) {
        try {
          region.showPopover();
        } catch {
          // Ignore if already open or unsupported
        }
      }
    } else {
      if (region.matches(":popover-open")) {
        try {
          region.hidePopover();
        } catch {
          // Ignore if already closed
        }
      }
    }
  }, [toasts.length]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={regionRef}
        popover="manual"
        className="ui-toast-region"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <p key={toast.id} className={`ui-toast ui-toast-${toast.tone}`} role="status">
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return value;
}
