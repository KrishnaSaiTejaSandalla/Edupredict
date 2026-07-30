import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

interface VehicleAlertsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectIssue: (issue: string) => void;
}

const VEHICLE_ISSUES = [
  { id: 'puncture', label: 'Puncture', icon: 'disc-outline', color: '#EF4444' },
  { id: 'oil_empty', label: 'Oil Empty', icon: 'water-outline', color: '#F59E0B' },
  { id: 'engine_warning', label: 'Engine Warning', icon: 'warning-outline', color: '#F59E0B' },
  { id: 'battery_problem', label: 'Battery Problem', icon: 'battery-dead-outline', color: '#EF4444' },
  { id: 'accident_report', label: 'Accident Report', icon: 'alert-circle-outline', color: '#DC2626' },
];

export const VehicleAlertsModal: React.FC<VehicleAlertsModalProps> = ({
  visible,
  onClose,
  onSelectIssue,
}) => {
  const theme = useTheme();
  const isDark = theme.isDark;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.content,
            {
              backgroundColor: isDark ? '#151A33' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="warning" size={22} color="#EF4444" />
              <Text style={[styles.title, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                Report Vehicle Issue
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={isDark ? '#9AA3C7' : '#64748B'} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.regular }]}>
            Select issue to notify School Admin in real-time with current GPS location.
          </Text>

          <ScrollView style={styles.issueList} showsVerticalScrollIndicator={false}>
            {VEHICLE_ISSUES.map((item) => (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.issueCard,
                  {
                    backgroundColor: isDark ? '#1E2442' : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => {
                  onSelectIssue(item.label);
                  onClose();
                }}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[styles.issueLabel, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.medium }]}>
                  ⚠ {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={isDark ? '#9AA3C7' : '#94A3B8'} />
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 22,
    maxHeight: '75%',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  issueList: {
    marginTop: 8,
  },
  issueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
  },
});
