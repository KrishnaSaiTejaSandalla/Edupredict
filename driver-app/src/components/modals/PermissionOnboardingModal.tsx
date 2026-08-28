import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@/hooks/useTheme';
import { StorageService } from '@/services/storage.service';

interface PermissionCardData {
  id: number;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  badgeBg: string;
  title: string;
  description: string;
  action: () => Promise<void>;
}

interface PermissionOnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function PermissionOnboardingModal({ visible, onComplete }: PermissionOnboardingModalProps) {
  const theme = useTheme();
  const isDark = theme.isDark;
  const [currentStep, setCurrentStep] = useState(0);

  const cards: PermissionCardData[] = [
    {
      id: 0,
      iconName: 'location',
      iconColor: isDark ? '#38BDF8' : '#2563EB',
      badgeBg: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
      title: 'Live Location',
      description: 'EduPredict uses your location for realtime school bus tracking and parent ETA alerts.',
      action: async () => {
        if (Platform.OS !== 'web') {
          await Location.requestForegroundPermissionsAsync().catch(() => {});
        }
      },
    },
    {
      id: 1,
      iconName: 'camera',
      iconColor: isDark ? '#A78BFA' : '#7C3AED',
      badgeBg: isDark ? 'rgba(167, 139, 250, 0.15)' : '#F3E8FF',
      title: 'Camera Access',
      description: 'Required for scanning student QR codes during bus boarding and drop-offs.',
      action: async () => {
        if (Platform.OS !== 'web') {
          await ImagePicker.requestCameraPermissionsAsync().catch(() => {});
        }
      },
    },
    {
      id: 2,
      iconName: 'images',
      iconColor: isDark ? '#34D399' : '#059669',
      badgeBg: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5',
      title: 'Gallery Access',
      description: 'Choose your driver profile photo directly from your device media library.',
      action: async () => {
        if (Platform.OS !== 'web') {
          await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => {});
        }
      },
    },
    {
      id: 3,
      iconName: 'notifications',
      iconColor: isDark ? '#FBBF24' : '#D97706',
      badgeBg: isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFFBEB',
      title: 'Push Notifications',
      description: 'Receive emergency broadcasts, parent message alerts, and trip schedule updates.',
      action: async () => {
        if (Platform.OS !== 'web') {
          await Notifications.requestPermissionsAsync().catch(() => {});
        }
      },
    },
  ];

  const currentCard = cards[currentStep] || cards[0];

  const handleNextStep = async (performAction: boolean) => {
    if (performAction && currentCard.action) {
      await currentCard.action();
    }

    if (currentStep < cards.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      await StorageService.setPermissionOnboardingCompleted(true);
      onComplete();
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Step Progress Indicator */}
          <View style={styles.progressRow}>
            {cards.map((card, idx) => (
              <View
                key={card.id}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      idx === currentStep
                        ? (isDark ? '#38BDF8' : theme.colors.primary)
                        : idx < currentStep
                        ? (isDark ? '#34D399' : '#059669')
                        : (isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'),
                  },
                ]}
              />
            ))}
          </View>

          {/* Card Icon Header */}
          <View style={[styles.iconWrapper, { backgroundColor: currentCard.badgeBg }]}>
            <Ionicons name={currentCard.iconName} size={36} color={currentCard.iconColor} />
          </View>

          {/* Title & Description */}
          <Text style={[styles.cardTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
            {currentCard.title}
          </Text>
          <Text style={[styles.cardDesc, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
            {currentCard.description}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={() => handleNextStep(false)}
              style={[styles.btnSkip, { backgroundColor: isDark ? '#202544' : '#F3F4F6' }]}
            >
              <Text style={[styles.btnSkipText, { fontFamily: theme.fonts.bold, color: theme.colors.textSecondary }]}>
                Skip
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleNextStep(true)}
              style={[styles.btnAllow, { backgroundColor: isDark ? '#38BDF8' : theme.colors.primary }]}
            >
              <Text style={[styles.btnAllowText, { fontFamily: theme.fonts.bold, color: '#FFFFFF' }]}>
                Allow
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    elevation: 8,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  progressDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  cardTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  btnSkip: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSkipText: {
    fontSize: 15,
  },
  btnAllow: {
    flex: 1.5,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAllowText: {
    fontSize: 15,
  },
});
