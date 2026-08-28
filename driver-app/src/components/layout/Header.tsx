import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export function Header({
  title,
  showBackButton = false,
  rightAction,
  style,
}: HeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                // Only reached on web direct URL entry with no stack history
                router.replace('/(tabs)/home' as any);
              }
            }}
            style={[
              styles.backButton,
              {
                width: theme.touchTarget,
                height: theme.touchTarget,
              },
            ]}
          >
            <Ionicons
              name="arrow-back-outline"
              size={theme.iconSize.lg}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titleContainer}>
        <Text
          numberOfLines={1}
          style={[
            styles.title,
            {
              fontFamily: theme.fonts.bold,
              fontSize: theme.fontSizes.lg,
              color: theme.colors.textPrimary,
            },
          ]}
        >
          {title}
        </Text>
      </View>

      <View style={styles.rightContainer}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  leftContainer: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  rightContainer: {
    width: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
