import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { ThemeProvider } from '@/lib/theme-context';
import { useAuth } from '@/hooks/useAuth';
import { registerUnauthorizedHandler } from '@/lib/auth-events';
import { Toast } from '@/components/common/Toast';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { FullScreenLoader } from '@/components/common/FullScreenLoader';

import { usePermissionStore } from '@/store/permission.store';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, status, restoreSession, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    usePermissionStore.getState().loadPermissions();
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      void logout().finally(() => {
        router.replace('/(auth)/login');
      });
    });
  }, [logout, router]);

  useEffect(() => {
    if (status === 'idle') {
      restoreSession();
    }
  }, [restoreSession, status]);

  useEffect(() => {
    if (status === 'idle' || status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, segments, status]);

  if (status === 'idle' || (status === 'loading' && !isAuthenticated)) {
    return <FullScreenLoader message="Checking Session..." />;
  }

  return <>{children}</>;
}

import { I18nProvider } from '@/i18n/i18n-context';

export default function RootLayout() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
              <NavigationGuard>
                <OfflineBanner />
                <Toast />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="settings" options={{ headerShown: false }} />
                  <Stack.Screen name="students" options={{ headerShown: false }} />
                  <Stack.Screen name="vehicle" options={{ headerShown: false }} />
                  <Stack.Screen name="trip/live-trip" options={{ headerShown: false }} />
                  <Stack.Screen name="trip/scan-qr" options={{ headerShown: false }} />
                  <Stack.Screen name="trip/stops" options={{ headerShown: false }} />
                  <Stack.Screen name="network-error" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
                </Stack>
              </NavigationGuard>
            </QueryClientProvider>
          </GestureHandlerRootView>
        </ErrorBoundary>
      </ThemeProvider>
    </I18nProvider>
  );
}
