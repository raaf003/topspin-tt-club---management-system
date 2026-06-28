import React from 'react';

export interface ToastState {
  type: 'success' | 'error';
  message: string;
}

interface ToastMessageProps {
  toast: ToastState | null;
}

export const ToastMessage: React.FC<ToastMessageProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-xs md:text-sm font-black shadow-xl border ${
        toast.type === 'success'
          ? 'bg-emerald-600 text-white border-emerald-500'
          : 'bg-rose-600 text-white border-rose-500'
      }`}
    >
      {toast.message}
    </div>
  );
};
