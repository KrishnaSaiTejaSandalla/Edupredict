"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "@/components/ui/ThemeProvider";
import type { Theme, Density } from "@/store/usePreferencesStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import {
  updateStudentProfileSettings,
  updateStudentNotificationPrefs,
  updateStudentAppearance,
  changeStudentPassword,
  generateStudentAIAvatars,
  selectStudentAIWebAvatar,
} from "@/lib/student-actions";
import { uploadUserProfileImage, deleteUserProfileImage } from "@/lib/settings-actions";
import ImageCropperModal from "@/components/shared/ImageCropperModal";
import type { NotificationPreferences } from "@/lib/notification-utils";

interface UserProps {
  id: number;
  name: string;
  email: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  phoneNumber?: string | null;
  notificationPreferences?: string | null;
  appearancePreferences?: string | null;
  learningGoal?: string | null;
  interests?: string | null;
}

interface UserPreferencesProps {
  id?: number;
  userId?: number;
  theme?: string;
  density?: string;
  sidebarCollapsed?: boolean;
  language?: string;
}

interface UserAvatarProps {
  id: number;
  avatarType: string;
  imageUrl: string;
  isSelected: boolean;
}

interface StudentSettingsClientProps {
  user: UserProps;
  userPreferences: UserPreferencesProps | null;
  userAvatars: UserAvatarProps[];
}

const THEME_PRESETS = [
  {
    id: "royal-purple",
    name: "Royal Purple",
    description: "Deep violet with a premium SaaS look",
    primary: "#a78bfa",
    secondary: "#7c3aed",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
    emoji: "👑",
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    description: "Cool cyan with a dark oceanic feel",
    primary: "#22d3ee",
    secondary: "#0891b2",
    gradient: "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
    emoji: "🌊",
  },
  {
    id: "emerald-green",
    name: "Emerald Green",
    description: "Vibrant green, great for growth & data",
    primary: "#34d399",
    secondary: "#059669",
    gradient: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
    emoji: "🌿",
  },
  {
    id: "sunset-orange",
    name: "Sunset Orange",
    description: "Warm orange, energetic and welcoming",
    primary: "#fb923c",
    secondary: "#ea580c",
    gradient: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
    emoji: "🌅",
  },
  {
    id: "crimson-red",
    name: "Crimson Red",
    description: "Bold red, confident and authoritative",
    primary: "#f87171",
    secondary: "#dc2626",
    gradient: "linear-gradient(135deg, #f87171 0%, #dc2626 100%)",
    emoji: "🔴",
  },
];

const NOTIFICATION_ITEMS = [
  { name: "attendance", label: "Attendance Alerts", desc: "Get notified when student attendance updates" },
  { name: "assignments", label: "Assignments", desc: "Get notified about new assignments and submissions" },
  { name: "messages", label: "Messages", desc: "Get notified about new chat messages" },
  { name: "diary", label: "Diary", desc: "Get notified about classroom diary updates" },
  { name: "feedback", label: "Feedback", desc: "Get notified about observations and surveys feedback" },
  { name: "leaves", label: "Leaves", desc: "Get notified about student leave requests or status changes" },
  { name: "announcements", label: "Announcements", desc: "Get notified about school-wide announcements" },
  { name: "transport", label: "Transport Alerts", desc: "Get notified about bus and location updates" },
  { name: "general", label: "General Alerts", desc: "Get notified about other updates and system info" },
] as const;

