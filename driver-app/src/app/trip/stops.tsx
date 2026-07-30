import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function StopsScreen() {
  const params = useLocalSearchParams();
  const theme = useTheme();

  return (
    <ScreenWrapper>
      <Header title="Trip Stops Schedule" showBackButton={true} />
      <View style={styles.container}>
        <View style={[styles.iconWrapper, { backgroundColor: theme.colors.primarySurface }]}>
          <Ionicons name="list" size={48} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
          Route Stops Schedule
        </Text>
        <Text style={[styles.subtitle, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
          This interface is scheduled for subsequent development phase. Trip ID: {params.tripId ?? 'N/A'}
        </Text>
        <View style={styles.badgePlaceholder}>
          <Text style={[styles.badgeText, { fontFamily: theme.fonts.medium, color: theme.colors.primary }]}>
            Stops List Placeholder
          </Text>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  badgePlaceholder: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  badgeText: {
    fontSize: 13,
  },
});
