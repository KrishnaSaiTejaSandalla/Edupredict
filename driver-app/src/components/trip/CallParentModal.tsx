import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Linking } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { TripStudent } from '@/store/trip.store';

interface CallParentModalProps {
  visible: boolean;
  onClose: () => void;
  students: TripStudent[];
}

export const CallParentModal: React.FC<CallParentModalProps> = ({
  visible,
  onClose,
  students,
}) => {
  const theme = useTheme();
  const isDark = theme.isDark;

  const defaultPhone = '9876543210';

  const handleCallParent = (phone: string) => {
    void Linking.openURL(`tel:${phone}`);
  };

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
              <Ionicons name="call-outline" size={22} color="#3E6BFF" />
              <Text style={[styles.title, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                Call Student Parents
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={isDark ? '#9AA3C7' : '#64748B'} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.regular }]}>
            Direct line to contact parents of waiting or absent students.
          </Text>

          <ScrollView style={styles.studentList} showsVerticalScrollIndicator={false}>
            {students.length === 0 ? (
              <Text style={[styles.emptyText, { color: isDark ? '#9AA3C7' : '#64748B' }]}>
                No students assigned to current trip.
              </Text>
            ) : (
              students.map((student) => (
                <View
                  key={student.id}
                  style={[
                    styles.studentRow,
                    {
                      backgroundColor: isDark ? '#1E2442' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.info}>
                    <Text style={[styles.name, { color: isDark ? '#F5F7FF' : '#0F172A', fontFamily: theme.fonts.bold }]}>
                      {student.name}
                    </Text>
                    <Text style={[styles.parentPhone, { color: isDark ? '#9AA3C7' : '#64748B', fontFamily: theme.fonts.mono }]}>
                      Parent: {defaultPhone}
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.callBtn,
                      { backgroundColor: '#3E6BFF', opacity: pressed ? 0.85 : 1 },
                    ]}
                    onPress={() => handleCallParent(defaultPhone)}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                    <Text style={[styles.callBtnText, { fontFamily: theme.fonts.bold }]}>CALL</Text>
                  </Pressable>
                </View>
              ))
            )}
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
  },
  studentList: {
    marginTop: 8,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
  },
  parentPhone: {
    fontSize: 12,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
});
