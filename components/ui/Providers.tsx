"use client";
import React from 'react';
import ThemeProvider from './ThemeProvider';
import OfflineExperience from '@/components/shared/OfflineExperience';

interface ProvidersProps {
  children: React.ReactNode;
  initialTheme?: string;
  initialDensity?: string;
  initialPreset?: string;
}

export default function Providers({ children, initialTheme, initialDensity, initialPreset }: ProvidersProps) {
  return (
    <ThemeProvider
      initialTheme={(initialTheme as any) ?? 'dark'}
      initialDensity={(initialDensity as any) ?? 'comfortable'}
      initialPreset={initialPreset ?? 'ocean-blue'}
    >
      {children}
      <OfflineExperience />
    </ThemeProvider>
  );
}
