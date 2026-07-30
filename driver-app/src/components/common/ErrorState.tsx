import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '../ui/Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Something Went Wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  icon,
  style,
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.title,
          {
            fontFamily: theme.fonts.bold,
            fontSize: theme.fontSizes.xl,
            color: theme.colors.textPrimary,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.message,
          {
            fontFamily: theme.fonts.regular,
            fontSize: theme.fontSizes.sm,
            color: theme.colors.textSecondary,
          },
        ]}
      >
        {message}
      </Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    maxWidth: 160,
  },
});
