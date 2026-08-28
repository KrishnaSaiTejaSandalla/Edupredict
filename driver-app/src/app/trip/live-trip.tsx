import React, { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { LocationService } from '@/services/location.service';
import { useLocationStore } from '@/store/location.store';
import { BoardingState, TripStop, TripStudent, useTripStore } from '@/store/trip.store';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import * as Location from 'expo-location';
import { usePermissionStore } from '@/store/permission.store';
import { useTranslation } from '@/i18n/i18n-context';
import { RouteModeSwitch } from '@/components/trip/RouteModeSwitch';
import { VehicleAlertsModal } from '@/components/trip/VehicleAlertsModal';
import { CallParentModal } from '@/components/trip/CallParentModal';
import { TripSummaryModal } from '@/components/trip/TripSummaryModal';
import { post } from '@/api/client';

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const secs = seconds % 60;

  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function LiveTripScreen() {
  const theme = useTheme();
  const isDark = theme.isDark;
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const toast = useToast();
  const { t } = useTranslation();
  const locationGranted = usePermissionStore((s) => s.locationGranted);
  const backgroundSyncGranted = usePermissionStore((s) => s.backgroundSyncGranted);
  const setLocationGranted = usePermissionStore((s) => s.setLocationGranted);

  const handleRequestLocation = async () => {
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(res.granted);
      if (res.granted) {
        toast.success('Location permission granted.');
      } else {
        toast.error('Location permission is required for bus tracking.');
      }
    } catch {
      toast.error('Could not request location permission.');
    }
  };

  const {
    tripStatus,
    routeName,
    stops,
    currentStopIndex,
    completedStopIds,
    elapsedSeconds,
    hasArrivedAtCurrent,
    selectedDirection,
    tripSession,
    markArrived,
    nextStop: advanceNextStop,
    boardStudent,
    markAbsent,
    tick,
    getSummary,
    completeTrip,
    initStore,
    loadTripDetails,
    startTrip,
    setDirection,
  } = useTripStore();

  const { currentLocation, tripDistance } = useLocationStore();

  const isMorning = selectedDirection === 'morning';

  // Component states
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // Bottom sheet height animation
  const sheetHeight = useSharedValue(230);

  useEffect(() => {
    sheetHeight.value = withSpring(isBottomSheetExpanded ? height * 0.65 : 230, theme.spring.gentle);
  }, [isBottomSheetExpanded, height, theme.spring.gentle]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  // Pulsing bus aura animation
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      true
    );
  }, [pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // On mount initialize
  useEffect(() => {
    const run = async () => {
      await initStore();
      const currentStore = useTripStore.getState();
      if (currentStore.stops.length === 0 || currentStore.rawStops.length === 0) {
        await loadTripDetails();
      }
      setShowSkeleton(false);
    };
    void run();
  }, [initStore, loadTripDetails]);

  useEffect(() => {
    const timer = setInterval(() => tick(), 1000);
    return () => clearInterval(timer);
  }, [tick]);

  const currentStop: TripStop | undefined = stops[currentStopIndex] ?? stops[0];
  const nextTargetStop: TripStop | undefined = stops[currentStopIndex + 1];

  const students = currentStop?.students ?? [];
  const doneStatus = isMorning ? 'boarded' : 'dropped';
  const studentsPicked = stops.flatMap((stop) => stop.students).filter((s) => s.status === doneStatus).length;
  const totalStudents = stops.reduce((sum, stop) => sum + stop.students.length, 0);

  const isFinalStop = currentStopIndex >= stops.length - 1;
  const allStudentsProcessed = stops.flatMap((s) => s.students).every((s) => s.status !== 'qr_pending');
  const showEndTrip = isFinalStop && hasArrivedAtCurrent && allStudentsProcessed;

  // Map Region & Coordinates
  const busCoordinates = currentLocation
    ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
    : { latitude: currentStop?.latitude || 22.2940, longitude: currentStop?.longitude || 73.3600 };

  const mapRegion: Region = {
    ...busCoordinates,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const polylineCoordinates = useMemo(() => {
    const points = stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
    if (currentLocation) {
      return [{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }, ...points];
    }
    return points;
  }, [stops, currentLocation]);

  // Handle Trip Start
  const handleStartTripClick = async () => {
    if (!locationGranted) {
      toast.info('Location permission required to start trip.');
      const res = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(res.granted);
      if (!res.granted) {
        toast.error('Location permission is required for bus tracking.');
        return;
      }
    }
    await startTrip();
    void LocationService.startTripTracking().catch((error) => {
      console.warn('[location/start]', error);
    });
    toast.success('Trip Started! Route GPS Tracking Active.');
  };

  // Handle Stop Workflows
  const handleArrived = () => {
    markArrived();
    setIsBottomSheetExpanded(true); // Automatically expand verification sheet
    toast.success(`Arrived at ${currentStop?.name || 'Stop'}. Verify students below.`);
  };

  const handleNextStop = () => {
    advanceNextStop();
    setIsBottomSheetExpanded(false);
    toast.info(`Moving towards ${stops[currentStopIndex + 1]?.name || 'next stop'}.`);
  };

  const handleEndTripConfirm = async () => {
    await completeTrip();
    await LocationService.stopTripTracking();
    setShowSummaryModal(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home' as any);
    }
  };

  const handleBoardStudent = async (studentId: string) => {
    if (isMorning) {
      router.push('/trip/scan-qr' as any);
    } else {
      await boardStudent(studentId);
      toast.success('Student dropped off safely!');
    }
  };

  const handleAbsentStudent = async (studentId: string) => {
    await markAbsent(studentId);
    toast.info('Student marked as Absent.');
  };

  const handleEmergencyCall = async () => {
    void Linking.openURL('tel:9876543210');
    try {
      await post('/mobile/driver/alerts', {
        alertType: 'emergency',
        message: 'Emergency button pressed on live route',
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
      });
      toast.error('Emergency alert broadcast to School Admins!');
    } catch {
      toast.error('Emergency call initiated.');
    }
  };

  const handleAlertSelect = async (issue: string) => {
    try {
      await post('/mobile/driver/alerts', {
        alertType: 'vehicle_issue',
        message: issue,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
      });
      toast.error(`Alert Sent to Admin: ${issue}`);
    } catch {
      toast.error(`Vehicle Alert: ${issue}`);
    }
  };

  const isTripRunning = tripStatus === 'in_progress' || tripStatus === 'paused';

  return (
    <ScreenWrapper safe style={{ backgroundColor: isDark ? '#0B1020' : '#F2F5FC' }}>
      {showSkeleton ? (
        <View style={styles.skeletonContainer}>
          <SkeletonLoader height={height * 0.5} borderRadius={24} style={{ width: '100%' }} />
          <SkeletonLoader height={200} borderRadius={24} style={{ width: '100%', marginTop: 20 }} />
        </View>
      ) : (
        <View style={styles.container}>
          {/* ==================== 1. FULL-SCREEN MAP OR PERMISSION CARD ==================== */}
          {!locationGranted ? (
            <View style={[styles.locationDisabledCard, { backgroundColor: isDark ? '#141B2D' : '#FFFFFF' }]}>
              <View style={[styles.disabledIconBox, { backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2' }]}>
                <Ionicons name="location-outline" size={40} color={isDark ? '#F87171' : '#DC2626'} />
              </View>
              <Text style={[styles.disabledTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
                Location Permission Disabled
              </Text>
              <Text style={[styles.disabledSub, { color: theme.colors.textSecondary, fontFamily: theme.fonts.regular }]}>
                Live tracking map and GPS update features require location access during your route.
              </Text>
              <Pressable style={[styles.grantBtn, { backgroundColor: isDark ? '#38BDF8' : theme.colors.primary }]} onPress={handleRequestLocation}>
                <Text style={[styles.grantBtnText, { fontFamily: theme.fonts.bold, color: '#FFFFFF' }]}>
                  Grant Location Permission
                </Text>
              </Pressable>
            </View>
          ) : (
            <MapView style={StyleSheet.absoluteFill} initialRegion={mapRegion} userInterfaceStyle={isDark ? 'dark' : 'light'}>
              {polylineCoordinates.length > 1 && (
                <Polyline
                  coordinates={polylineCoordinates}
                  strokeColor={isDark ? '#6B8CFF' : '#3E6BFF'}
                  strokeWidth={5}
                />
              )}

              {/* Route Stops */}
              {stops.map((stop, index) => {
                const isCurrent = index === currentStopIndex;
                const isCompleted = completedStopIds.includes(stop.id);

                return (
                  <Marker key={stop.id} coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}>
                    <View
                      style={[
                        styles.stopMarker,
                        {
                          backgroundColor: isCurrent ? '#3E6BFF' : isCompleted ? '#10B981' : isDark ? '#1B2340' : '#FFFFFF',
                          borderColor: isCurrent ? '#FFFFFF' : '#3E6BFF',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stopMarkerText,
                          { color: isCurrent || isCompleted ? '#FFFFFF' : '#3E6BFF', fontFamily: theme.fonts.bold },
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                  </Marker>
                );
              })}

              {/* Animated Vehicle / Bus Marker */}
              <Marker coordinate={busCoordinates}>
                <View style={styles.busMarkerWrap}>
                  <Animated.View style={[styles.busPulseAura, pulseStyle]} />
                  <View style={styles.busIconCircle}>
                    <Ionicons name="bus" size={20} color="#FFFFFF" />
                  </View>
                </View>
              </Marker>
            </MapView>
          )}

          {/* ==================== 2. TOP FLOATING HEADER ==================== */}
          <View style={styles.topHeaderOverlay}>
            <Pressable
              style={[
                styles.backBtn,
                {
                  backgroundColor: isDark ? 'rgba(21, 26, 51, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/home' as any);
                }
              }}
            >
              <Ionicons name="arrow-back" size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
            </Pressable>

            {/* Morning / Evening Switch */}
            <View
              style={[
                styles.modeSwitchWrap,
                {
                  backgroundColor: isDark ? 'rgba(21, 26, 51, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <Text style={[styles.modeLabel, { color: isDark ? '#FFFFFF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                {isMorning ? 'MORNING' : 'EVENING'}
              </Text>
              <RouteModeSwitch isEveningMode={!isMorning} onToggle={(val) => setDirection(val ? 'evening' : 'morning')} />
            </View>
          </View>

          {/* ==================== 3. FLOATING STATUS BADGE ==================== */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.statusBadgeOverlay}>
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: isDark ? 'rgba(21, 26, 51, 0.9)' : 'rgba(255, 255, 255, 0.92)',
                  borderColor: isDark ? 'rgba(107, 140, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)',
                },
              ]}
            >
              <View style={styles.statusBadgeHeader}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: !isTripRunning
                        ? isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7'
                        : hasArrivedAtCurrent
                          ? isDark ? 'rgba(52, 211, 153, 0.2)' : '#ECFDF5'
                          : isDark ? 'rgba(107, 140, 255, 0.2)' : '#EEF2FF',
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.statusDot,
                      { backgroundColor: !isTripRunning ? '#F59E0B' : hasArrivedAtCurrent ? '#34D399' : '#6B8CFF' },
                      pulseStyle,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color: !isTripRunning ? '#F59E0B' : hasArrivedAtCurrent ? '#34D399' : '#6B8CFF',
                        fontFamily: theme.fonts.bold,
                      },
                    ]}
                  >
                    {!isTripRunning
                      ? 'TRIP NOT STARTED'
                      : hasArrivedAtCurrent
                        ? `${t('trip_current_stop')} • ${t('trip_arrived')}`
                        : t('trip_moving_to_next')}
                  </Text>
                </View>
                <Text style={[styles.timerText, { color: isDark ? '#8E98B8' : '#64748B', fontFamily: theme.fonts.mono }]}>
                  ⏱ {formatDuration(elapsedSeconds)}
                </Text>
              </View>

              <Text style={[styles.currentStopTitle, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                {currentStop?.name ?? t('not_available')}
              </Text>

              <View style={styles.statusMetaRow}>
                {nextTargetStop && (
                  <Text style={[styles.nextStopSub, { color: isDark ? '#8E98B8' : '#64748B', fontFamily: theme.fonts.medium }]}>
                    Next stop → <Text style={{ color: isDark ? '#F5F7FF' : '#0F172A', fontWeight: '700' }}>{nextTargetStop.name}</Text>
                  </Text>
                )}
                <Text style={[styles.etaSub, { color: '#34D399', fontFamily: theme.fonts.mono }]}>
                  ETA {currentStop?.eta ?? '--'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ==================== 4. BOTTOM SHEET ENGINE ==================== */}
          <Animated.View
            style={[
              styles.bottomSheet,
              animatedSheetStyle,
              {
                backgroundColor: isDark ? '#141B2D' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
              },
            ]}
          >
            {/* Sheet Handle */}
            <Pressable style={styles.sheetHandleWrap} onPress={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}>
              <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#566182' : '#CBD5E1' }]} />
            </Pressable>

            {/* Quick Metrics Bar */}
            <View style={styles.metricsBar}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.mono }]}>
                  {studentsPicked} / {totalStudents}
                </Text>
                <Text style={[styles.metricLabel, { color: isDark ? '#8E98B8' : '#64748B', fontFamily: theme.fonts.medium }]}>
                  {isMorning ? t('trip_picked') : t('status_dropped')}
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.mono }]}>
                  {completedStopIds.length} / {stops.length}
                </Text>
                <Text style={[styles.metricLabel, { color: isDark ? '#8E98B8' : '#64748B', fontFamily: theme.fonts.medium }]}>
                  {t('stops_count')}
                </Text>
              </View>

              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.mono }]}>
                  {(tripDistance / 1000).toFixed(1)} km
                </Text>
                <Text style={[styles.metricLabel, { color: isDark ? '#8E98B8' : '#64748B', fontFamily: theme.fonts.medium }]}>
                  {t('trip_distance')}
                </Text>
              </View>
            </View>

            {/* Primary Action Buttons */}
            <View style={styles.primaryBtnWrap}>
              {!isTripRunning ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: '#10B981', opacity: pressed ? 0.9 : 1, flex: 1 },
                  ]}
                  onPress={handleStartTripClick}
                >
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                  <Text style={[styles.primaryBtnText, { fontFamily: theme.fonts.bold }]}>{t('dash_start_trip')}</Text>
                </Pressable>
              ) : showEndTrip ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: '#EF4444', opacity: pressed ? 0.9 : 1, flex: 1 },
                  ]}
                  onPress={() => setShowSummaryModal(true)}
                >
                  <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                  <Text style={[styles.primaryBtnText, { fontFamily: theme.fonts.bold }]}>{t('trip_end_trip')}</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    disabled={hasArrivedAtCurrent}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      {
                        backgroundColor: hasArrivedAtCurrent ? (isDark ? '#1B2340' : '#E2E8F0') : '#3E6BFF',
                        opacity: pressed && !hasArrivedAtCurrent ? 0.9 : 1,
                        flex: 1,
                        marginRight: 6,
                      },
                    ]}
                    onPress={handleArrived}
                  >
                    <Ionicons name="location" size={18} color={hasArrivedAtCurrent ? (isDark ? '#566182' : '#94A3B8') : '#FFFFFF'} />
                    <Text style={[styles.primaryBtnText, { fontFamily: theme.fonts.bold, color: hasArrivedAtCurrent ? (isDark ? '#566182' : '#94A3B8') : '#FFFFFF' }]}>{t('trip_arrived')}</Text>
                  </Pressable>
                  <Pressable
                    disabled={!hasArrivedAtCurrent || isFinalStop}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      {
                        backgroundColor: hasArrivedAtCurrent && !isFinalStop ? '#10B981' : (isDark ? '#1B2340' : '#E2E8F0'),
                        opacity: pressed && hasArrivedAtCurrent ? 0.9 : 1,
                        flex: 1,
                        marginLeft: 6,
                      },
                    ]}
                    onPress={handleNextStop}
                  >
                    <Ionicons name="arrow-forward" size={18} color={hasArrivedAtCurrent && !isFinalStop ? '#FFFFFF' : (isDark ? '#566182' : '#94A3B8')} />
                    <Text style={[styles.primaryBtnText, { fontFamily: theme.fonts.bold, color: hasArrivedAtCurrent && !isFinalStop ? '#FFFFFF' : (isDark ? '#566182' : '#94A3B8') }]}>{t('trip_next_stop')}</Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* 4 Emergency / Action Buttons */}
            <View style={styles.actionsRow}>
              <Pressable style={[styles.actionChip, { backgroundColor: '#FEE2E2' }]} onPress={handleEmergencyCall}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={[styles.actionChipText, { color: '#DC2626', fontFamily: theme.fonts.bold }]}>Emergency</Text>
              </Pressable>

              <Pressable style={[styles.actionChip, { backgroundColor: '#E0E7FF' }]} onPress={() => setShowCallModal(true)}>
                <Ionicons name="call" size={16} color="#4338CA" />
                <Text style={[styles.actionChipText, { color: '#4338CA', fontFamily: theme.fonts.bold }]}>Call Parent</Text>
              </Pressable>

              <Pressable style={[styles.actionChip, { backgroundColor: '#F3E8FF' }]} onPress={() => toast.info('Voice AI Navigation Active')}>
                <Ionicons name="mic" size={16} color="#6B21A8" />
                <Text style={[styles.actionChipText, { color: '#6B21A8', fontFamily: theme.fonts.bold }]}>Voice AI</Text>
              </Pressable>

              <Pressable style={[styles.actionChip, { backgroundColor: '#FEF3C7' }]} onPress={() => setShowAlertsModal(true)}>
                <Ionicons name="warning" size={16} color="#B45309" />
                <Text style={[styles.actionChipText, { color: '#B45309', fontFamily: theme.fonts.bold }]}>Alerts</Text>
              </Pressable>
            </View>

            {/* Expanded Student Verification List */}
            {isBottomSheetExpanded && (
              <View style={styles.expandedContent}>
                <Text style={[styles.stopHeaderTitle, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                  Stop: {currentStop?.name} • Students ({students.length})
                </Text>

                <ScrollView style={styles.studentList} showsVerticalScrollIndicator={false}>
                  {students.length === 0 ? (
                    <Text style={[styles.emptyText, { color: isDark ? '#8E98B8' : '#64748B' }]}>
                      No students registered for this stop.
                    </Text>
                  ) : (
                    students.map((student) => {
                      const isDone = student.status === doneStatus;
                      const isAbsent = student.status === 'absent';
                      const actionLabel = isMorning ? (isDone ? 'BOARDED' : 'SCAN') : (isDone ? 'DROPPED' : 'DROP');
                      const actionIcon = isDone ? 'checkmark-circle' : (isMorning ? 'qr-code-outline' : 'exit-outline');

                      return (
                        <View
                          key={student.id}
                          style={[
                            styles.studentRow,
                            {
                              backgroundColor: isDark ? '#1B2340' : '#F8FAFC',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                            },
                          ]}
                        >
                          <View style={styles.studentLeft}>
                            <Text style={[styles.studentName, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                              {student.name}
                            </Text>
                            <Text style={[styles.studentClass, { color: isDark ? '#8E98B8' : '#64748B' }]}>
                              {student.className || 'Class 5-A'}
                            </Text>
                          </View>

                          <View style={styles.studentButtons}>
                            <Pressable
                              style={[
                                styles.boardingBtn,
                                {
                                  backgroundColor: isDone ? '#10B981' : isDark ? '#1B2340' : '#EEF2FF',
                                },
                              ]}
                              onPress={() => handleBoardStudent(student.id)}
                              disabled={isDone || isAbsent}
                            >
                              <Ionicons
                                name={actionIcon as any}
                                size={14}
                                color={isDone ? '#FFFFFF' : '#3E6BFF'}
                              />
                              <Text
                                style={[
                                  styles.boardingBtnText,
                                  { color: isDone ? '#FFFFFF' : '#3E6BFF', fontFamily: theme.fonts.bold },
                                ]}
                              >
                                {actionLabel}
                              </Text>
                            </Pressable>

                            <Pressable
                              style={[
                                styles.boardingBtn,
                                {
                                  backgroundColor: isAbsent ? '#EF4444' : isDark ? '#1B2340' : '#FEF2F2',
                                },
                              ]}
                              onPress={() => handleAbsentStudent(student.id)}
                            >
                              <Text
                                style={[
                                  styles.boardingBtnText,
                                  { color: isAbsent ? '#FFFFFF' : '#EF4444', fontFamily: theme.fonts.bold },
                                ]}
                              >
                                ABSENT
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}
          </Animated.View>

          {/* ==================== 5. MODALS ==================== */}
          <VehicleAlertsModal
            visible={showAlertsModal}
            onClose={() => setShowAlertsModal(false)}
            onSelectIssue={handleAlertSelect}
          />

          <CallParentModal
            visible={showCallModal}
            onClose={() => setShowCallModal(false)}
            students={students}
          />

          <TripSummaryModal
            visible={showSummaryModal}
            onFinish={handleEndTripConfirm}
            summary={{
              studentsPicked,
              totalStudents,
              stopsCovered: completedStopIds.length,
              totalStops: stops.length,
              distanceCoveredKm: tripDistance / 1000,
              durationSeconds: elapsedSeconds,
            }}
          />
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  skeletonContainer: {
    padding: 20,
    gap: 16,
  },

  /* Top Overlay Header */
  topHeaderOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modeSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modeLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },

  /* Status Overlay Badge */
  statusBadgeOverlay: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    zIndex: 15,
  },
  statusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  statusBadgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  currentStopTitle: {
    fontSize: 20,
    lineHeight: 24,
  },
  statusMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextStopSub: {
    fontSize: 12,
  },
  etaSub: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Map Markers */
  stopMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMarkerText: {
    fontSize: 12,
  },
  busMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  busPulseAura: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(62, 107, 255, 0.35)',
  },
  busIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3E6BFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3E6BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  /* Bottom Sheet Engine */
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    zIndex: 30,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },

  /* Primary Action Button */
  primaryBtnWrap: {
    marginTop: 10,
    flexDirection: 'row',
  },
  primaryBtn: {
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.5,
  },

  /* Emergency / Action Chips */
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 6,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionChipText: {
    fontSize: 10,
  },

  /* Expanded Student Verification List */
  expandedContent: {
    marginTop: 14,
    flex: 1,
  },
  stopHeaderTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  studentList: {
    flex: 1,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  studentLeft: {
    gap: 2,
  },
  studentName: {
    fontSize: 14,
  },
  studentClass: {
    fontSize: 11,
  },
  studentButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  boardingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  boardingBtnText: {
    fontSize: 11,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
  locationDisabledCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  disabledIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  disabledTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  disabledSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  grantBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  grantBtnText: {
    fontSize: 14,
  },
});
