import { notFound } from 'next/navigation';
import DevResetForm from '@/components/dev/DevResetForm';

export default function DevResetPage() {
  // Restrict access to development mode only
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-[#09090b] text-zinc-100 p-6 relative overflow-hidden">
      {/* Dynamic background grid and gradient */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.12),rgba(0,0,0,0))]" />
      <div 
        className="absolute inset-0 z-0 opacity-[0.02]" 
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        {/* Logo/Branding */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            EduPredict
          </span>
          <span className="text-[9px] font-semibold tracking-wider uppercase bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">
            Dev Utility
          </span>
        </div>
        
        {/* Render the Form */}
        <DevResetForm />
      </div>
    </main>
  );
}
