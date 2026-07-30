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
import { useTheme } from "@/components/ui/ThemeProvider";
import RealtimeListener from "@/components/shared/RealtimeListener";
import { markNotificationRead } from "@/lib/notification-actions";

type StudentShellProps = {
  children: React.ReactNode;
  user: {
    name: string;
    email?: string;
    profileImageUrl?: string | null;
    school?: { id: number; name: string; logoUrl?: string | null } | null;
  };
  alerts?: { id: string; title: string; message: string; tone: "danger" | "warning" | "info"; time?: string }[];
  phrases?: string[];
};

function isActive(pathname: string, href: string) {
  if (href === "/student") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StudentShell({ children, user, alerts: initialAlerts = [], phrases }: StudentShellProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const pathname = usePathname();
  const storeUnread = useNotificationStore(s => s.unreadCount);
  const notifications = useNotificationStore(s => s.notifications);

  const isAcademicRoute =
    pathname.startsWith("/student/attendance") ||
    pathname.startsWith("/student/assignments") ||
    pathname.startsWith("/student/timetable") ||
    pathname.startsWith("/student/diary") ||
    pathname.startsWith("/student/results");

  const showAcademics = openMenu === "Academics" || (openMenu !== "closed" && isAcademicRoute);

  const toggleAcademics = () => {
    if (showAcademics) {
      setOpenMenu("closed");
    } else {
      setOpenMenu("Academics");
    }
  };

  useEffect(() => {
    if (!isAcademicRoute) {
      setOpenMenu(null);
    }
  }, [pathname, isAcademicRoute]);

  useEffect(() => {
    if (!showNotifications && !showProfileMenu) return;
    const h = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.notif-dropdown-container') && !t.closest('.notif-trigger')) setShowNotifications(false);
      if (!t.closest('.profile-dropdown-container') && !t.closest('.profile-trigger')) setShowProfileMenu(false);
    };
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, [showNotifications, showProfileMenu]);

  useEffect(() => setMobileOpen(false), [pathname]);

  const initials = user.name.split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const renderNavItem = (item: { href: string; label: string; icon: string }) => {
    const active = isActive(pathname, item.href);
    const isNotifications = item.href === "/student/notifications";
    return (
      <Link key={item.href} href={item.href as Route}
        className={["group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition duration-200",
          active ? "bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/15" : "text-secondary hover:bg-hover hover:text-primary"].join(' ')}>
        <span className={["flex h-8 w-8 items-center justify-center rounded-lg transition duration-200 shrink-0",
          active ? "bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-md shadow-cyan-500/30" : "bg-hover text-muted"].join(' ')}>
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={item.icon} />
          </svg>
        </span>
        <span className="flex-1 truncate">{item.label}</span>

        {isNotifications && storeUnread > 0 && (
          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shrink-0 shadow-sm shadow-rose-500/20">
            {storeUnread}
          </span>
        )}

        {active && !isNotifications && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" />}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="shrink-0 px-4 pt-5">
        <Link href="/student" className="mb-3 flex items-center ml-2 gap-3 rounded-xl px-2 py-2 transition hover:bg-hover">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme bg-white p-1.5 shadow-lg shadow-cyan-950/30">
            <Image src={logo} alt="EduPredict" width={36} height={36} priority className="h-full w-full object-contain" />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-wide text-primary">EduPredict AI</span>
            <span className="block text-[11px] font-bold text-accent uppercase tracking-widest">Student Portal</span>
          </span>
        </Link>
        <div className="mb-2 border-t border-theme" />
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-0.5 scrollbar-hide">
        {/* 1. Dashboard */}
        {renderNavItem({
          href: "/student",
          label: "Dashboard",
          icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-18v7h8V2h-8Z"
        })}

        {/* 2. Academics collapsible group */}
        <div>
          <button
            onClick={toggleAcademics}
            className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-secondary transition duration-200 hover:bg-hover hover:text-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hover text-muted">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
              </svg>
            </span>
            <span className="flex-1 text-left">Academics</span>
            <svg
              viewBox="0 0 24 24"
              className={[
                "h-4 w-4 text-muted fill-current transition-transform duration-200 shrink-0",
                showAcademics ? "rotate-180" : "",
              ].join(" ")}
            >
              <path d="M7 10l5 5 5-5H7z" />
            </svg>
          </button>

          {showAcademics && (
            <div className="ml-11 mt-1 space-y-1 animate-in fade-in duration-200">
              {[
                { label: "Attendance", href: "/student/attendance" },
                { label: "Assignments", href: "/student/assignments" },
                { label: "Timetable", href: "/student/timetable" },
                { label: "Diary", href: "/student/diary" },
                { label: "Results", href: "/student/results" },
              ].map((subItem) => {
                const subActive = isActive(pathname, subItem.href);
                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href as Route}
                    className={`block rounded-lg px-3 py-1.5 text-xs transition ${
                      subActive
                        ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                        : "text-secondary hover:bg-hover hover:text-primary"
                    }`}
                  >
                    {subItem.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Performance */}
        {renderNavItem({
          href: "/student/performance",
          label: "Performance",
          icon: "M4 17l6-6 4 4 6-6M4 21h16"
        })}

        {/* 4. Resources */}
        {renderNavItem({
          href: "/student/resources",
          label: "Resources",
          icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
        })}


        {/* 6. Feedback */}
        {renderNavItem({
          href: "/student/feedback",
          label: "Feedback",
          icon: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm0 14H6l-2 2V4h16v12Z"
        })}

        {/* 7. Leaves */}
        {renderNavItem({
          href: "/student/leaves",
          label: "Leaves",
          icon: "M19 3h-5v2h4v14H5V5h4V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Z"
        })}

        {/* 8. Notifications */}
        {renderNavItem({
          href: "/student/notifications",
          label: "Notifications",
          icon: "M12 22a2.8 2.8 0 0 0 2.7-2h-5.4A2.8 2.8 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"
        })}
      </nav>

      {/* User Card */}
      <div className="shrink-0 px-4 pb-3">
        <div className="rounded-xl p-2 bg-gradient-to-r from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20">
          <div className="flex items-center gap-3">
            {user.profileImageUrl
              ? <div className="relative h-10 w-10 overflow-hidden rounded-xl border-2 border-cyan-400/30 shrink-0"><img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" /></div>
              : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-xs font-bold text-white shrink-0">{initials || 'ST'}</span>}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-primary">{user.name}</span>
              <span className="block truncate text-[10px] text-accent font-semibold uppercase tracking-wider">Student</span>
            </span>
            <LogoutButton compact />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base text-primary antialiased selection:bg-cyan-500/30 transition-colors duration-200">
      <RealtimeListener role="student" />
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-theme bg-surface/95 shadow-2xl shadow-black/20 backdrop-blur-xl lg:flex flex-col transition-colors duration-200">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-surface border-r border-theme shadow-2xl flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-theme bg-base/80 backdrop-blur-xl transition-colors duration-200">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Mobile menu button */}
              <button onClick={() => setMobileOpen(true)} className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-theme bg-hover text-secondary">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><path strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" /></svg>
              </button>
              <div className="min-w-0 flex-1"><WelcomeAnimation name={user.name} phrases={phrases} /></div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications dropdown trigger */}
              <div className="relative">
                <button type="button" aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}
                  className="notif-trigger relative flex h-11 w-11 items-center justify-center rounded-xl border border-theme bg-hover text-secondary transition-all duration-200 hover:text-primary">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current"><path d="M12 22a2.8 2.8 0 0 0 2.7-2h-5.4A2.8 2.8 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" /></svg>
                  {storeUnread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-base" />}
                </button>

                {showNotifications && (
                  <div className="notif-dropdown-container absolute right-0 mt-3 w-80 rounded-2xl border border-theme bg-surface p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-subtle flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Notifications</span>
                      <Link href="/student/notifications" className="text-xs text-violet-400 hover:text-violet-300 font-bold" onClick={() => setShowNotifications(false)}>View All</Link>
                    </div>
                    <div className="mt-1 max-h-72 overflow-y-auto space-y-0.5 scrollbar-hide">
                      {(() => {
                        const unreadNotifications = notifications.filter((n) => !n.isRead).slice(0, 5);
                        if (unreadNotifications.length === 0) {
                          return (
                            <div className="p-4 text-center text-xs text-muted">No unread alerts</div>
                          );
                        }
                        return unreadNotifications.map((notif) => {
                          const toneBg =
                            notif.priority === "high"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : notif.priority === "medium"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
                          const badgeText = notif.priority === "high" ? "High" : notif.priority === "medium" ? "Medium" : "Info";
                          return (
                            <div
                              key={notif.id}
                              onClick={() => {
                                useNotificationStore.getState().markRead(notif.id);
                                markNotificationRead(notif.id).catch(console.error);
                              }}
                              className="group rounded-xl p-3 hover:bg-hover transition duration-200 border border-transparent cursor-pointer"
                            >
                              <div className="flex gap-2.5">
                                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notif.priority === "high" ? "bg-rose-500" : notif.priority === "medium" ? "bg-amber-500" : "bg-cyan-500"}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <p className="text-xs font-semibold text-primary group-hover:text-cyan-300 transition duration-150 truncate">{notif.title}</p>
                                    <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${toneBg}`}>{badgeText}</span>
                                  </div>
                                  <p className="mt-1 text-[11px] text-secondary leading-normal">{notif.message}</p>
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

              {/* Profile */}
              <div className="relative">
                <button onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="profile-trigger relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-violet-400/30 bg-hover transition-all duration-200 hover:scale-105 hover:border-violet-400/60">
                  {user.profileImageUrl
                    ? <img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" />
                    : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-400 to-purple-500 text-sm font-bold text-white">{initials || 'ST'}</span>}
                </button>

                {showProfileMenu && (
                  <div className="profile-dropdown-container absolute right-0 mt-3 w-60 rounded-2xl border border-theme bg-surface p-2 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2.5 border-b border-subtle flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center overflow-hidden shrink-0">
                        {user.school?.logoUrl ? <img src={user.school.logoUrl} alt="School Logo" className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-muted">{(user.school?.name?.[0] || 'S').toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-primary truncate">{user.name}</p>
                        {user.email && <p className="text-[10px] text-muted truncate mt-0.5">{user.email}</p>}
                      </div>
                    </div>
                    <div className="mt-1 py-1">
                      <Link href="/student/settings" onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-secondary hover:bg-hover hover:text-primary transition duration-200">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-muted"><path d="M19.14 12.94a7.07 7.07 0 0 0 .06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.04 7.04 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.37 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58ZM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2Z" /></svg>
                        Settings
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </div>
    </div>
  );
}
