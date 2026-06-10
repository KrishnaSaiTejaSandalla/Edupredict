"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import logo from "@/branding/logo.png";
import { updateUserProfile, updateUserPassword, updateSchoolProfile } from "@/lib/settings-actions";

const tabs = ["Profile", "School", "Notifications", "Security", "Appearance"];

function Field({
  label,
  defaultValue,
  type = "text",
  name,
  required,
}: {
  label: string;
  defaultValue?: string;
  type?: string;
  name?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020]/60 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10"
      />
    </label>
  );
}

interface UserProps {
  id: number;
  name: string;
  email: string;
  schoolId: number | null;
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
}

export default function SettingsClient({
  user,
  school,
}: {
  user: UserProps;
  school: SchoolProps | null;
}) {
  const [activeTab, setActiveTab] = useState("profile");

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSaveDefault = () => {
    toast.success("Settings saved successfully!");
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    try {
      await updateUserProfile(user.id, { name, email });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const handleSchoolSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const schoolId = user.schoolId || 1;
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const address = formData.get("address") as string;

    try {
      await updateSchoolProfile(schoolId, {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: school?.city || null,
        state: school?.state || null,
        pincode: school?.pincode || null,
        principalName: school?.principalName || null,
      });
      toast.success("School profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update school profile");
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;

    try {
      await updateUserPassword(user.id, { currentPassword, newPassword });
      toast.success("Password updated successfully!");
      e.currentTarget.reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Settings</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Admin Settings</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Manage your personal profile, school information, system credentials, notifications, and styling.
          </p>
        </div>
        <button
          type={["profile", "school", "security"].includes(activeTab) ? "submit" : "button"}
          form={["profile", "school", "security"].includes(activeTab) ? `${activeTab}-form` : undefined}
          onClick={!["profile", "school", "security"].includes(activeTab) ? handleSaveDefault : undefined}
          className="rounded-xl bg-cyan-400 px-5 py-3 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-400/10 hover:bg-cyan-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          Save Changes
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid gap-8 xl:grid-cols-[280px_1fr]">
        
        {/* Navigation Sidebar */}
        <aside className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/20 self-start">
          <div className="rounded-xl border border-white/5 bg-[#0b1020]/60 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-sm font-bold text-slate-950 shadow-inner">
                {initials || "AD"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Administrator</p>
              </div>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {tabs.map((tab) => {
              const tabId = tab.toLowerCase();
              const isActive = activeTab === tabId;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tabId)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold tracking-wide uppercase transition duration-200 ${
                    isActive
                      ? "bg-cyan-400/10 text-white border border-cyan-400/20 shadow-md"
                      : "text-slate-400 hover:bg-white/[0.03] hover:text-white border border-transparent"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full transition ${isActive ? "bg-cyan-400 scale-125" : "bg-slate-600"}`} />
                  {tab}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Pane */}
        <div className="min-h-[400px]">
          {activeTab === "profile" && (
            <form
              id="profile-form"
              onSubmit={handleProfileSubmit}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex flex-col gap-5 border-b border-white/5 pb-6 sm:flex-row sm:items-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white p-2.5 shadow-md">
                  <Image src={logo} alt="EduPredict logo" width={48} height={48} className="h-full w-full object-contain" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight">{user.name}</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{user.email}</p>
                  <span className="mt-2.5 inline-flex rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 uppercase tracking-wider border border-cyan-400/10">
                    Active System Root
                  </span>
                </div>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="Full Name" name="name" defaultValue={user.name} required />
                <Field label="Email Address" name="email" defaultValue={user.email} type="email" required />
              </div>
            </form>
          )}

          {activeTab === "school" && (
            <form
              id="school-form"
              onSubmit={handleSchoolSubmit}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="mb-6 border-b border-white/5 pb-4">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">School Configuration</h2>
                <p className="text-xs text-slate-500 mt-1">General settings for the overall campus ERP identity.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="School Name" name="name" defaultValue={school?.name || "EduPredict Academy"} required />
                <Field label="School Logo Path" defaultValue="/branding/logo.png" />
                <Field label="Contact Email Address" name="email" defaultValue={school?.email || "admin@edupredict.ac"} type="email" />
                <Field label="Phone Number" name="phone" defaultValue={school?.phone || "+1 (555) 100-2000"} />
                <div className="md:col-span-2">
                  <Field label="Campus Address Line" name="address" defaultValue={school?.address || "Main Campus, Education District Road"} />
                </div>
              </div>
            </form>
          )}

          {activeTab === "notifications" && (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-6 border-b border-white/5 pb-4">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Notification Preferences</h2>
                <p className="text-xs text-slate-500 mt-1">Configure when and how you receive status updates.</p>
              </div>
              <div className="grid gap-3.5 md:grid-cols-2">
                {['Email notifications', 'In-app notifications', 'Attendance alerts', 'Exam reminders'].map((label) => (
                  <label key={label} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0b1020]/40 px-4 py-4 text-xs font-semibold text-slate-300 hover:bg-white/[0.03] transition cursor-pointer">
                    <span>{label}</span>
                    <input type="checkbox" defaultChecked className="h-4.5 w-4.5 accent-cyan-400 cursor-pointer rounded border-white/10" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <form
              id="security-form"
              onSubmit={handleSecuritySubmit}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="mb-6 border-b border-white/5 pb-4">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Account Security</h2>
                <p className="text-xs text-slate-500 mt-1">Update passwords and secure credentials access.</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Current Password" name="currentPassword" type="password" required />
                <Field label="New Password" name="newPassword" type="password" required />
              </div>
              <div className="mt-5 rounded-xl border border-white/5 bg-[#0b1020]/40 p-4 text-xs text-slate-400 font-medium leading-relaxed">
                ℹ Session validation and API access tokens are controlled and enforced at the server firewall level.
              </div>
            </form>
          )}

          {activeTab === "appearance" && (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-6 border-b border-white/5 pb-4">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Appearance Settings</h2>
                <p className="text-xs text-slate-500 mt-1">Customize visual layouts and scale settings.</p>
              </div>
              <div className="grid gap-3.5 md:grid-cols-3">
                {['Dark Theme (Recommended)', 'Compact Rows', 'Comfortable Padding'].map((label, index) => (
                  <label key={label} className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-4 text-xs font-semibold text-slate-300 hover:bg-white/[0.03] transition cursor-pointer flex items-center gap-2">
                    <input type="radio" name="appearance" defaultChecked={index === 0} className="accent-cyan-400 cursor-pointer h-4 w-4" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
