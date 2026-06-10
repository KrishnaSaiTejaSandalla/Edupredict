import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl shadow-slate-950/30">
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">EduPredict</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              AI-powered school management with a production-ready foundation.
            </h1>
            <p className="mt-4 max-w-2xl text-slate-400">
              Built with Next.js App Router, TypeScript, Tailwind CSS, Better Auth, Drizzle ORM, MySQL, Zustand, and Recharts.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button>Launch App</Button>
            <Button variant="secondary">View Docs</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
