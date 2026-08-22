"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import logo from "@/branding/logo.png";
import LogoutButton from "@/components/auth/LogoutButton";
import WelcomeAnimation from "./WelcomeAnimation";
import { useNotificationStore } from "@/store/useNotificationStore";
import { isNotificationAllowedByPrefs } from "@/lib/notification-utils";
import RealtimeListener from "@/components/shared/RealtimeListener";
import { markNotificationRead } from "@/lib/notification-actions";

type AdminShellProps = {
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

const simpleNavItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-18v7h8V2h-8Z",
  },
  {
    href: "/admin/students",
    label: "Students",
    icon: "M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1 20a6 6 0 0 1 12 0H1Zm12.6 0a7.5 7.5 0 0 0-2.1-4.9A5 5 0 0 1 22 20h-8.4Z",
  },
  {
    href: "/admin/messages",
    label: "Messages",
    icon: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: "M12 22a2.8 2.8 0 0 0 2.7-2h-5.4A2.8 2.8 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: "M4 19h16v2H4v-2Zm2-2h3V9H6v8Zm5 0h3V4h-3v13Zm5 0h3v-6h-3v6Z",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: "M4 3h11l5 5v13H4V3Zm10 2v4h4l-4-4ZM7 13h10v-2H7v2Zm0 4h10v-2H7v2Z",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children, user, alerts: initialAlerts = [] }: AdminShellProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();

  const storeUnread = useNotificationStore((s) => s.unreadCount);
  const notifications = useNotificationStore((s) => s.notifications);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  // Accidental Zoom Prevention (Ctrl + MouseWheel, Ctrl/Cmd + +/-/=)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "_")) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const isItemActive = (href: string) => {
    if (href === "/admin/marks") {
      return pathname === "/admin/marks";
    }

    if (href === "/admin/marks/results") {
      return pathname === "/admin/marks/results";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isTeacherRoute = pathname.startsWith("/admin/teachers");

  const isAcademicRoute =
    pathname.startsWith("/admin/classes") ||
    pathname.startsWith("/admin/subjects") ||
    pathname.startsWith("/admin/exams") ||
    pathname.startsWith("/admin/marks") ||
    pathname.startsWith("/admin/attendance");

  const isOperationsRoute =
    pathname.startsWith("/admin/admit-cards") ||
    pathname.startsWith("/admin/timetable") ||
    pathname.startsWith("/admin/leaves") ||
    pathname.startsWith("/admin/transport") ||
    pathname.startsWith("/admin/feedback") ||
    pathname.startsWith("/admin/announcements") ||
    pathname.startsWith("/admin/audit-logs");

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Click outside to close dropdowns
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

  // Reusable Nav Content Function
  const renderNavContent = (onLinkClick?: () => void) => (
    <>
      {simpleNavItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href as Route}
            onClick={onLinkClick}
            className={[
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium transition duration-200",
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

            <span className="flex-1 truncate">{item.label}</span>
            {item.href === "/admin/notifications" && storeUnread > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shrink-0">
                {storeUnread}
              </span>
            )}
          </Link>
        );
      })}

      <div>
        <button
          onClick={() => setOpenMenu(openMenu === "Staff" ? null : "Staff")}
          className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium text-secondary transition duration-200 hover:bg-hover hover:text-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hover text-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1 20a6 6 0 0 1 12 0H1Zm12.6 0a7.5 7.5 0 0 0-2.1-4.9A5 5 0 0 1 22 20h-8.4Z" />
            </svg>
          </span>

          <span className="flex-1 text-left">Staff Management</span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 fill-current text-muted transition-transform duration-200 ${
              openMenu === "Staff" || isTeacherRoute ? "rotate-180" : ""
            }`}
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>

        {(openMenu === "Staff" || isTeacherRoute) && (
          <div className="ml-11 mt-1 space-y-1">
            <Link
              href="/admin/teachers"
              onClick={onLinkClick}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                pathname === "/admin/teachers" || pathname.startsWith("/admin/teachers/")
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-secondary hover:bg-hover hover:text-primary"
              }`}
            >
              Teachers
            </Link>
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => setOpenMenu(openMenu === "Academics" ? null : "Academics")}
          className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium text-secondary transition duration-200 hover:bg-hover hover:text-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hover text-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M6 3h12v18H6V3Zm3 4h6V5H9v2Zm0 4h6V9H9v2Zm0 4h4v-2H9v2Z" />
            </svg>
          </span>

          <span className="flex-1 text-left">Academics</span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 fill-current text-muted transition-transform duration-200 ${
              openMenu === "Academics" || isAcademicRoute ? "rotate-180" : ""
            }`}
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>

        {(openMenu === "Academics" || isAcademicRoute) && (
          <div className="ml-11 mt-1 space-y-1">
            {[
              ["Classes", "/admin/classes"],
              ["Subjects", "/admin/subjects"],
              ["Exams", "/admin/exams"],
              ["Results", "/admin/marks/results"],
              ["Attendance", "/admin/attendance"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href as Route}
                onClick={onLinkClick}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  isItemActive(href)
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-secondary hover:bg-hover hover:text-primary"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => setOpenMenu(openMenu === "Operations" ? null : "Operations")}
          className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium text-secondary transition duration-200 hover:bg-hover hover:text-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hover text-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 14H7v-2h5v2Zm5-4H7v-2h10v2Zm0-4H7V7h10v2Z" />
            </svg>
          </span>

          <span className="flex-1 text-left">Operations</span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 fill-current text-muted transition-transform duration-200 ${
              openMenu === "Operations" || isOperationsRoute ? "rotate-180" : ""
            }`}
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>

        {(openMenu === "Operations" || isOperationsRoute) && (
          <div className="ml-11 mt-1 space-y-1">
            {[
              ["Admit Cards", "/admin/admit-cards"],
              ["Timetable", "/admin/timetable"],
              ["Leaves", "/admin/leaves"],
              ["Transport", "/admin/transport"],
              ["Feedback", "/admin/feedback"],
              ["Announcements", "/admin/announcements"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href as Route}
                onClick={onLinkClick}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  isItemActive(href)
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-secondary hover:bg-hover hover:text-primary"
                }`}
              >
                {label}
              </Link>
            ))}

            <Link
              href={"/admin/audit-logs" as Route}
              onClick={onLinkClick}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
                pathname.startsWith("/admin/audit-logs")
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-secondary hover:bg-hover hover:text-primary"
              }`}
            >
              Audit Logs
            </Link>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-base text-primary antialiased selection:bg-cyan-500/30 transition-colors duration-200">
      <RealtimeListener role="admin" />

      {/* ── MOBILE SIDEBAR DRAWER OVERLAY (lg:hidden) ───────────────────── */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Slide-over Drawer */}
          <aside className="relative z-10 w-[280px] max-w-[85vw] bg-surface/98 border-r border-theme shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-300">
            {/* Top Logo + Close Button */}
            <div className="shrink-0 px-4 pt-4 pb-3 flex items-center justify-between border-b border-theme">
              <Link
                href="/admin"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex items-center gap-2.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-theme bg-white p-1 shadow-md">
                  <Image
                    src={logo}
                    alt="EduPredict"
                    width={30}
                    height={30}
                    priority
                    className="h-full w-full object-contain"
                  />
                </span>
                <span>
                  <span className="block text-base font-bold text-primary leading-tight">
                    EduPredict AI
                  </span>
                  <span className="block text-xs text-muted font-medium">School ERP</span>
                </span>
              </Link>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-theme bg-hover text-secondary hover:text-primary transition"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            {/* Scrollable Nav Section */}
            <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-1 scrollbar-hide">
              {renderNavContent(() => setIsMobileDrawerOpen(false))}
            </nav>

            {/* Mobile Profile Card */}
            <div className="shrink-0 p-3 border-t border-theme bg-base/40">
              <div className="flex items-center gap-2.5 rounded-xl p-2 bg-surface border border-theme">
                {user.profileImageUrl ? (
                  <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-theme bg-white/[0.04] shrink-0">
                    <img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300 text-xs font-bold text-slate-950 shrink-0">
                    {initials || "AD"}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-primary">{user.name}</span>
                  <span className="block truncate text-[10px] text-muted">Administrator</span>
                </span>
                <LogoutButton compact />
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── DESKTOP SIDEBAR (lg:flex, completely untouched) ─────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-theme bg-surface/95 shadow-2xl shadow-black/30 backdrop-blur-xl lg:flex flex-col transition-colors duration-200">
        {/* Fixed Top: Logo + Divider */}
        <div className="shrink-0 px-4 pt-5">
          <Link
            href="/admin"
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
          {renderNavContent()}
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
                  {initials || "AD"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-primary">{user.name}</span>
                <span className="block truncate text-xs text-muted">Administrator</span>
              </span>
              <LogoutButton compact />
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────────── */}
      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-20 border-b border-theme bg-base/80 backdrop-blur-xl transition-colors duration-200">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Mobile Hamburger Trigger */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                aria-label="Open mobile navigation"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme bg-surface text-secondary hover:text-primary hover:bg-hover transition shadow-sm shrink-0"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                </svg>
              </button>
            </div>

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
                      href="/admin/notifications"
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                      onClick={() => setShowNotifications(false)}
                    >
                      View All
                    </Link>
                  </div>
                  <div className="mt-1 max-h-72 overflow-y-auto space-y-0.5 scrollbar-hide">
                    {(() => {
                      const storePreferences = useNotificationStore.getState().preferences;
                      const unreadNotifications = notifications
                        .filter((n) => !n.isRead && isNotificationAllowedByPrefs(n, storePreferences))
                        .slice(0, 5);
                      if (unreadNotifications.length === 0) {
                        return (
                          <div className="text-center py-6 text-xs text-muted">
                            No unread notifications
                          </div>
                        );
                      }
                      return unreadNotifications.map((notif) => {
                        const toneBg =
                          notif.priority === "high"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : notif.priority === "medium"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

                        const badgeText =
                          notif.priority === "high"
                            ? "High"
                            : notif.priority === "medium"
                              ? "Medium"
                              : "Info";

                        return (
                          <div
                            key={notif.id}
                            className="group rounded-xl p-3 hover:bg-hover transition duration-200 border border-transparent cursor-pointer"
                            onClick={() => {
                              useNotificationStore.getState().markRead(notif.id);
                              markNotificationRead(notif.id).catch(console.error);
                            }}
                          >
                            <div className="flex gap-2.5">
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notif.priority === "high"
                                ? "bg-rose-500"
                                : notif.priority === "medium"
                                  ? "bg-amber-500"
                                  : "bg-cyan-500"
                                }`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <p className="text-xs font-semibold text-primary group-hover:text-cyan-300 transition duration-150 truncate">
                                    {notif.title}
                                  </p>
                                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${toneBg}`}>
                                    {badgeText}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] leading-relaxed text-secondary">
                                  {notif.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
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
                    {initials || "AD"}
                  </span>
                )}
              </button>

              {showProfileMenu && (
                <div className="profile-dropdown-container absolute right-0 mt-3 w-60 rounded-2xl border border-theme bg-surface p-2 shadow-2xl backdrop-blur-md transition-all duration-200 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2.5 border-b border-subtle flex items-center gap-3">
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
                      href="/admin/settings"
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
