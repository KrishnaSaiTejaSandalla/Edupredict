"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import logo from "@/branding/logo.png";
import { useNotificationStore } from "@/store/useNotificationStore";
import { isNotificationAllowedByPrefs } from "@/lib/notification-utils";
import { toast } from "sonner";
import { markNotificationRead } from "@/lib/notification-actions";
import LogoutButton from "@/components/auth/LogoutButton";
import RealtimeListener from "@/components/shared/RealtimeListener";

type ParentShellProps = {
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
  childName: string;
  alerts?: {
    id: string;
    title: string;
    message: string;
    tone: "danger" | "warning" | "info";
    time?: string;
  }[];
};

const topNavItems = [
  {
    href: "/parent",
    label: "Dashboard",
    icon: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-18v7h8V2h-8Z",
  },
];

const academicsNavItems = [
  { href: "/parent/attendance", label: "Attendance" },
  { href: "/parent/diary", label: "Diary" },
  { href: "/parent/assignments", label: "Assignments" },
  { href: "/parent/results", label: "Results" },
  { href: "/parent/performance", label: "Performance" },
  { href: "/parent/timetable", label: "Timetable" },
  { href: "/parent/exams", label: "Exams" },
];

const bottomNavItems = [
  {
    href: "/parent/notifications",
    label: "Notifications",
    icon: "M12 22a2.8 2.8 0 0 0 2.7-2h-5.4A2.8 2.8 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 0 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z",
  },
  {
    href: "/parent/announcements",
    label: "Announcements",
    icon: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  },
  {
    href: "/parent/messages",
    label: "Messages",
    icon: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z",
  },
  {
    href: "/parent/feedback",
    label: "Feedback",
    icon: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12Z",
  },
  {
    href: "/parent/bus-tracking",
    label: "Bus Tracking",
    icon: "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10Zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17Zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5Zm1.5-6H6V6h12v5Z",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/parent") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function ParentWelcomeAnimation({ name }: { name: string }) {
  const firstName = name.split(" ")[0] || name;
  const [greeting, setGreeting] = useState("");
  const phrases = ["learning", "growing", "achieving", "improving", "thriving"];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hours = new Date().getHours();
    let timeGreeting = "Welcome back";
    if (hours < 12) timeGreeting = "Good Morning";
    else if (hours < 17) timeGreeting = "Good Afternoon";
    else timeGreeting = "Good Evening";
    setGreeting(`${timeGreeting}, ${firstName} 👋`);
  }, [firstName]);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting && charIndex < currentPhrase.length) {
      timeoutRef.current = setTimeout(() => {
        setDisplayed(currentPhrase.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      }, 75);
    } else if (!isDeleting && charIndex === currentPhrase.length) {
      timeoutRef.current = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
    } else if (isDeleting && charIndex > 0) {
      timeoutRef.current = setTimeout(() => {
        setDisplayed(currentPhrase.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      }, 40);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [charIndex, isDeleting, phraseIndex]);

  return (
    <div className="flex flex-col justify-center animate-in fade-in duration-500">
      <h1 className="text-md font-bold tracking-tight text-primary sm:text-base">
        {greeting}
      </h1>
      <p className="text-[15px] text-secondary mt-0.5 font-medium hidden sm:block">
        Stay connected with your child's{" "}
        <span className="text-accent font-semibold inline-block min-w-[60px]">
          {displayed}
          <span className="ml-0.5 inline-block h-3.5 w-0.5 translate-y-0.5 animate-pulse bg-current align-middle" />
        </span>{" "}
        journey.
      </p>
    </div>
  );
}

export default function ParentShell({ children, user, childName, alerts: initialAlerts = [] }: ParentShellProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const storeUnread = useNotificationStore((s) => s.unreadCount);
  const notifications = useNotificationStore((s) => s.notifications);

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isAcademicRoute =
    pathname.startsWith("/parent/attendance") ||
    pathname.startsWith("/parent/diary") ||
    pathname.startsWith("/parent/assignments") ||
    pathname.startsWith("/parent/results") ||
    pathname.startsWith("/parent/performance") ||
    pathname.startsWith("/parent/timetable") ||
    pathname.startsWith("/parent/exams");

  // Prevent accidental Ctrl/Cmd + wheel zoom and Ctrl/Cmd + key zoom interactions
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")
      ) {
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

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-surface">
      <div className="shrink-0 px-4 pt-5">
        <Link
          href="/parent"
          className="mb-3 flex items-center ml-2 gap-3 rounded-xl px-2 py-2 transition hover:bg-hover"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-theme bg-white p-1.5 shadow-lg shadow-cyan-950/30">
            <Image src={logo} alt="EduPredict" width={36} height={36} priority className="h-full w-full object-contain" />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-wide text-primary">EduPredict AI</span>
            <span className="block text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Parent Portal</span>
          </span>
        </Link>
        <div className="mb-2 border-t border-theme" />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-1.5 scrollbar-hide">
        {topNavItems.map((item) => {
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
              <span className={["flex h-8 w-8 items-center justify-center rounded-lg transition duration-200", active ? "bg-cyan-300 text-slate-950" : "bg-hover text-muted"].join(" ")}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d={item.icon} />
                </svg>
              </span>
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}

        <div>
          <button
            onClick={() => setOpenMenu(openMenu === "Academics" ? null : "Academics")}
            className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-base font-medium text-secondary transition duration-200 hover:bg-hover hover:text-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hover text-muted">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
              </svg>
            </span>
            <span className="flex-1 text-left uppercase tracking-wider text-sm font-semibold">Academics</span>
            <svg viewBox="0 0 24 24" className={`h-4 w-4 fill-current text-muted transition-transform duration-200 ${(openMenu === "Academics" || isAcademicRoute) ? 'rotate-180' : ''}`}>
              <path d="M7 10l5 5 5-5H7z" />
            </svg>
          </button>

          {(openMenu === "Academics" || isAcademicRoute) && (
            <div className="ml-11 mt-1 space-y-1 animate-in fade-in duration-200">
              {academicsNavItems.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href as Route}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${isActive(pathname, subItem.href)
                    ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                    : "text-secondary hover:bg-hover hover:text-primary"
                    }`}
                >
                  {subItem.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {bottomNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          const isNotif = item.href === "/parent/notifications";
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
              <span className={["flex h-8 w-8 items-center justify-center rounded-lg transition duration-200", active ? "bg-cyan-300 text-slate-950" : "bg-hover text-muted"].join(" ")}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d={item.icon} />
                </svg>
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {isNotif && storeUnread > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shrink-0">
                  {storeUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

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
              <span className="block truncate text-xs text-muted">
                Parent of {childName}
              </span>
            </span>

            <LogoutButton compact />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base text-primary antialiased selection:bg-cyan-500/30 transition-colors duration-200">
      <RealtimeListener role="parent" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-theme bg-surface/95 shadow-2xl shadow-black/20 backdrop-blur-xl lg:flex flex-col transition-colors duration-200">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-surface border-r border-theme shadow-2xl flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-20 border-b border-theme bg-base/80 backdrop-blur-xl transition-colors duration-200">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-theme bg-hover text-secondary"
                aria-label="Toggle menu"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2">
                  <path strokeLinecap="round" d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <ParentWelcomeAnimation name={user.name} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification Bell */}
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
                  {storeUnread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-base" />}
                </button>

                {showNotifications && (
                  <div className="notif-dropdown-container absolute right-0 mt-3 w-80 rounded-2xl border border-theme bg-surface p-2 shadow-2xl backdrop-blur-xl z-50">
                    <div className="px-3 py-2 border-b border-subtle flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Notifications center</span>
                      <Link
                        href="/parent/notifications"
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
                                  <p className="mt-1 text-[11px] leading-relaxed text-secondary">{notif.message}</p>
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

              <div className="h-8 w-px bg-white/10" />

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
                      {initials || "PA"}
                    </span>
                  )}
                </button>

                {showProfileMenu && (
                  <div className="profile-dropdown-container absolute right-0 mt-3 w-60 rounded-2xl border border-theme bg-surface p-2 shadow-2xl backdrop-blur-md transition-all duration-200 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2.5 border-b border-subtle flex items-center gap-3">
                      {/* School Logo */}
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center overflow-hidden shrink-0">
                        {user.school?.logoUrl ? (
                          <img src={user.school.logoUrl} alt="School Logo" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-muted">
                            {(user.school?.name?.[0] || "S").toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="min-w-0 flex-1">
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
                        href="/parent/settings"
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
          </div>
        </header>
        <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      </div>
    </div>
  );
}
