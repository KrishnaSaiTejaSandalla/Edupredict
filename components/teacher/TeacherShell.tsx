"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import logo from "@/branding/logo.png";
import LogoutButton from "@/components/auth/LogoutButton";
import WelcomeAnimation from "../admin/WelcomeAnimation";
import { useNotificationStore } from "@/store/useNotificationStore";

type TeacherShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    email?: string;
    profileImageUrl?: string | null;
    school?: {
      id: number;
      name: string;
      logoUrl?: string | null;
    } | null;
  };
  alerts?: {
    id: string;
    title: string;
    message: string;
    tone: "danger" | "warning" | "info";
    time?: string;
  }[];
};

const navItems = [
  {
    href: "/teacher",
    label: "Dashboard",
    icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-18v7h8V2h-8Z",
  },
  {
    href: "/teacher/timetable",
    label: "Timetable",
    icon: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z",
  },
  {
    href: "/teacher/leaves",
    label: "Leaves",
    icon: "M10 2v2H6v16h12v-6h2v6c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h4zm9 3.59L13.59 11 12 9.41 16.41 5H13V3h7v7h-2V6.59z",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/teacher") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function TeacherShell({ children, user, alerts = [] }: TeacherShellProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();

  const storeUnread = useNotificationStore((s) => s.unreadCount);
  const hydrate = useNotificationStore((s) => s.hydrate);

  useEffect(() => {
    const pollNotifications = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        hydrate(data.count);
      } catch (error) {
        console.error("Notification polling failed", error);
      }
    };

    pollNotifications();
    const interval = setInterval(pollNotifications, 60000);
    return () => clearInterval(interval);
  }, [hydrate]);

  useEffect(() => {
    const serverCount = alerts.filter((a) => a.id !== "empty").length;
    hydrate(serverCount);
  }, []);

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!showNotifications && !showProfileMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notif-dropdown-container") && !target.closest(".notif-trigger")) {
        setShowNotifications(false);
      }
      if (!target.closest(".profile-dropdown-container") && !target.closest(".profile-trigger")) {
        setShowProfileMenu(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [showNotifications, showProfileMenu]);

  return (
    <div className="min-h-screen bg-base text-primary antialiased selection:bg-cyan-500/30 transition-colors duration-200">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-theme bg-surface/95 shadow-2xl shadow-black/30 backdrop-blur-xl lg:flex flex-col transition-colors duration-200">
        {/* Fixed Top: Logo + Divider */}
        <div className="shrink-0 px-4 pt-5">
          <Link
            href="/teacher"
            className="mb-3 flex items-center ml-2 gap-3 rounded-xl px-2 py-2 transition hover:bg-hover"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme bg-white p-1.5 shadow-lg shadow-cyan-950/30">
              <Image
                src={logo}
                alt="EduPredict"
                width={36}
                height={36}
                priority
                className="h-full w-full object-contain"
              />
            </span>

            <span>
              <span className="block text-lg font-semibold tracking-wide text-primary">
                EduPredict AI
              </span>
              <span className="block text-sm font-medium text-muted">
                School ERP
              </span>
            </span>
          </Link>

          <div className="mb-2 border-t border-theme" />
        </div>

        {/* Scrollable Nav Section */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-0.5 scrollbar-hide">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={[
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-base font-medium transition duration-200",
                  active
                    ? "bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/15"
                    : "text-secondary hover:bg-hover hover:text-primary",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-lg transition duration-200",
                    active
                      ? "bg-cyan-300 text-slate-950"
                      : "bg-hover text-muted",
                  ].join(" ")}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d={item.icon} />
                  </svg>
                </span>

                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Fixed Bottom: Profile Card */}
        <div className="shrink-0 px-4 pb-3">
          <div className="rounded-xl p-2 bg-surface border border-theme">
            <div className="flex items-center gap-3">
              {user.profileImageUrl ? (
                <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-theme bg-white/[0.04] shrink-0">
                  <img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" />
                </div>
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300 text-xs font-bold text-slate-950 shrink-0">
                  {initials || "TE"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-primary">{user.name}</span>
                <span className="block truncate text-xs text-muted">Educator</span>
              </span>
              <LogoutButton compact />
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-20 border-b border-theme bg-base/80 backdrop-blur-xl transition-colors duration-200">
          <div className="flex h-[72px] items-center justify-end gap-4 px-4 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1">
              <WelcomeAnimation name={user.name} />
            </div>

            {/* Notification Bell Dropdown Container */}
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setShowNotifications(!showNotifications)}
                className="notif-trigger relative flex h-11 w-11 items-center justify-center rounded-xl border border-theme bg-hover text-secondary transition-all duration-200 hover:text-primary"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                  <path d="M12 22a2.8 2.8 0 0 0 2.7-2h-5.4A2.8 2.8 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" />
                </svg>
                {storeUnread > 0 && (
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-base" />
                )}
              </button>

              {showNotifications && (
                <div className="notif-dropdown-container absolute right-0 mt-3 w-80 rounded-2xl border border-theme bg-surface p-2 shadow-2xl backdrop-blur-xl transition-all duration-200 z-50">
                  <div className="px-3 py-2 border-b border-subtle flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Notifications</span>
                  </div>
                  <div className="mt-1 max-h-72 overflow-y-auto space-y-0.5 scrollbar-hide">
                    {alerts.map((alert) => {
                      const toneBg =
                        alert.tone === "danger"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : alert.tone === "warning"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

                      const badgeText =
                        alert.tone === "danger"
                          ? "High"
                          : alert.tone === "warning"
                            ? "Medium"
                            : "Info";

                      return (
                        <div
                          key={alert.id}
                          className="group rounded-xl p-3 hover:bg-hover transition duration-200 border border-transparent"
                        >
                          <div className="flex gap-2.5">
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${alert.tone === "danger"
                              ? "bg-rose-500"
                              : alert.tone === "warning"
                                ? "bg-amber-500"
                                : "bg-cyan-500"
                              }`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <p className="text-xs font-semibold text-primary group-hover:text-cyan-300 transition duration-150 truncate">
                                  {alert.title}
                                </p>
                                {alert.id !== "empty" && (
                                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${toneBg}`}>
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] leading-relaxed text-secondary">
                                {alert.message}
                              </p>
                              {alert.time && (
                                <p className="mt-1 text-[9px] text-muted">
                                  {alert.time}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="h-10 w-px bg-white/10" />

            {/* Profile Avatar Dropdown Container */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="profile-trigger relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-theme bg-hover transition-all duration-200 hover:scale-105"
              >
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-cyan-300 text-sm font-bold text-slate-950">
                    {initials || "TE"}
                  </span>
                )}
              </button>

              {showProfileMenu && (
                <div className="profile-dropdown-container absolute right-0 mt-3 w-60 rounded-2xl border border-theme bg-surface p-2 shadow-2xl backdrop-blur-md transition-all duration-200 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2.5 border-b border-subtle flex items-center gap-3">
                    {/* School Logo */}
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center overflow-hidden shrink-0">
                      {user.school?.logoUrl ? (
                        <img
                          src={user.school.logoUrl}
                          alt="School Logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-muted">
                          {(user.school?.name?.[0] || "S").toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">
                        {user.name}
                      </p>
                      {user.email && (
                        <p className="text-[10px] text-muted truncate mt-0.5">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </div>
    </div>
  );
}
