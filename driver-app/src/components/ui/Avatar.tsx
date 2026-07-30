import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ImageStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { getMediaUrl } from '@/utils/media';

interface AvatarProps {
  url?: string;
  name?: string;
  size?: number;
  style?: ImageStyle;
}

export function Avatar({
  url,
  name = '',
  size = 48,
  style,
}: AvatarProps) {
  const theme = useTheme();
  const [hasError, setHasError] = useState(false);

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const renderFallback = () => {
    const initials = name ? getInitials(name) : '?';
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.primarySurface,
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.4,
              fontFamily: theme.fonts.semiBold,
              color: theme.colors.primary,
            },
          ]}
        >
          {initials}
        </Text>
      </View>
    );
  };

  const resolvedUrl = getMediaUrl(url);

  if (!resolvedUrl || hasError) {
    return renderFallback();
  }

  return (
    <Image
      source={{ uri: resolvedUrl }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surfaceElevated,
        },
        style,
      ]}
      onError={() => setHasError(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    textAlign: 'center',
  },
});
