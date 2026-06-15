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
    href: "/teacher/classes",
    label: "My Classes",
    icon: "M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2ZM6 4h5v8l-2.5-1.5L6 12V4Z",
  },
  {
    href: "/teacher/attendance",
    label: "Attendance",
    icon: "M17 12h-5v5h5v-5ZM16 1v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2Zm3 18H5V8h14v11Z",
  },
  {
    href: "/teacher/assignments",
    label: "Assignments",
    icon: "M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm-2 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z",
  },
  {
    href: "/teacher/marks",
    label: "Marks Entry",
    icon: "M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6Zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2Z",
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
  {
    href: "/teacher/messages",
    label: "Messages",
    icon: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  },
  {
    href: "/teacher/announcements",
    label: "Announcements",
    icon: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm0 14H5.17l-.59.59-.58.58V4h16v12ZM11 12h2v2h-2v-2Zm0-6h2v4h-2V6Z",
  },
  {
    href: "/teacher/performance",
    label: "Performance",
    icon: "M4 17l6-6 4 4 6-6M4 21h16",
  },
];

// Notification and Settings are rendered separately with special treatment

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

          {/* Notifications */}
          <Link
            href={"/teacher/notifications" as Route}
            className={[
              "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-base font-medium transition duration-200",
              pathname.startsWith("/teacher/notifications")
                ? "bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/15"
                : "text-secondary hover:bg-hover hover:text-primary",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg transition duration-200",
                pathname.startsWith("/teacher/notifications")
                  ? "bg-cyan-300 text-slate-950"
                  : "bg-hover text-muted",
              ].join(" ")}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M12 22a2.8 2.8 0 0 0 2.7-2h-5.4A2.8 2.8 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" />
              </svg>
            </span>
            Notifications
            {storeUnread > 0 && (
              <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                {storeUnread}
              </span>
            )}
          </Link>

          {/* Settings */}
          <Link
            href={"/teacher/settings" as Route}
            className={[
              "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-base font-medium transition duration-200",
              pathname.startsWith("/teacher/settings")
                ? "bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/15"
                : "text-secondary hover:bg-hover hover:text-primary",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg transition duration-200",
                pathname.startsWith("/teacher/settings")
                  ? "bg-cyan-300 text-slate-950"
                  : "bg-hover text-muted",
              ].join(" ")}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.04 7.04 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.37 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z" />
              </svg>
            </span>
            Settings
          </Link>
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
                    <Link
                      href="/teacher/notifications"
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                      onClick={() => setShowNotifications(false)}
                    >
                      View All
                    </Link>
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
                  <div className="mt-1 py-1">
                    <Link
                      href="/teacher/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-secondary hover:bg-hover hover:text-primary transition duration-200"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-muted">
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                        <path fillRule="evenodd" d="M19.4 15a1.6 1.6 0 0 0 1-1.5v-3a1.6 1.6 0 0 0-1-1.5l-2.2-1.1a8.8 8.8 0 0 0-.7-1.7l1.1-2.2A1.6 1.6 0 0 0 17.1 3h-3a1.6 1.6 0 0 0-1.5 1L11.5 6.2a8.8 8.8 0 0 0-1.7.7L7.6 5.8a1.6 1.6 0 0 0-1.5 1v3a1.6 1.6 0 0 0 1 1.5l2.2 1.1c.2.6.4 1.2.7 1.7l-1.1 2.2a1.6 1.6 0 0 0 .5 2l3 1.5c.5.3 1.1.2 1.5-.2l1.1-2.2c.6-.2 1.2-.4 1.7-.7l2.2 1.1a1.6 1.6 0 0 0 1.5-1v-3ZM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
                      </svg>
                      Settings
                    </Link>
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
