import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';
import logo from '@/branding/logo.png';

export default function LoginPage() {
  const features = [
    'AI-powered academic predictions',
    'Real-time attendance tracking',
    'Multi-role management system',
    'Smart performance analytics',
  ];

  return (
    <main className="grid min-h-screen bg-[#070b16] text-white lg:grid-cols-2">
      <section className="relative hidden overflow-hidden border-r border-white/10 bg-[#0b1020] px-10 py-12 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(59,130,246,0.22),transparent_28%),radial-gradient(circle_at_70%_70%,rgba(34,211,238,0.12),transparent_24%)]" />
        <div className="relative z-10 w-full max-w-xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-3 shadow-2xl shadow-blue-500/30">
            <Image src={logo} alt="EduPredict" width={64} height={64} priority className="h-full w-full object-contain" />
          </div>
          <h1 className="mt-8 text-5xl font-bold tracking-tight">EduPredict</h1>
          <p className="mt-4 text-xl text-slate-400">AI-Powered School Management System</p>
          <div className="mx-auto mt-12 max-w-md space-y-4 text-left">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-slate-300 shadow-xl shadow-black/10">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                    <path d="m9 16.2-3.5-3.5L4 14.2 9 19l11-11-1.5-1.5L9 16.2Z" />
                  </svg>
                </span>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-10 lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-2">
              <Image src={logo} alt="EduPredict" width={44} height={44} priority className="h-full w-full object-contain" />
            </div>
          </div>
          <h2 className="text-4xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-slate-400">Sign in to your EduPredict account</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
