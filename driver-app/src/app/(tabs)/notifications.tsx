import React, { useEffect, useState } from 'react';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/common/EmptyState';
import { useTheme } from '@/hooks/useTheme';
import { getNotificationsApi } from '@/api/trips';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlatList, View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';

function formatNotificationTime(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    if (diff < dayMs && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 2 * dayMs && new Date(now.getTime() - dayMs).getDate() === d.getDate()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (err) {
    return '--';
  }
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await getNotificationsApi();
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  return (
    <ScreenWrapper safe style={{ backgroundColor: theme.colors.background }}>
      <Header title="Alerts & Dispatch" />
      
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No Alerts Today"
          description="Your dispatch timeline is completely clean."
          icon={
            <Ionicons
              name="notifications-off-outline"
              size={theme.iconSize['3xl']}
              color={theme.colors.textTertiary}
            />
          }
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isAnnouncement = item.type === 'announcement';
            // We can mock unread status or check unread flag if available
            const isUnread = !item.isRead; 

            return (
              <Pressable style={({ pressed }) => [
                styles.notifItem,
                { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.9 : 1
                }
              ]}>
                
                {/* Profile style Category Circle */}
                <View style={[
                  styles.categoryCircle, 
                  { backgroundColor: isAnnouncement ? theme.colors.primarySurface : theme.colors.accentSurface }
                ]}>
                  <Ionicons
                    name={isAnnouncement ? 'megaphone-outline' : 'shield-outline'}
                    size={20}
                    color={isAnnouncement ? theme.colors.primary : theme.colors.accent}
                  />
                </View>

                {/* Text Content */}
                <View style={styles.contentWrap}>
                  <View style={styles.headerRow}>
                    <Text 
                      numberOfLines={1} 
                      style={[
                        styles.notifTitle, 
                        { 
                          color: theme.colors.textPrimary, 
                          fontFamily: isUnread ? theme.fonts.bold : theme.fonts.semiBold 
                        }
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.timeText, { color: theme.colors.textTertiary, fontFamily: theme.fonts.regular }]}>
                      {formatNotificationTime(item.createdAt)}
                    </Text>
                  </View>

                  <Text 
                    numberOfLines={2} 
                    style={[
                      styles.bodyText, 
                      { 
                        color: theme.colors.textSecondary, 
                        fontFamily: theme.fonts.regular 
                      }
                    ]}
                  >
                    {item.message}
                  </Text>
                </View>

                {/* WhatsApp Style Unread Badge */}
                {isUnread && (
                  <View style={styles.unreadColumn}>
                    <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
                  </View>
                )}

              </Pressable>
            );
          }}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 10,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 12,
  },
  categoryCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    flex: 1,
    gap: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 14,
    flex: 1,
    marginRight: 6,
  },
  timeText: {
    fontSize: 11,
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  unreadColumn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
