"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";

export default function LogoutButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    toast.success("Signed out successfully");
    router.push("/login");
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={
          compact
            ? "flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
            : "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
        }
        aria-label="Sign out"
        title="Sign out"
      >
        {compact ? (
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4 fill-current"
          >
            <path d="M4 4h8v2H6v12h6v2H4V4Zm11.6 4.4L17 7l5 5-5 5-1.4-1.4 2.6-2.6H10v-2h8.2l-2.6-2.6Z" />
          </svg>
        ) : (
          "Logout"
        )}
      </button>

      {showConfirm &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b1020] p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-current text-red-400"
                >
                  <path d="M16 17v-2H8v-2h8v-2l5 3-5 3ZM13 3v2H6v14h7v2H4V3h9Z" />
                </svg>
              </div>

              <h3 className="mb-1 text-sm font-semibold text-white">
                Log out?
              </h3>

              <p className="mb-4 text-xs text-slate-400">
                You'll need to sign in again to access EduPredict.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white transition hover:bg-white/[0.08]"
                >
                  Stay
                </button>

                <button
                  onClick={handleLogout}
                  className="flex-1 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}