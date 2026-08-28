import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAudioPlayer } from 'expo-audio';
import {
  BarcodeScanningResult,
  CameraType,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { AnimatedPressable } from '@/components/dashboard/AnimatedPressable';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { BottomSheet } from '@/components/modals/BottomSheet';
import { StudentBoardingCandidate, useTripStore } from '@/store/trip.store';
import { useTheme } from '@/hooks/useTheme';

import { usePermissionStore } from '@/store/permission.store';

const SUCCESS_SOUND_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

function formatBoardedAt(value?: string): string {
  if (!value) return 'Just now';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ScannerFrame() {
  const theme = useTheme();
  const scanY = useSharedValue(0);

  useEffect(() => {
    scanY.value = withRepeat(
      withSequence(withTiming(1, { duration: 1500 }), withTiming(0, { duration: 1500 })),
      -1,
      true,
    );
  }, [scanY]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value * 230 }],
  }));

  return (
    <View style={styles.frameWrap}>
      <View style={[styles.corner, styles.topLeft, { borderColor: theme.colors.primary }]} />
      <View style={[styles.corner, styles.topRight, { borderColor: theme.colors.primary }]} />
      <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.colors.primary }]} />
      <View style={[styles.corner, styles.bottomRight, { borderColor: theme.colors.primary }]} />
      <Animated.View style={[styles.scanLine, { backgroundColor: theme.colors.accent }, lineStyle]} />
    </View>
  );
}

