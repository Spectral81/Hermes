'use client';

import { useEffect, useState } from 'react';

export type ToastTone = 'info' | 'success' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  body?: string;
  tone?: ToastTone;
}

interface Props {
  toast: ToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function AppToast({ toast, onDismiss, durationMs = 5000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const hide = window.setTimeout(() => setVisible(false), durationMs - 320);
    const clear = window.setTimeout(onDismiss, durationMs);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(clear);
    };
  }, [toast, durationMs, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={`web-toast web-toast-${toast.tone ?? 'info'}${visible ? ' web-toast-in' : ' web-toast-out'}`}
      role="status"
    >
      <strong>{toast.title}</strong>
      {toast.body ? <span>{toast.body}</span> : null}
    </div>
  );
}
