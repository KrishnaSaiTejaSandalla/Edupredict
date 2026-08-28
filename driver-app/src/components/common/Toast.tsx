import React, { useEffect } from 'react';
import { StyleSheet, Text, SafeAreaView, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useToast } from '@/hooks/useToast';
import { useTheme } from '@/hooks/useTheme';

export function Toast() {
  const { visible, message, type, duration, hide } = useToast();
  const theme = useTheme();
  const translateY = useSharedValue(-100);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(40, theme.spring.gentle);
      const timer = setTimeout(() => {
        dismissToast();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      translateY.value = withTiming(-100, { duration: theme.duration.fast });
    }
  }, [visible, message]);

  const dismissToast = () => {
    translateY.value = withTiming(-100, { duration: theme.duration.fast }, (finished) => {
      if (finished) {
        runOnJS(hide)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.danger;
      case 'info':
      default:
        return theme.colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: getBackgroundColor(),
          borderRadius: theme.radius.md,
          ...theme.elevation.md,
        },
        animatedStyle,
      ]}
    >
      <Pressable onPress={dismissToast} style={styles.container}>
        <Text
          style={[
            styles.text,
            {
              fontFamily: theme.fonts.medium,
              fontSize: theme.fontSizes.sm,
              color: theme.colors.textInverse,
            },
          ]}
        >
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    minHeight: 48,
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    textAlign: 'center',
  },
});
