import './globals.css';
import { Toaster } from "sonner";
import Providers from '@/components/ui/Providers';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'EduPredict',
  description: 'AI-powered school management for modern schools',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialTheme = cookieStore.get('ep-theme')?.value || 'dark';
  const initialDensity = cookieStore.get('ep-density')?.value || 'comfortable';
  const initialPreset = cookieStore.get('ep-color-preset')?.value || 'ocean-blue';

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      data-density={initialDensity}
      data-color-preset={initialPreset}
      className={initialTheme === 'dark' ? 'dark' : ''}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = document.cookie.match(/ep-theme=([^;]+)/)?.[1];
                  if (!theme || theme === 'system') {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  var density = document.cookie.match(/ep-density=([^;]+)/)?.[1];
                  if (density) {
                    document.documentElement.setAttribute('data-density', density);
                  }
                  var preset = document.cookie.match(/ep-color-preset=([^;]+)/)?.[1];
                  if (preset) {
                    document.documentElement.setAttribute('data-color-preset', preset);
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <Providers initialTheme={initialTheme} initialDensity={initialDensity} initialPreset={initialPreset}>
          {children}
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

