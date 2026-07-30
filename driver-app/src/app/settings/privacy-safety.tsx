import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, Platform, Modal, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Divider } from '@/components/ui/Divider';
import { Button } from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/i18n/i18n-context';

interface ContactToCall {
  name: string;
  phone: string;
  roleKey: 'contact_admin' | 'contact_transport' | 'contact_helpline';
}

import { usePermissionStore } from '@/store/permission.store';

export default function PrivacySafetyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const isDark = theme.isDark;

  const [callModalVisible, setCallModalVisible] = useState(false);
  const [privacyPolicyModalVisible, setPrivacyPolicyModalVisible] = useState(false);
  const [targetContact, setTargetContact] = useState<ContactToCall | null>(null);

  // Bind to central Permission Store
  const locationGranted = usePermissionStore((s) => s.locationGranted);
  const cameraGranted = usePermissionStore((s) => s.cameraGranted);
  const galleryGranted = usePermissionStore((s) => s.galleryGranted);
  const notifGranted = usePermissionStore((s) => s.notificationsGranted);
  const bgSyncGranted = usePermissionStore((s) => s.backgroundSyncGranted);

  const setLocationGranted = usePermissionStore((s) => s.setLocationGranted);
  const setCameraGranted = usePermissionStore((s) => s.setCameraGranted);
  const setGalleryGranted = usePermissionStore((s) => s.setGalleryGranted);
  const setNotifGranted = usePermissionStore((s) => s.setNotificationsGranted);
  const setBgSyncGranted = usePermissionStore((s) => s.setBackgroundSyncGranted);

  useEffect(() => {
    // Load persistent permission states on screen mount
    usePermissionStore.getState().loadPermissions();
  }, []);

  const handleTogglePermission = async (
    type: 'location' | 'camera' | 'gallery' | 'notifications' | 'bgsync',
    currentVal: boolean
  ) => {
    const newVal = !currentVal;
    if (type === 'location') setLocationGranted(newVal);
    else if (type === 'camera') setCameraGranted(newVal);
    else if (type === 'gallery') setGalleryGranted(newVal);
    else if (type === 'notifications') setNotifGranted(newVal);
    else if (type === 'bgsync') setBgSyncGranted(newVal);

    toast.info(`Permission ${newVal ? 'enabled' : 'disabled'}.`);

    if (Platform.OS !== 'web' && newVal) {
      try {
        if (type === 'location') await Location.requestForegroundPermissionsAsync().catch(() => {});
        else if (type === 'camera') await ImagePicker.requestCameraPermissionsAsync().catch(() => {});
        else if (type === 'gallery') await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => {});
        else if (type === 'notifications') await Notifications.requestPermissionsAsync().catch(() => {});
      } catch {
        // Non-fatal permission request
      }
    }
  };

  const emergencyContacts: ContactToCall[] = [
    { name: 'School Admin', phone: '+91 98765 00001', roleKey: 'contact_admin' },
    { name: 'Transportation Manager', phone: '+91 98765 00002', roleKey: 'contact_transport' },
    { name: 'Support Helpline', phone: '+91 1800 123 4567', roleKey: 'contact_helpline' },
  ];

  const handleInitiateCall = (contact: ContactToCall) => {
    setTargetContact(contact);
    setCallModalVisible(true);
  };

  const handleConfirmCall = () => {
    setCallModalVisible(false);
    if (targetContact?.phone) {
      const cleanPhone = targetContact.phone.replace(/[^0-9+]/g, '');
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        toast.error(`Unable to place call to ${targetContact.name}`);
      });
    }
  };

  const handleOpenAppSettings = () => {
    if (Platform.OS === 'web') {
      toast.info('This option is available only on Android/iOS devices.');
      return;
    }
    toast.info('Opening app permissions in system settings...');
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:').catch(() => {
        toast.info('This option is available only on Android/iOS devices.');
      });
    } else if (Linking.openSettings) {
      Linking.openSettings().catch(() => {
        toast.info('This option is available only on Android/iOS devices.');
      });
    } else {
      toast.info('This option is available only on Android/iOS devices.');
    }
  };

  const handleOpenPrivacyPolicy = () => {
    setPrivacyPolicyModalVisible(true);
  };

  return (
    <ScreenWrapper safe style={{ backgroundColor: theme.colors.background }}>
      <Header title={t('privacy_title')} showBackButton={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* IN-APP PERMISSION MANAGER */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textTertiary }]}>
            Permission Manager
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            {/* Location Access */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
                  <Ionicons name="location" size={18} color={isDark ? '#38BDF8' : '#2563EB'} />
                </View>
                <View style={styles.rowTextGroup}>
                  <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                    {t('loc_access_title')}
                  </Text>
                  <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                    Always During Trip
                  </Text>
                </View>
              </View>
              <View style={styles.rowRightControl}>
                <View style={[styles.statusBadge, { backgroundColor: locationGranted ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5') : (isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2') }]}>
                  <Text style={[styles.statusBadgeText, { color: locationGranted ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626'), fontFamily: theme.fonts.bold }]}>
                    {locationGranted ? 'Granted' : 'Disabled'}
                  </Text>
                </View>
                <Switch
                  value={locationGranted}
                  onValueChange={() => handleTogglePermission('location', locationGranted)}
                  trackColor={{ false: theme.colors.border, true: '#38BDF8' }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                />
              </View>
            </View>

            <Divider color={theme.colors.borderSubtle} />

            {/* Camera Access */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : '#F3E8FF' }]}>
                  <Ionicons name="camera" size={18} color={isDark ? '#A78BFA' : '#7C3AED'} />
                </View>
                <View style={styles.rowTextGroup}>
                  <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                    {t('cam_access_title')}
                  </Text>
                  <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                    Required for QR Scanner
                  </Text>
                </View>
              </View>
              <View style={styles.rowRightControl}>
                <View style={[styles.statusBadge, { backgroundColor: cameraGranted ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5') : (isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2') }]}>
                  <Text style={[styles.statusBadgeText, { color: cameraGranted ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626'), fontFamily: theme.fonts.bold }]}>
                    {cameraGranted ? 'Granted' : 'Disabled'}
                  </Text>
                </View>
                <Switch
                  value={cameraGranted}
                  onValueChange={() => handleTogglePermission('camera', cameraGranted)}
                  trackColor={{ false: theme.colors.border, true: '#38BDF8' }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                />
              </View>
            </View>

            <Divider color={theme.colors.borderSubtle} />

            {/* Gallery Access */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5' }]}>
                  <Ionicons name="images" size={18} color={isDark ? '#34D399' : '#059669'} />
                </View>
                <View style={styles.rowTextGroup}>
                  <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                    Gallery Access
                  </Text>
                  <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                    Profile Photos
                  </Text>
                </View>
              </View>
              <View style={styles.rowRightControl}>
                <View style={[styles.statusBadge, { backgroundColor: galleryGranted ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5') : (isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2') }]}>
                  <Text style={[styles.statusBadgeText, { color: galleryGranted ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626'), fontFamily: theme.fonts.bold }]}>
                    {galleryGranted ? 'Granted' : 'Disabled'}
                  </Text>
                </View>
                <Switch
                  value={galleryGranted}
                  onValueChange={() => handleTogglePermission('gallery', galleryGranted)}
                  trackColor={{ false: theme.colors.border, true: '#38BDF8' }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                />
              </View>
            </View>

            <Divider color={theme.colors.borderSubtle} />

            {/* Notifications */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFFBEB' }]}>
                  <Ionicons name="notifications" size={18} color={isDark ? '#FBBF24' : '#D97706'} />
                </View>
                <View style={styles.rowTextGroup}>
                  <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                    {t('notif_title')}
                  </Text>
                  <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                    Push Alerts
                  </Text>
                </View>
              </View>
              <View style={styles.rowRightControl}>
                <View style={[styles.statusBadge, { backgroundColor: notifGranted ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5') : (isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2') }]}>
                  <Text style={[styles.statusBadgeText, { color: notifGranted ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626'), fontFamily: theme.fonts.bold }]}>
                    {notifGranted ? 'Granted' : 'Disabled'}
                  </Text>
                </View>
                <Switch
                  value={notifGranted}
                  onValueChange={() => handleTogglePermission('notifications', notifGranted)}
                  trackColor={{ false: theme.colors.border, true: '#38BDF8' }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                />
              </View>
            </View>

            <Divider color={theme.colors.borderSubtle} />

            {/* Background Sync */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
                  <Ionicons name="sync" size={18} color={isDark ? '#38BDF8' : '#2563EB'} />
                </View>
                <View style={styles.rowTextGroup}>
                  <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                    Background Sync
                  </Text>
                  <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                    Realtime Trip Updates
                  </Text>
                </View>
              </View>
              <View style={styles.rowRightControl}>
                <View style={[styles.statusBadge, { backgroundColor: bgSyncGranted ? (isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5') : (isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2') }]}>
                  <Text style={[styles.statusBadgeText, { color: bgSyncGranted ? (isDark ? '#34D399' : '#059669') : (isDark ? '#F87171' : '#DC2626'), fontFamily: theme.fonts.bold }]}>
                    {bgSyncGranted ? 'Granted' : 'Disabled'}
                  </Text>
                </View>
                <Switch
                  value={bgSyncGranted}
                  onValueChange={() => handleTogglePermission('bgsync', bgSyncGranted)}
                  trackColor={{ false: theme.colors.border, true: '#38BDF8' }}
                  thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
                />
              </View>
            </View>
          </View>
        </View>

        {/* SAFETY / EMERGENCY CONTACTS */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textTertiary }]}>
            {t('section_safety')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            {emergencyContacts.map((contact, idx) => (
              <React.Fragment key={contact.phone}>
                {idx > 0 && <Divider color={theme.colors.borderSubtle} />}
                <TouchableOpacity onPress={() => handleInitiateCall(contact)} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : '#FEF2F2' }]}>
                      <Ionicons name="call" size={18} color={isDark ? '#F87171' : '#DC2626'} />
                    </View>
                    <View style={styles.rowTextGroup}>
                      <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                        {t(contact.roleKey)}
                      </Text>
                      <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.mono, color: theme.colors.textSecondary }]}>
                        {contact.phone}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="call-outline" size={18} color={isDark ? '#F87171' : '#DC2626'} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* POLICIES BUTTON */}
        <View style={styles.section}>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              onPress={handleOpenPrivacyPolicy}
              style={[
                styles.actionBtn,
                { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
              ]}
            >
              <Ionicons name="document-text-outline" size={18} color={theme.colors.textPrimary} />
              <Text style={[styles.actionBtnText, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                {t('btn_privacy_policy')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* FULL PRIVACY POLICY MODAL */}
      <Modal visible={privacyPolicyModalVisible} transparent={true} animationType="slide" onRequestClose={() => setPrivacyPolicyModalVisible(false)}>
        <View style={ppStyles.overlay}>
          <View style={[ppStyles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={ppStyles.header}>
              <View style={ppStyles.headerTitleRow}>
                <Ionicons name="shield-checkmark" size={22} color={isDark ? '#38BDF8' : '#2563EB'} />
                <Text style={[ppStyles.headerTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                  {t('privacy_policy_title')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPrivacyPolicyModalVisible(false)} style={ppStyles.closeBtn}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={ppStyles.bodyScroll} showsVerticalScrollIndicator={false}>
              {/* 1. Information Collected */}
              <View style={ppStyles.section}>
                <Text style={[ppStyles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.primary }]}>
                  1. {t('pp_section1_title')}
                </Text>
                <Text style={[ppStyles.sectionText, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                  {t('pp_section1_body')}
                </Text>
              </View>

              {/* 2. Purpose of Data Usage */}
              <View style={ppStyles.section}>
                <Text style={[ppStyles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.primary }]}>
                  2. {t('pp_section2_title')}
                </Text>
                <Text style={[ppStyles.sectionText, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                  {t('pp_section2_body')}
                </Text>
              </View>

              {/* 3. Data Sharing & Privacy */}
              <View style={ppStyles.section}>
                <Text style={[ppStyles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.primary }]}>
                  3. {t('pp_section3_title')}
                </Text>
                <Text style={[ppStyles.sectionText, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                  {t('pp_section3_body')}
                </Text>
              </View>

              {/* 4. Security & Encryption */}
              <View style={ppStyles.section}>
                <Text style={[ppStyles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.primary }]}>
                  4. {t('pp_section4_title')}
                </Text>
                <Text style={[ppStyles.sectionText, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                  {t('pp_section4_body')}
                </Text>
              </View>

              {/* 5. User Rights & Contact */}
              <View style={ppStyles.section}>
                <Text style={[ppStyles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.primary }]}>
                  5. {t('pp_section5_title')}
                </Text>
                <Text style={[ppStyles.sectionText, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                  {t('pp_section5_body')}
                </Text>
              </View>
            </ScrollView>

            <Button title="Close" variant="primary" onPress={() => setPrivacyPolicyModalVisible(false)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>

      {/* CONFIRM EMERGENCY CALL MODAL */}
      <ConfirmationModal
        visible={callModalVisible}
        title={t('modal_emergency_call_title')}
        message={`${t('modal_emergency_call_msg')} ${targetContact?.name} (${targetContact?.phone})?`}
        confirmText="Call Now"
        isDestructive={false}
        onClose={() => setCallModalVisible(false)}
        onConfirm={handleConfirmCall}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  rowRightControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextGroup: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
  },
  rowSubtitle: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
  },
  buttonGroup: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  actionBtnText: {
    fontSize: 14,
  },
});

const ppStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
  },
  closeBtn: {
    padding: 4,
  },
  bodyScroll: {
    paddingVertical: 14,
    gap: 16,
  },
  section: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
