'use client';

import { useState, useEffect } from 'react';
import type { ToastType } from '@/lib/toast';

type ToastItem = { id: number; message: string; type: ToastType };

const BG: Record<ToastType, string> = {
  error: 'bg-red-600',
  success: 'bg-green-600',
  info: 'bg-zinc-700',
};

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let counter = 0;
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent<{ message: string; type: ToastType }>).detail;
      const id = counter++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        3000,
      );
    };
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-16 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${BG[t.type]} text-white text-sm font-medium px-4 py-3 rounded-lg shadow-xl toast-enter`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
