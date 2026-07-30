import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  lift?: number;
}

const AnimatedPressableRoot = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  style,
  lift = 3,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const theme = useTheme();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -pressed.value * lift },
      { scale: 1 - pressed.value * 0.018 },
    ],
    opacity: 1 - pressed.value * 0.05,
  }));

  return (
    <AnimatedPressableRoot
      {...props}
      android_ripple={{ color: theme.colors.primarySurface, borderless: false }}
      onPressIn={(event) => {
        pressed.value = withTiming(1, { duration: 120 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = withSpring(0, theme.spring.gentle);
        onPressOut?.(event);
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressableRoot>
  );
}
