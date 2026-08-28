import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, Scale, ShieldCheck } from "lucide-react";
import logo from "@/branding/logo.png";
import PublicThemeToggle from "@/components/ui/PublicThemeToggle";

type InfoPageType = "privacy" | "terms" | "status";

const pageContent = {
  privacy: {
    icon: ShieldCheck,
    eyebrow: "Privacy Policy",
    title: "Your school data deserves care.",
    intro: "This policy explains how EduPredict handles the information needed to provide its school-management experience.",
    sections: [
      ["Information used", "EduPredict processes account, academic, attendance, communication, and settings information only to operate the platform and its authorised school workflows."],
      ["How it is protected", "Access is role-based and limited to the functions available to each authorised user. We work to minimise unnecessary access to personal and academic information."],
      ["Your responsibility", "Schools and authorised users are responsible for ensuring the information they enter is accurate and for using the platform in accordance with their local privacy obligations."],
    ],
  },
  terms: {
    icon: Scale,
    eyebrow: "Terms of Service",
    title: "Simple terms for a smarter school platform.",
    intro: "By using EduPredict, you agree to use the platform responsibly and only for lawful, authorised educational purposes.",
    sections: [
      ["Authorised use", "Use EduPredict only through your assigned account and role. Do not attempt to access another person’s account, data, or school information."],
      ["Account security", "Keep your credentials private and notify your school administrator promptly if you believe your account has been used without permission."],
      ["Project ownership", "EduPredict was independently designed and built by its creator, who retains all rights, title, and interest in the project, its design, code, branding, and original content."],
    ],
  },
  status: {
    icon: Clock3,
    eyebrow: "System Status",
    title: "Keeping EduPredict moving.",
    intro: "This page provides a clear place for service availability and maintenance updates.",
    sections: [
      ["Current status", "No planned maintenance is currently listed. If an issue is identified, updates should be shared here by the project maintainer."],
      ["Service components", "The web application, account access, school portals, and learning tools are designed to operate together; availability can depend on the deployment, database, and connected services."],
      ["Need help?", "For access or platform questions, contact the project creator directly at krishnasaitejasandalla@gmail.com."],
    ],
  },
} as const;

export default function PublicInfoPage({ type }: { type: InfoPageType }) {
  const content = pageContent[type];
  const Icon = content.icon;

  return (
    <main className="public-page public-info-page min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-cyan-100 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 p-2 shadow-sm shadow-cyan-200/60">
              <Image src={logo} alt="EduPredict" width={30} height={30} priority className="h-full w-full object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight">Edu<span className="text-cyan-500">Predict</span></span>
          </Link>
          <PublicThemeToggle />
        </div>
      </header>

      <section className="relative overflow-hidden px-5 py-16 sm:px-8 sm:py-24">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_80%_20%,rgba(52,211,153,0.14),transparent_38%)]" />
        <div className="relative mx-auto max-w-4xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-cyan-700">
            <ArrowLeft className="h-4 w-4" /> Back to EduPredict
          </Link>

          <div className="mt-10 rounded-[2rem] border border-cyan-100 bg-white/90 p-7 shadow-[0_24px_70px_-35px_rgba(8,145,178,0.38)] sm:p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-400/25">
              <Icon className="h-6 w-6" />
            </div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">{content.eyebrow}</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">{content.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{content.intro}</p>

            <div className="mt-10 grid gap-4">
              {content.sections.map(([heading, body]) => (
                <article key={heading} className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-cyan-50/50 p-5 sm:p-6">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <div>
                      <h2 className="font-bold text-slate-900">{heading}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-2 border-t border-slate-200 pt-6 text-xs text-slate-500">
              <FileText className="h-4 w-4 text-cyan-600" />
              EduPredict is an independently built project. All rights reserved by the project creator.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
