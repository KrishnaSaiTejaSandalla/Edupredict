import './globals.css';
import { Toaster } from "sonner";
import Providers from '@/components/ui/Providers';

export const metadata = {
  title: 'EduPredict',
  description: 'AI-powered school management for modern schools',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
