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

const navItems = [
  { href: "/student", label: "Dashboard", icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-18v7h8V2h-8Z" },
  { href: "/student/attendance", label: "Attendance", icon: "M17 12h-5v5h5v-5ZM16 1v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2Zm3 18H5V8h14v11Z" },
  { href: "/student/assignments", label: "Assignments", icon: "M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm-2 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8Z" },
  { href: "/student/results", label: "Results", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-5 14H7v-2h7v2Zm3-4H7v-2h10v2Zm0-4H7V7h10v2Z" },
  { href: "/student/diary", label: "Diary", icon: "M18 2h-3a3 3 0 0 0-6 0H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm-6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm6 18H6V4h2v3h8V4h2v16Z" },
  { href: "/student/performance", label: "Performance", icon: "M4 17l6-6 4 4 6-6M4 21h16" },
  { href: "/student/resources", label: "Resources", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
  { href: "/student/feedback", label: "Feedback", icon: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm0 14H6l-2 2V4h16v12Z" },
];

function isActive(pathname: string, href: string) {
  if (href === "/student") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const icons = { light: "M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-14v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42", dark: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z", system: "M4 6h16v10H4zM1 20h22M8 16v4M16 16v4" };
  const labels = ["light", "dark", "system"] as const;
  const next = labels[(labels.indexOf(theme as typeof labels[number]) + 1) % labels.length];
  return (
    <button onClick={() => setTheme(next)} title={`Switch to ${next} mode`}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-theme bg-hover text-secondary transition-all duration-200 hover:text-primary hover:scale-105">
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icons[theme as keyof typeof icons] || icons.dark} />
      </svg>
    </button>
  );
}

export default function StudentShell({ children, user, alerts = [], phrases }: StudentShellProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const storeUnread = useNotificationStore(s => s.unreadCount);
  const hydrate = useNotificationStore(s => s.hydrate);

  useEffect(() => {
    const poll = async () => {
      try { const r = await fetch('/api/notifications/unread-count'); if (r.ok) hydrate((await r.json()).count); } catch {}
    };
    poll();
    const i = setInterval(poll, 30000);
    return () => clearInterval(i);
  }, [hydrate]);

  useEffect(() => {
    hydrate(alerts.filter(a => a.id !== 'empty').length);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {navItems.map(item => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href as Route}
              className={["group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition duration-200",
                active ? "bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/15" : "text-secondary hover:bg-hover hover:text-primary"].join(' ')}>
              <span className={["flex h-8 w-8 items-center justify-center rounded-lg transition duration-200",
                active ? "bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-md shadow-cyan-500/30" : "bg-hover text-muted"].join(' ')}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </span>
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" />}
            </Link>
          );
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
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-theme bg-surface/95 shadow-2xl shadow-black/20 backdrop-blur-xl lg:flex flex-col transition-colors duration-200">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
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
              {/* Notifications */}
              <div className="relative">
                <button type="button" aria-label="Notifications" onClick={() => setShowNotifications(!showNotifications)}
                  className="notif-trigger relative flex h-11 w-11 items-center justify-center rounded-xl border border-theme bg-hover text-secondary transition-all duration-200 hover:text-primary">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current"><path d="M12 22a2.8 2.8 0 0 0 2.7-2h-5.4A2.8 2.8 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" /></svg>
                  {storeUnread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-base" />}
                </button>

                {showNotifications && (
                  <div className="notif-dropdown-container absolute right-0 mt-3 w-80 rounded-2xl border border-theme bg-surface p-2 shadow-2xl backdrop-blur-xl z-50">
                    <div className="px-3 py-2 border-b border-subtle flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Notifications</span>
                      <Link href="/student/notifications" className="text-xs text-violet-400 hover:text-violet-300" onClick={() => setShowNotifications(false)}>View All</Link>
                    </div>
                    <div className="mt-1 max-h-72 overflow-y-auto space-y-0.5 scrollbar-hide">
                      {alerts.map(alert => (
                        <div key={alert.id} className="group rounded-xl p-3 hover:bg-hover transition duration-200">
                          <div className="flex gap-2.5">
                            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${alert.tone === 'danger' ? 'bg-rose-500' : alert.tone === 'warning' ? 'bg-amber-500' : 'bg-violet-500'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-primary group-hover:text-violet-300 transition truncate">{alert.title}</p>
                              <p className="mt-1 text-[11px] text-secondary">{alert.message}</p>
                              {alert.time && <p className="mt-1 text-[9px] text-muted">{alert.time}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
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
