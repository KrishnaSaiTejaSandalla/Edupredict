import React from 'react';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function HistoryScreen() {
  const theme = useTheme();

  return (
    <ScreenWrapper>
      <Header title="Trip History" />
      <EmptyState
        title="No Logs Available"
        description="Your completed trips and attendance history sheets will appear here."
        icon={
          <Ionicons
            name="time-outline"
            size={theme.iconSize['3xl']}
            color={theme.colors.textTertiary}
          />
        }
      />
    </ScreenWrapper>
  );
}
