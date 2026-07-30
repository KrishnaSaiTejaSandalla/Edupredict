import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useLocationStore } from '@/store/location.store';

export default function VehicleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { driver } = useAuth();
  const { tripDistance } = useLocationStore();

  const bus = driver?.assignedBus;
  const busNumber = bus?.busNumber ?? 'Not Assigned';
  const registration = bus?.registrationNumber ?? 'MH79TD0098';
  const nickname = bus?.nickname ?? 'Fleet Cruiser';
  const capacity = bus?.capacity ? `${bus.capacity} Seats` : '42 Seats';
  const model = 'Mercedes Benz Tourismo (2024)';

  const formattedDistance = useMemo(() => {
    return (tripDistance / 1000).toFixed(1) + ' km';
  }, [tripDistance]);

  return (
    <ScreenWrapper safe style={{ backgroundColor: theme.colors.background }}>
      <Header 
        title="Vehicle Dashboard" 
        showBackButton={true}
      />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Large Bus Illustration Card */}
        <DashboardCard style={[styles.illustrationCard, { backgroundColor: theme.colors.backgroundSecond, borderColor: theme.colors.border }]}>
          {/* Stylized high-tech bus wireframe */}
          <View style={styles.busWrapper}>
            <View style={[styles.busBody, { borderColor: theme.colors.primary }]}>
              {/* Windshield */}
              <View style={[styles.windshield, { backgroundColor: theme.colors.primarySurface }]} />
              {/* Windows */}
              <View style={styles.windowsRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <View key={i} style={[styles.windowItem, { backgroundColor: theme.colors.primarySurface }]} />
                ))}
              </View>
              {/* Wheels */}
              <View style={styles.wheelsRow}>
                <View style={[styles.wheel, { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.primary }]} />
                <View style={[styles.wheel, { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.primary }]} />
              </View>
            </View>
          </View>

          <Text style={[styles.vehicleTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
            {nickname}
          </Text>
          <Text style={[styles.vehicleSubtitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
            {model} · {busNumber}
          </Text>
        </DashboardCard>

        {/* Real-time Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: theme.colors.primarySurface, borderColor: theme.colors.primary + '30' }]}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.statusBannerText, { color: theme.colors.primary, fontFamily: theme.fonts.bold }]}>
            All systems nominal · Fleet Checked
          </Text>
        </View>

        {/* Info Grid */}
        <View style={styles.metricsGrid}>
          
          <MetricInfoCard 
            icon="car-outline" 
            title="Registration" 
            value={registration} 
            subtitle="License Plate" 
          />
          
          <MetricInfoCard 
            icon="people-outline" 
            title="Capacity" 
            value={capacity} 
            subtitle="Passanger Count" 
          />

          <MetricInfoCard 
            icon="speedometer-outline" 
            title="Today's Odo" 
            value={formattedDistance} 
            subtitle="Distance Run" 
          />

          <MetricInfoCard 
            icon="heart-half-outline" 
            title="Health Status" 
            value="98%" 
            subtitle="Engine & Systems" 
            color={theme.colors.success}
          />

          <MetricInfoCard 
            icon="water-outline" 
            title="Fuel Level" 
            value="74%" 
            subtitle="Estimated 280km" 
            color={theme.colors.primary}
          />

          <MetricInfoCard 
            icon="document-text-outline" 
            title="Insurance" 
            value="ACTIVE" 
            subtitle="Expires Dec 2026" 
            color={theme.colors.success}
          />

          <MetricInfoCard 
            icon="thermometer-outline" 
            title="Coolant Temp" 
            value="86°C" 
            subtitle="Normal Range" 
          />

          <MetricInfoCard 
            icon="build-outline" 
            title="Service Status" 
            value="OPTIMAL" 
            subtitle="Next: 4,200 km" 
            color={theme.colors.success}
          />

        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

function MetricInfoCard({ 
  icon, 
  title, 
  value, 
  subtitle, 
  color 
}: { 
  icon: string; 
  title: string; 
  value: string; 
  subtitle: string; 
  color?: string; 
}) {
  const theme = useTheme();
  return (
    <DashboardCard style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.metricCardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.backgroundSecond }]}>
          <Ionicons name={icon as any} size={18} color={color || theme.colors.textPrimary} />
        </View>
        <Text style={[styles.metricTitle, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.metricValue, { color: color || theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
        {value}
      </Text>
      <Text style={[styles.metricSubtitle, { color: theme.colors.textTertiary, fontFamily: theme.fonts.medium }]}>
        {subtitle}
      </Text>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  illustrationCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busWrapper: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  busBody: {
    width: 220,
    height: 80,
    borderWidth: 2,
    borderRadius: 12,
    padding: 8,
    position: 'relative',
    justifyContent: 'space-between',
  },
  windshield: {
    width: 40,
    height: '100%',
    position: 'absolute',
    left: 8,
    top: 8,
    borderRadius: 4,
  },
  windowsRow: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 56,
    height: 24,
  },
  windowItem: {
    width: 22,
    height: '100%',
    borderRadius: 2,
  },
  wheelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: -10,
  },
  wheel: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 4,
  },
  vehicleTitle: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: 8,
  },
  vehicleSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBannerText: {
    fontSize: 13,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 16,
    marginTop: 6,
  },
  metricSubtitle: {
    fontSize: 11,
  },
});
