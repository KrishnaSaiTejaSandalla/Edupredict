import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  StyleProp,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const getVariantStyles = (): { view: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          view: {
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
          },
          text: {
            color: theme.colors.textPrimary,
          },
        };
      case 'danger':
        return {
          view: {
            backgroundColor: theme.colors.danger,
          },
          text: {
            color: theme.colors.textInverse,
          },
        };
      case 'primary':
      default:
        return {
          view: {
            backgroundColor: theme.colors.primary,
          },
          text: {
            color: theme.colors.textInverse,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const isInteractionDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.button,
        { borderRadius: theme.radius.lg },
        variantStyles.view,
        isInteractionDisabled && styles.disabled,
        isInteractionDisabled && variant === 'primary' && { backgroundColor: theme.colors.textDisabled },
        style,
      ]}
      disabled={isInteractionDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? theme.colors.textPrimary : theme.colors.textInverse}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              fontFamily: theme.fonts.semiBold,
              fontSize: theme.fontSizes.base,
            },
            variantStyles.text,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});
