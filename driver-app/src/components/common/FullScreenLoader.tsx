import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface FullScreenLoaderProps {
  message?: string;
}

export function FullScreenLoader({ message }: FullScreenLoaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message && (
        <Text
          style={[
            styles.message,
            {
              fontFamily: theme.fonts.medium,
              fontSize: theme.fontSizes.sm,
              color: theme.colors.textSecondary,
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
  },
});
