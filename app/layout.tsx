import './globals.css';
import { Toaster } from "sonner";
import Providers from '@/components/ui/Providers';
import { cookies, headers } from 'next/headers';

export const metadata = {
  title: 'EduPredict',
  description: 'AI-powered school management for modern schools',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const reqHeaders = await headers();
  const pathname = reqHeaders.get('x-pathname') || '';

  let role = '';
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) role = 'admin';
  else if (pathname.startsWith('/teacher') || pathname.startsWith('/api/teacher')) role = 'teacher';
  else if (pathname.startsWith('/parent') || pathname.startsWith('/api/parent')) role = 'parent';
  else if (pathname.startsWith('/student') || pathname.startsWith('/api/student')) role = 'student';

  const suffix = role ? `_${role}` : '';
  const isPublicPage = !role;
  const publicThemeCookie = cookieStore.get('ep-public-theme')?.value || 'light';
  const initialTheme = isPublicPage ? publicThemeCookie : (cookieStore.get(`ep-theme${suffix}`)?.value || 'dark');
  const initialDensity = cookieStore.get(`ep-density${suffix}`)?.value || 'comfortable';
  const initialPreset = cookieStore.get(`ep-color-preset${suffix}`)?.value || 'ocean-blue';

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      data-public-theme={isPublicPage ? initialTheme : undefined}
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
                  var path = window.location.pathname;
                  var suffix = '';
                  if (path.indexOf('/admin') === 0) suffix = '_admin';
                  else if (path.indexOf('/teacher') === 0) suffix = '_teacher';
                  else if (path.indexOf('/parent') === 0) suffix = '_parent';
                  else if (path.indexOf('/student') === 0) suffix = '_student';

                  var publicTheme = localStorage.getItem('ep-public-theme') === 'dark' ? 'dark' : 'light';
                  document.documentElement.setAttribute('data-public-theme', publicTheme);
                  if (!suffix) {
                    document.documentElement.setAttribute('data-theme', publicTheme);
                    if (publicTheme === 'dark') {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  } else {
                    var theme = document.cookie.match(new RegExp('ep-theme' + suffix + '=([^;]+)'))?.[1];
                    if (!theme || theme === 'system') {
                      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    }
                    document.documentElement.setAttribute('data-theme', theme);
                    if (theme === 'dark') {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                  var density = document.cookie.match(new RegExp('ep-density' + suffix + '=([^;]+)'))?.[1];
                  if (density) {
                    document.documentElement.setAttribute('data-density', density);
                  }
                  var preset = document.cookie.match(new RegExp('ep-color-preset' + suffix + '=([^;]+)'))?.[1];
                  if (preset) {
                    document.documentElement.setAttribute('data-color-preset', preset);
                  }
                  // Prevent accidental browser page zoom (Ctrl/Cmd + wheel, Ctrl/Cmd + Plus/Minus/0)
                  window.addEventListener('wheel', function(e) {
                    if (e.ctrlKey || e.metaKey) {
                      e.preventDefault();
                    }
                  }, { passive: false });
                  document.addEventListener('keydown', function(e) {
                    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0' || e.keyCode === 187 || e.keyCode === 189 || e.keyCode === 48 || e.keyCode === 107 || e.keyCode === 109)) {
                      e.preventDefault();
                    }
                  });
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