function applyPreviewToDOM(theme: Theme, density: Density, preset: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved =
    theme === "system"
      ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-density", density);
  root.setAttribute("data-color-preset", preset);
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export default function StudentSettingsClient({
  user,
  userPreferences,
  userAvatars: initialAvatars,
}: StudentSettingsClientProps) {
  const router = useRouter();
  const {
    theme: currentTheme,
    density: currentDensity,
    colorPreset: currentPreset,
    setTheme,
    setDensity,
    setColorPreset,
  } = useTheme();

  const [activeTab, setActiveTab] = useState("profile");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Profile Baseline & Draft
  const [persistedProfile, setPersistedProfile] = useState({
    name: user.name || "",
    phoneNumber: user.phoneNumber || "",
    bio: user.bio || "",
    learningGoal: user.learningGoal || "",
    interests: user.interests || "",
  });
  const [draftProfile, setDraftProfile] = useState({ ...persistedProfile });

  // 2. Notification Preferences Baseline & Draft
  const parseNotifs = (raw: string | null | undefined): NotificationPreferences => {
    const defaults: NotificationPreferences = {
      attendance: true,
      assignments: true,
      messages: true,
      diary: true,
      feedback: true,
      leaves: true,
      announcements: true,
      transport: true,
      general: true,
    };
    if (!raw) return defaults;
    try {
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return defaults;
    }
  };

  const [persistedNotifs, setPersistedNotifs] = useState<NotificationPreferences>(() =>
    parseNotifs(user.notificationPreferences)
  );
  const [draftNotifs, setDraftNotifs] = useState<NotificationPreferences>({ ...persistedNotifs });

  // 3. Appearance Baseline & Draft
  const parseAppearance = () => {
    let preset = currentPreset || "ocean-blue";
    let themeVal: Theme = (userPreferences?.theme as Theme) || currentTheme || "dark";
    let densityVal: Density = (userPreferences?.density as Density) || (currentDensity as Density) || "comfortable";

    if (user.appearancePreferences) {
      try {
        const parsed = JSON.parse(user.appearancePreferences);
        if (parsed.colorPreset) preset = parsed.colorPreset;
        if (parsed.theme) themeVal = parsed.theme;
        if (parsed.density) densityVal = parsed.density;
      } catch {}
    }
    return {
      colorPreset: preset,
      theme: themeVal,
      density: densityVal,
    };
  };

  const [persistedAppearance, setPersistedAppearance] = useState(parseAppearance);
  const [draftAppearance, setDraftAppearance] = useState({ ...persistedAppearance });

  // 4. Security Draft
  const [draftSecurity, setDraftSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // 5. Avatars & Photo Upload
  const [avatars, setAvatars] = useState(initialAvatars);
  const [isGeneratingAvatars, setIsGeneratingAvatars] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync props from server revalidation
  useEffect(() => {
    const nextProfile = {
      name: user.name || "",
      phoneNumber: user.phoneNumber || "",
      bio: user.bio || "",
      learningGoal: user.learningGoal || "",
      interests: user.interests || "",
    };
    setPersistedProfile(nextProfile);

    const nextNotifs = parseNotifs(user.notificationPreferences);
    setPersistedNotifs(nextNotifs);

    const nextApp = parseAppearance();
    setPersistedAppearance(nextApp);

    setAvatars(initialAvatars);
  }, [user, userPreferences, initialAvatars]);

  // Handle Appearance preview & reverting
  // Only apply draft preview when on Appearance tab; revert to persisted when switching away or unmounting
  useEffect(() => {
    if (activeTab === "appearance") {
      applyPreviewToDOM(draftAppearance.theme, draftAppearance.density, draftAppearance.colorPreset);
    } else {
      applyPreviewToDOM(persistedAppearance.theme, persistedAppearance.density, persistedAppearance.colorPreset);
    }
  }, [activeTab, draftAppearance, persistedAppearance]);

  useEffect(() => {
    return () => {
      applyPreviewToDOM(persistedAppearance.theme, persistedAppearance.density, persistedAppearance.colorPreset);
    };
  }, [persistedAppearance]);

  // Initials and Profile completion calculation
  const initials = (user.name || "ST")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileFields = [
    draftProfile.name,
    user.email,
    draftProfile.phoneNumber,
    draftProfile.bio,
    draftProfile.learningGoal,
    draftProfile.interests,
    user.profileImageUrl,
  ];
  const completedFields = profileFields.filter((f) => f && f.toString().trim() !== "").length;
  const profileCompletionPercent = Math.round((completedFields / profileFields.length) * 100);

  // Check dirty state for current tab
  const isProfileDirty =
    draftProfile.name !== persistedProfile.name ||
    draftProfile.phoneNumber !== persistedProfile.phoneNumber ||
    draftProfile.bio !== persistedProfile.bio ||
    draftProfile.learningGoal !== persistedProfile.learningGoal ||
    draftProfile.interests !== persistedProfile.interests;

  const isNotifsDirty = (Object.keys(draftNotifs) as (keyof NotificationPreferences)[]).some(
    (k) => draftNotifs[k] !== persistedNotifs[k]
  );

  const isAppearanceDirty =
    draftAppearance.colorPreset !== persistedAppearance.colorPreset ||
    draftAppearance.density !== persistedAppearance.density ||
    draftAppearance.theme !== persistedAppearance.theme;

  const isSecurityDirty = Boolean(
    draftSecurity.currentPassword || draftSecurity.newPassword || draftSecurity.confirmPassword
  );

  const isCurrentTabDirty =
    activeTab === "profile"
      ? isProfileDirty
      : activeTab === "notifications"
      ? isNotifsDirty
      : activeTab === "appearance"
      ? isAppearanceDirty
      : activeTab === "security"
      ? isSecurityDirty
      : false;

  const handleDiscard = () => {
    setErrorMessage(null);
    if (activeTab === "profile") {
      setDraftProfile({ ...persistedProfile });
      toast.info("Profile changes discarded.");
    } else if (activeTab === "notifications") {
      setDraftNotifs({ ...persistedNotifs });
      toast.info("Notification preferences reverted.");
    } else if (activeTab === "appearance") {
      setDraftAppearance({ ...persistedAppearance });
      applyPreviewToDOM(persistedAppearance.theme, persistedAppearance.density, persistedAppearance.colorPreset);
      toast.info("Appearance settings reverted.");
    } else if (activeTab === "security") {
      setDraftSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveStatus("saving");

    try {
      if (activeTab === "profile") {
        if (!draftProfile.name.trim()) {
          throw new Error("Full Name cannot be empty.");
        }
        await updateStudentProfileSettings(user.id, {
          name: draftProfile.name,
          bio: draftProfile.bio,
          phoneNumber: draftProfile.phoneNumber,
          learningGoal: draftProfile.learningGoal,
          interests: draftProfile.interests,
        });
        setPersistedProfile({ ...draftProfile });
        toast.success("Profile saved successfully! ✨");
        router.refresh();
      } else if (activeTab === "notifications") {
        await updateStudentNotificationPrefs(user.id, draftNotifs);
        setPersistedNotifs({ ...draftNotifs });
        useNotificationStore.getState().setPreferences(draftNotifs);
        toast.success("Notification preferences saved! 🔔");
        router.refresh();
      } else if (activeTab === "appearance") {
        setColorPreset(draftAppearance.colorPreset, true);
        setTheme(draftAppearance.theme);
        setDensity(draftAppearance.density);
        await updateStudentAppearance(user.id, {
          theme: draftAppearance.theme,
          density: draftAppearance.density,
          colorPreset: draftAppearance.colorPreset,
        });
        setPersistedAppearance({ ...draftAppearance });
        toast.success("Appearance settings updated! 🎨");
        router.refresh();
      } else if (activeTab === "security") {
        if (!draftSecurity.currentPassword) {
          throw new Error("Please enter your current password.");
        }
        if (!draftSecurity.newPassword) {
          throw new Error("Please enter your new password.");
        }
        if (draftSecurity.newPassword.length < 8) {
          throw new Error("New password must be at least 8 characters long.");
        }
        if (draftSecurity.newPassword !== draftSecurity.confirmPassword) {
          throw new Error("New passwords do not match. Please verify.");
        }
        await changeStudentPassword(user.id, {
          currentPassword: draftSecurity.currentPassword,
          newPassword: draftSecurity.newPassword,
        });
        setDraftSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
        toast.success("Password updated successfully! 🔒");
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err: any) {
      setSaveStatus("idle");
      const msg = err.message || "Failed to save settings";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  // Image upload and crop handlers
  const handleFileChangeAndOpenCropper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File size must be under 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
    setShowUploadMenu(false);
  };

  const handleCropSave = async (blob: Blob) => {
    setIsUploadingProfile(true);
    setCropImageSrc(null);
    const data = new FormData();
    data.append("image", blob, "profile.jpg");

    try {
      await uploadUserProfileImage(user.id, data);
      toast.success("Profile photo updated successfully! 📸");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleProfileImageDelete = async () => {
    setIsDeletingProfile(true);
    try {
      await deleteUserProfileImage(user.id);
      toast.success("Profile photo removed.");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete photo");
    } finally {
      setIsDeletingProfile(false);
      setShowUploadMenu(false);
    }
  };

  const handleGenerateAvatars = async () => {
    setIsGeneratingAvatars(true);
    try {
      await generateStudentAIAvatars(user.id);
      toast.success("Student AI Avatars generated! 🎨");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate avatars");
    } finally {
      setIsGeneratingAvatars(false);
    }
  };

  const handleSelectAvatar = async (avatarId: number, url: string) => {
    try {
      await selectStudentAIWebAvatar(user.id, avatarId, url);
      toast.success("Avatar selected as profile photo! 🎭");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to select avatar");
    }
  };

  const TABS = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "appearance", label: "Appearance", icon: "👁️" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "avatars", label: "AI Avatars", icon: "✨" },
  ];

  const needsSave = activeTab !== "avatars";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 relative pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider border border-cyan-500/10">
              Student Portal
            </span>
            {saveStatus === "saving" && (
              <span className="inline-flex items-center gap-1.5 text-xs text-secondary animate-pulse">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                Saving to database...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Saved ✓
              </span>
            )}
            {isCurrentTabDirty && saveStatus === "idle" && (
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Unsaved changes
              </span>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-primary sm:text-3xl">Profile Settings</h1>
          <p className="mt-1 text-sm text-secondary">
            Manage your personal profile, notification triggers, theme styling, and student AI avatars.
          </p>
        </div>

        {/* Profile Completion */}
        <div className="flex items-center gap-3 rounded-2xl border border-theme bg-surface/50 p-3 backdrop-blur-md shadow-sm">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <svg className="h-full w-full transform -rotate-90">
              <circle cx="24" cy="24" r="21" className="stroke-subtle fill-none" strokeWidth="3" />
              <circle
                cx="24"
                cy="24"
                r="21"
                className="stroke-accent fill-none transition-all duration-700 ease-out"
                strokeWidth="3"
                strokeDasharray="132"
                strokeDashoffset={132 - (132 * profileCompletionPercent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-primary">{profileCompletionPercent}%</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">Profile Status</p>
            <p className="text-[10px] text-secondary">
              {profileCompletionPercent === 100 ? "Fully completed!" : `${completedFields} of ${profileFields.length} details filled`}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[10px] uppercase font-bold text-rose-400 hover:text-rose-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        {/* Sidebar Nav */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-theme bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-theme bg-hover shrink-0">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-accent text-sm font-bold text-white">
                    {initials || "ST"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-primary truncate">{draftProfile.name || user.name}</p>
                <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider mt-0.5">
                  Student Panel
                </p>
              </div>
            </div>
          </div>

          <nav className="rounded-2xl border border-theme bg-surface/50 p-2 shadow-sm space-y-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasUnsavedTabChanges =
                tab.id === "profile"
                  ? isProfileDirty
                  : tab.id === "notifications"
                  ? isNotifsDirty
                  : tab.id === "appearance"
                  ? isAppearanceDirty
                  : tab.id === "security"
                  ? isSecurityDirty
                  : false;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setErrorMessage(null);
                    setActiveTab(tab.id);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide uppercase transition duration-150 border border-transparent ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-sm"
                      : "text-secondary hover:bg-hover hover:text-primary"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {hasUnsavedTabChanges && (
                      <span className="h-2 w-2 rounded-full bg-amber-400" title="Unsaved changes" />
                    )}
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Pane */}
        <div className="min-h-[500px]">
          {needsSave ? (
            <form id="student-settings-form" onSubmit={handleSave} className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6">
              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <>
                  <div className="border-b border-subtle pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Personal Profile</h2>
                      <p className="text-xs text-secondary mt-1">Update your name, contact details, bio, and learning goals.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-theme bg-hover flex items-center justify-center shrink-0">
                        {isUploadingProfile || isDeletingProfile ? (
                          <div className="absolute inset-0 bg-surface/80 flex items-center justify-center">
                            <span className="h-4 w-4 animate-spin border-2 border-accent border-t-transparent rounded-full" />
                          </div>
                        ) : null}
                        {user.profileImageUrl ? (
                          <img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-secondary">{initials}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 relative">
                          {user.profileImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setCropImageSrc(user.profileImageUrl || null)}
                              className="rounded-xl border border-theme bg-hover hover:bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition"
                            >
                              Edit
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="rounded-xl border border-theme bg-hover/40 px-3 py-1.5 text-xs font-semibold text-secondary/40 cursor-not-allowed"
                            >
                              Edit
                            </button>
                          )}

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowUploadMenu(!showUploadMenu)}
                              className="rounded-xl border border-theme bg-hover hover:bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition"
                            >
                              Upload
                            </button>
                            {showUploadMenu && (
                              <div className="absolute left-0 mt-1.5 w-36 rounded-xl border border-theme bg-surface p-1 shadow-xl z-30">
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="w-full block rounded-lg px-3 py-2 text-xs font-medium text-primary hover:bg-hover text-left"
                                >
                                  Replace Photo
                                </button>
                                {user.profileImageUrl && (
                                  <button
                                    type="button"
                                    onClick={handleProfileImageDelete}
                                    className="w-full block rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 text-left"
                                  >
                                    Delete Photo
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            onChange={handleFileChangeAndOpenCropper}
                          />
                        </div>
                        <p className="text-[10px] text-muted">PNG, JPG, WEBP. Under 3MB.</p>
                      </div>

                      {cropImageSrc && (
                        <ImageCropperModal
                          imageSrc={cropImageSrc}
                          onClose={() => setCropImageSrc(null)}
                          onSave={handleCropSave}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Full Name</span>
                      <input
                        type="text"
                        name="name"
                        value={draftProfile.name}
                        onChange={(e) => setDraftProfile({ ...draftProfile, name: e.target.value })}
                        required
                        className="input-theme w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Email Address</span>
                      <input
                        type="email"
                        name="email"
                        value={user.email}
                        disabled
                        className="input-theme w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary opacity-60 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-muted">Email is managed by school administration.</p>
                    </label>
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Phone Number</span>
                      <input
                        type="text"
                        name="phoneNumber"
                        value={draftProfile.phoneNumber}
                        onChange={(e) => setDraftProfile({ ...draftProfile, phoneNumber: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                        className="input-theme w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Interests & Hobbies</span>
                      <input
                        type="text"
                        name="interests"
                        value={draftProfile.interests}
                        onChange={(e) => setDraftProfile({ ...draftProfile, interests: e.target.value })}
                        placeholder="e.g. Robotics, Astronomy, Chess, Mathematics"
                        className="input-theme w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </label>
                    <label className="block md:col-span-2 space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Bio</span>
                      <textarea
                        name="bio"
                        value={draftProfile.bio}
                        onChange={(e) => setDraftProfile({ ...draftProfile, bio: e.target.value })}
                        placeholder="Tell your teachers and classmates about yourself..."
                        className="textarea-theme w-full rounded-xl border border-theme bg-hover p-3 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none h-24"
                      />
                    </label>
                    <label className="block md:col-span-2 space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Learning Goal</span>
                      <textarea
                        name="learningGoal"
                        value={draftProfile.learningGoal}
                        onChange={(e) => setDraftProfile({ ...draftProfile, learningGoal: e.target.value })}
                        placeholder="What are your academic goals for this term (e.g. Master Calculus, achieve 90%+ in Science)..."
                        className="textarea-theme w-full rounded-xl border border-theme bg-hover p-3 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none h-20"
                      />
                    </label>
                  </div>
                </>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === "notifications" && (
                <>
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Notification Preferences</h2>
                    <p className="text-xs text-secondary mt-1">
                      Configure active feeds for alerts and updates. Disabled categories will not appear in your Notification Center until re-enabled.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {NOTIFICATION_ITEMS.map((item) => {
                      const isChecked = draftNotifs[item.name as keyof NotificationPreferences] !== false;
                      return (
                        <label
                          key={item.name}
                          className="flex items-start gap-4 rounded-xl border border-theme bg-hover/30 p-4 cursor-pointer hover:bg-hover transition duration-150"
                        >
                          <input
                            type="checkbox"
                            name={item.name}
                            checked={isChecked}
                            onChange={(e) =>
                              setDraftNotifs({
                                ...draftNotifs,
                                [item.name]: e.target.checked,
                              })
                            }
                            className="mt-0.5 h-4 w-4 rounded border-theme text-accent accent-cyan-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-primary">{item.label}</p>
                            <p className="text-[10px] text-secondary mt-0.5">{item.desc}</p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isChecked ? "bg-emerald-500/10 text-emerald-400" : "bg-hover text-muted"
                            }`}
                          >
                            {isChecked ? "Active" : "Disabled"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              {/* APPEARANCE TAB */}
              {activeTab === "appearance" && (
                <>
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Appearance</h2>
                    <p className="text-xs text-secondary mt-1">Customize your Student Portal color palette, layout density, and theme mode.</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-secondary">
                        Color Preset
                      </span>
                      <p className="text-[11px] text-muted mt-0.5 mb-3">
                        Select a theme color preset. Previews live on this tab; persists only when clicking Save Changes.
                      </p>
                      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
                        {THEME_PRESETS.map((preset) => {
                          const isSelected = draftAppearance.colorPreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setDraftAppearance((prev) => ({ ...prev, colorPreset: preset.id }));
                                applyPreviewToDOM(draftAppearance.theme, draftAppearance.density, preset.id);
                              }}
                              className={`flex flex-col items-stretch rounded-xl border p-4 text-left transition-all ${
                                isSelected
                                  ? "border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400"
                                  : "border-subtle bg-hover/20 hover:bg-hover hover:border-theme"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm shrink-0">{preset.emoji}</span>
                                  <span className="text-xs font-bold text-primary truncate">{preset.name}</span>
                                </div>
                                {isSelected && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                                )}
                              </div>
                              <p className="text-[10px] text-secondary mb-3 leading-relaxed truncate">
                                {preset.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Layout Density</p>
                      <div className="flex gap-2">
                        {(["comfortable", "compact"] as Density[]).map((d) => {
                          const isSelected = draftAppearance.density === d;
                          return (
                            <label
                              key={d}
                              className={`flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition ${
                                isSelected
                                  ? "border-cyan-400 bg-cyan-500/10 text-cyan-400"
                                  : "border-subtle bg-hover/30 hover:bg-hover text-secondary"
                              }`}
                            >
                              <input
                                type="radio"
                                name="density"
                                value={d}
                                checked={isSelected}
                                onChange={() => {
                                  setDraftAppearance((prev) => ({ ...prev, density: d }));
                                  applyPreviewToDOM(draftAppearance.theme, d, draftAppearance.colorPreset);
                                }}
                                className="accent-cyan-500"
                              />
                              <span className="text-xs font-semibold capitalize">{d}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Theme Mode</p>
                      <div className="flex gap-2">
                        {(["dark", "light", "system"] as Theme[]).map((t) => {
                          const isSelected = draftAppearance.theme === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setDraftAppearance((prev) => ({ ...prev, theme: t }));
                                applyPreviewToDOM(t, draftAppearance.density, draftAppearance.colorPreset);
                              }}
                              className={`rounded-xl border px-4 py-2 text-xs font-semibold capitalize transition ${
                                isSelected
                                  ? "border-cyan-400 bg-cyan-500/10 text-accent"
                                  : "border-subtle text-secondary hover:bg-hover"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SECURITY TAB */}
              {activeTab === "security" && (
                <>
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Change Password</h2>
                    <p className="text-xs text-secondary mt-1">Update your account password for secure access.</p>
                  </div>
                  <div className="grid gap-5 max-w-lg">
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                        Current Password
                      </span>
                      <input
                        type="password"
                        name="currentPassword"
                        value={draftSecurity.currentPassword}
                        onChange={(e) =>
                          setDraftSecurity({ ...draftSecurity, currentPassword: e.target.value })
                        }
                        required
                        className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="••••••••"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                        New Password (min 8 characters)
                      </span>
                      <input
                        type="password"
                        name="newPassword"
                        value={draftSecurity.newPassword}
                        onChange={(e) =>
                          setDraftSecurity({ ...draftSecurity, newPassword: e.target.value })
                        }
                        required
                        minLength={8}
                        className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Min. 8 characters"
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                        Confirm New Password
                      </span>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={draftSecurity.confirmPassword}
                        onChange={(e) =>
                          setDraftSecurity({ ...draftSecurity, confirmPassword: e.target.value })
                        }
                        required
                        minLength={8}
                        className="w-full rounded-xl border border-theme bg-hover p-2.5 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Re-enter new password"
                      />
                    </label>
                  </div>
                </>
              )}

              {/* Action Buttons: Save & Discard */}
              <div className="flex items-center justify-between border-t border-subtle pt-4">
                <div>
                  {isCurrentTabDirty && (
                    <button
                      type="button"
                      onClick={handleDiscard}
                      disabled={saveStatus === "saving"}
                      className="rounded-xl border border-theme bg-hover/40 px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition"
                    >
                      Discard Changes
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={saveStatus === "saving"}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-700 hover:from-cyan-600 hover:to-cyan-800 text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-50 transition shadow-lg shadow-cyan-500/20"
                >
                  {saveStatus === "saving" ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </span>
                  ) : saveStatus === "saved" ? (
                    "Saved ✓"
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* AI AVATARS TAB */
            <div className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6">
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">AI Generated Avatars</h2>
                <p className="text-xs text-secondary mt-1">Generate unique, fun student AI avatars and select one as your profile photo.</p>
              </div>

              <button
                type="button"
                onClick={handleGenerateAvatars}
                disabled={isGeneratingAvatars}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-700 hover:from-cyan-600 hover:to-cyan-800 text-white px-5 py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {isGeneratingAvatars ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  "✨ Generate Student AI Avatars"
                )}
              </button>

              {isGeneratingAvatars ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-6">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2.5 animate-pulse">
                      <div className="h-16 w-16 rounded-full bg-hover" />
                      <div className="h-3 w-12 rounded bg-hover" />
                    </div>
                  ))}
                </div>
              ) : avatars.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-theme p-10 text-center">
                  <p className="text-sm text-secondary">
                    No AI avatars yet. Click generate to create unique Astronaut, Football player, Scientist, Gamer, and Wizard characters!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                      Select Your Character
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {avatars.map((av) => {
                        const isCurrentSelection = user.profileImageUrl === av.imageUrl || av.isSelected;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => handleSelectAvatar(av.id, av.imageUrl)}
                            className={`flex flex-col items-center p-3 rounded-xl border bg-hover/20 hover:bg-hover hover:scale-[1.03] transition-all duration-200 group relative ${
                              isCurrentSelection
                                ? "border-cyan-400 ring-2 ring-cyan-400 ring-opacity-50 bg-cyan-400/5"
                                : "border-theme"
                            }`}
                          >
                            <div className="relative h-16 w-16 rounded-full overflow-hidden border border-theme bg-surface shrink-0">
                              <img
                                src={av.imageUrl}
                                alt={av.avatarType}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <span className="mt-2 text-[10px] font-bold text-secondary text-center truncate max-w-full">
                              {av.avatarType}
                            </span>
                            {isCurrentSelection && (
                              <span className="absolute top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-theme bg-hover/30 p-4 text-xs text-secondary leading-relaxed flex items-start gap-2.5">
                    <span className="text-base">🤖</span>
                    <span>
                      Avatars are generated matching five student roles (Astronaut, Football player, Scientist, Gamer, Wizard). Click any avatar to apply it immediately!
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
