"use client";

import React from "react";
import { createPortal } from "react-dom";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  title = "Delete Item?",
  message = "This action cannot be undone. Are you sure you want to proceed?",
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
}: DeleteConfirmModalProps) {
  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-theme bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-rose-500 fill-none stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
          </svg>
        </div>

        <h3 className="mb-2 text-sm font-bold text-primary">
          {title}
        </h3>

        <p className="mb-5 text-xs text-secondary leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-theme bg-hover hover:bg-surface px-4 py-2.5 text-xs font-semibold text-secondary hover:text-primary transition"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white transition active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
