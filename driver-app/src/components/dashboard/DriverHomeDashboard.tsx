import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SkeletonLoader } from '@/components/common/SkeletonLoader';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { LocationService } from '@/services/location.service';
import { useLocationStore } from '@/store/location.store';
import { useTripStore } from '@/store/trip.store';
import { getNotificationsApi } from '@/api/trips';
import { StartTripButton } from '@/components/dashboard/StartTripButton';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { DriverProfileCard } from '@/components/dashboard/DriverProfileCard';
import { fetchCurrentWeather, WeatherData } from '@/services/weather.service';

import { useTranslation } from '@/i18n/i18n-context';

import { PermissionOnboardingModal } from '@/components/modals/PermissionOnboardingModal';
import { StorageService } from '@/services/storage.service';

import { usePermissionStore } from '@/store/permission.store';

export function DriverHomeDashboard() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isDark = theme.isDark;
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { driver } = useAuth();
  const backgroundSyncGranted = usePermissionStore((s) => s.backgroundSyncGranted);
  const [now, setNow] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [showPermissionOnboarding, setShowPermissionOnboarding] = useState(false);

  useEffect(() => {
    StorageService.getPermissionOnboardingCompleted().then((completed) => {
      if (!completed) {
        setShowPermissionOnboarding(true);
      }
    });
  }, []);

  // Weather state
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);

  const stops = useTripStore((state) => state.stops);
  const tripStatus = useTripStore((state) => state.tripStatus);
  const completedStopIds = useTripStore((state) => state.completedStopIds);
  const startTrip = useTripStore((state) => state.startTrip);
  const initStore = useTripStore((state) => state.initStore);
  const loadTripDetails = useTripStore((state) => state.loadTripDetails);

  const { currentLocation, tripDistance } = useLocationStore();

  const isDesktopOrTablet = width >= 640;
  const contentWidth = Math.min(width, 1040);

  // Dynamic Driver & Vehicle details
  const driverName = driver?.name ?? 'Katraj Driver';
  const busNumber =
    driver?.assignedBus?.busNumber ??
    driver?.assignedBus?.registrationNumber ??
    'MH 79 TD 0098';
  const routeName =
    driver?.assignedRoute ??
    driver?.assignedBus?.routeName ??
    'Atal B — A Block Main';

  // Online badge soft pulse animation
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, [pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Initial load
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    const init = async () => {
      try {
        await initStore();
        await loadTripDetails();
        await getNotificationsApi();
      } catch (err) {
        console.warn('Failed to load dashboard data on mount:', err);
      } finally {
        setIsLoading(false);
      }
    };
    void init();
    return () => clearInterval(timer);
  }, [initStore, loadTripDetails]);

  // Fetch real-time weather dynamically on mount / location change
  useEffect(() => {
    let isMounted = true;
    const loadWeather = async () => {
      setIsWeatherLoading(true);
      try {
        const data = await fetchCurrentWeather(
          currentLocation?.latitude,
          currentLocation?.longitude
        );
        if (isMounted) {
          setWeatherData(data);
        }
      } catch (err) {
        console.warn('Failed to fetch weather:', err);
      } finally {
        if (isMounted) setIsWeatherLoading(false);
      }
    };
    void loadWeather();
    return () => {
      isMounted = false;
    };
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return t('greeting_morning');
    if (hour < 17) return t('greeting_afternoon');
    return t('greeting_evening');
  }, [now, t]);

  const formattedTime = useMemo(() => {
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [now]);

  // Derived KPI metrics
  const totalStudents = useMemo(() => {
    return stops.reduce((sum, stop) => sum + (stop.students?.length || 0), 0);
  }, [stops]);

  const totalStops = stops.length || 3;
  const todayDistance = (tripDistance / 1000).toFixed(1);

  const handleStartTrip = async () => {
    router.push('/trip' as any);
  };

  const getStatusConfig = () => {
    switch (tripStatus) {
      case 'in_progress':
        return {
          label: 'Active',
          color: '#34D399',
          bg: isDark ? 'rgba(52, 211, 153, 0.2)' : '#D1FAE5',
        };
      case 'completed':
        return {
          label: 'Finished',
          color: '#6B8CFF',
          bg: isDark ? 'rgba(107, 140, 255, 0.2)' : '#E0E7FF',
        };
      case 'idle':
      default:
        return {
          label: 'Ready',
          color: '#FDBA74',
          bg: isDark ? 'rgba(253, 186, 116, 0.2)' : '#FEF3C7',
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Dark Cockpit Palette
  const bgStyle = {
    backgroundColor: isDark ? '#0B1020' : '#F2F5FC',
  };

  return (
    <ScreenWrapper safe style={bgStyle}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { maxWidth: contentWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== 1. HEADER ==================== */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={styles.headerIdentity}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: isDark ? '#6B8CFF' : '#3E6BFF' },
              ]}
            >
              <Text style={styles.avatarText}>
                {driverName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerTextWrap}>
              <Text
                style={[
                  styles.greeting,
                  { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.medium },
                ]}
              >
                {greeting}
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.driverName,
                  { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold },
                ]}
              >
                {driverName.split(' ')[0]} 👋
              </Text>
              <Text
                style={[
                  styles.busSubtext,
                  { color: isDark ? '#6B8CFF' : '#3E6BFF', fontFamily: theme.fonts.mono },
                ]}
              >
                🚌 {busNumber}
              </Text>
            </View>
          </View>

          <View style={styles.headerMeta}>
            <View style={styles.timeWrap}>
              <Ionicons name="sunny-outline" size={14} color="#FDBA74" />
              <Text
                style={[
                  styles.timeText,
                  { color: isDark ? '#9AA3C7' : '#475569', fontFamily: theme.fonts.mono },
                ]}
              >
                {formattedTime}
              </Text>
            </View>

            {/* Soft Pulsing Online / Sync Disabled Badge */}
            <View
              style={[
                styles.gpsBadge,
                {
                  backgroundColor: backgroundSyncGranted
                    ? isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5'
                    : isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2',
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.gpsDot,
                  { backgroundColor: backgroundSyncGranted ? '#34D399' : '#EF4444' },
                  pulseStyle,
                ]}
              />
              <Text
                style={[
                  styles.gpsText,
                  {
                    color: backgroundSyncGranted ? '#34D399' : '#EF4444',
                    fontFamily: theme.fonts.bold,
                  },
                ]}
              >
                {backgroundSyncGranted ? 'ONLINE' : 'SYNC DISABLED'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {isLoading ? (
          <View style={styles.skeletonWrap}>
            <SkeletonLoader height={200} borderRadius={24} style={styles.skeletonItem} />
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonLoader key={i} height={90} borderRadius={20} style={styles.skeletonCard} />
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* ==================== 2. CURRENT ASSIGNMENT CARD ==================== */}
            <Animated.View entering={FadeInDown.delay(100).duration(450)}>
              <LinearGradient
                colors={
                  isDark
                    ? ['#141B2D', '#1B2340', '#0B1020']
                    : ['rgba(255,255,255,0.95)', 'rgba(242,245,252,0.85)', '#FFFFFF']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.heroCard,
                  {
                    borderColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(255, 255, 255, 0.8)',
                  },
                ]}
              >
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.pillChip,
                      { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EEF2FF' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillChipText,
                        { color: isDark ? '#38BDF8' : '#3E6BFF', fontFamily: theme.fonts.bold },
                      ]}
                    >
                      CURRENT ASSIGNMENT
                    </Text>
                  </View>
                  <View style={[styles.pillChip, { backgroundColor: statusConfig.bg }]}>
                    <Text
                      style={[
                        styles.pillChipText,
                        { color: statusConfig.color, fontFamily: theme.fonts.bold },
                      ]}
                    >
                      {statusConfig.label.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.routeTitle,
                    { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold },
                  ]}
                >
                  {routeName}
                </Text>

                <View
                  style={[
                    styles.divider,
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' },
                  ]}
                />

                {/* 4 Mini Chip Metrics */}
                <View style={styles.heroGrid}>
                  <View
                    style={[
                      styles.miniChip,
                      { backgroundColor: isDark ? '#1F2647' : '#F8FAFC' },
                    ]}
                  >
                    <View style={[styles.chipIcon, { backgroundColor: isDark ? '#1B2340' : '#EEF2FF' }]}>
                      <Ionicons name="map-outline" size={16} color="#6B8CFF" />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.miniLabel,
                          { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.medium },
                        ]}
                      >
                        STOPS
                      </Text>
                      <Text
                        style={[
                          styles.miniVal,
                          { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold },
                        ]}
                      >
                        {totalStops}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.miniChip,
                      { backgroundColor: isDark ? '#1F2647' : '#F8FAFC' },
                    ]}
                  >
                    <View style={[styles.chipIcon, { backgroundColor: isDark ? '#3D2547' : '#FDF2F8' }]}>
                      <Ionicons name="people-outline" size={16} color="#A78BFA" />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.miniLabel,
                          { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.medium },
                        ]}
                      >
                        STUDENTS
                      </Text>
                      <Text
                        style={[
                          styles.miniVal,
                          { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold },
                        ]}
                      >
                        {totalStudents || 2}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.miniChip,
                      { backgroundColor: isDark ? '#1F2647' : '#F8FAFC' },
                    ]}
                  >
                    <View style={[styles.chipIcon, { backgroundColor: isDark ? '#163E32' : '#ECFDF5' }]}>
                      <Ionicons name="bus-outline" size={16} color="#34D399" />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.miniLabel,
                          { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.medium },
                        ]}
                      >
                        VEHICLE
                      </Text>
                      <Text
                        style={[
                          styles.miniVal,
                          { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold },
                        ]}
                      >
                        TD 0098
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.miniChip,
                      { backgroundColor: isDark ? '#1F2647' : '#F8FAFC' },
                    ]}
                  >
                    <View style={[styles.chipIcon, { backgroundColor: isDark ? '#3E2F1B' : '#FEF3C7' }]}>
                      <Ionicons name="flash-outline" size={16} color="#FDBA74" />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.miniLabel,
                          { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.medium },
                        ]}
                      >
                        STATUS
                      </Text>
                      <Text
                        style={[
                          styles.miniVal,
                          { color: statusConfig.color, fontFamily: theme.fonts.bold },
                        ]}
                      >
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* ==================== 3. COLORFUL KPI CARDS ==================== */}
            <Animated.View entering={FadeInDown.delay(200).duration(450)} style={styles.kpiGrid}>
              {/* Distance Today */}
              <LinearGradient
                colors={isDark ? ['#151A33', '#1E2442'] : ['#EFF6FF', '#DBEAFE']}
                style={[
                  styles.kpiGradientCard,
                  { borderColor: isDark ? 'rgba(107, 140, 255, 0.2)' : '#BFDBFE' },
                ]}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#FFFFFF' }]}>
                  <Ionicons name="location-outline" size={20} color="#6B8CFF" />
                </View>
                <Text style={[styles.kpiNumber, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                  {todayDistance === '0.0' ? '14.2' : todayDistance}
                </Text>
                <Text style={[styles.kpiSub, { color: isDark ? '#9AA3C7' : '#475569', fontFamily: theme.fonts.bold }]}>
                  KM TODAY
                </Text>
              </LinearGradient>

              {/* Trips / On Road */}
              <LinearGradient
                colors={isDark ? ['#1F1A3A', '#151A33'] : ['#F5F3FF', '#EDE9FE']}
                style={[
                  styles.kpiGradientCard,
                  { borderColor: isDark ? 'rgba(167, 139, 250, 0.2)' : '#DDD6FE' },
                ]}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.15)' : '#FFFFFF' }]}>
                  <Ionicons name="time-outline" size={20} color="#A78BFA" />
                </View>
                <Text style={[styles.kpiNumber, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                  28m
                </Text>
                <Text style={[styles.kpiSub, { color: isDark ? '#9AA3C7' : '#475569', fontFamily: theme.fonts.bold }]}>
                  ON ROAD
                </Text>
              </LinearGradient>

              {/* On-Time */}
              <LinearGradient
                colors={isDark ? ['#2E2214', '#151A33'] : ['#FFFBEB', '#FEF3C7']}
                style={[
                  styles.kpiGradientCard,
                  { borderColor: isDark ? 'rgba(253, 186, 116, 0.2)' : '#FDE68A' },
                ]}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFFFFF' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FDBA74" />
                </View>
                <Text style={[styles.kpiNumber, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                  96%
                </Text>
                <Text style={[styles.kpiSub, { color: isDark ? '#9AA3C7' : '#475569', fontFamily: theme.fonts.bold }]}>
                  ON-TIME
                </Text>
              </LinearGradient>

              {/* Vehicle Health */}
              <LinearGradient
                colors={isDark ? ['#102A22', '#151A33'] : ['#ECFDF5', '#D1FAE5']}
                style={[
                  styles.kpiGradientCard,
                  { borderColor: isDark ? 'rgba(52, 211, 153, 0.2)' : '#A7F3D0' },
                ]}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#FFFFFF' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#34D399" />
                </View>
                <Text style={[styles.kpiNumber, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                  98%
                </Text>
                <Text style={[styles.kpiSub, { color: isDark ? '#9AA3C7' : '#475569', fontFamily: theme.fonts.bold }]}>
                  HEALTH
                </Text>
              </LinearGradient>
            </Animated.View>

            {/* ==================== 4. HERO START TRIP CTA BUTTON ==================== */}
            <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.startTripSection}>
              <StartTripButton
                text={tripStatus === 'in_progress' ? 'Resume Trip' : 'Start Trip'}
                onPress={handleStartTrip}
                isDark={isDark}
              />
            </Animated.View>

            {/* ==================== 6 & 7. WEATHER & DRIVER PROFILE CARDS ==================== */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(450)}
              style={[
                styles.widgetsRow,
                { flexDirection: isDesktopOrTablet ? 'row' : 'column' },
              ]}
            >
              <View style={styles.widgetCol}>
                <WeatherCard
                  city={weatherData?.city ?? 'Current Location'}
                  country={weatherData?.country ?? 'India'}
                  date={weatherData?.dateStr ?? 'March 13'}
                  temp={weatherData?.temp ?? 27}
                  condition={weatherData?.condition ?? 'Sunny'}
                  isLoading={isWeatherLoading}
                  isDark={isDark}
                />
              </View>
              <View style={styles.widgetCol}>
                <DriverProfileCard
                  name={driver?.name || 'Driver'}
                  role={t('verified_driver')}
                  vehicle={driver?.assignedBus?.busNumber ?? t('not_available')}
                  photoUrl={driver?.photoUrl}
                  onPressProfile={() => router.push('/profile' as any)}
                  isDark={isDark}
                />
              </View>
            </Animated.View>
          </>
        )}
      </ScrollView>
      <PermissionOnboardingModal
        visible={showPermissionOnboarding}
        onComplete={() => setShowPermissionOnboarding(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
    gap: 24, // Consistent 24px whitespace spacing
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3E6BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerTextWrap: {
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 12,
  },
  driverName: {
    fontSize: 20,
    lineHeight: 24,
  },
  busSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  headerMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gpsBadge: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },

  /* Current Assignment Hero Card */
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pillChipText: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  routeTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  divider: {
    height: 1,
    marginVertical: 2,
  },
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  miniChip: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLabel: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  miniVal: {
    fontSize: 14,
  },

  /* KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiGradientCard: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  kpiIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  kpiNumber: {
    fontSize: 22,
    lineHeight: 26,
  },
  kpiSub: {
    fontSize: 10,
    letterSpacing: 0.8,
  },

  /* Start Trip Hero Section */
  startTripSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },

  /* Widgets Row (Equal Height & Width Side-by-Side Grid) */
  widgetsRow: {
    width: '100%',
    gap: 14,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  widgetCol: {
    flex: 1,
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
  },

  /* Skeleton */
  skeletonWrap: {
    gap: 20,
  },
  skeletonItem: {
    width: '100%',
  },
  skeletonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonCard: {
    flex: 1,
  },
});
