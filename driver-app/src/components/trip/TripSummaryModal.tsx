import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

interface TripSummaryModalProps {
  visible: boolean;
  onFinish: () => void;
  summary: {
    studentsPicked: number;
    totalStudents: number;
    stopsCovered: number;
    totalStops: number;
    distanceCoveredKm: number;
    durationSeconds: number;
  };
}

export const TripSummaryModal: React.FC<TripSummaryModalProps> = ({
  visible,
  onFinish,
  summary,
}) => {
  const theme = useTheme();
  const isDark = theme.isDark;

  const minutes = Math.floor(summary.durationSeconds / 60);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFinish}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.content,
            {
              backgroundColor: isDark ? '#151A33' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
            },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : '#ECFDF5' }]}>
            <Ionicons name="checkmark-circle" size={48} color="#34D399" />
          </View>

          <Text style={[styles.title, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
            TRIP COMPLETED!
          </Text>

          <Text style={[styles.subtitle, { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.regular }]}>
            Great job! You have safely completed the transport route.
          </Text>

          {/* Metrics Grid */}
          <View style={styles.grid}>
            <View style={[styles.metricCard, { backgroundColor: isDark ? '#1E2442' : '#F8FAFC' }]}>
              <Ionicons name="people" size={20} color="#3E6BFF" />
              <Text style={[styles.metricVal, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                {summary.studentsPicked} / {summary.totalStudents}
              </Text>
              <Text style={[styles.metricLabel, { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.medium }]}>
                Students Picked
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? '#1E2442' : '#F8FAFC' }]}>
              <Ionicons name="map" size={20} color="#8B5CF6" />
              <Text style={[styles.metricVal, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                {summary.stopsCovered} / {summary.totalStops}
              </Text>
              <Text style={[styles.metricLabel, { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.medium }]}>
                Stops Completed
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? '#1E2442' : '#F8FAFC' }]}>
              <Ionicons name="navigate" size={20} color="#34D399" />
              <Text style={[styles.metricVal, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                {summary.distanceCoveredKm.toFixed(1)} km
              </Text>
              <Text style={[styles.metricLabel, { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.medium }]}>
                Total Distance
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: isDark ? '#1E2442' : '#F8FAFC' }]}>
              <Ionicons name="time" size={20} color="#FDBA74" />
              <Text style={[styles.metricVal, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                {minutes} mins
              </Text>
              <Text style={[styles.metricLabel, { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.medium }]}>
                Duration
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.finishBtn,
              { backgroundColor: '#3E6BFF', opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onFinish}
          >
            <Text style={[styles.finishBtnText, { fontFamily: theme.fonts.bold }]}>BACK TO DASHBOARD</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 10,
  },
  metricCard: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  metricVal: {
    fontSize: 16,
  },
  metricLabel: {
    fontSize: 11,
  },
  finishBtn: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
