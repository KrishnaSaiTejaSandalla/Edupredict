"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "@/components/ui/ThemeProvider";
import type { Theme, Density } from "@/store/usePreferencesStore";
import {
  updateTeacherProfile,
  updateTeacherProfessionalInfo,
  updateTeacherNotificationPrefs,
  updateTeacherAppearance,
  changeTeacherPassword,
  uploadTeacherProfileImage,
} from "@/lib/teacher-settings.service";
import {
  generateUserAvatars,
  selectUserAvatar,
} from "@/lib/ai/avatars/generate";

interface UserProps {
  id: number;
  name: string;
  email: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  designation?: string | null;
  phoneNumber?: string | null;
  notificationPreferences?: string | null;
  appearancePreferences?: string | null;
}

interface TeacherProps {
  id: number;
  employeeId?: string | null;
  department?: string | null;
  qualification?: string | null;
  experience?: number | null;
}

interface UserPreferencesProps {
  id: number;
  userId: number;
  theme: string;
  density: string;
  sidebarCollapsed: boolean;
  language: string;
}

interface UserAvatarProps {
  id: number;
  userId: number;
  imageUrl: string;
  style: string;
  isSelected: boolean;
  createdAt: Date | string;
}

interface TeacherSettingsClientProps {
  user: UserProps;
  teacher: TeacherProps | null;
  userPreferences: UserPreferencesProps | null;
  userAvatars: UserAvatarProps[];
}

