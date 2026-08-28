"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  updateSchoolFeedbackSettings,
  upsertUserPreferences,
  updateUserAppearancePreferences,
} from "@/lib/settings-actions";
import { saveNotificationPreferences } from "@/lib/notification-actions";
import { useNotificationStore } from "@/store/useNotificationStore";
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
  monthlyFeedbackOpen: boolean;
  teacherFeedbackOpen: boolean;
  schoolSurveyOpen: boolean;
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

export default function SettingsClient({
  user,
  school,
  userPreferences,
  userAvatars: initialAvatars,
}: SettingsClientProps) {
  const router = useRouter();
  const {
    theme: currentTheme,
    density: currentDensity,
    colorPreset: currentPreset,
    setTheme,
    setDensity,
    setColorPreset,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<string>("profile");
  const [isPending, startTransition] = useTransition();

  const [avatars, setAvatars] = useState<UserAvatarProps[]>(initialAvatars);
  const [isGeneratingAvatars, setIsGeneratingAvatars] = useState<boolean>(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);

  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [draftProfile, setDraftProfile] = useState({
    name: user.name || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    designation: user.designation || "",
    bio: user.bio || "",
  });

  const [draftSchool, setDraftSchool] = useState({
    name: school?.name || "",
    principalName: school?.principalName || "",
    establishedYear: school?.establishedYear ? String(school.establishedYear) : "",
    website: school?.website || "",
    email: school?.email || "",
    phone: school?.phone || "",
    motto: school?.motto || "",
    registrationNumber: school?.registrationNumber || "",
    affiliationBoard: school?.affiliationBoard || "",
    udiseCode: school?.udiseCode || "",
    address: school?.address || "",
    city: school?.city || "",
    state: school?.state || "",
    pincode: school?.pincode || "",
  });

  const [draftPrimaryColor, setDraftPrimaryColor] = useState<string>(school?.primaryColor || "#22d3ee");
  const [draftAccentColor, setDraftAccentColor] = useState<string>(school?.accentColor || "#0891b2");
  const [draftLogoPreview, setDraftLogoPreview] = useState<string | null>(school?.logoUrl || null);
  const [draftPreset, setDraftPreset] = useState<string>(currentPreset || "ocean-blue");

  const [draftTheme, setDraftTheme] = useState<Theme>((userPreferences?.theme as Theme) || currentTheme || "dark");
  const [draftDensity, setDraftDensity] = useState<Density>((userPreferences?.density as Density) || currentDensity || "comfortable");

  const parsedNotifs = user.notificationPreferences
    ? JSON.parse(user.notificationPreferences)
    : { attendance: true, assignments: true, messages: true, diary: true, feedback: true, leaves: true, announcements: true, transport: true, general: true };

  const [draftNotifs, setDraftNotifs] = useState<Record<string, boolean>>({
    attendance: parsedNotifs.attendance ?? true,
    assignments: parsedNotifs.assignments ?? true,
    messages: parsedNotifs.messages ?? true,
    diary: parsedNotifs.diary ?? true,
    feedback: parsedNotifs.feedback ?? true,
    leaves: parsedNotifs.leaves ?? true,
    announcements: parsedNotifs.announcements ?? true,
    transport: parsedNotifs.transport ?? true,
    general: parsedNotifs.general ?? true,
  });

  const [draftMonthlyFeedback, setDraftMonthlyFeedback] = useState<boolean>(school?.monthlyFeedbackOpen ?? false);
  const [draftTeacherFeedback, setDraftTeacherFeedback] = useState<boolean>(school?.teacherFeedbackOpen ?? false);
  const [draftSchoolSurvey, setDraftSchoolSurvey] = useState<boolean>(school?.schoolSurveyOpen ?? false);

  const [draftSecurity, setDraftSecurity] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setDraftProfile({
      name: user.name || "",
      email: user.email || "",
      phoneNumber: user.phoneNumber || "",
      designation: user.designation || "",
      bio: user.bio || "",
    });
  }, [user]);

  useEffect(() => {
    if (school) {
      setDraftSchool({
        name: school.name || "",
        principalName: school.principalName || "",
        establishedYear: school.establishedYear ? String(school.establishedYear) : "",
        website: school.website || "",
        email: school.email || "",
        phone: school.phone || "",
        motto: school.motto || "",
        registrationNumber: school.registrationNumber || "",
        affiliationBoard: school.affiliationBoard || "",
        udiseCode: school.udiseCode || "",
        address: school.address || "",
        city: school.city || "",
        state: school.state || "",
        pincode: school.pincode || "",
      });
      setDraftPrimaryColor(school.primaryColor || "#22d3ee");
      setDraftAccentColor(school.accentColor || "#0891b2");
      setDraftLogoPreview(school.logoUrl || null);
      setDraftMonthlyFeedback(school.monthlyFeedbackOpen ?? false);
      setDraftTeacherFeedback(school.teacherFeedbackOpen ?? false);
      setDraftSchoolSurvey(school.schoolSurveyOpen ?? false);
    }
  }, [school]);

  useEffect(() => {
    setAvatars(initialAvatars);
  }, [initialAvatars]);

  const profileFields = [
    draftProfile.name,
    draftProfile.email,
    draftProfile.bio,
    draftProfile.designation,
    draftProfile.phoneNumber,
    user.profileImageUrl,
  ];
  const completedFields = profileFields.filter(
    (field) => field && field.toString().trim() !== ""
  ).length;
  const profileCompletionPercent = Math.round((completedFields / profileFields.length) * 100);

  const initials = draftProfile.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleDiscard = () => {
    if (activeTab === "profile") {
      setDraftProfile({
        name: user.name || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        designation: user.designation || "",
        bio: user.bio || "",
      });
    } else if (activeTab === "school") {
      setDraftSchool({
        name: school?.name || "",
        principalName: school?.principalName || "",
        establishedYear: school?.establishedYear ? String(school.establishedYear) : "",
        website: school?.website || "",
        email: school?.email || "",
        phone: school?.phone || "",
        motto: school?.motto || "",
        registrationNumber: school?.registrationNumber || "",
        affiliationBoard: school?.affiliationBoard || "",
        udiseCode: school?.udiseCode || "",
        address: school?.address || "",
        city: school?.city || "",
        state: school?.state || "",
        pincode: school?.pincode || "",
      });
    } else if (activeTab === "branding") {
      setDraftPrimaryColor(school?.primaryColor || "#22d3ee");
      setDraftAccentColor(school?.accentColor || "#0891b2");
      setDraftLogoPreview(school?.logoUrl || null);
      setDraftPreset(currentPreset || "ocean-blue");
    } else if (activeTab === "appearance") {
      setDraftTheme((userPreferences?.theme as Theme) || currentTheme || "dark");
      setDraftDensity((userPreferences?.density as Density) || currentDensity || "comfortable");
    } else if (activeTab === "notifications") {
      setDraftNotifs({
        attendance: parsedNotifs.attendance ?? true,
        assignments: parsedNotifs.assignments ?? true,
        messages: parsedNotifs.messages ?? true,
        diary: parsedNotifs.diary ?? true,
        feedback: parsedNotifs.feedback ?? true,
        leaves: parsedNotifs.leaves ?? true,
        announcements: parsedNotifs.announcements ?? true,
        transport: parsedNotifs.transport ?? true,
        general: parsedNotifs.general ?? true,
      });
    } else if (activeTab === "surveys") {
      setDraftMonthlyFeedback(school?.monthlyFeedbackOpen ?? false);
      setDraftTeacherFeedback(school?.teacherFeedbackOpen ?? false);
      setDraftSchoolSurvey(school?.schoolSurveyOpen ?? false);
    } else if (activeTab === "security") {
      setDraftSecurity({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }

    setIsDirty(false);
    toast.info("Changes discarded.");
  };

  const executeSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveStatus("saving");

    try {
      if (activeTab === "profile") {
        if (!draftProfile.name.trim() || !draftProfile.email.trim()) {
          throw new Error("Full name and email address are required.");
        }
        await updateUserProfile(user.id, {
          name: draftProfile.name.trim(),
          email: draftProfile.email.trim(),
          bio: draftProfile.bio.trim() || null,
          designation: draftProfile.designation.trim() || null,
          phoneNumber: draftProfile.phoneNumber.trim() || null,
        });
        toast.success("Profile saved successfully!");
      } else if (activeTab === "school") {
        if (!school) throw new Error("No school record is associated with this profile.");
        if (!draftSchool.name.trim()) throw new Error("School name is required.");

        await updateSchoolProfile(school.id, {
          name: draftSchool.name.trim(),
          email: draftSchool.email.trim() || null,
          phone: draftSchool.phone.trim() || null,
          address: draftSchool.address.trim() || null,
          city: draftSchool.city.trim() || null,
          state: draftSchool.state.trim() || null,
          pincode: draftSchool.pincode.trim() || null,
          principalName: draftSchool.principalName.trim() || null,
          establishedYear: draftSchool.establishedYear ? parseInt(draftSchool.establishedYear, 10) : null,
          motto: draftSchool.motto.trim() || null,
          website: draftSchool.website.trim() || null,
          registrationNumber: draftSchool.registrationNumber.trim() || null,
          affiliationBoard: draftSchool.affiliationBoard.trim() || null,
          udiseCode: draftSchool.udiseCode.trim() || null,
        });
        toast.success("School configuration saved successfully!");
      } else if (activeTab === "branding") {
        if (!school) throw new Error("No school record associated.");
        await updateSchoolBranding(school.id, {
          primaryColor: draftPrimaryColor,
          accentColor: draftAccentColor,
          logoUrl: draftLogoPreview,
        });
        setColorPreset(draftPreset, true);
        toast.success("School branding saved successfully!");
      } else if (activeTab === "appearance") {
        await upsertUserPreferences(user.id, {
          theme: draftTheme,
          density: draftDensity,
        });
        await updateUserAppearancePreferences(user.id, {
          theme: draftTheme,
          density: draftDensity,
        });
        setTheme(draftTheme);
        setDensity(draftDensity);
        toast.success("Appearance settings saved successfully!");
      } else if (activeTab === "notifications") {
        const notifPayload = {
          attendance: Boolean(draftNotifs.attendance),
          assignments: Boolean(draftNotifs.assignments),
          messages: Boolean(draftNotifs.messages),
          diary: Boolean(draftNotifs.diary),
          feedback: Boolean(draftNotifs.feedback),
          leaves: Boolean(draftNotifs.leaves),
          announcements: Boolean(draftNotifs.announcements),
          transport: Boolean(draftNotifs.transport),
          general: Boolean(draftNotifs.general),
        };
        await updateUserNotificationPreferences(user.id, notifPayload);
        await saveNotificationPreferences(user.id, notifPayload);
        useNotificationStore.getState().setPreferences(notifPayload);
        toast.success("Notification preferences saved successfully!");
      } else if (activeTab === "surveys") {
        if (!school) throw new Error("No school record associated.");
        await updateSchoolFeedbackSettings(school.id, {
          monthlyFeedbackOpen: draftMonthlyFeedback,
          teacherFeedbackOpen: draftTeacherFeedback,
          schoolSurveyOpen: draftSchoolSurvey,
        });
        toast.success("Feedback & Survey settings saved successfully!");
      } else if (activeTab === "security") {
        if (!draftSecurity.currentPassword) {
          throw new Error("Current password is required.");
        }
        if (!draftSecurity.newPassword || draftSecurity.newPassword.length < 6) {
          throw new Error("New password must be at least 6 characters long.");
        }
        if (draftSecurity.confirmPassword && draftSecurity.newPassword !== draftSecurity.confirmPassword) {
          throw new Error("New password and confirm password do not match.");
        }

        await updateUserPassword(user.id, {
          currentPassword: draftSecurity.currentPassword,
          newPassword: draftSecurity.newPassword,
        });
        toast.success("Password updated successfully!");
        setDraftSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }

      setSaveStatus("saved");
      setIsDirty(false);
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (err: any) {
      setSaveStatus("idle");
      toast.error(err.message || "Failed to save settings. Please try again.");
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProfile(true);
    const data = new FormData();
    data.append("image", file);

    try {
      await uploadUserProfileImage(user.id, data);
      toast.success("Profile photo uploaded!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!school) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const data = new FormData();
    data.append("logo", file);

    try {
      const res = await uploadSchoolLogo(school.id, data);
      setDraftLogoPreview(res.logoUrl);
      setIsDirty(true);
      toast.success("School logo uploaded!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
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

  return (
    <div className="space-y-6 relative pb-28">
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
              <span className="text-xs text-emerald-400 font-medium">Saved to database ✓</span>
            )}
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Identity &amp; Settings
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Manage your credentials, branding configurations, layout preferences, and AI features.
          </p>
        </div>

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

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div className="hidden xl:block rounded-2xl border border-theme bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-theme bg-hover">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={draftProfile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-cyan-300 text-sm font-bold text-slate-950">
                    {initials || "AD"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-primary truncate">{draftProfile.name || user.name}</p>
                <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider mt-0.5">
                  {draftProfile.designation || "Administrator"}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex xl:flex-col overflow-x-auto scrollbar-hide rounded-2xl border border-theme bg-surface/50 p-2 shadow-sm gap-1">
            {[
              { id: "profile", label: "Profile", icon: "👤" },
              { id: "school", label: "School Identity", icon: "🏫" },
              { id: "branding", label: "Branding", icon: "🎨" },
              { id: "appearance", label: "Appearance", icon: "👁️" },
              { id: "notifications", label: "Notifications", icon: "🔔" },
              { id: "surveys", label: "Surveys & Feedback", icon: "📋" },
              { id: "security", label: "Security", icon: "🔒" },
              { id: "avatars", label: "AI Avatars", icon: "✨" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide uppercase transition duration-150 border border-transparent whitespace-nowrap ${
                    isActive
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-sm"
                      : "text-secondary hover:bg-hover hover:text-primary"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </span>
                  {isActive && <span className="hidden xl:inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 ml-2" />}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-h-[500px]">
          {activeTab === "profile" && (
            <form
              id="profile-form"
              onSubmit={executeSave}
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
                    Full Name *
                  </span>
                  <input
                    type="text"
                    required
                    value={draftProfile.name}
                    onChange={(e) => {
                      setDraftProfile({ ...draftProfile, name: e.target.value });
                      setIsDirty(true);
                    }}
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Email Address *
                  </span>
                  <input
                    type="email"
                    required
                    value={draftProfile.email}
                    onChange={(e) => {
                      setDraftProfile({ ...draftProfile, email: e.target.value });
                      setIsDirty(true);
                    }}
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Phone Number
                  </span>
                  <input
                    type="text"
                    value={draftProfile.phoneNumber}
                    placeholder="+1 (555) 000-0000"
                    onChange={(e) => {
                      setDraftProfile({ ...draftProfile, phoneNumber: e.target.value });
                      setIsDirty(true);
                    }}
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Designation / Role
                  </span>
                  <input
                    type="text"
                    value={draftProfile.designation}
                    placeholder="e.g. Principal, Admin Lead"
                    onChange={(e) => {
                      setDraftProfile({ ...draftProfile, designation: e.target.value });
                      setIsDirty(true);
                    }}
                    className="input-theme"
                  />
                </label>

                <label className="block md:col-span-2 space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                    Personal Bio
                  </span>
                  <textarea
                    rows={3}
                    value={draftProfile.bio}
                    placeholder="Tell us about your educational role..."
                    onChange={(e) => {
                      setDraftProfile({ ...draftProfile, bio: e.target.value });
                      setIsDirty(true);
                    }}
                    className="textarea-theme"
                  />
                </label>
              </div>
            </form>
          )}

          {activeTab === "school" && (
            <form
              id="school-form"
              onSubmit={executeSave}
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
                      School Name *
                    </span>
                    <input
                      type="text"
                      required
                      value={draftSchool.name}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, name: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Principal Name
                    </span>
                    <input
                      type="text"
                      value={draftSchool.principalName}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, principalName: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Established Year
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 1998"
                      value={draftSchool.establishedYear}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, establishedYear: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Official Website
                    </span>
                    <input
                      type="url"
                      placeholder="https://yourschool.edu"
                      value={draftSchool.website}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, website: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Contact Email
                    </span>
                    <input
                      type="email"
                      value={draftSchool.email}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, email: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Contact Phone
                    </span>
                    <input
                      type="text"
                      value={draftSchool.phone}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, phone: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block md:col-span-2 space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Motto / Vision
                    </span>
                    <input
                      type="text"
                      placeholder="Inspiring Excellence, Empowering Leaders"
                      value={draftSchool.motto}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, motto: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <div className="border-t border-subtle md:col-span-2 pt-4 mt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4">
                      Academic Affiliation &amp; Board Registrations
                    </h3>
                  </div>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Registration Number
                    </span>
                    <input
                      type="text"
                      value={draftSchool.registrationNumber}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, registrationNumber: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Affiliation Board
                    </span>
                    <input
                      type="text"
                      placeholder="CBSE, ICSE, IB, State Board"
                      value={draftSchool.affiliationBoard}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, affiliationBoard: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      UDISE Code
                    </span>
                    <input
                      type="text"
                      placeholder="11-digit school code"
                      value={draftSchool.udiseCode}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, udiseCode: e.target.value });
                        setIsDirty(true);
                      }}
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
                      value={draftSchool.address}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, address: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      City
                    </span>
                    <input
                      type="text"
                      value={draftSchool.city}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, city: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      State / Region
                    </span>
                    <input
                      type="text"
                      value={draftSchool.state}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, state: e.target.value });
                        setIsDirty(true);
                      }}
                      className="input-theme"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                      Pincode / Zip Code
                    </span>
                    <input
                      type="text"
                      value={draftSchool.pincode}
                      onChange={(e) => {
                        setDraftSchool({ ...draftSchool, pincode: e.target.value });
                        setIsDirty(true);
                      }}
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

          {activeTab === "branding" && (
            <form
              id="branding-form"
              onSubmit={executeSave}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Branding &amp; Identity System
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Customize themes, school logos, and dashboard primary branding colors.
                </p>
              </div>

              {school ? (
                <div className="grid gap-6">
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
                        {draftLogoPreview ? (
                          <img
                            src={draftLogoPreview}
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
                          Recommended: 256x256 size in PNG or WEBP format. Maximum 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs font-semibold uppercase tracking-wider text-secondary">
                        School Color Theme Preset
                      </span>
                      <p className="text-[11px] text-muted mt-0.5">
                        Choose a cohesive color system for your school's dashboard. Select and click Save Changes to apply.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                      {THEME_PRESETS.map((preset) => {
                        const isSelected = draftPreset === preset.id || (draftPrimaryColor === preset.primary && draftAccentColor === preset.secondary);
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setDraftPrimaryColor(preset.primary);
                              setDraftAccentColor(preset.secondary);
                              setDraftPreset(preset.id);
                              setIsDirty(true);
                            }}
                            className={`flex flex-col items-stretch rounded-xl border p-4 text-left transition-all ${
                              isSelected
                                ? "border-cyan-400 bg-cyan-400/5 ring-1 ring-cyan-400"
                                : "border-theme bg-hover/20 hover:bg-hover hover:border-secondary"
                            }`}
                          >
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

                            <div className="rounded-lg border border-theme bg-background p-2 space-y-1.5 overflow-hidden select-none pointer-events-none">
                              <div className="flex items-center justify-between border-b border-subtle pb-1">
                                <div className="h-1.5 w-8 rounded bg-muted/60" />
                                <div className="h-2.5 w-2.5 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                  <div className="h-1 w-1 rounded-full bg-cyan-400" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <div className="w-8 border-r border-subtle pr-1 flex flex-col gap-1">
                                  <div className="h-1.5 w-full rounded bg-cyan-500/15" />
                                  <div className="h-1 w-2/3 rounded bg-muted/40" />
                                </div>
                                <div className="flex-1 flex flex-col gap-1.5">
                                  <div className="h-2 w-8 rounded bg-muted/50" />
                                  <div className="mt-0.5 flex justify-end">
                                    <div className="rounded bg-cyan-400 px-1.5 py-0.5 text-[6px] font-bold text-slate-950 scale-90 origin-right">
                                      Save
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

          {activeTab === "appearance" && (
            <form
              id="appearance-form"
              onSubmit={executeSave}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Appearance Settings
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Adjust theme modes and layout densities. Saved changes persist across logins.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Theme Mode
                  </span>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftTheme("dark");
                        setIsDirty(true);
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        draftTheme === "dark"
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

                    <button
                      type="button"
                      onClick={() => {
                        setDraftTheme("light");
                        setIsDirty(true);
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        draftTheme === "light"
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

                    <button
                      type="button"
                      onClick={() => {
                        setDraftTheme("system");
                        setIsDirty(true);
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        draftTheme === "system"
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

                <div className="space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-secondary">
                    Information Density
                  </span>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftDensity("compact");
                        setIsDirty(true);
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        draftDensity === "compact"
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

                    <button
                      type="button"
                      onClick={() => {
                        setDraftDensity("comfortable");
                        setIsDirty(true);
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        draftDensity === "comfortable"
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

                    <button
                      type="button"
                      onClick={() => {
                        setDraftDensity("spacious");
                        setIsDirty(true);
                      }}
                      className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                        draftDensity === "spacious"
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
              </div>
            </form>
          )}

          {activeTab === "notifications" && (
            <form
              id="notifications-form"
              onSubmit={executeSave}
              className="rounded-2xl bg-background border border-border p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Notification Center Preferences
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Choose which notification categories appear in your Notification Center and trigger badges.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: "attendance", label: "Attendance Alerts", desc: "Get notified when student attendance updates" },
                  { name: "assignments", label: "Assignments", desc: "Get notified about new assignments and submissions" },
                  { name: "messages", label: "Messages", desc: "Get notified about new chat messages" },
                  { name: "diary", label: "Diary", desc: "Get notified about classroom diary updates" },
                  { name: "feedback", label: "Feedback", desc: "Get notified about observations and surveys feedback" },
                  { name: "leaves", label: "Leaves", desc: "Get notified about student leave requests or status changes" },
                  { name: "announcements", label: "Announcements", desc: "Get notified about school-wide announcements" },
                  { name: "transport", label: "Transport Alerts", desc: "Get notified about bus and location updates" },
                  { name: "general", label: "General Alerts", desc: "Get notified about other updates and system info" },
                ].map((item) => (
                  <label
                    key={item.name}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 text-xs font-medium text-foreground cursor-pointer hover:border-cyan-500/30 transition"
                  >
                    <div className="space-y-0.5">
                      <span className="block">{item.label}</span>
                      <span className="block text-[10px] text-secondary font-medium">
                        {item.desc}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      name={item.name}
                      checked={Boolean(draftNotifs[item.name])}
                      onChange={(e) => {
                        setDraftNotifs({ ...draftNotifs, [item.name]: e.target.checked });
                        setIsDirty(true);
                      }}
                      className="h-5 w-5 accent-cyan-400 cursor-pointer rounded border-theme"
                    />
                  </label>
                ))}
              </div>
            </form>
          )}

          {activeTab === "surveys" && (
            <form
              id="surveys-form"
              onSubmit={executeSave}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                  <span>📋</span> Surveys &amp; Feedback Control
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Open or close feedback windows for students and teachers. Changes take effect across all portals upon saving.
                </p>
              </div>

              <div className="space-y-4">
                <div className={`relative flex items-start gap-4 rounded-2xl border p-5 transition-all duration-200 ${draftMonthlyFeedback ? "border-violet-500/30 bg-violet-500/5" : "border-theme bg-hover/20"}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-lg">
                    🎓
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">Monthly Student Feedback</p>
                    <p className="text-xs text-secondary mt-0.5 leading-relaxed">
                      When enabled, students can submit a monthly satisfaction form in their portal under the Feedback section.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${draftMonthlyFeedback ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                        {draftMonthlyFeedback ? "● Open" : "○ Closed"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draftMonthlyFeedback}
                    onClick={() => {
                      setDraftMonthlyFeedback((v) => !v);
                      setIsDirty(true);
                    }}
                    className={`relative shrink-0 inline-flex h-7 w-12 items-center rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-400 ${draftMonthlyFeedback ? "bg-violet-500 border-violet-400" : "bg-hover border-subtle"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ${draftMonthlyFeedback ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>

                <div className={`relative flex items-start gap-4 rounded-2xl border p-5 transition-all duration-200 ${draftTeacherFeedback ? "border-cyan-500/30 bg-cyan-500/5" : "border-theme bg-hover/20"}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-lg">
                    👨‍🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">Teacher Feedback Round</p>
                    <p className="text-xs text-secondary mt-0.5 leading-relaxed">
                      Enables teachers to submit structured feedback on student performance, classroom observations, and resource needs.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${draftTeacherFeedback ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                        {draftTeacherFeedback ? "● Open" : "○ Closed"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draftTeacherFeedback}
                    onClick={() => {
                      setDraftTeacherFeedback((v) => !v);
                      setIsDirty(true);
                    }}
                    className={`relative shrink-0 inline-flex h-7 w-12 items-center rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${draftTeacherFeedback ? "bg-cyan-500 border-cyan-400" : "bg-hover border-subtle"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ${draftTeacherFeedback ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>

                <div className={`relative flex items-start gap-4 rounded-2xl border p-5 transition-all duration-200 ${draftSchoolSurvey ? "border-amber-500/30 bg-amber-500/5" : "border-theme bg-hover/20"}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-lg">
                    🏫
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">School-Wide Survey</p>
                    <p className="text-xs text-secondary mt-0.5 leading-relaxed">
                      Opens a comprehensive school climate survey that appears for all students and staff.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${draftSchoolSurvey ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}`}>
                        {draftSchoolSurvey ? "● Open" : "○ Closed"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draftSchoolSurvey}
                    onClick={() => {
                      setDraftSchoolSurvey((v) => !v);
                      setIsDirty(true);
                    }}
                    className={`relative shrink-0 inline-flex h-7 w-12 items-center rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 ${draftSchoolSurvey ? "bg-amber-500 border-amber-400" : "bg-hover border-subtle"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ${draftSchoolSurvey ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <form
              id="security-form"
              onSubmit={executeSave}
              className="rounded-2xl border border-theme bg-surface/60 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-subtle pb-4">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Account Credentials Security
                </h2>
                <p className="text-xs text-secondary mt-1">
                  Change administrator passwords and manage security keys.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Current Password *
                  </span>
                  <input
                    type="password"
                    required
                    value={draftSecurity.currentPassword}
                    onChange={(e) => {
                      setDraftSecurity({ ...draftSecurity, currentPassword: e.target.value });
                      setIsDirty(true);
                    }}
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    New Password *
                  </span>
                  <input
                    type="password"
                    required
                    value={draftSecurity.newPassword}
                    onChange={(e) => {
                      setDraftSecurity({ ...draftSecurity, newPassword: e.target.value });
                      setIsDirty(true);
                    }}
                    className="input-theme"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Confirm New Password
                  </span>
                  <input
                    type="password"
                    value={draftSecurity.confirmPassword}
                    onChange={(e) => {
                      setDraftSecurity({ ...draftSecurity, confirmPassword: e.target.value });
                      setIsDirty(true);
                    }}
                    className="input-theme"
                  />
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
      </div>

      {isDirty && (
        <div className="fixed bottom-6 left-4 right-4 md:left-[304px] z-40 bg-surface/95 backdrop-blur-md border border-cyan-400/30 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">Unsaved changes in this tab</p>
              <p className="text-[10px] text-secondary truncate">
                Click Save Changes to commit to the database.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isPending || saveStatus === "saving"}
              className="rounded-xl border border-theme bg-hover hover:bg-surface px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => executeSave()}
              disabled={isPending || saveStatus === "saving"}
              className="rounded-xl bg-cyan-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-cyan-400/10 hover:bg-cyan-300 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50"
            >
              {saveStatus === "saving" ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
