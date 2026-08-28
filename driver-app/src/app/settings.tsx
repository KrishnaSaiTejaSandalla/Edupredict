import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, ScrollView, Modal, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Divider } from '@/components/ui/Divider';
import { Button } from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { useThemeContext } from '@/lib/theme-context';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/i18n/i18n-context';
import { SupportedLanguage } from '@/i18n/translations';
import { StorageService } from '@/services/storage.service';
import { useAuthStore } from '@/store/auth.store';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { logout, driver } = useAuth();
  const { isDark, toggleTheme } = useThemeContext();
  const { language, setLanguage, t } = useTranslation();

  const [logoutVisible, setLogoutVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [vehicleNickname, setVehicleNickname] = useState(driver?.assignedBus?.nickname || t('not_available'));
  const [savingNickname, setSavingNickname] = useState(false);

  useEffect(() => {
    if (driver?.assignedBus?.nickname) {
      setVehicleNickname(driver.assignedBus.nickname);
    } else {
      StorageService.getVehicleNickname().then((saved) => {
        if (saved) setVehicleNickname(saved);
      });
    }
  }, [driver?.assignedBus?.nickname]);

  const handleLogoutConfirm = async () => {
    setLogoutVisible(false);
    await logout();
    toast.success('Successfully logged out.');
    router.replace('/(auth)/login');
  };

  const handleSaveNickname = async () => {
    setSavingNickname(true);
    try {
      await useAuthStore.getState().updateDriverProfile({
        assignedBus: {
          nickname: vehicleNickname,
        },
      });
      toast.success('Vehicle nickname saved successfully.');
      setNicknameModalVisible(false);
    } catch (e) {
      toast.error('Failed to save vehicle nickname.');
    } finally {
      setSavingNickname(false);
    }
  };

  const languages: { key: SupportedLanguage; label: string; native: string }[] = [
    { key: 'en', label: 'English', native: 'English' },
    { key: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { key: 'te', label: 'Telugu', native: 'తెలుగు' },
  ];

  const currentLangObj = languages.find((l) => l.key === language) || languages[0];

  return (
    <ScreenWrapper safe style={{ backgroundColor: theme.colors.background }}>
      <Header title={t('settings_title')} showBackButton={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* PREFERENCES GROUP */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textTertiary }]}>
            {t('group_preferences')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            {/* Dark Mode */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(129, 140, 248, 0.15)' : '#EEF2FF' }]}>
                  <Ionicons name="moon" size={18} color={isDark ? '#818CF8' : '#4F46E5'} />
                </View>
                <Text style={[styles.rowText, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                  {t('setting_dark_mode')}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.colors.border, true: '#38BDF8' }}
                thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
              />
            </View>

            <Divider color={theme.colors.borderSubtle} />

            {/* Language Selector */}
            <TouchableOpacity onPress={() => setLangModalVisible(true)} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
                  <Ionicons name="globe-outline" size={18} color={isDark ? '#38BDF8' : '#2563EB'} />
                </View>
                <Text style={[styles.rowText, { fontFamily: theme.fonts.medium, color: theme.colors.textPrimary }]}>
                  {t('setting_language')}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowSubtext, { fontFamily: theme.fonts.bold, color: theme.colors.primary }]}>
                  {currentLangObj.native}
                </Text>
                <Ionicons name="chevron-forward-outline" size={16} color={theme.colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* VEHICLE INFORMATION GROUP */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textTertiary }]}>
            {t('group_vehicle')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            {/* Vehicle Nickname (Editable) */}
            <TouchableOpacity onPress={() => setNicknameModalVisible(true)} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFFBEB' }]}>
                  <Ionicons name="bus-outline" size={18} color={isDark ? '#FBBF24' : '#D97706'} />
                </View>
                <View style={styles.rowTextGroup}>
                  <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                    {t('setting_vehicle_nickname')}
                  </Text>
                  <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }]}>
                    {vehicleNickname}
                  </Text>
                </View>
              </View>
              <View style={styles.editChip}>
                <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                <Text style={[styles.editChipText, { fontFamily: theme.fonts.bold, color: theme.colors.primary }]}>Edit</Text>
              </View>
            </TouchableOpacity>

            <Divider color={theme.colors.borderSubtle} />

            {/* Registration Number (Read-only) */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5' }]}>
                  <Ionicons name="card-outline" size={18} color={isDark ? '#34D399' : '#059669'} />
                </View>
                <View style={styles.rowTextGroup}>
                  <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                    {t('setting_registration')}
                  </Text>
                  <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.mono, color: theme.colors.textSecondary }]}>
                    {driver?.assignedBus?.busNumber ?? t('not_available')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.readOnlyBadge, { fontFamily: theme.fonts.mono, color: theme.colors.textTertiary }]}>READ-ONLY</Text>
            </View>

            <Divider color={theme.colors.borderSubtle} />

            {/* Bus Capacity (Read-only) */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : '#F3E8FF' }]}>
                  <Ionicons name="people-outline" size={18} color={isDark ? '#A78BFA' : '#7C3AED'} />
                </View>
                <View style={styles.rowTextGroup}>
                  <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                    {t('setting_bus_capacity')}
                  </Text>
                  <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }]}>
                    {driver?.assignedBus?.capacity ? `${driver.assignedBus.capacity} Seats` : t('not_available')}
                  </Text>
                </View>
              </View>
            </View>

            <Divider color={theme.colors.borderSubtle} />

            {/* Assigned Route (Read-only) */}
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}>
                  <Ionicons name="navigate-outline" size={18} color={isDark ? '#38BDF8' : '#2563EB'} />
                </View>
                <View style={styles.rowTextGroup}>
                  <Text style={[styles.rowTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                    {t('dash_route_label')}
                  </Text>
                  <Text style={[styles.rowSubtitle, { fontFamily: theme.fonts.bold, color: theme.colors.textSecondary }]}>
                    {driver?.assignedRoute ?? t('not_available')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SUPPORT & PRIVACY GROUP */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold, color: theme.colors.textTertiary }]}>
            {t('group_support_privacy')}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            {/* Privacy & Safety */}
            <TouchableOpacity onPress={() => router.push('/settings/privacy-safety' as any)} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#ECFDF5' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={isDark ? '#34D399' : '#059669'} />
                </View>
                <Text style={[styles.rowText, { fontFamily: theme.fonts.medium, color: theme.colors.textPrimary }]}>
                  {t('setting_privacy_safety')}
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>

            <Divider color={theme.colors.borderSubtle} />

            {/* Help & Support */}
            <TouchableOpacity onPress={() => router.push('/settings/help-support' as any)} style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : '#FFFBEB' }]}>
                  <Ionicons name="help-circle-outline" size={18} color={isDark ? '#FBBF24' : '#D97706'} />
                </View>
                <Text style={[styles.rowText, { fontFamily: theme.fonts.medium, color: theme.colors.textPrimary }]}>
                  {t('setting_help_support')}
                </Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* LOG OUT BUTTON */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => setLogoutVisible(true)}
            style={[
              styles.card,
              styles.row,
              {
                backgroundColor: isDark ? 'rgba(248, 113, 113, 0.12)' : '#FEF2F2',
                borderColor: isDark ? 'rgba(248, 113, 113, 0.25)' : '#FECACA',
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(248, 113, 113, 0.2)' : '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={18} color={isDark ? '#F87171' : '#DC2626'} />
              </View>
              <Text style={[styles.rowText, { fontFamily: theme.fonts.bold, color: isDark ? '#F87171' : '#DC2626' }]}>
                {t('btn_log_out')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* COMPACT FOOTER BRANDING */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }]}>
            {t('footer_partner')} • {t('footer_version')}
          </Text>
          <Text style={[styles.footerSub, { fontFamily: theme.fonts.regular, color: theme.colors.textTertiary }]}>
            {t('footer_last_update')}
          </Text>
        </View>
      </ScrollView>

      {/* LANGUAGE SELECTOR MODAL */}
      <Modal visible={langModalVisible} transparent={true} animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 24 }]}>
            <Text style={[modalStyles.title, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
              {t('setting_language')}
            </Text>

            <View style={styles.langList}>
              {languages.map((l) => {
                const selected = language === l.key;
                return (
                  <TouchableOpacity
                    key={l.key}
                    onPress={() => {
                      setLanguage(l.key);
                      setLangModalVisible(false);
                      toast.success(`Language set to ${l.label}`);
                    }}
                    style={[
                      styles.langOptionRow,
                      {
                        backgroundColor: selected
                          ? (isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF')
                          : (isDark ? '#202544' : '#F9FAFB'),
                        borderColor: selected ? (isDark ? '#38BDF8' : '#2563EB') : theme.colors.borderSubtle,
                      },
                    ]}
                  >
                    <View style={styles.langRadioWrap}>
                      <View
                        style={[
                          styles.radioOuter,
                          { borderColor: selected ? (isDark ? '#38BDF8' : '#2563EB') : theme.colors.textTertiary },
                        ]}
                      >
                        {selected && <View style={[styles.radioInner, { backgroundColor: isDark ? '#38BDF8' : '#2563EB' }]} />}
                      </View>
                      <View>
                        <Text style={[styles.langNative, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                          {l.native}
                        </Text>
                        <Text style={[styles.langLabel, { fontFamily: theme.fonts.regular, color: theme.colors.textSecondary }]}>
                          {l.label}
                        </Text>
                      </View>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={isDark ? '#38BDF8' : '#2563EB'} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button title={t('btn_cancel')} variant="secondary" onPress={() => setLangModalVisible(false)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>

      {/* EDIT VEHICLE NICKNAME MODAL */}
      <Modal visible={nicknameModalVisible} transparent={true} animationType="fade" onRequestClose={() => setNicknameModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: 24 }]}>
            <Text style={[modalStyles.title, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
              {t('setting_vehicle_nickname')}
            </Text>
            <TextInput
              value={vehicleNickname}
              onChangeText={setVehicleNickname}
              placeholder="Enter vehicle nickname..."
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                modalStyles.input,
                {
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.inputBackground,
                  fontFamily: theme.fonts.medium,
                  borderRadius: 14,
                },
              ]}
              autoFocus
            />

            <View style={modalStyles.buttonRow}>
              <Button title={t('btn_cancel')} variant="secondary" onPress={() => setNicknameModalVisible(false)} style={{ flex: 1 }} />
              <Button title={t('btn_save')} variant="primary" loading={savingNickname} onPress={handleSaveNickname} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* LOGOUT CONFIRMATION MODAL */}
      <ConfirmationModal
        visible={logoutVisible}
        title={t('btn_log_out')}
        message={t('msg_logout_confirm')}
        confirmText={t('btn_log_out')}
        isDestructive={true}
        onClose={() => setLogoutVisible(false)}
        onConfirm={handleLogoutConfirm}
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
    minHeight: 58,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  rowTextGroup: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
  },
  rowSubtitle: {
    fontSize: 13,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 15,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowSubtext: {
    fontSize: 14,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  editChipText: {
    fontSize: 12,
  },
  readOnlyBadge: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
    gap: 2,
  },
  footerText: {
    fontSize: 12,
  },
  footerSub: {
    fontSize: 11,
  },
  langList: {
    gap: 10,
    marginVertical: 12,
  },
  langOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  langRadioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  langNative: {
    fontSize: 15,
  },
  langLabel: {
    fontSize: 12,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 18,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
});
