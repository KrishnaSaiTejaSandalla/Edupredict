"use client";

import React, { useState, useEffect, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useNotificationStore } from "@/store/useNotificationStore";
import {
  updateUserPassword,
  uploadUserProfileImage,
  deleteUserProfileImage,
  updateUserAppearancePreferences,
} from "@/lib/settings-actions";
import {
  updateParentProfile,
  updateParentNotificationPreferences,
  updateStudentBasicInfo,
  generateParentAvatars,
} from "@/lib/parent-actions";
import { selectUserAvatar } from "@/lib/ai/avatars/generate";
import ImageCropperModal from "@/components/shared/ImageCropperModal";

interface UserProps {
  id: number;
  name: string;
  email: string;
  profileImageUrl?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  notificationPreferences?: string | null;
}

interface StudentProps {
  studentId: number;
  rollNumber: string | null;
  gender: string | null;
  name: string;
  email: string | null;
  className: string;
  classSection: string | null;
  displayClass: string;
  profileImageUrl?: string | null;
  isActive: boolean;
  relation: string | null;
  admissionDate: string | Date | null;
}

interface UserAvatarProps {
  id: number;
  userId: number;
  imageUrl: string;
  style: string;
  isSelected: boolean;
  createdAt: Date | string;
}

interface SettingsClientProps {
  user: UserProps;
  students: StudentProps[];
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
    description: "Deep luxury purples and amethysts",
    primary: "#a78bfa",
    secondary: "#7c3aed",
    gradient: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
    emoji: "🔮",
  },
  {
    id: "emerald-green",
    name: "Forest Green",
    description: "Natural organic emerald tones",
    primary: "#34d399",
    secondary: "#059669",
    gradient: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
    emoji: "🌿",
  },
  {
    id: "sunset-orange",
    name: "Sunfire Amber",
    description: "Warm orange and amber tones",
    primary: "#fb923c",
    secondary: "#ea580c",
    gradient: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
    emoji: "🌅",
  },
  {
    id: "crimson-red",
    name: "Cherry Rose",
    description: "Elegant crimson red and rose tones",
    primary: "#f87171",
    secondary: "#dc2626",
    gradient: "linear-gradient(135deg, #f87171 0%, #dc2626 100%)",
    emoji: "🌸",
  },
];

const getParentStyleLabel = (style: string) => {
  const cleanStyle = style.split("-").slice(0, 2).join("-");
  switch (cleanStyle) {
    case "professional-portrait": return "Professional Parent";
    case "corporate-cartoon": return "Caring Parent";
    case "student-avatar": return "Business Parent";
    case "teacher-avatar": return "Traditional Parent";
    case "saas-illustration": return "Casual Parent";
    default: return cleanStyle;
  }
};

