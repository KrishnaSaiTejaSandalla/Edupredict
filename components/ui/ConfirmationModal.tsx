"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: "danger" | "primary" | "warning";
  isConfirming?: boolean;
  inPlace?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  isConfirming = false,
  inPlace = false,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isConfirming) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel, isConfirming]);

  if (!isOpen || typeof window === "undefined") return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-rose-500/10",
          iconColor: "text-rose-500",
          btnBg: "bg-rose-500 hover:bg-rose-600 focus:ring-rose-500",
          iconPath: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        };
      case "warning":
        return {
          iconBg: "bg-amber-500/10",
          iconColor: "text-amber-500",
          btnBg: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-500",
          iconPath: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        };
      case "primary":
      default:
        return {
          iconBg: "bg-cyan-500/10",
          iconColor: "text-cyan-400",
          btnBg: "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 focus:ring-cyan-500",
          iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        };
    }
  };

  const styles = getVariantStyles();

  const modalContent = (
    <div
      className={`${inPlace ? "absolute" : "fixed"
        } inset-0 z-[99999] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4`}
      onClick={() => {
        if (!isConfirming) onCancel();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-sm rounded-2xl border border-theme bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${styles.iconBg} shrink-0`}>
          <svg
            viewBox="0 0 24 24"
            className={`h-6 w-6 ${styles.iconColor} fill-none stroke-current`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={styles.iconPath} />
          </svg>
        </div>

        <h3 className="mb-2 text-sm font-bold text-primary">
          {title}
        </h3>

        <p className="mb-5 text-xs text-secondary leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3 mt-auto">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="flex-1 rounded-xl border border-theme bg-hover hover:bg-surface px-4 py-2.5 text-xs font-semibold text-secondary hover:text-primary transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-md ${styles.btnBg}`}
          >
            {isConfirming ? (
              <>
                <svg className="animate-spin -ml-1 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (inPlace) return modalContent;
  return createPortal(modalContent, document.body);
}
