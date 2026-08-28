import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({
  label,
  variant = 'primary',
  style,
  textStyle,
}: BadgeProps) {
  const theme = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bg: theme.colors.successSurface,
          text: theme.colors.success,
        };
      case 'warning':
        return {
          bg: theme.colors.warningSurface,
          text: theme.colors.warning,
        };
      case 'danger':
        return {
          bg: theme.colors.dangerSurface,
          text: theme.colors.danger,
        };
      case 'info':
        return {
          bg: theme.colors.primarySurface,
          text: theme.colors.primary,
        };
      case 'neutral':
        return {
          bg: theme.colors.border,
          text: theme.colors.textSecondary,
        };
      case 'primary':
      default:
        return {
          bg: theme.colors.primarySurface,
          text: theme.colors.primary,
        };
    }
  };

  const { bg, text } = getVariantStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderRadius: theme.radius.xs,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontFamily: theme.fonts.medium,
            fontSize: theme.fontSizes.xs,
            color: text,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    textTransform: 'uppercase',
  },
});
