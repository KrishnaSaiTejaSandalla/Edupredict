"use client";
import React from 'react';
import ThemeProvider from './ThemeProvider';

interface ProvidersProps {
  children: React.ReactNode;
  initialTheme?: string;
  initialDensity?: string;
}

export default function Providers({ children, initialTheme, initialDensity }: ProvidersProps) {
  return (
    <ThemeProvider
      initialTheme={(initialTheme as any) ?? 'dark'}
      initialDensity={(initialDensity as any) ?? 'comfortable'}
    >
      {children}
    </ThemeProvider>
  );
}
