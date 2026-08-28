import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface InlineLoaderProps {
  message?: string;
  style?: ViewStyle;
}

export function InlineLoader({ message, style }: InlineLoaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      {message && (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  message: {
    marginLeft: 8,
  },
});
