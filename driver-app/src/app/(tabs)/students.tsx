import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useTheme } from '@/hooks/useTheme';
import { useTripStore, BoardingState } from '@/store/trip.store';
import { useToast } from '@/hooks/useToast';

import { useTranslation } from '@/i18n/i18n-context';

// Enable LayoutAnimation for Android if needed
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DisplayStudent {
  id: string;
  name: string;
  initials: string;
  className: string;
  stopName: string;
  status: BoardingState;
  parentName: string;
  parentPhone: string;
  pickupTime: string;
  dropTime: string;
  avatarBg: string;
}

export default function StudentsScreen() {
  const theme = useTheme();
  const toast = useToast();
  const router = useRouter();
  const { t } = useTranslation();

  const stops = useTripStore((state) => state.stops);
  const selectedDirection = useTripStore((state) => state.selectedDirection);
  const updateStudentStatus = useTripStore((state) => state.updateStudentStatus);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const isMorning = selectedDirection === 'morning';
  const isDark = theme.isDark;

  // Build roster list from Zustand store stops or fallback demo list
  const rosterStudents: DisplayStudent[] = useMemo(() => {
    const colors = ['#8B5CF6', '#0FAF6C', '#F2994A', '#3E6BFF', '#E11D48', '#0284C7'];
    let count = 0;

    const extracted = (stops || []).flatMap((stop) =>
      (stop.students || []).map((s) => {
        const names = s.name.split(' ');
        const initials =
          names.length > 1
            ? `${names[0][0]}${names[1][0]}`.toUpperCase()
            : s.name.slice(0, 2).toUpperCase();
        const avatarBg = colors[count++ % colors.length];

        return {
          id: s.id,
          name: s.name,
          initials,
          className: s.className ? (s.className.startsWith('Class') ? s.className : `Class ${s.className}`) : 'Class 10',
          stopName: stop.name,
          status: s.status || 'qr_pending',
          parentName: s.parentName || 'Parent / Guardian',
          parentPhone: s.parentPhone || '+91 98765 43210',
          pickupTime: s.pickupTime || stop.eta || '08:15 AM',
          dropTime: s.dropTime || stop.dropTime || '04:30 PM',
          avatarBg,
        };
      })
    );

    if (extracted.length > 0) return extracted;

    // Fallback demonstration students preserving design reference
    return [
      {
        id: 'st-1',
        name: 'Chanakya',
        initials: 'CH',
        className: 'Class 10',
        stopName: 'Atal B',
        status: 'qr_pending',
        parentName: 'Srinivasa Rao',
        parentPhone: '+91 98765 43210',
        pickupTime: '08:10 AM',
        dropTime: '04:20 PM',
        avatarBg: '#8B5CF6',
      },
      {
        id: 'st-2',
        name: 'Riya Sharma',
        initials: 'RS',
        className: 'Class 8',
        stopName: 'Azad Bhawan A',
        status: 'qr_pending',
        parentName: 'Vikram Sharma',
        parentPhone: '+91 98765 43211',
        pickupTime: '08:15 AM',
        dropTime: '04:25 PM',
        avatarBg: '#0FAF6C',
      },
      {
        id: 'st-3',
        name: 'Aarav Khanna',
        initials: 'AK',
        className: 'Class 9',
        stopName: 'Subhash C. Bose',
        status: 'absent',
        parentName: 'Rajesh Khanna',
        parentPhone: '+91 98765 43212',
        pickupTime: '08:20 AM',
        dropTime: '04:30 PM',
        avatarBg: '#F2994A',
      },
      {
        id: 'st-4',
        name: 'Meera Patil',
        initials: 'MP',
        className: 'Class 7',
        stopName: 'Atal B',
        status: 'boarded',
        parentName: 'Sunil Patil',
        parentPhone: '+91 98765 43213',
        pickupTime: '08:10 AM',
        dropTime: '04:20 PM',
        avatarBg: '#3E6BFF',
      },
    ];
  }, [stops]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return rosterStudents;
    const q = searchQuery.toLowerCase();
    return rosterStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.stopName.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [rosterStudents, searchQuery]);

  // Metric counts
  const presentOrBoardedCount = rosterStudents.filter(
    (s) => s.status === 'boarded' || s.status === 'present'
  ).length;
  const droppedCount = rosterStudents.filter((s) => s.status === 'dropped').length;
  const absentCount = rosterStudents.filter((s) => s.status === 'absent').length;
  const pendingCount = rosterStudents.filter(
    (s) => s.status === 'qr_pending' || (!isMorning && s.status === 'boarded')
  ).length;
  const totalStops = stops.length || 3;

  const toggleExpand = (studentId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedStudentId((prev) => (prev === studentId ? null : studentId));
  };

  const handleCallParent = (phone: string, parentName: string) => {
    if (!phone) {
      toast.error('Parent contact number is missing');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      toast.error(`Unable to dial ${parentName}`);
    });
  };

  const handleStatusOverride = async (studentId: string, newStatus: BoardingState, studentName: string) => {
    try {
      await updateStudentStatus(studentId, newStatus);
      const labelMap: Record<string, string> = {
        boarded: 'marked Present',
        present: 'marked Present',
        absent: isMorning ? 'marked Absent' : 'marked Not Dropped',
        dropped: 'marked Dropped',
      };
      toast.success(`${studentName} ${labelMap[newStatus] || 'updated'}`);
    } catch (err) {
      toast.error('Failed to update student attendance');
    }
  };

  // Render Status Chip with theme-driven color palette
  const renderStatusChip = (status: BoardingState) => {
    let chipBg = isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFF8E1';
    let chipText = isDark ? '#FBBF24' : '#F57F17';
    let label = t('status_pending');
    let dotColor = isDark ? '#FBBF24' : '#F57F17';

    if (isMorning) {
      if (status === 'boarded' || status === 'present') {
        chipBg = isDark ? 'rgba(52, 211, 153, 0.15)' : '#E8F5E9';
        chipText = isDark ? '#34D399' : '#2E7D32';
        label = t('status_present');
        dotColor = isDark ? '#34D399' : '#2E7D32';
      } else if (status === 'absent') {
        chipBg = isDark ? 'rgba(248, 113, 113, 0.15)' : '#FFEBEE';
        chipText = isDark ? '#F87171' : '#C62828';
        label = t('status_absent');
        dotColor = isDark ? '#F87171' : '#C62828';
      } else {
        chipBg = isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFF8E1';
        chipText = isDark ? '#FBBF24' : '#F57F17';
        label = t('status_pending');
        dotColor = isDark ? '#FBBF24' : '#F57F17';
      }
    } else {
      // Evening Route
      if (status === 'dropped') {
        chipBg = isDark ? 'rgba(52, 211, 153, 0.15)' : '#E8F5E9';
        chipText = isDark ? '#34D399' : '#2E7D32';
        label = t('status_dropped');
        dotColor = isDark ? '#34D399' : '#2E7D32';
      } else if (status === 'boarded' || status === 'present') {
        chipBg = isDark ? 'rgba(249, 115, 22, 0.15)' : '#FFF3E0';
        chipText = isDark ? '#FB923C' : '#E65100';
        label = t('status_in_bus');
        dotColor = isDark ? '#FB923C' : '#E65100';
      } else {
        chipBg = isDark ? 'rgba(248, 113, 113, 0.15)' : '#FFEBEE';
        chipText = isDark ? '#F87171' : '#C62828';
        label = t('status_not_dropped');
        dotColor = isDark ? '#F87171' : '#C62828';
      }
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: chipBg }]}>
        <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
        <Text style={[styles.badgeText, { color: chipText, fontFamily: theme.fonts.bold }]}>
          {label}
        </Text>
      </View>
    );
  };

  return (
    <ScreenWrapper safe style={{ backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER & ROUTE BADGE */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
              {t('attendance_center')}
            </Text>
            <View
              style={[
                styles.routeDirectionBadge,
                {
                  backgroundColor: isDark
                    ? isMorning ? 'rgba(99, 102, 241, 0.2)' : 'rgba(249, 115, 22, 0.2)'
                    : isMorning ? '#EEF2FF' : '#FFF7ED',
                },
              ]}
            >
              <Ionicons
                name={isMorning ? 'sunny' : 'moon'}
                size={13}
                color={isMorning ? (isDark ? '#A5B4FC' : '#4F46E5') : (isDark ? '#FB923C' : '#EA580C')}
              />
              <Text
                style={[
                  styles.routeDirectionText,
                  {
                    color: isMorning ? (isDark ? '#A5B4FC' : '#4F46E5') : (isDark ? '#FB923C' : '#EA580C'),
                    fontFamily: theme.fonts.bold,
                  },
                ]}
              >
                {isMorning ? t('morning_route') : t('evening_route')}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => setShowSearch(!showSearch)}
            style={[styles.searchIconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Ionicons name="search-outline" size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        {/* SEARCH BAR */}
        {showSearch && (
          <View style={[styles.searchBarWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search student, class, or stop..."
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.searchInput, { color: theme.colors.textPrimary, fontFamily: theme.fonts.medium }]}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>
        )}

        {/* METRIC SUMMARY CARDS */}
        <View style={styles.metricsRow}>
          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : '#F0FDF4',
                borderColor: isDark ? 'rgba(52, 211, 153, 0.25)' : '#BBF7D0',
              },
            ]}
          >
            <Text style={[styles.metricNumber, { color: isDark ? '#34D399' : '#166534', fontFamily: theme.fonts.mono }]}>
              {isMorning ? `${presentOrBoardedCount}/${rosterStudents.length}` : `${droppedCount}/${rosterStudents.length}`}
            </Text>
            <Text style={[styles.metricLabel, { color: isDark ? '#34D399' : '#15803D', fontFamily: theme.fonts.bold }]}>
              {isMorning ? 'PRESENT' : 'DROPPED'}
            </Text>
          </View>

          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: isDark ? 'rgba(251, 191, 36, 0.12)' : '#FFFBEB',
                borderColor: isDark ? 'rgba(251, 191, 36, 0.25)' : '#FDE68A',
              },
            ]}
          >
            <Text style={[styles.metricNumber, { color: isDark ? '#FBBF24' : '#92400E', fontFamily: theme.fonts.mono }]}>
              {isMorning ? pendingCount : absentCount}
            </Text>
            <Text style={[styles.metricLabel, { color: isDark ? '#FBBF24' : '#B45309', fontFamily: theme.fonts.bold }]}>
              {isMorning ? 'PENDING' : 'NOT DROPPED'}
            </Text>
          </View>

          <View
            style={[
              styles.metricCard,
              {
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#EFF6FF',
                borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#BFDBFE',
              },
            ]}
          >
            <Text style={[styles.metricNumber, { color: isDark ? '#38BDF8' : '#1E40AF', fontFamily: theme.fonts.mono }]}>
              {totalStops}
            </Text>
            <Text style={[styles.metricLabel, { color: isDark ? '#38BDF8' : '#1D4ED8', fontFamily: theme.fonts.bold }]}>
              STOPS
            </Text>
          </View>
        </View>

        {/* STUDENT ROSTER LIST */}
        <View style={styles.rosterList}>
          {filteredStudents.map((item) => {
            const isExpanded = expandedStudentId === item.id;

            return (
              <View
                key={item.id}
                style={[
                  styles.studentCard,
                  {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: isExpanded ? theme.colors.primary : theme.colors.cardBorder,
                    shadowColor: theme.colors.cardShadow,
                  },
                ]}
              >
                {/* UNEXPANDED CARD HEADER */}
                <Pressable
                  onPress={() => toggleExpand(item.id)}
                  style={styles.cardHeaderPressable}
                >
                  <View style={[styles.avatarCircle, { backgroundColor: item.avatarBg }]}>
                    <Text style={styles.avatarInitials}>{item.initials}</Text>
                  </View>

                  <View style={styles.studentInfo}>
                    <Text
                      numberOfLines={1}
                      style={[styles.studentName, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.studentSub, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}
                    >
                      {item.className} · {item.stopName}
                    </Text>
                  </View>

                  <View style={styles.statusAndChevron}>
                    {renderStatusChip(item.status)}
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.textTertiary}
                    />
                  </View>
                </Pressable>

                {/* EXPANDED OPERATIONAL INFORMATION & CONTROLS */}
                {isExpanded && (
                  <View style={styles.expandedContainer}>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

                    {/* OPERATIONAL INFORMATION GRID (NO MEDICAL NOTES) */}
                    <View style={styles.infoGrid}>
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.bold }]}>
                          ASSIGNED STOP
                        </Text>
                        <Text style={[styles.infoValue, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
                          {item.stopName}
                        </Text>
                      </View>

                      <View style={styles.infoRowDouble}>
                        <View style={styles.infoCol}>
                          <Text style={[styles.infoLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.bold }]}>
                            PARENT / GUARDIAN
                          </Text>
                          <Text style={[styles.infoValue, { color: theme.colors.textPrimary, fontFamily: theme.fonts.medium }]}>
                            {item.parentName}
                          </Text>
                        </View>

                        <View style={styles.infoCol}>
                          <Text style={[styles.infoLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.bold }]}>
                            PHONE NUMBER
                          </Text>
                          <Text style={[styles.infoValue, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
                            {item.parentPhone}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRowDouble}>
                        <View style={styles.infoCol}>
                          <Text style={[styles.infoLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.bold }]}>
                            PICKUP TIME
                          </Text>
                          <Text style={[styles.infoValue, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
                            {item.pickupTime}
                          </Text>
                        </View>

                        <View style={styles.infoCol}>
                          <Text style={[styles.infoLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.bold }]}>
                            DROP TIME
                          </Text>
                          <Text style={[styles.infoValue, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
                            {item.dropTime}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* ACTION CONTROLS & MANUAL ATTENDANCE OVERRIDE */}
                    <View style={styles.actionsWrap}>
                      {/* CALL PARENT BUTTON */}
                      <Pressable
                        onPress={() => handleCallParent(item.parentPhone, item.parentName)}
                        style={({ pressed }) => [
                          styles.callParentBtn,
                          {
                            backgroundColor: isDark ? '#1B2340' : '#F3F4F6',
                            borderColor: theme.colors.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Ionicons name="call-outline" size={16} color={theme.colors.textPrimary} />
                        <Text style={[styles.callParentBtnText, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
                          Call Parent
                        </Text>
                      </Pressable>

                      {/* MANUAL ATTENDANCE OVERRIDE BUTTONS */}
                      <View style={styles.manualControlsRow}>
                        {isMorning ? (
                          <>
                            {/* MORNING ROUTE: SCAN vs ABSENT */}
                            <Pressable
                              onPress={() => router.push('/trip/scan-qr' as any)}
                              style={[
                                styles.overrideBtn,
                                (item.status === 'boarded' || item.status === 'present')
                                  ? styles.activePresentBtn
                                  : { backgroundColor: '#38BDF8', borderColor: '#0284C7' },
                              ]}
                            >
                              <Ionicons
                                name="qr-code-outline"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text
                                style={[
                                  styles.overrideBtnText,
                                  {
                                    color: '#FFFFFF',
                                    fontFamily: theme.fonts.bold,
                                  },
                                ]}
                              >
                                SCAN
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleStatusOverride(item.id, 'absent', item.name)}
                              style={[
                                styles.overrideBtn,
                                item.status === 'absent'
                                  ? styles.activeAbsentBtn
                                  : [styles.inactiveOverrideBtn, { backgroundColor: isDark ? '#1B2340' : '#F9FAFB', borderColor: theme.colors.border }],
                              ]}
                            >
                              <Ionicons
                                name="close-circle"
                                size={16}
                                color={item.status === 'absent' ? '#FFFFFF' : (isDark ? '#F87171' : '#991B1B')}
                              />
                              <Text
                                style={[
                                  styles.overrideBtnText,
                                  {
                                    color: item.status === 'absent' ? '#FFFFFF' : (isDark ? '#F87171' : '#991B1B'),
                                    fontFamily: theme.fonts.bold,
                                  },
                                ]}
                              >
                                ABSENT
                              </Text>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            {/* EVENING ROUTE: DROPPED vs NOT DROPPED */}
                            <Pressable
                              onPress={() => handleStatusOverride(item.id, 'dropped', item.name)}
                              style={[
                                styles.overrideBtn,
                                item.status === 'dropped'
                                  ? styles.activeDroppedBtn
                                  : [styles.inactiveOverrideBtn, { backgroundColor: isDark ? '#1B2340' : '#F9FAFB', borderColor: theme.colors.border }],
                              ]}
                            >
                              <Ionicons
                                name="checkmark-done-circle"
                                size={16}
                                color={item.status === 'dropped' ? '#FFFFFF' : (isDark ? '#34D399' : '#166534')}
                              />
                              <Text
                                style={[
                                  styles.overrideBtnText,
                                  {
                                    color: item.status === 'dropped' ? '#FFFFFF' : (isDark ? '#34D399' : '#166534'),
                                    fontFamily: theme.fonts.bold,
                                  },
                                ]}
                              >
                                Dropped
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleStatusOverride(item.id, 'absent', item.name)}
                              style={[
                                styles.overrideBtn,
                                (item.status === 'absent' || item.status === 'qr_pending')
                                  ? styles.activeNotDroppedBtn
                                  : [styles.inactiveOverrideBtn, { backgroundColor: isDark ? '#1B2340' : '#F9FAFB', borderColor: theme.colors.border }],
                              ]}
                            >
                              <Ionicons
                                name="alert-circle"
                                size={16}
                                color={(item.status === 'absent' || item.status === 'qr_pending') ? '#FFFFFF' : (isDark ? '#F87171' : '#991B1B')}
                              />
                              <Text
                                style={[
                                  styles.overrideBtnText,
                                  {
                                    color: (item.status === 'absent' || item.status === 'qr_pending') ? '#FFFFFF' : (isDark ? '#F87171' : '#991B1B'),
                                    fontFamily: theme.fonts.bold,
                                  },
                                ]}
                              >
                                Not Dropped
                              </Text>
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 28,
  },
  routeDirectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  routeDirectionText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  searchIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    gap: 2,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  rosterList: {
    gap: 12,
    marginTop: 4,
  },
  studentCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  cardHeaderPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: 15,
  },
  studentSub: {
    fontSize: 12,
  },
  statusAndChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
  },
  expandedContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  infoGrid: {
    gap: 10,
  },
  infoRow: {
    gap: 2,
  },
  infoRowDouble: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
  },
  actionsWrap: {
    gap: 10,
    marginTop: 4,
  },
  callParentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    width: '100%',
  },
  callParentBtnText: {
    fontSize: 14,
  },
  manualControlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  overrideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  inactiveOverrideBtn: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  activePresentBtn: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  activeAbsentBtn: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  activeDroppedBtn: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  activeNotDroppedBtn: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  overrideBtnText: {
    fontSize: 13,
  },
});
