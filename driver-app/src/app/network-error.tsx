import React from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ErrorState } from '@/components/common/ErrorState';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function NetworkErrorScreen() {
  const theme = useTheme();
  const router = useRouter();

  const handleRetry = () => {
    // Retry action: try navigating back or home
    router.replace('/');
  };

  return (
    <ScreenWrapper>
      <ErrorState
        title="Network Disconnected"
        message="Please check your internet connection or try again later."
        onRetry={handleRetry}
        icon={
          <Ionicons
            name="cloud-offline-outline"
            size={theme.iconSize['3xl']}
            color={theme.colors.danger}
          />
        }
        style={styles.errorState}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  errorState: {
    flex: 1,
  },
});
