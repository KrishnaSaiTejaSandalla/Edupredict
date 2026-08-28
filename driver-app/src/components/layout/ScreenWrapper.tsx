import React from 'react';
import { View, StyleSheet, SafeAreaView, ViewStyle, StatusBar } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  safe?: boolean;
}

export function ScreenWrapper({ children, style, safe = true }: ScreenWrapperProps) {
  const theme = useTheme();

  const content = (
    <View style={[styles.inner, { backgroundColor: theme.colors.background }, style]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      {children}
    </View>
  );

  if (safe) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {content}
      </SafeAreaView>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
});
