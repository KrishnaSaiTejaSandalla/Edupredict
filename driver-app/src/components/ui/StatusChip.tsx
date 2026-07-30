import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type StatusChipVariant = 'active' | 'inactive' | 'pending' | 'custom';

interface StatusChipProps {
  label: string;
  variant?: StatusChipVariant;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function StatusChip({
  label,
  variant = 'active',
  color,
  backgroundColor,
  style,
  textStyle,
}: StatusChipProps) {
  const theme = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'active':
        return {
          bg: theme.colors.successSurface,
          txt: theme.colors.success,
        };
      case 'inactive':
        return {
          bg: theme.colors.dangerSurface,
          txt: theme.colors.danger,
        };
      case 'pending':
        return {
          bg: theme.colors.warningSurface,
          txt: theme.colors.warning,
        };
      case 'custom':
      default:
        return {
          bg: backgroundColor ?? theme.colors.surfaceElevated,
          txt: color ?? theme.colors.textPrimary,
        };
    }
  };

  const { bg, txt } = getVariantStyles();

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: bg,
          borderRadius: theme.radius.full,
          borderColor: theme.colors.borderSubtle,
          borderWidth: 1,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: txt }]} />
      <Text
        style={[
          styles.text,
          {
            fontFamily: theme.fonts.medium,
            fontSize: theme.fontSizes.xs,
            color: theme.colors.textPrimary,
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    textTransform: 'capitalize',
  },
});