export default function ParentSettingsClient({
  user,
  students,
  userAvatars: initialAvatars,
}: SettingsClientProps) {
  const router = useRouter();
  const { theme: currentTheme, colorPreset: currentPreset, setTheme, setColorPreset } = useTheme();
  const setStorePreferences = useNotificationStore((s) => s.setPreferences);

  const [activeTab, setActiveTab] = useState<string>("profile");
  const [isPending, startTransition] = useTransition();

  // Avatar states
  const [avatars, setAvatars] = useState<UserAvatarProps[]>(initialAvatars);
  const [isGeneratingAvatars, setIsGeneratingAvatars] = useState<boolean>(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState<boolean>(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState<boolean>(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showUploadMenu, setShowUploadMenu] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kids Profile Modal States
  const [viewKid, setViewKid] = useState<StudentProps | null>(null);
  const [editKid, setEditKid] = useState<StudentProps | null>(null);
  const [editKidName, setEditKidName] = useState("");
  const [editKidEmail, setEditKidEmail] = useState("");
  const [isSavingKid, setIsSavingKid] = useState(false);

  // -------------------------------------------------------------
  // DRAFT STATES FOR ALL TABS
  // -------------------------------------------------------------

  // 1. Profile Draft
  const [profileDraft, setProfileDraft] = useState({
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber || "",
    address: user.address || "",
  });

  useEffect(() => {
    setProfileDraft({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      address: user.address || "",
    });
  }, [user.name, user.email, user.phoneNumber, user.address]);

  // 2. Appearance Draft
  const [themeDraft, setThemeDraft] = useState<"dark" | "light" | "system">(currentTheme || "dark");
  const [presetDraft, setPresetDraft] = useState<string>(currentPreset || "ocean-blue");

  useEffect(() => {
    setThemeDraft(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    setPresetDraft(currentPreset || "ocean-blue");
  }, [currentPreset]);

  // 3. Password & Security Draft
  const [securityDraft, setSecurityDraft] = useState({
    currentPassword: "",
    newPassword: "",
  });

  // 4. Notifications Draft
  const parsedNotifs = useMemo(() => {
    if (!user.notificationPreferences) {
      return {
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
    }
    try {
      return JSON.parse(user.notificationPreferences);
    } catch {
      return {
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
    }
  }, [user.notificationPreferences]);

  const [notifDraft, setNotifDraft] = useState<Record<string, boolean>>(parsedNotifs);

  useEffect(() => {
    setNotifDraft(parsedNotifs);
  }, [parsedNotifs]);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    setAvatars(initialAvatars);
  }, [initialAvatars]);

  // -------------------------------------------------------------
  // TAB-AWARE DIRTY COMPUTATIONS
  // -------------------------------------------------------------
  const isProfileDirty =
    profileDraft.name.trim() !== user.name.trim() ||
    profileDraft.email.trim() !== user.email.trim() ||
    profileDraft.phoneNumber.trim() !== (user.phoneNumber || "").trim() ||
    profileDraft.address.trim() !== (user.address || "").trim();

  const isAppearanceDirty = themeDraft !== currentTheme || presetDraft !== currentPreset;

  const isSecurityDirty =
    securityDraft.currentPassword.trim().length > 0 ||
    securityDraft.newPassword.trim().length > 0;

  const isNotifDirty = JSON.stringify(notifDraft) !== JSON.stringify(parsedNotifs);

  const isCurrentTabDirty =
    activeTab === "profile"
      ? isProfileDirty
      : activeTab === "appearance"
      ? isAppearanceDirty
      : activeTab === "security"
      ? isSecurityDirty
      : activeTab === "notifications"
      ? isNotifDirty
      : false;

  // Calculate Profile Completion Meter (5 fields)
  const profileFields = [
    user.name,
    user.email,
    user.phoneNumber,
    user.address,
    user.profileImageUrl,
  ];
  const completedFields = profileFields.filter(
    (field) => field && field.toString().trim() !== ""
  ).length;
  const profileCompletionPercent = Math.round((completedFields / profileFields.length) * 100);

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // -------------------------------------------------------------
  // DISCARD & SAVE HANDLERS
  // -------------------------------------------------------------
  const handleDiscard = () => {
    if (activeTab === "profile") {
      setProfileDraft({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber || "",
        address: user.address || "",
      });
    } else if (activeTab === "appearance") {
      setThemeDraft(currentTheme);
      setPresetDraft(currentPreset || "ocean-blue");
    } else if (activeTab === "security") {
      setSecurityDraft({ currentPassword: "", newPassword: "" });
    } else if (activeTab === "notifications") {
      setNotifDraft(parsedNotifs);
    }
    toast.info("Unsaved changes discarded");
  };

  const executeSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveStatus("saving");

    try {
      if (activeTab === "profile") {
        if (!profileDraft.name.trim() || !profileDraft.email.trim()) {
          toast.error("Name and email address are required.");
          setSaveStatus("idle");
          return;
        }

        await updateParentProfile(user.id, {
          name: profileDraft.name.trim(),
          email: profileDraft.email.trim(),
          phoneNumber: profileDraft.phoneNumber.trim(),
          address: profileDraft.address.trim(),
        });

        toast.success("Profile details saved successfully!");
      } else if (activeTab === "security") {
        if (!securityDraft.currentPassword || !securityDraft.newPassword) {
          toast.error("Please provide both current and new password.");
          setSaveStatus("idle");
          return;
        }
        if (securityDraft.newPassword.length < 6) {
          toast.error("New password must be at least 6 characters long.");
          setSaveStatus("idle");
          return;
        }

        await updateUserPassword(user.id, {
          currentPassword: securityDraft.currentPassword,
          newPassword: securityDraft.newPassword,
        });

        toast.success("Password changed successfully!");
        setSecurityDraft({ currentPassword: "", newPassword: "" });
      } else if (activeTab === "notifications") {
        const payload = {
          attendance: notifDraft.attendance !== false,
          assignments: notifDraft.assignments !== false,
          messages: notifDraft.messages !== false,
          diary: notifDraft.diary !== false,
          feedback: notifDraft.feedback !== false,
          leaves: notifDraft.leaves !== false,
          announcements: notifDraft.announcements !== false,
          transport: notifDraft.transport !== false,
          general: notifDraft.general !== false,
        };

        await updateParentNotificationPreferences(user.id, payload);
        setStorePreferences(payload as any);
        toast.success("Notification preferences saved successfully!");
      } else if (activeTab === "appearance") {
        setTheme(themeDraft);
        setColorPreset(presetDraft, true);
        await updateUserAppearancePreferences(user.id, {
          theme: themeDraft,
          density: "comfortable",
        });
        toast.success("Appearance settings updated successfully!");
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);

      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings. Please try again.");
      setSaveStatus("idle");
      // Note: Draft states are deliberately kept intact so user work is NOT lost on error!
    }
  };

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
      toast.success("Profile photo updated successfully.");
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
      await generateParentAvatars(user.id);
      toast.success("New 15 AI avatar options generated!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Avatar generation failed");
    } finally {
      setIsGeneratingAvatars(false);
    }
  };

  const handleSelectAvatar = async (avatarId: number, url: string) => {
    try {
      await selectUserAvatar(user.id, avatarId, url);
      toast.success("Active profile avatar updated!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to select avatar");
    }
  };

  const handleEditKidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editKid) return;

    if (!editKidName.trim() || !editKidEmail.trim()) {
      toast.error("Name and email are required for student.");
      return;
    }

    setIsSavingKid(true);
    try {
      await updateStudentBasicInfo(editKid.studentId, {
        name: editKidName.trim(),
        email: editKidEmail.trim(),
      });
      toast.success("Student details updated successfully!");
      setEditKid(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update student details");
    } finally {
      setIsSavingKid(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-300">
      {/* Settings Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-theme pb-5 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
            System Settings
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            Parent Account Portal
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Manage your personal data, linked kids, security setups, and theme preferences.
          </p>
        </div>

        {/* Dynamic Profile Completion Meter */}
        <div className="flex items-center gap-3 rounded-2xl border border-theme bg-surface/50 p-3 backdrop-blur-md shadow-sm shrink-0">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <svg className="h-full w-full transform -rotate-90">
              <circle cx="24" cy="24" r="21" className="stroke-subtle fill-none" strokeWidth="3" />
              <circle
                cx="24"
                cy="24"
                r="21"
                className="stroke-cyan-400 fill-none transition-all duration-700 ease-out"
                strokeWidth="3"
                strokeDasharray="132"
                strokeDashoffset={132 - (132 * profileCompletionPercent) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-primary">
              {profileCompletionPercent}%
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">Profile Status</p>
            <p className="text-[10px] text-secondary">
              {profileCompletionPercent === 100
                ? "Profile fully completed!"
                : "Fill fields to finish setup"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Navigation Tabs */}
        <aside className="space-y-6">
          <div className="flex items-center gap-3.5 rounded-2xl border border-theme bg-surface/50 p-4 shadow-sm">
            <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-theme bg-white/[0.04]">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-cyan-300 text-xs font-bold text-slate-950">
                  {initials}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xs font-bold text-primary">{user.name}</h2>
              <p className="truncate text-[10px] text-muted mt-0.5 font-medium">Parent Profile</p>
            </div>
          </div>

          <nav className="rounded-2xl border border-theme bg-surface/50 p-2 shadow-sm space-y-1">
            {[
              { id: "profile", label: "Profile Details", icon: "👤" },
              { id: "kids", label: "Kids Profile", icon: "🎓" },
              { id: "appearance", label: "Appearance", icon: "👁️" },
              { id: "security", label: "Password & Security", icon: "🔒" },
              { id: "avatars", label: "AI Avatars", icon: "✨" },
              { id: "notifications", label: "Notifications", icon: "🔔" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Tabs */}
        <div className="min-h-[500px]">
          {/* PROFILE FORM */}
          {activeTab === "profile" && (
            <form
              id="profile-form"
              onSubmit={executeSave}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6 animate-in fade-in duration-200"
            >
              <div className="border-b border-subtle pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                    Personal Profile Details
                  </h2>
                  <p className="text-xs text-secondary mt-1">
                    Manage your credentials, phone number, and street address.
                  </p>
                </div>

                {/* Profile Photo Upload / Remove */}
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-theme bg-hover flex items-center justify-center shrink-0">
                    {isUploadingProfile || isDeletingProfile ? (
                      <div className="absolute inset-0 bg-surface/80 flex items-center justify-center">
                        <span className="h-4 w-4 animate-spin border-2 border-cyan-400 border-t-transparent rounded-full" />
                      </div>
                    ) : null}
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                      />
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
                    <p className="text-[10px] text-muted">PNG, JPG, or WEBP. Under 3MB.</p>
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
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Full Name
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={profileDraft.name}
                    onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                    required
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Email Address
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={profileDraft.email}
                    onChange={(e) => setProfileDraft({ ...profileDraft, email: e.target.value })}
                    required
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Phone Number
                  </span>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={profileDraft.phoneNumber}
                    onChange={(e) => setProfileDraft({ ...profileDraft, phoneNumber: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2 md:col-span-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Address Street
                  </span>
                  <input
                    type="text"
                    name="address"
                    value={profileDraft.address}
                    onChange={(e) => setProfileDraft({ ...profileDraft, address: e.target.value })}
                    placeholder="Enter your residence address"
                    className="input-theme"
                  />
                </label>
              </div>
            </form>
          )}

          {/* KIDS PROFILE */}
          {activeTab === "kids" && (
            <div className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Linked Student Profiles
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Children associated with this parent's account.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {students.map((kid) => {
                  const kidInitials = kid.name
                    .split(" ")
                    .filter(Boolean)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const admNumber = `ADM-${kid.studentId.toString().padStart(4, "0")}`;

                  return (
                    <div
                      key={`kid-card-${kid.studentId}`}
                      className="flex flex-col rounded-2xl border border-theme bg-hover/20 p-5 transition-all duration-200 hover:border-secondary hover:shadow-lg"
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-theme bg-white/[0.04] shrink-0">
                          {kid.profileImageUrl ? (
                            <img src={kid.profileImageUrl} alt={kid.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-cyan-300 text-sm font-bold text-slate-950">
                              {kidInitials}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-bold text-primary truncate">{kid.name}</h3>
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${
                                kid.isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}
                            >
                              {kid.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="text-xs text-secondary">
                            Class: <span className="text-cyan-400 font-semibold">{kid.displayClass}</span>
                          </p>
                          <p className="text-[11px] text-muted">
                            Roll Number: <span className="text-primary font-medium">{kid.rollNumber || "—"}</span>
                          </p>
                          <p className="text-[11px] text-muted">
                            Admission No: <span className="text-primary font-medium">{admNumber}</span>
                          </p>
                          <p className="text-[11px] text-muted truncate">
                            Email: <span className="text-primary font-medium">{kid.email || "—"}</span>
                          </p>
                          <p className="text-[11px] text-muted">
                            Relation: <span className="text-primary font-medium capitalize">{kid.relation || "Child"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-theme flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setViewKid(kid)}
                          className="rounded-xl border border-theme bg-hover hover:bg-surface px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditKid(kid);
                            setEditKidName(kid.name);
                            setEditKidEmail(kid.email || "");
                          }}
                          className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-4 py-2 text-xs font-semibold transition"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>
                  );
                })}

                {students.length === 0 && (
                  <div className="text-xs text-secondary py-8 text-center sm:col-span-2">
                    No linked student profiles found.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === "appearance" && (
            <form
              id="appearance-form"
              onSubmit={executeSave}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6 animate-in fade-in duration-200"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Layout &amp; Theme Appearance
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Select your preferred theme mode and accent highlight. Click Save Changes to apply.
                </p>
              </div>

              <div className="space-y-6">
                {/* Theme Mode */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Choose Theme Mode
                  </span>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Dark */}
                    <button
                      type="button"
                      onClick={() => setThemeDraft("dark")}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        themeDraft === "dark"
                          ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                          : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                      }`}
                    >
                      <div className="h-2 w-full rounded bg-slate-900 mb-2 border border-white/5 flex items-center justify-between px-2">
                        <span className="h-1 w-2 rounded bg-slate-700" />
                        <span className="h-1 w-1 rounded-full bg-cyan-400" />
                      </div>
                      <span className="text-xs font-bold text-primary">Dark Theme</span>
                      <span className="text-[10px] text-secondary mt-1">Sleek, low light, deep obsidian look.</span>
                    </button>

                    {/* Light */}
                    <button
                      type="button"
                      onClick={() => setThemeDraft("light")}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        themeDraft === "light"
                          ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                          : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                      }`}
                    >
                      <div className="h-2 w-full rounded bg-slate-100 mb-2 border border-black/5 flex items-center justify-between px-2">
                        <span className="h-1 w-2 rounded bg-slate-300" />
                        <span className="h-1 w-1 rounded-full bg-cyan-600" />
                      </div>
                      <span className="text-xs font-bold text-primary">Light Theme</span>
                      <span className="text-[10px] text-secondary mt-1">Clean white backdrop, professional contrast.</span>
                    </button>

                    {/* System */}
                    <button
                      type="button"
                      onClick={() => setThemeDraft("system")}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        themeDraft === "system"
                          ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                          : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                      }`}
                    >
                      <div className="h-2 w-full rounded bg-gradient-to-r from-slate-900 to-slate-100 mb-2 border border-theme flex items-center justify-between px-2">
                        <span className="h-1 w-2 rounded bg-slate-500" />
                        <span className="h-1 w-1 rounded-full bg-cyan-400" />
                      </div>
                      <span className="text-xs font-bold text-primary">System Default</span>
                      <span className="text-[10px] text-secondary mt-1">Synchronizes automatically with system preference.</span>
                    </button>
                  </div>
                </div>

                {/* Accent Swatch Cards */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Choose Accent Highlights
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {THEME_PRESETS.map((preset) => {
                      const isActivePreset = presetDraft === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setPresetDraft(preset.id)}
                          className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all duration-150 relative ${
                            isActivePreset
                              ? "border-cyan-400 bg-cyan-400/5 ring-2 ring-cyan-400/40"
                              : "border-theme bg-hover/10 hover:bg-hover hover:border-secondary"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-base">{preset.emoji}</span>
                            {isActivePreset && <span className="h-2 w-2 rounded-full bg-cyan-400" />}
                          </div>
                          <span className="mt-3 text-xs font-bold text-primary truncate max-w-full">
                            {preset.name}
                          </span>
                          <span className="mt-1 text-[9px] text-secondary leading-normal">
                            {preset.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* SECURITY */}
          {activeTab === "security" && (
            <form
              id="security-form"
              onSubmit={executeSave}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6 animate-in fade-in duration-200"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Update Account Password
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Ensure security updates for authorization logins.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Current Password
                  </span>
                  <input
                    type="password"
                    name="currentPassword"
                    value={securityDraft.currentPassword}
                    onChange={(e) => setSecurityDraft({ ...securityDraft, currentPassword: e.target.value })}
                    required
                    placeholder="••••••••"
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    New Password
                  </span>
                  <input
                    type="password"
                    name="newPassword"
                    value={securityDraft.newPassword}
                    onChange={(e) => setSecurityDraft({ ...securityDraft, newPassword: e.target.value })}
                    required
                    placeholder="••••••••"
                    className="input-theme"
                  />
                </label>
              </div>
            </form>
          )}

          {/* AI AVATARS */}
          {activeTab === "avatars" && (
            <div className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
              <div className="border-b border-subtle pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <span>✨ AI Avatar Foundation</span>
                  </h2>
                  <p className="text-xs text-secondary mt-1">
                    Generate unique avatar illustrations deterministically using AI styles.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAvatars}
                  disabled={isGeneratingAvatars}
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-400/10 hover:bg-cyan-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {isGeneratingAvatars ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin border-2 border-slate-950 border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : (
                    <>✨ Generate New Batch</>
                  )}
                </button>
              </div>

              {/* Loader pulsing skeleton */}
              {isGeneratingAvatars ? (
                <div className="grid grid-cols-5 gap-4 py-6">
                  {Array.from({ length: 15 }).map((_, idx) => (
                    <div key={`avatar-skeleton-${idx}`} className="flex flex-col items-center gap-2.5">
                      <div className="h-16 w-16 rounded-full skeleton" />
                      <div className="h-3 w-16 rounded skeleton" />
                    </div>
                  ))}
                </div>
              ) : avatars.length > 0 ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                      Select Generated Character
                    </h3>
                    <div className="grid grid-cols-5 gap-4">
                      {avatars.map((av) => {
                        const isCurrentSelection = user.profileImageUrl === av.imageUrl;
                        return (
                          <button
                            key={`avatar-${av.id}`}
                            type="button"
                            onClick={() => handleSelectAvatar(av.id, av.imageUrl)}
                            className={`flex flex-col items-center p-3 rounded-xl border bg-hover/20 hover:bg-hover hover:scale-[1.03] transition-all duration-200 group relative ${
                              isCurrentSelection
                                ? "border-cyan-400 ring-2 ring-cyan-400/50 bg-cyan-400/5"
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
                              {getParentStyleLabel(av.style)}
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
                </div>
              ) : null}
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <form
              id="notifications-form"
              onSubmit={executeSave}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6 animate-in fade-in duration-200"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Notification Channel Preferences
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Control which notification feeds trigger emails and dashboard alerts.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { name: "attendance", label: "Attendance Alerts", desc: "Get notified when child attendance updates are recorded." },
                  { name: "assignments", label: "Assignments & Submissions", desc: "Get notified on child newly created assignments and due dates." },
                  { name: "messages", label: "Messages", desc: "Get notified about new chat messages." },
                  { name: "diary", label: "Diary Updates", desc: "Get notified about classroom teacher posts and diaries." },
                  { name: "feedback", label: "Observations & Surveys", desc: "Get notified about observations and surveys feedback reports." },
                  { name: "leaves", label: "Leaves Alerts", desc: "Get notified about child leaves requests or status changes." },
                  { name: "announcements", label: "School Announcements", desc: "Get notified about school-wide announcements." },
                  { name: "transport", label: "Transport Alerts", desc: "Get notified about bus and location updates." },
                  { name: "general", label: "General Alerts", desc: "Get notified about other updates and system info." },
                ].map((item) => (
                  <label key={item.name} className="flex items-start gap-3.5 rounded-xl border border-theme bg-hover/10 p-4 cursor-pointer hover:bg-hover/20 transition-colors">
                    <input
                      type="checkbox"
                      name={item.name}
                      checked={notifDraft[item.name] !== false}
                      onChange={(e) =>
                        setNotifDraft({
                          ...notifDraft,
                          [item.name]: e.target.checked,
                        })
                      }
                      className="mt-1 h-4.5 w-4.5 rounded border-theme bg-surface text-cyan-400 focus:ring-cyan-500/20"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-primary">{item.label}</span>
                      <span className="block text-[10px] text-secondary mt-0.5">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* STICKY BOTTOM SAVE BAR */}
      {isCurrentTabDirty && (
        <div className="fixed bottom-6 left-6 right-6 md:left-[304px] z-40 bg-surface backdrop-blur-sm border border-cyan-400/20 rounded-2xl px-6 py-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">Unsaved changes in this tab</p>
              <p className="text-[10px] text-secondary">
                You have modified fields. Click Save Changes to persist.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saveStatus === "saving"}
              className="rounded-xl border border-theme bg-hover hover:bg-surface px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="submit"
              form={`${activeTab}-form`}
              disabled={saveStatus === "saving"}
              className="rounded-xl bg-cyan-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-400/10 hover:bg-cyan-300 hover:scale-[1.02] transition disabled:opacity-50 flex items-center gap-2"
            >
              {saveStatus === "saving" ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin border-2 border-slate-950 border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      )}

      {/* VIEW KID PROFILE DIALOG */}
      {viewKid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-theme bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-theme pb-4">
              <div>
                <h3 className="text-base font-bold text-primary">Student Profile Details</h3>
                <p className="text-[11px] text-secondary mt-0.5">Full academic overview record</p>
              </div>
              <button
                type="button"
                onClick={() => setViewKid(null)}
                className="text-secondary hover:text-primary rounded-lg p-1 hover:bg-hover transition"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-theme bg-white/[0.04] shrink-0">
                  {viewKid.profileImageUrl ? (
                    <img src={viewKid.profileImageUrl} alt={viewKid.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-cyan-300 text-sm font-bold text-slate-950">
                      {viewKid.name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary">{viewKid.name}</h4>
                  <p className="text-xs text-cyan-400 font-semibold">{viewKid.displayClass}</p>
                </div>
              </div>

              <div className="rounded-xl border border-theme bg-hover/20 p-4 space-y-2.5 text-xs text-secondary">
                <div className="flex justify-between">
                  <span>Student ID:</span>
                  <span className="font-semibold text-primary">{viewKid.studentId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Admission Number:</span>
                  <span className="font-semibold text-primary">ADM-{viewKid.studentId.toString().padStart(4, "0")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Roll Number:</span>
                  <span className="font-semibold text-primary">{viewKid.rollNumber || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email Address:</span>
                  <span className="font-semibold text-primary truncate max-w-[200px]">{viewKid.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Relation Mapping:</span>
                  <span className="font-semibold text-primary capitalize">{viewKid.relation || "Child"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Enrollment Status:</span>
                  <span className={`font-semibold ${viewKid.isActive ? "text-emerald-400" : "text-slate-400"}`}>
                    {viewKid.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {viewKid.admissionDate && (
                  <div className="flex justify-between">
                    <span>Admission Date:</span>
                    <span className="font-semibold text-primary">
                      {new Date(viewKid.admissionDate).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewKid(null)}
                className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-5 py-2.5 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT KID PROFILE DIALOG */}
      {editKid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-theme bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-theme pb-4">
              <div>
                <h3 className="text-base font-bold text-primary">Edit Student Info</h3>
                <p className="text-[11px] text-secondary mt-0.5">Modify student's name and email only</p>
              </div>
              <button
                type="button"
                onClick={() => setEditKid(null)}
                className="text-secondary hover:text-primary rounded-lg p-1 hover:bg-hover transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditKidSubmit} className="mt-5 space-y-4">
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                  Student Name
                </span>
                <input
                  type="text"
                  required
                  value={editKidName}
                  onChange={(e) => setEditKidName(e.target.value)}
                  className="input-theme"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                  Email Address
                </span>
                <input
                  type="email"
                  required
                  value={editKidEmail}
                  onChange={(e) => setEditKidEmail(e.target.value)}
                  className="input-theme"
                />
              </label>

              <div className="mt-6 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditKid(null)}
                  className="rounded-xl border border-theme bg-hover hover:bg-surface px-4 py-2.5 text-xs font-semibold text-secondary hover:text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingKid}
                  className="rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-5 py-2.5 text-xs font-semibold transition disabled:opacity-50"
                >
                  {isSavingKid ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
