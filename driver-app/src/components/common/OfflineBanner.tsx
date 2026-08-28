import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, SafeAreaView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

export function OfflineBanner() {
  const theme = useTheme();
  // Standard placeholder - defaults to online (false). Future milestones can replace with a real connection listener.
  const [isOffline] = useState(false);
  const heightVal = useSharedValue(0);

  useEffect(() => {
    heightVal.value = withTiming(isOffline ? 48 : 0, { duration: theme.duration.normal });
  }, [isOffline]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: heightVal.value,
      opacity: heightVal.value === 0 ? 0 : 1,
    };
  });


  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: theme.colors.danger },
        animatedStyle,
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <Text
          style={[
            styles.text,
            {
              fontFamily: theme.fonts.semiBold,
              fontSize: theme.fontSizes.xs,
              color: theme.colors.textInverse,
            },
          ]}
        >
          You are currently offline. Check connection.
        </Text>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  safeArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});
