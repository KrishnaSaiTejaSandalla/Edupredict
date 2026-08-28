import Image from "next/image";
import LoginForm from "@/components/auth/LoginForm";
import { Typewriter } from "@/components/ui/typewriter";
import logo from "@/branding/logo.png";
import { Sparkles, Brain, Activity, ShieldCheck, BarChart3 } from "lucide-react";
import PublicThemeToggle from "@/components/ui/PublicThemeToggle";

export default function LoginPage() {
  const typewriterTexts = [
    "Learn smarter. Predict better. Achieve more.",
    "One platform for smarter education.",
    "Your learning journey starts here.",
  ];

  const highlights = [
    {
      icon: Brain,
      title: "AI-Powered Predictions",
      desc: "Advanced machine learning algorithms for student performance forecasting",
    },
    {
      icon: Activity,
      title: "Real-Time Tracking",
      desc: "Instant live attendance tracking and smart bus location updates",
    },
    {
      icon: ShieldCheck,
      title: "Multi-Role Management",
      desc: "Seamlessly unified portals for Students, Teachers, Parents & Admins",
    },
    {
      icon: BarChart3,
      title: "Smart Analytics",
      desc: "Deep academic metrics, grade insights, and automated reports",
    },
  ];

  return (
    <main className="public-page login-page grid min-h-screen w-full lg:grid-cols-2">
      {/* Left side: Authentication Form */}
      <section className="login-panel-left flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16 xl:px-20 border-b lg:border-b-0 lg:border-r pub-border-line">
        {/* Top header branding */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 p-2 border border-cyan-500/30 shadow-sm">
              <Image
                src={logo}
                alt="EduPredict"
                width={32}
                height={32}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight pub-text-primary">
              Edu<span className="text-cyan-500 dark:text-cyan-400">Predict</span>
            </span>
          </div>
          <PublicThemeToggle />
        </div>

        {/* Main form container */}
        <div className="mx-auto w-full max-w-md my-auto py-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-medium pub-text-accent shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>EduPredict Platform Portal</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight pub-text-primary sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm pub-text-secondary">
            Sign in to continue to your EduPredict account.
          </p>

          <LoginForm />
        </div>

        {/* Footer info */}
        <div className="text-xs pub-text-muted text-center sm:text-left">
          &copy; {new Date().getFullYear()} EduPredict. Smart Education System.
        </div>
      </section>

      {/* Right side: Educational Visual & Showcase (Desktop only) */}
      <section className="login-panel-right relative hidden overflow-hidden px-10 py-12 lg:flex lg:flex-col lg:items-center lg:justify-between">
        {/* Glowing background gradients */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_40%_30%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_75%_75%,rgba(59,130,246,0.15),transparent_35%)]" />

        {/* Top visual pill */}
        <div className="relative z-10 w-full flex justify-end">
          <div className="flex items-center gap-2 rounded-full border pub-border-line pub-card px-4 py-1.5 text-xs pub-text-secondary backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span>System Status: Online</span>
          </div>
        </div>

        {/* Center showcase container */}
        <div className="relative z-10 my-auto w-full max-w-lg text-center">
          {/* Logo Card */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-cyan-500/30 pub-card p-4 shadow-xl backdrop-blur-xl transition-transform hover:scale-105">
            <Image
              src={logo}
              alt="EduPredict Logo"
              width={72}
              height={72}
              priority
              className="h-full w-full object-contain"
            />
          </div>

          <h2 className="mt-8 text-4xl font-extrabold tracking-tight pub-text-primary">
            EduPredict
          </h2>

          {/* Typewriter Rotator */}
          <div className="mt-4 min-h-[3.5rem] flex items-center justify-center px-4">
            <p className="text-xl font-medium pub-text-accent">
              <Typewriter
                text={typewriterTexts}
                speed={50}
                delay={2000}
                deleteSpeed={30}
                loop={true}
              />
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group rounded-2xl border pub-card p-4 backdrop-blur-md transition hover:border-cyan-500/40 shadow-sm"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 pub-text-accent border border-cyan-500/20 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold pub-text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs pub-text-muted line-clamp-2">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom decorative bar */}
        <div className="relative z-10 w-full text-center text-xs pub-text-muted">
          Trusted by Next-Generation Educational Institutions
        </div>
      </section>
    </main>
  );
}