export default function ScanQRScreen() {
  const theme = useTheme();
  const router = useRouter();
  const player = useAudioPlayer({ uri: SUCCESS_SOUND_URI });
  const [permission, requestPermission] = useCameraPermissions();
  const cameraGrantedStore = usePermissionStore((s) => s.cameraGranted);
  const setCameraGrantedStore = usePermissionStore((s) => s.setCameraGranted);

  const [facing, setFacing] = useState<CameraType>('back');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanningEnabled, setScanningEnabled] = useState(true);

  // States for custom overlays
  const [candidate, setCandidate] = useState<StudentBoardingCandidate | null>(null);
  const [statusOverlay, setStatusOverlay] = useState<{
    type: 'success' | 'wrong_bus' | 'wrong_stop' | 'already_boarded' | 'not_found';
    title: string;
    message: string;
    studentName?: string;
    studentPhoto?: string;
  } | null>(null);

  const findStudentByQRCode = useTripStore((state) => state.findStudentByQRCode);
  const boardStudent = useTripStore((state) => state.boardStudent);
  const stops = useTripStore((state) => state.stops);
  const currentStopIndex = useTripStore((state) => state.currentStopIndex);

  const currentStop = stops[currentStopIndex];
  const pendingStudents = (currentStop?.students || []).filter((s) => s.status === 'qr_pending');

  const cameraReady = Boolean(permission?.granted && cameraGrantedStore);

  const handleGrantCameraPermission = async () => {
    const res = await requestPermission();
    setCameraGrantedStore(res.granted);
  };

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  async function playSuccessSound() {
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // Sound is non-critical
    }
  }

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!scanningEnabled || statusOverlay !== null || candidate !== null) return;

    setScanningEnabled(false);
    const match = await findStudentByQRCode(result.data);

    if (!match) {
      setStatusOverlay({
        type: 'not_found',
        title: 'Not Found',
        message: 'This QR does not match any student assigned to this route.',
      });
      return;
    }

    if (match.error === 'wrong_bus') {
      setStatusOverlay({
        type: 'wrong_bus',
        title: 'Wrong Bus',
        message: `${match.student.name} is assigned to Bus ${match.assignedBusNumber ?? 'N/A'}.`,
        studentName: match.student.name,
        studentPhoto: match.student.photoUrl,
      });
      return;
    }

    if (match.error === 'wrong_stop') {
      setStatusOverlay({
        type: 'wrong_stop',
        title: 'Wrong Stop',
        message: `${match.student.name} is assigned to stop "${match.stop.name}".`,
        studentName: match.student.name,
        studentPhoto: match.student.photoUrl,
      });
      return;
    }

    if (match.error === 'already_boarded' || match.student.status === 'boarded') {
      setStatusOverlay({
        type: 'already_boarded',
        title: 'Already Boarded',
        message: `${match.student.name} boarded at ${formatBoardedAt(match.student.boardedAt)}.`,
        studentName: match.student.name,
        studentPhoto: match.student.photoUrl,
      });
      return;
    }

    setCandidate(match);
  }

  function retryScan() {
    setCandidate(null);
    setStatusOverlay(null);
    setScanningEnabled(true);
  }

  async function confirmBoarding() {
    if (!candidate) return;
    const boarded = await boardStudent(candidate.student.id);
    if (!boarded) return;

    setCandidate(null);
    
    // Show premium Success card and dismiss after 2s
    setStatusOverlay({
      type: 'success',
      title: 'Boarded Successfully',
      message: 'Welcome onboard!',
      studentName: candidate.student.name,
      studentPhoto: candidate.student.photoUrl,
    });
    
    await playSuccessSound();

    setTimeout(() => {
      setStatusOverlay(null);
      setScanningEnabled(true);
    }, 2000);
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {cameraReady ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torchEnabled}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanningEnabled ? handleBarcodeScanned : undefined}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.permissionFallback, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="camera-outline" size={54} color={theme.colors.primary} />
          <Text style={[styles.permissionTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
            Camera Access Needed
          </Text>
          <Text style={[styles.permissionText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
            Allow camera access to scan student boarding QR codes.
          </Text>
          <Button title="Grant Permission" onPress={handleGrantCameraPermission} style={styles.permissionButton} />
        </View>
      )}

      {/* Dark Blurred Overlay mask around frame */}
      <View style={styles.cameraOverlayMask}>
        <View style={styles.header}>
          <Pressable onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/home' as any);
            }
          }} style={[styles.circleBtn, { backgroundColor: theme.colors.glass }]}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: '#FFF', fontFamily: theme.fonts.bold }]}>
              QR Boarding Scanner
            </Text>
            <Text style={[styles.headerSub, { color: 'rgba(255,255,255,0.7)', fontFamily: theme.fonts.medium }]}>
              Live QR confirmation engine
            </Text>
          </View>
          <Pressable
            onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
            style={[styles.circleBtn, { backgroundColor: theme.colors.glass }]}
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.scannerCenter}>
          <ScannerFrame />
          <Text style={[styles.scanHint, { color: '#FFF', fontFamily: theme.fonts.semiBold }]}>
            Position QR Code inside the brackets
          </Text>
        </View>

        <View style={styles.bottomControls}>
          <Pressable
            onPress={() => setTorchEnabled((current) => !current)}
            style={[styles.controlPill, { backgroundColor: theme.colors.glass }]}
          >
            <Ionicons
              name={torchEnabled ? 'flash' : 'flash-outline'}
              size={20}
              color={torchEnabled ? theme.colors.warning : '#FFF'}
            />
            <Text style={[styles.controlText, { color: '#FFF', fontFamily: theme.fonts.bold }]}>
              TORCH
            </Text>
          </Pressable>
        </View>

        {/* Quick Student QR Test Selector (Web/Testing) */}
        {pendingStudents.length > 0 && (
          <View style={{ position: 'absolute', bottom: 70, left: 16, right: 16, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 6, fontWeight: '600' }}>
              SIMULATE SCAN (TEST):
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {pendingStudents.map((st) => (
                <Pressable
                  key={st.id}
                  onPress={() => handleBarcodeScanned({ data: st.id } as BarcodeScanningResult)}
                  style={{
                    backgroundColor: 'rgba(62, 107, 255, 0.85)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 14,
                  }}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
                    📷 Scan {st.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Manual Student Confirmation bottom sheet */}
      <BottomSheet visible={!!candidate} onClose={retryScan} title="Boarding Candidate">
        {candidate ? (
          <View style={styles.confirmContent}>
            <View style={styles.confirmIdentity}>
              <Avatar name={candidate.student.name} url={candidate.student.photoUrl} size={64} />
              <View style={styles.confirmText}>
                <Text style={[styles.confirmName, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
                  {candidate.student.name}
                </Text>
                <Text style={[styles.confirmMeta, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
                  Class {candidate.student.className} · Roll {candidate.student.rollNumber}
                </Text>
              </View>
            </View>

            <View style={[styles.detailGrid, { borderColor: theme.colors.border }]}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.medium }]}>PICKUP STOP</Text>
                <Text style={[styles.detailValue, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>{candidate.stop.name}</Text>
              </View>
            </View>

            <View style={styles.confirmActions}>
              <Button title="Cancel" variant="secondary" onPress={retryScan} style={styles.confirmBtn} />
              <Button title="Confirm Boarding" onPress={confirmBoarding} style={styles.confirmBtn} />
            </View>
          </View>
        ) : null}
      </BottomSheet>

      {/* PREMIUM HIGH-TECH ALERTS AND SUCCESS CARDS */}
      {statusOverlay !== null && (
        <Animated.View 
          entering={FadeInDown.springify()} 
          exiting={FadeOutUp.duration(200)} 
          style={StyleSheet.absoluteFill}
        >
          <View style={[styles.overlayContainer, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <DashboardCard 
              style={[
                styles.statusCard, 
                { 
                  backgroundColor: 
                    statusOverlay.type === 'success' ? theme.colors.success || '#10B981' :
                    statusOverlay.type === 'wrong_bus' ? '#EF4444' :
                    statusOverlay.type === 'wrong_stop' ? '#F59E0B' :
                    statusOverlay.type === 'already_boarded' ? '#475569' : '#EF4444',
                  borderColor: 'rgba(255,255,255,0.1)'
                }
              ]}
            >
              <View style={styles.statusCardIconWrap}>
                <Ionicons 
                  name={
                    statusOverlay.type === 'success' ? 'checkmark-circle-outline' :
                    statusOverlay.type === 'wrong_bus' ? 'bus' :
                    statusOverlay.type === 'wrong_stop' ? 'warning-outline' : 'alert-circle-outline'
                  } 
                  size={50} 
                  color="#FFF" 
                />
              </View>
              
              <Text style={[styles.statusCardTitle, { color: '#FFF', fontFamily: theme.fonts.bold }]}>
                {statusOverlay.title.toUpperCase()}
              </Text>
              
              {statusOverlay.studentName && (
                <View style={styles.studentDetailsRow}>
                  <Avatar name={statusOverlay.studentName} url={statusOverlay.studentPhoto} size={48} />
                  <Text style={[styles.studentCardName, { color: '#FFF', fontFamily: theme.fonts.bold }]}>
                    {statusOverlay.studentName}
                  </Text>
                </View>
              )}

              <Text style={[styles.statusCardText, { color: '#FFF', fontFamily: theme.fonts.medium }]}>
                {statusOverlay.message}
              </Text>

              {statusOverlay.type !== 'success' && (
                <Button 
                  title="CONTINUE SCANNING" 
                  onPress={retryScan} 
                  style={styles.dismissBtn}
                  textStyle={{ color: '#000', fontFamily: theme.fonts.bold }}
                />
              )}
            </DashboardCard>
          </View>
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  permissionFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  permissionTitle: {
    fontSize: 24,
    lineHeight: 30,
    marginTop: 18,
  },
  permissionText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  permissionButton: {
    maxWidth: 260,
  },
  cameraOverlayMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 54,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  scannerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameWrap: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 10,
    height: 3.5,
    borderRadius: 99,
  },
  scanHint: {
    marginTop: 20,
    fontSize: 13,
  },
  bottomControls: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  controlPill: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlText: {
    fontSize: 13,
    letterSpacing: 0.8,
  },
  confirmContent: {
    gap: 16,
  },
  confirmIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  confirmText: {
    flex: 1,
  },
  confirmName: {
    fontSize: 18,
  },
  confirmMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  detailGrid: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  detailItem: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  statusCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  statusCardIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCardTitle: {
    fontSize: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  studentDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 12,
    borderRadius: 16,
    width: '100%',
  },
  studentCardName: {
    fontSize: 16,
    flex: 1,
  },
  statusCardText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  dismissBtn: {
    width: '100%',
    backgroundColor: '#FFF',
    height: 48,
    borderRadius: 14,
  },
});