const THEME_PRESETS = [
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
    id: "royal-purple",
    name: "Royal Purple",
    description: "Deep violet with a premium SaaS look",
    primary: "#a78bfa",
    secondary: "#7c3aed",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
    emoji: "👑",
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

export default function TeacherSettingsClient({
  user,
  teacher,
  userPreferences,
  userAvatars: initialAvatars,
}: TeacherSettingsClientProps) {
  const router = useRouter();
  const { theme: currentTheme, density: currentDensity, colorPreset: currentPreset, setTheme, setDensity, setColorPreset } = useTheme();
  const [activeTab, setActiveTab] = useState("profile");
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [selectedPreset, setSelectedPreset] = useState(currentPreset || "ocean-blue");
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const [avatars, setAvatars] = useState(initialAvatars);
  const [isGeneratingAvatars, setIsGeneratingAvatars] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);

  const currentPresetRef = useRef(currentPreset);

  useEffect(() => {
    currentPresetRef.current = currentPreset;
  }, [currentPreset]);

  useEffect(() => {
    if (currentPreset) {
      setSelectedPreset(currentPreset);
    }
  }, [currentPreset]);

  // Revert preview if active tab changes or on unmount without saving
  useEffect(() => {
    return () => {
      if (currentPresetRef.current) {
        setColorPreset(currentPresetRef.current, false);
      }
    };
  }, [activeTab, setColorPreset]);

  const initials = user.name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const profileFields = [user.name, user.email, user.bio, user.designation, user.phoneNumber, user.profileImageUrl];
  const completedFields = profileFields.filter((f) => f && f.toString().trim() !== "").length;
  const profileCompletionPercent = Math.round((completedFields / profileFields.length) * 100);

  const parsedNotifs = user.notificationPreferences
    ? JSON.parse(user.notificationPreferences)
    : { email: true, inApp: true, attendance: true, assignments: true, marks: true, announcements: true };

  const TABS = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "professional", label: "Professional", icon: "🏫" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "appearance", label: "Appearance", icon: "👁️" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "avatars", label: "AI Avatars", icon: "✨" },
  ];

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveStatus("saving");
    const formData = new FormData(e.currentTarget);

    try {
      if (activeTab === "profile") {
        await updateTeacherProfile(user.id, {
          name: formData.get("name") as string,
          bio: formData.get("bio") as string,
          designation: formData.get("designation") as string,
          phoneNumber: formData.get("phoneNumber") as string,
        });
        toast.success("Profile saved successfully!");
      } else if (activeTab === "professional" && teacher) {
        await updateTeacherProfessionalInfo(teacher.id, {
          qualification: formData.get("qualification") as string,
          experience: formData.get("experience") ? Number(formData.get("experience")) : undefined,
          department: formData.get("department") as string,
        });
        toast.success("Professional info saved!");
      } else if (activeTab === "notifications") {
        await updateTeacherNotificationPrefs(user.id, {
          email: formData.get("email") === "on",
          inApp: formData.get("inApp") === "on",
          attendance: formData.get("attendance") === "on",
          assignments: formData.get("assignments") === "on",
          marks: formData.get("marks") === "on",
          announcements: formData.get("announcements") === "on",
        });
        toast.success("Notification preferences saved!");
      } else if (activeTab === "appearance") {
        setColorPreset(selectedPreset, true);
        const newDensity = formData.get("density") as string | null;
        if (newDensity) setDensity(newDensity as any);
        await updateTeacherAppearance(user.id, {
          theme: currentTheme,
          density: newDensity || currentDensity,
          colorPreset: selectedPreset,
        });
        toast.success("Appearance saved!");
      } else if (activeTab === "security") {
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        await changeTeacherPassword(user.id, { currentPassword, newPassword });
        toast.success("Password updated!");
        (e.target as HTMLFormElement).reset();
      }

      setSaveStatus("saved");
      router.refresh();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err: any) {
      setSaveStatus("idle");
      toast.error(err.message || "Failed to save");
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("File size too large.");
      return;
    }
    setIsUploadingProfile(true);
    const data = new FormData();
    data.append("image", file);
    try {
      await uploadTeacherProfileImage(user.id, data);
      toast.success("Profile photo updated!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload");
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleGenerateAvatars = async () => {
    setIsGeneratingAvatars(true);
    try {
      await generateUserAvatars(user.id);
      toast.success("AI Avatars generated!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate avatars");
    } finally {
      setIsGeneratingAvatars(false);
    }
  };

  const handleSelectAvatar = async (avatarId: number, url: string) => {
    try {
      await selectUserAvatar(user.id, avatarId, url);
      toast.success("Avatar selected as profile photo!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to select avatar");
    }
  };

  useEffect(() => {
    setAvatars(initialAvatars);
  }, [initialAvatars]);

  const needsSave = activeTab !== "avatars";

  return (
    <div className="space-y-6 relative pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider border border-cyan-500/10">
              Teacher Portal
            </span>
            {saveStatus === "saving" && <span className="text-xs text-secondary animate-pulse">Saving...</span>}
            {saveStatus === "saved" && <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>}
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-primary sm:text-3xl">Identity & Preferences</h1>
          <p className="mt-1 text-sm text-secondary">Manage your teacher profile, professional info, and appearance.</p>
        </div>

        {/* Profile Completion */}
        <div className="flex items-center gap-3 rounded-2xl border border-theme bg-surface/50 p-3 backdrop-blur-md shadow-sm">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <svg className="h-full w-full transform -rotate-90">
              <circle cx="24" cy="24" r="21" className="stroke-subtle fill-none" strokeWidth="3" />
              <circle cx="24" cy="24" r="21" className="stroke-cyan-400 fill-none transition-all duration-700 ease-out" strokeWidth="3" strokeDasharray="132" strokeDashoffset={132 - (132 * profileCompletionPercent) / 100} strokeLinecap="round" />
            </svg>
            <span className="absolute text-[10px] font-bold text-primary">{profileCompletionPercent}%</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">Profile Status</p>
            <p className="text-[10px] text-secondary">
              {profileCompletionPercent === 100 ? "Fully completed!" : "Complete your profile"}
            </p>
          </div>
        </div>
      </div>

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
                  <span className="flex h-full w-full items-center justify-center bg-cyan-300 text-sm font-bold text-slate-950">{initials || "TE"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-primary truncate">{user.name}</p>
                <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider mt-0.5">
                  {teacher?.department || user.designation || "Educator"}
                </p>
                {teacher?.employeeId && (
                  <p className="text-[9px] text-muted mt-0.5">ID: {teacher.employeeId}</p>
                )}
              </div>
            </div>
          </div>

          <nav className="rounded-2xl border border-theme bg-surface/50 p-2 shadow-sm space-y-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide uppercase transition duration-150 border border-transparent ${
                    isActive ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-sm" : "text-secondary hover:bg-hover hover:text-primary"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </span>
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Pane */}
        <div className="min-h-[500px]">
          {needsSave ? (
            <form id="teacher-settings-form" onSubmit={handleSave} className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6">
              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <>
                  <div className="border-b border-subtle pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Personal Profile</h2>
                      <p className="text-xs text-secondary mt-1">Update your name, contact, and bio.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-theme bg-hover flex items-center justify-center shrink-0">
                        {isUploadingProfile && (
                          <div className="absolute inset-0 bg-surface/80 flex items-center justify-center">
                            <span className="h-4 w-4 animate-spin border-2 border-cyan-400 border-t-transparent rounded-full" />
                          </div>
                        )}
                        {user.profileImageUrl ? (
                          <img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-secondary">{initials}</span>
                        )}
                      </div>
                      <div>
                        <label className="inline-block rounded-xl border border-theme bg-hover hover:bg-surface px-3 py-1.5 text-xs font-semibold text-primary cursor-pointer transition">
                          Upload Photo
                          <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleProfileImageUpload} />
                        </label>
                        <p className="text-[10px] text-muted mt-1">PNG, JPG, WEBP. Under 3MB.</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Full Name</span>
                      <input type="text" name="name" defaultValue={user.name} required className="input-theme" />
                    </label>
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Email Address</span>
                      <input type="email" name="email" defaultValue={user.email} disabled className="input-theme opacity-60 cursor-not-allowed" />
                      <p className="text-[10px] text-muted">Email cannot be changed here. Contact admin.</p>
                    </label>
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Phone Number</span>
                      <input type="text" name="phoneNumber" defaultValue={user.phoneNumber || ""} placeholder="+91 XXXXX XXXXX" className="input-theme" />
                    </label>
                    <label className="block space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Designation</span>
                      <input type="text" name="designation" defaultValue={user.designation || ""} placeholder="e.g. Senior Teacher, HOD" className="input-theme" />
                    </label>
                    <label className="block md:col-span-2 space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Bio</span>
                      <textarea name="bio" defaultValue={user.bio || ""} placeholder="Tell us about your teaching experience..." className="textarea-theme" />
                    </label>
                  </div>
                </>
              )}

              {/* PROFESSIONAL TAB */}
              {activeTab === "professional" && (
                <>
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Professional Information</h2>
                    <p className="text-xs text-secondary mt-1">Update your academic qualifications and experience.</p>
                  </div>
                  {!teacher ? (
                    <p className="text-sm text-secondary">Teacher record not found. Contact administrator.</p>
                  ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="block space-y-2">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Employee ID</span>
                        <input type="text" defaultValue={teacher.employeeId || ""} disabled className="input-theme opacity-60 cursor-not-allowed" />
                        <p className="text-[10px] text-muted">Assigned by administrator. Read-only.</p>
                      </label>
                      <label className="block space-y-2">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Department / Subject</span>
                        <input type="text" name="department" defaultValue={teacher.department || ""} placeholder="e.g. Mathematics, Physics" className="input-theme" />
                      </label>
                      <label className="block space-y-2">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Highest Qualification</span>
                        <input type="text" name="qualification" defaultValue={teacher.qualification || ""} placeholder="e.g. M.Sc, B.Ed, Ph.D" className="input-theme" />
                      </label>
                      <label className="block space-y-2">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Years of Experience</span>
                        <input type="number" name="experience" defaultValue={teacher.experience || ""} placeholder="e.g. 5" min="0" max="50" className="input-theme" />
                      </label>
                    </div>
                  )}
                </>
              )}

              {/* NOTIFICATIONS TAB */}
              {activeTab === "notifications" && (
                <>
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Notification Preferences</h2>
                    <p className="text-xs text-secondary mt-1">Configure which notifications you want to receive.</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { name: "email", label: "Email Notifications", desc: "Receive notifications via email" },
                      { name: "inApp", label: "In-App Notifications", desc: "Show in-app notification badge" },
                      { name: "attendance", label: "Attendance Alerts", desc: "Reminders to mark attendance" },
                      { name: "assignments", label: "Assignment Alerts", desc: "New submissions and due date alerts" },
                      { name: "marks", label: "Marks Alerts", desc: "Reminders for pending marks entry" },
                      { name: "announcements", label: "School Announcements", desc: "School-wide announcements" },
                    ].map((item) => (
                      <label key={item.name} className="flex items-start gap-4 rounded-xl border border-subtle bg-hover/30 p-4 cursor-pointer hover:bg-hover transition">
                        <input type="checkbox" name={item.name} defaultChecked={parsedNotifs[item.name] !== false} className="mt-0.5 h-4 w-4 rounded border-theme accent-cyan-500" />
                        <div>
                          <p className="text-xs font-semibold text-primary">{item.label}</p>
                          <p className="text-[10px] text-secondary mt-0.5">{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}

              {/* APPEARANCE TAB */}
              {activeTab === "appearance" && (
                <>
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Appearance</h2>
                    <p className="text-xs text-secondary mt-1">Customize the portal theme and layout density.</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-secondary">
                        Color Preset
                      </span>
                      <p className="text-[11px] text-muted mt-0.5 mb-3">
                        Choose a cohesive color system for your dashboard. Live preview switches colors instantly.
                      </p>
                      <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
                        {THEME_PRESETS.map((preset) => {
                          const isSelected = selectedPreset === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setSelectedPreset(preset.id);
                                setColorPreset(preset.id, false); // live preview
                              }}
                              onMouseEnter={() => {
                                setHoveredPreset(preset.id);
                                setColorPreset(preset.id, false); // live preview on hover
                              }}
                              onMouseLeave={() => {
                                setHoveredPreset(null);
                                // Revert to whatever is currently selected
                                setColorPreset(selectedPreset, false);
                              }}
                              className={`flex flex-col items-stretch rounded-xl border p-4 text-left transition-all ${
                                isSelected
                                  ? "border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400"
                                  : "border-subtle bg-hover/20 hover:bg-hover hover:border-theme"
                              }`}
                            >
                              {/* Card Header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm shrink-0">{preset.emoji}</span>
                                  <span className="text-xs font-bold text-primary truncate">{preset.name}</span>
                                </div>
                                {isSelected && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                                )}
                              </div>

                              <p className="text-[10px] text-secondary mb-3 leading-relaxed truncate">
                                {preset.description}
                              </p>

                              {/* Mini Dashboard Preview */}
                              <div className="rounded-lg border border-theme bg-background p-2 space-y-1.5 overflow-hidden select-none pointer-events-none">
                                {/* Topbar */}
                                <div className="flex items-center justify-between border-b border-subtle pb-1">
                                  <div className="h-1.5 w-8 rounded bg-muted/60" />
                                  <div className="h-2.5 w-2.5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                    <div className="h-1 w-1 rounded-full bg-cyan-400" />
                                  </div>
                                </div>
                                
                                {/* Body */}
                                <div className="flex gap-2">
                                  {/* Sidebar */}
                                  <div className="w-8 border-r border-subtle pr-1 flex flex-col gap-1">
                                    <div className="h-1.5 w-full rounded bg-cyan-500/15" />
                                    <div className="h-1 w-2/3 rounded bg-muted/40" />
                                  </div>
                                  
                                  {/* Content */}
                                  <div className="flex-1 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                      <div className="h-2 w-8 rounded bg-muted/50" />
                                      <div className="rounded bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.5 text-[6px] font-bold text-cyan-400 uppercase tracking-wider scale-90 origin-right">
                                        OK
                                      </div>
                                    </div>
                                    <div className="mt-0.5 flex justify-end">
                                      <div className="rounded bg-cyan-400 px-1.5 py-0.5 text-[6px] font-bold text-slate-950 scale-90 origin-right">
                                        Go
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Density</p>
                      <div className="flex gap-2">
                        {["comfortable", "compact"].map((d) => (
                          <label key={d} className="flex items-center gap-2 rounded-xl border border-subtle bg-hover/30 p-3 cursor-pointer hover:bg-hover transition">
                            <input type="radio" name="density" value={d} defaultChecked={currentDensity === d} className="accent-cyan-500" />
                            <span className="text-xs font-semibold text-primary capitalize">{d}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Theme Mode</p>
                      <div className="flex gap-2">
                        {(["dark", "light", "system"] as Theme[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTheme(t)}
                            className={`rounded-xl border px-4 py-2 text-xs font-semibold capitalize transition ${currentTheme === t ? "border-cyan-400 bg-cyan-500/10 text-cyan-400" : "border-subtle text-secondary hover:bg-hover"}`}
                          >
                            {t}
                          </button>
                        ))}
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
                    <p className="text-xs text-secondary mt-1">Update your account password for security.</p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2 max-w-lg">
                    <label className="block md:col-span-2 space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">Current Password</span>
                      <input type="password" name="currentPassword" required className="input-theme" placeholder="••••••••" />
                    </label>
                    <label className="block md:col-span-2 space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">New Password</span>
                      <input type="password" name="newPassword" required minLength={8} className="input-theme" placeholder="Min. 8 characters" />
                    </label>
                  </div>
                </>
              )}

              {/* Save Button */}
              <div className="flex justify-end border-t border-subtle pt-4">
                <button
                  type="submit"
                  disabled={saveStatus === "saving"}
                  className="btn-cyan rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50 transition"
                >
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved ✓" : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            /* AI AVATARS TAB */
            <div className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6">
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">AI Generated Avatars</h2>
                <p className="text-xs text-secondary mt-1">Generate unique AI avatars and set one as your profile photo.</p>
              </div>

              <button
                onClick={handleGenerateAvatars}
                disabled={isGeneratingAvatars}
                className="btn-cyan rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {isGeneratingAvatars ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Generating...</>
                ) : "✨ Generate AI Avatars"}
              </button>

              {isGeneratingAvatars ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-6">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2.5">
                      <div className="h-16 w-16 rounded-full skeleton" />
                      <div className="h-3 w-12 rounded skeleton" />
                    </div>
                  ))}
                </div>
              ) : avatars.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-theme p-10 text-center">
                  <p className="text-sm text-secondary">No AI avatars yet. Click generate to create unique avatars!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                      Select Generated Character
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
                                alt={av.style}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <span className="mt-2 text-[10px] font-bold text-secondary truncate max-w-full">
                              {av.style}
                            </span>
                            {isCurrentSelection && (
                              <span className="absolute top-1 right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-cyan-400 text-[9px] font-bold text-slate-950">
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
                      The system uses a randomized session seed to build 5 illustration variations.
                      Select any variant to instantly update your global header, sidebar, and SQL profile image.
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
