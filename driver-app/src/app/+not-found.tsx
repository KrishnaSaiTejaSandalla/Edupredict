import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text
          style={[
            styles.title,
            {
              fontFamily: theme.fonts.bold,
              fontSize: theme.fontSizes['3xl'],
              color: theme.colors.textPrimary,
            },
          ]}
        >
          Page Not Found
        </Text>
        <Text
          style={[
            styles.description,
            {
              fontFamily: theme.fonts.regular,
              fontSize: theme.fontSizes.base,
              color: theme.colors.textSecondary,
            },
          ]}
        >
          This screen does not exist or has been moved.
        </Text>
        <Link href="/" style={[styles.link, { color: theme.colors.primary }]}>
          <Text
            style={{
              fontFamily: theme.fonts.semiBold,
              fontSize: theme.fontSizes.base,
            }}
          >
            Go back to home screen
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
