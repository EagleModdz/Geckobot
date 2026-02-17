import { useState, useCallback, useEffect, useRef } from 'react';

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error';
}

let listeners: Array<(toast: ToastData) => void> = [];
let toastCount = 0;

function dispatch(toast: Omit<ToastData, 'id'>) {
  const id = String(++toastCount);
  const full = { ...toast, id };
  listeners.forEach((fn) => fn(full));
  return id;
}

export const toast = {
  success: (title: string, description?: string) =>
    dispatch({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    dispatch({ title, description, variant: 'error' }),
  info: (title: string, description?: string) =>
    dispatch({ title, description, variant: 'default' }),
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const addToastRef = useRef<(t: ToastData) => void>(undefined);

  const addToast = useCallback((t: ToastData) => {
    setToasts((prev) => [...prev, t]);
  }, []);

  addToastRef.current = addToast;

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (t: ToastData) => addToastRef.current?.(t);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  return { toasts, dismissToast };
}
