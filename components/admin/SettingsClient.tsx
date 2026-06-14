"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "@/components/ui/ThemeProvider";
import type { Theme, Density } from "@/store/usePreferencesStore";
import {
  updateUserProfile,
  updateUserPassword,
  updateSchoolProfile,
  updateSchoolBranding,
  uploadSchoolLogo,
  uploadUserProfileImage,
  updateUserNotificationPreferences,
} from "@/lib/settings-actions";
import {
  generateUserAvatars,
  selectUserAvatar,
} from "@/lib/ai/avatars/generate";
import logo from "@/branding/logo.png";

interface UserProps {
  id: number;
  name: string;
  email: string;
  schoolId: number | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  designation?: string | null;
  phoneNumber?: string | null;
  notificationPreferences?: string | null;
  appearancePreferences?: string | null;
}

interface SchoolProps {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  principalName: string | null;
  establishedYear: number | null;
  motto: string | null;
  website: string | null;
  registrationNumber: string | null;
  affiliationBoard: string | null;
  udiseCode: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
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

interface SettingsClientProps {
  user: UserProps;
  school: SchoolProps | null;
  userPreferences: UserPreferencesProps | null;
  userAvatars: UserAvatarProps[];
}

/* ── 5 Built-in Color Presets ── */
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

/* Legacy hex swatches kept for backward compat with branding DB field */
const COLOR_PRESETS = [
  { name: "Cyan", value: "#06b6d4" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
];

export default function SettingsClient({
  user,
  school,
  userPreferences,
  userAvatars: initialAvatars,
}: SettingsClientProps) {
  const router = useRouter();
  const { theme: currentTheme, density: currentDensity, colorPreset: currentPreset, setTheme, setDensity, setColorPreset } = useTheme();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [isPending, startTransition] = useTransition();
  const [selectedPreset, setSelectedPreset] = useState<string>(currentPreset || "ocean-blue");
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);

  // Avatar states
  const [avatars, setAvatars] = useState<UserAvatarProps[]>(initialAvatars);
  const [isGeneratingAvatars, setIsGeneratingAvatars] = useState<boolean>(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  // Form states and dirty checks
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Dynamic branding previews
  const [primaryColor, setPrimaryColor] = useState<string>(school?.primaryColor || "#06b6d4");
  const [accentColor, setAccentColor] = useState<string>(school?.accentColor || "#a78bfa");
  const [logoPreview, setLogoPreview] = useState<string | null>(school?.logoUrl || null);

  // Ref to monitor forms
  const formRef = useRef<HTMLFormElement>(null);

  // Parse notifications
  const parsedNotifs = user.notificationPreferences
    ? JSON.parse(user.notificationPreferences)
    : { email: true, inApp: true, attendance: true, exams: true };

  // Calculate Profile Completion Meter
  const profileFields = [
    user.name,
    user.email,
    user.bio,
    user.designation,
    user.phoneNumber,
    user.profileImageUrl,
  ];
  const completedFields = profileFields.filter(
    (field) => field && field.toString().trim() !== ""
  ).length;
  const profileCompletionPercent = Math.round((completedFields / profileFields.length) * 100);

  // Generate Initials fallback
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Reset dirty flag if we switch tabs
  useEffect(() => {
    setIsDirty(false);
  }, [activeTab]);

  const handleFieldChange = () => {
    if (!isDirty) {
      setIsDirty(true);
    }
  };

  const handleDiscard = () => {
    startTransition(() => {
      // Reload page state from DB
      router.refresh();
      setIsDirty(false);
      toast.info("Changes discarded");
    });
  };

  const executeSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveStatus("saving");
    const formData = new FormData(e.currentTarget);

    try {
      if (activeTab === "profile") {
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const bio = formData.get("bio") as string;
        const designation = formData.get("designation") as string;
        const phoneNumber = formData.get("phoneNumber") as string;

        await updateUserProfile(user.id, { name, email, bio, designation, phoneNumber });
        toast.success("Profile saved successfully!");
      } else if (activeTab === "school") {
        if (!school) throw new Error("No school record is associated with this profile.");
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        const address = formData.get("address") as string;
        const city = formData.get("city") as string;
        const state = formData.get("state") as string;
        const pincode = formData.get("pincode") as string;
        const principalName = formData.get("principalName") as string;
        const establishedYear = formData.get("establishedYear")
          ? parseInt(formData.get("establishedYear") as string, 10)
          : null;
        const motto = formData.get("motto") as string;
        const website = formData.get("website") as string;
        const registrationNumber = formData.get("registrationNumber") as string;
        const affiliationBoard = formData.get("affiliationBoard") as string;
        const udiseCode = formData.get("udiseCode") as string;

        await updateSchoolProfile(school.id, {
          name,
          email,
          phone,
          address,
          city,
          state,
          pincode,
          principalName,
          establishedYear,
          motto,
          website,
          registrationNumber,
          affiliationBoard,
          udiseCode,
        });
        toast.success("School configuration saved successfully!");
      } else if (activeTab === "branding") {
        if (!school) throw new Error("No school record associated.");
        await updateSchoolBranding(school.id, {
          primaryColor,
          accentColor,
          logoUrl: logoPreview,
        });
        const matchedPreset = THEME_PRESETS.find(p => p.primary === primaryColor)?.id || 'ocean-blue';
        setColorPreset(matchedPreset, true);
        toast.success("School branding saved successfully!");
      } else if (activeTab === "notifications") {
        const email = formData.get("email") === "on";
        const inApp = formData.get("inApp") === "on";
        const attendance = formData.get("attendance") === "on";
        const exams = formData.get("exams") === "on";

        await updateUserNotificationPreferences(user.id, { email, inApp, attendance, exams });
        toast.success("Notification preferences saved successfully!");
      } else if (activeTab === "appearance") {
        // Persist the currently selected preset via ThemeProvider cookie
        setColorPreset(selectedPreset, true);
        // Also persist density
        const newDensity = formData.get("density") as string | null;
        if (newDensity) setDensity(newDensity as any);
        toast.success("Appearance saved! Your color preset is now active.");
      } else if (activeTab === "security") {
        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;

        await updateUserPassword(user.id, { currentPassword, newPassword });
        toast.success("Password updated successfully!");
        (e.target as HTMLFormElement).reset();
      }

      setSaveStatus("saved");
      setIsDirty(false);
      router.refresh();
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err: any) {
      setSaveStatus("idle");
      toast.error(err.message || "An error occurred while saving.");
    }
  };

  // Profile picture upload handler
  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProfile(true);
    const data = new FormData();
    data.append("image", file);

    try {
      const res = await uploadUserProfileImage(user.id, data);
      toast.success("Profile photo uploaded!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setIsUploadingProfile(false);
    }
  };

  // School logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!school) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const data = new FormData();
    data.append("logo", file);

    try {
      const res = await uploadSchoolLogo(school.id, data);
      setLogoPreview(res.logoUrl);
      toast.success("School logo uploaded!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Generate Avatars handler
  const handleGenerateAvatars = async () => {
    setIsGeneratingAvatars(true);
    try {
      const generated = await generateUserAvatars(user.id);
      toast.success("AI Avatars generated!");
      // Re-fetch avatars
      router.refresh();
      // Directly pull latest from DB or update client state
      // Since generated returns items, let's map them
      // We will refresh the page to reload the newly generated database records
      setTimeout(() => {
        router.refresh();
      }, 500);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate avatars");
    } finally {
      setIsGeneratingAvatars(false);
    }
  };

  // Select Avatar handler
  const handleSelectAvatar = async (avatarId: number, url: string) => {
    try {
      await selectUserAvatar(user.id, avatarId, url);
      toast.success("Avatar selected as profile photo!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to select avatar");
    }
  };

  // Sync state values on DB reload
  useEffect(() => {
    if (school) {
      setPrimaryColor(school.primaryColor || "#06b6d4");
      setAccentColor(school.accentColor || "#a78bfa");
      setLogoPreview(school.logoUrl || null);
    }
  }, [school]);

  // Sync avatars list
  useEffect(() => {
    setAvatars(initialAvatars);
  }, [initialAvatars]);

  return (
    <div className="space-y-6 relative pb-20">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-theme pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider border border-cyan-500/10">
              Admin Platform
            </span>
            {saveStatus === "saving" && (
              <span className="text-xs text-secondary animate-pulse">Saving changes...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-emerald-400 font-medium">Saved ✓</span>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Identity & Personalization
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Manage your credentials, branding configurations, layout preferences, and AI features.
          </p>
        </div>

        {/* Dynamic Profile Completion Meter in Header */}
        <div className="flex items-center gap-3 rounded-2xl border border-theme bg-surface/50 p-3 backdrop-blur-md shadow-sm">
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

      {/* Main Settings Grid */}
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        {/* Navigation Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-theme bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-theme bg-hover">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-cyan-300 text-sm font-bold text-slate-950">
                    {initials || "AD"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-primary truncate">{user.name}</p>
                <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider mt-0.5">
                  {user.designation || "Administrator"}
                </p>
              </div>
            </div>
          </div>

          <nav className="rounded-2xl border border-theme bg-surface/50 p-2 shadow-sm space-y-1">
            {[
              { id: "profile", label: "Profile", icon: "👤" },
              { id: "school", label: "School Identity", icon: "🏫" },
              { id: "branding", label: "Branding", icon: "🎨" },
              { id: "appearance", label: "Appearance", icon: "👁️" },
              { id: "notifications", label: "Notifications", icon: "🔔" },
              { id: "security", label: "Security", icon: "🔒" },
              { id: "avatars", label: "AI Avatars", icon: "✨" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide uppercase transition duration-150 border border-transparent ${isActive
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

        {/* Content Pane */}
        <div className="min-h-[500px]">
          {/* PROFILE FORM */}
          {activeTab === "profile" && (
            <form
              id="profile-form"
              onSubmit={executeSave}
              onChange={handleFieldChange}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                    Personal Profile Details
                  </h2>
                  <p className="text-xs text-secondary mt-1">
                    Manage your credentials, designation, and bio.
                  </p>
                </div>

                {/* Profile Picture Upload Preview */}
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-theme bg-hover flex items-center justify-center shrink-0">
                    {isUploadingProfile ? (
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
                  <div>
                    <label className="inline-block rounded-xl border border-theme bg-hover hover:bg-surface px-3 py-1.5 text-xs font-semibold text-primary cursor-pointer transition">
                      Upload Photo
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={handleProfileImageUpload}
                      />
                    </label>
                    <p className="text-[10px] text-muted mt-1">PNG, JPG, or WEBP. Under 3MB.</p>
                  </div>
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
                    defaultValue={user.name}
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
                    defaultValue={user.email}
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
                    defaultValue={user.phoneNumber || ""}
                    placeholder="+1 (555) 000-0000"
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Designation / Role
                  </span>
                  <input
                    type="text"
                    name="designation"
                    defaultValue={user.designation || ""}
                    placeholder="e.g. Principal, Admin Lead"
                    className="input-theme"
                  />
                </label>

                <label className="block md:col-span-2 space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Personal Bio
                  </span>
                  <textarea
                    name="bio"
                    defaultValue={user.bio || ""}
                    placeholder="Tell us about your educational role..."
                    className="textarea-theme"
                  />
                </label>
              </div>
            </form>
          )}

          {/* SCHOOL CONFIGURATION FORM */}
          {activeTab === "school" && (
            <form
              id="school-form"
              onSubmit={executeSave}
              onChange={handleFieldChange}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  School ERP Profile
                </h2>
                <p className="text-xs text-secondary mt-1">
                  General institutional details for reports, invoices, and certificates.
                </p>
              </div>

              {school ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      School Name
                    </span>
                    <input
                      type="text"
                      name="name"
                      defaultValue={school.name}
                      required
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Principal Name
                    </span>
                    <input
                      type="text"
                      name="principalName"
                      defaultValue={school.principalName || ""}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Established Year
                    </span>
                    <input
                      type="number"
                      name="establishedYear"
                      defaultValue={school.establishedYear || ""}
                      placeholder="e.g. 1998"
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Official Website
                    </span>
                    <input
                      type="url"
                      name="website"
                      defaultValue={school.website || ""}
                      placeholder="https://yourschool.edu"
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Contact Email
                    </span>
                    <input
                      type="email"
                      name="email"
                      defaultValue={school.email || ""}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Contact Phone
                    </span>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={school.phone || ""}
                      className="input-theme"
                    />
                  </label>

                  <label className="block md:col-span-2 space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Motto / Vision
                    </span>
                    <input
                      type="text"
                      name="motto"
                      defaultValue={school.motto || ""}
                      placeholder="Inspiring Excellence, Empowering Leaders"
                      className="input-theme"
                    />
                  </label>

                  <div className="border-t border-subtle md:col-span-2 pt-4 mt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
                      Academic Affiliation & Board Registrations
                    </h3>
                  </div>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Registration Number
                    </span>
                    <input
                      type="text"
                      name="registrationNumber"
                      defaultValue={school.registrationNumber || ""}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Affiliation Board
                    </span>
                    <input
                      type="text"
                      name="affiliationBoard"
                      defaultValue={school.affiliationBoard || ""}
                      placeholder="CBSE, ICSE, IB, State Board"
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      UDISE Code
                    </span>
                    <input
                      type="text"
                      name="udiseCode"
                      defaultValue={school.udiseCode || ""}
                      placeholder="11-digit school code"
                      className="input-theme"
                    />
                  </label>

                  <div className="border-t border-subtle md:col-span-2 pt-4 mt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
                      Campus Location
                    </h3>
                  </div>

                  <label className="block md:col-span-2 space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Address Street
                    </span>
                    <input
                      type="text"
                      name="address"
                      defaultValue={school.address || ""}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      City
                    </span>
                    <input
                      type="text"
                      name="city"
                      defaultValue={school.city || ""}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      State / Region
                    </span>
                    <input
                      type="text"
                      name="state"
                      defaultValue={school.state || ""}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Pincode / Zip Code
                    </span>
                    <input
                      type="text"
                      name="pincode"
                      defaultValue={school.pincode || ""}
                      className="input-theme"
                    />
                  </label>
                </div>
              ) : (
                <div className="text-xs text-secondary py-10 text-center">
                  ⚠️ No school record found. Create an association in database.
                </div>
              )}
            </form>
          )}

          {/* BRANDING FORM */}
          {activeTab === "branding" && (
            <form
              id="branding-form"
              onSubmit={executeSave}
              onChange={handleFieldChange}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Branding & Identity System
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Customize themes, school logos, and dashboard primary branding colors.
                </p>
              </div>

              {school ? (
                <div className="grid gap-6">
                  {/* Logo Upload area */}
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      School Logo
                    </span>
                    <div className="flex flex-col sm:flex-row items-center gap-6 rounded-xl border border-dashed border-theme p-4 bg-hover/20">
                      <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-white p-2 border border-theme shadow-inner shrink-0 flex items-center justify-center">
                        {isUploadingLogo ? (
                          <div className="absolute inset-0 bg-surface/80 flex items-center justify-center">
                            <span className="h-5 w-5 animate-spin border-2 border-cyan-400 border-t-transparent rounded-full" />
                          </div>
                        ) : null}
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Image
                            src={logo}
                            alt="Default Logo"
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="inline-block rounded-xl border border-theme bg-hover hover:bg-surface px-4 py-2 text-xs font-semibold text-primary cursor-pointer transition">
                          Upload Custom Logo
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </label>
                        <p className="text-[10px] text-muted">
                          Recommended: 256x256 size in PNG or WEBP format. Maximum file size 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Theme Presets Selection (with Live Preview Cards) */}
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                        School Color Theme Preset
                      </span>
                      <p className="text-[11px] text-muted mt-0.5">
                        Choose a cohesive color system for your school's dashboard. Hover for a live preview; click to select.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      {THEME_PRESETS.map((preset) => {
                        const isSelected = primaryColor === preset.primary && accentColor === preset.secondary;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setPrimaryColor(preset.primary);
                              setAccentColor(preset.secondary);
                              setColorPreset(preset.id, false); // select temporarily/locally
                              setSelectedPreset(preset.id);
                              handleFieldChange();
                            }}
                            onMouseEnter={() => {
                              setHoveredPreset(preset.id);
                              setColorPreset(preset.id, false); // live preview
                            }}
                            onMouseLeave={() => {
                              setHoveredPreset(null);
                              // Revert to whatever matches current selected state
                              const activeId = THEME_PRESETS.find(p => p.primary === primaryColor)?.id || "ocean-blue";
                              setColorPreset(activeId, false);
                            }}
                            className={`flex flex-col items-stretch rounded-xl border p-4 text-left transition-all ${
                              isSelected
                                ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                                : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{preset.emoji}</span>
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
                </div>
              ) : (
                <div className="text-xs text-secondary py-10 text-center">
                  ⚠️ Branding configuration is only available for valid schools.
                </div>
              )}
            </form>
          )}

          {/* APPEARANCE REDESIGNED - LIVE SWITCHING */}
          {activeTab === "appearance" && (
            <form
              id="appearance-form"
              onSubmit={executeSave}
              onChange={handleFieldChange}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Appearance Settings
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Switches layout style and system colors. Updates instantly in your browser.
                </p>
              </div>

              <div className="space-y-6">
                {/* Theme Options */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Choose Theme Mode
                  </span>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Dark Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("dark");
                        handleFieldChange();
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${currentTheme === "dark"
                        ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                        : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                        }`}
                    >
                      <div className="h-2 w-full rounded bg-slate-900 mb-2 border border-white/5 flex items-center justify-between px-2">
                        <span className="h-1 w-2 rounded bg-slate-700" />
                        <span className="h-1 w-1 rounded-full bg-cyan-400" />
                      </div>
                      <span className="text-xs font-bold text-primary">Dark Theme</span>
                      <span className="text-[10px] text-secondary mt-1">
                        Sleek, low light, deep obsidian look.
                      </span>
                    </button>

                    {/* Light Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("light");
                        handleFieldChange();
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${currentTheme === "light"
                        ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                        : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                        }`}
                    >
                      <div className="h-2 w-full rounded bg-slate-100 mb-2 border border-black/5 flex items-center justify-between px-2">
                        <span className="h-1 w-2 rounded bg-slate-300" />
                        <span className="h-1 w-1 rounded-full bg-cyan-600" />
                      </div>
                      <span className="text-xs font-bold text-primary">Light Theme</span>
                      <span className="text-[10px] text-secondary mt-1">
                        Clean white backdrop, professional contrast.
                      </span>
                    </button>

                    {/* System Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("system");
                        handleFieldChange();
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${currentTheme === "system"
                        ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                        : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                        }`}
                    >
                      <div className="h-2 w-full rounded bg-gradient-to-r from-slate-900 to-slate-100 mb-2 border border-theme flex items-center justify-between px-2">
                        <span className="h-1 w-2 rounded bg-slate-500" />
                        <span className="h-1 w-1 rounded-full bg-cyan-400" />
                      </div>
                      <span className="text-xs font-bold text-primary">System Default</span>
                      <span className="text-[10px] text-secondary mt-1">
                        Synchronizes automatically with system preference.
                      </span>
                    </button>
                  </div>
                </div>


                {/* Density Options */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Choose Information Density
                  </span>
                  <input type="hidden" name="density" value={currentDensity} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Compact */}
                    <button
                      type="button"
                      onClick={() => {
                        setDensity("compact");
                        handleFieldChange();
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${currentDensity === "compact"
                        ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                        : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                        }`}
                    >
                      <div className="w-full flex flex-col gap-0.5 mb-2">
                        <div className="h-1 w-full rounded bg-muted" />
                        <div className="h-1 w-full rounded bg-muted" />
                        <div className="h-1 w-full rounded bg-muted" />
                      </div>
                      <span className="text-xs font-bold text-primary">Compact</span>
                      <span className="text-[10px] text-secondary mt-1">
                        Tight padding and fonts. Maximizes information.
                      </span>
                    </button>

                    {/* Comfortable */}
                    <button
                      type="button"
                      onClick={() => {
                        setDensity("comfortable");
                        handleFieldChange();
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${currentDensity === "comfortable"
                        ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                        : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                        }`}
                    >
                      <div className="w-full flex flex-col gap-1 mb-2">
                        <div className="h-1.5 w-full rounded bg-muted" />
                        <div className="h-1.5 w-full rounded bg-muted" />
                      </div>
                      <span className="text-xs font-bold text-primary">Comfortable</span>
                      <span className="text-[10px] text-secondary mt-1">
                        Standard balanced row sizes. Easy reading.
                      </span>
                    </button>

                    {/* Spacious */}
                    <button
                      type="button"
                      onClick={() => {
                        setDensity("spacious");
                        handleFieldChange();
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${currentDensity === "spacious"
                        ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                        : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                        }`}
                    >
                      <div className="w-full flex flex-col gap-2 mb-2">
                        <div className="h-2 w-full rounded bg-muted" />
                      </div>
                      <span className="text-xs font-bold text-primary">Spacious</span>
                      <span className="text-[10px] text-secondary mt-1">
                        Larger spacing and padding. Clean and breathable.
                      </span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-theme bg-hover/30 p-4 text-xs text-secondary leading-relaxed flex items-start gap-2.5">
                  <span className="text-base">ℹ️</span>
                  <span>
                    Appearance settings are saved globally. The system persists cookies to
                    prevent layout shifts or theme flashes during page loading.
                  </span>
                </div>
              </div>
            </form>
          )}

          {/* NOTIFICATIONS FORM */}
          {activeTab === "notifications" && (
            <form
              id="notifications-form"
              onSubmit={executeSave}
              onChange={handleFieldChange}
              className="rounded-2xl bg-background border border-border p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Notification Center
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Configure when and how you receive alerts and reports.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 text-xs font-medium text-foreground">
                  <div className="space-y-0.5">
                    <span className="block">Email Notifications</span>
                    <span className="block text-[10px] text-secondary font-medium">
                      Receive weekly stats summaries via email.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    name="email"
                    defaultChecked={parsedNotifs.email}
                    className="h-5 w-5 accent-cyan-400 cursor-pointer rounded border-theme"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 text-xs font-medium text-foreground">
                  <div className="space-y-0.5">
                    <span className="block">In-App Alerts</span>
                    <span className="block text-[10px] text-secondary font-medium">
                      Show badges and popups inside administrative header.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    name="inApp"
                    defaultChecked={parsedNotifs.inApp}
                    className="h-5 w-5 accent-cyan-400 cursor-pointer rounded border-theme"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 text-xs font-medium text-foreground">
                  <div className="space-y-0.5">
                    <span className="block">Attendance Broadcasts</span>
                    <span className="block text-[10px] text-secondary font-medium">
                      Trigger messages to parents when student records change.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    name="attendance"
                    defaultChecked={parsedNotifs.attendance}
                    className="h-5 w-5 accent-cyan-400 cursor-pointer rounded border-theme"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 text-xs font-medium text-foreground">
                  <div className="space-y-0.5">
                    <span className="block">Exam reminders</span>
                    <span className="block text-[10px] text-secondary font-medium">
                      Notify staff regarding exam sheets deadline.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    name="exams"
                    defaultChecked={parsedNotifs.exams}
                    className="h-5 w-5 accent-cyan-400 cursor-pointer rounded border-theme"
                  />
                </label>
              </div>
            </form>
          )}

          {/* SECURITY FORM */}
          {activeTab === "security" && (
            <form
              id="security-form"
              onSubmit={executeSave}
              onChange={handleFieldChange}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Account Credentials Security
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Change system passwords and monitor session encryption.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Current Password
                  </span>
                  <input type="password" name="currentPassword" required className="input-theme" />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    New Password
                  </span>
                  <input type="password" name="newPassword" required className="input-theme" />
                </label>
              </div>

              <div className="rounded-xl border border-theme bg-hover/30 p-4 text-xs text-secondary leading-relaxed flex items-start gap-2.5">
                <span className="text-base">🔒</span>
                <span>
                  Admin credentials utilize salt hashing via bcryptjs. Session tokens expire in 30
                  days or upon manual logouts.
                </span>
              </div>
            </form>
          )}

          {/* AI AVATARS MODULE */}
          {activeTab === "avatars" && (
            <div className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
              <div className="border-b border-subtle pb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <span>✨ AI Avatar Foundation</span>
                  </h2>
                  <p className="text-xs text-secondary mt-1">
                    Generate creative avatar styles deterministically using AI provider pipelines.
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-6">
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2.5">
                      <div className="h-16 w-16 rounded-full skeleton" />
                      <div className="h-3 w-12 rounded skeleton" />
                    </div>
                  ))}
                </div>
              ) : avatars.length > 0 ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">
                      Select Generated Character
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {avatars.map((av) => {
                        const isCurrentSelection = user.profileImageUrl === av.imageUrl;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => handleSelectAvatar(av.id, av.imageUrl)}
                            className={`flex flex-col items-center p-3 rounded-xl border bg-hover/20 hover:bg-hover hover:scale-[1.03] transition-all duration-200 group relative ${isCurrentSelection
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
              ) : (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-theme rounded-2xl bg-hover/10">
                  <div className="text-3xl mb-2">🎨</div>
                  <h4 className="text-xs font-bold text-primary">No Avatars Generated Yet</h4>
                  <p className="text-[10px] text-secondary mt-1 text-center max-w-xs px-4">
                    Click the "Generate New Batch" button above to dynamically create unique AI avatar illustrations.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div >

      {/* STICKY BOTTOM SAVE BAR */}
      {
        isDirty && (
          <div className="fixed bottom-6 left-6 right-6 md:left-[304px] z-40 bg-surface
        backdrop-blur-sm border border-cyan-400/20 rounded-2xl px-6 py-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary">Unsaved changes in this tab</p>
                <p className="text-[10px] text-secondary">
                  You have modified fields in this tab. Save to apply changes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isPending}
                className="rounded-xl sborder border-theme bg-hover hover:bg-surface px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition"
              >
                Discard
              </button>
              <button
                type="submit"
                form={`${activeTab}-form`}
                className="rounded-xl bg-cyan-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-400/10 hover:bg-cyan-300 hover:scale-[1.02] transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
}
