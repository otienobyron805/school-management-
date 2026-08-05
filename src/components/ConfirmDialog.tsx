import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

let confirmDialogTrigger: ((options: ConfirmDialogOptions) => void) | null = null;

export function confirmAction(options: ConfirmDialogOptions) {
  if (confirmDialogTrigger) {
    confirmDialogTrigger(options);
  } else if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app_show_confirm_dialog', { detail: options }));
  }
}

export default function ConfirmDialog() {
  const [dialogState, setDialogState] = useState<ConfirmDialogOptions | null>(null);

  useEffect(() => {
    confirmDialogTrigger = (options: ConfirmDialogOptions) => {
      setDialogState(options);
    };

    const handleCustomEvent = (e: CustomEvent<ConfirmDialogOptions>) => {
      if (e.detail) {
        setDialogState(e.detail);
      }
    };

    window.addEventListener('app_show_confirm_dialog', handleCustomEvent as EventListener);

    return () => {
      confirmDialogTrigger = null;
      window.removeEventListener('app_show_confirm_dialog', handleCustomEvent as EventListener);
    };
  }, []);

  if (!dialogState) return null;

  const handleConfirm = () => {
    const cb = dialogState.onConfirm;
    setDialogState(null);
    if (cb) cb();
  };

  const handleCancel = () => {
    const cb = dialogState.onCancel;
    setDialogState(null);
    if (cb) cb();
  };

  const variant = dialogState.variant || 'danger';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Banner Accent */}
          <div className={`absolute top-0 left-0 right-0 h-2 ${
            variant === 'danger' ? 'bg-red-500' : variant === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
          }`} />

          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4 pt-2">
            <div className={`p-3 rounded-2xl flex-shrink-0 ${
              variant === 'danger' ? 'bg-red-50 text-red-600' : variant === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {variant === 'danger' ? (
                <Trash2 className="w-6 h-6" />
              ) : variant === 'warning' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">
                {dialogState.title || (variant === 'danger' ? 'Confirm Deletion' : 'Confirm Action')}
              </h4>
              <p className="text-sm font-medium text-slate-600 mt-1 leading-relaxed">
                {dialogState.message}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            >
              {dialogState.cancelText || 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md active:scale-95 transition cursor-pointer flex items-center gap-2 ${
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  : variant === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
              }`}
            >
              {variant === 'danger' && <Trash2 className="w-4 h-4 pointer-events-none" />}
              <span>{dialogState.confirmText || 'Delete Record'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
