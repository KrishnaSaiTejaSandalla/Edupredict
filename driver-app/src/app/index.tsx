import React from 'react';
import { Redirect } from 'expo-router';
import { FullScreenLoader } from '@/components/common/FullScreenLoader';
import { useAuth } from '@/hooks/useAuth';

export default function IndexRoute() {
  const { isAuthenticated, status } = useAuth();

  if (status === 'authenticated' || isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (status === 'unauthenticated' || status === 'error') {
    return <Redirect href="/(auth)/login" />;
  }

  return <FullScreenLoader message="Checking Session..." />;
}
