import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from '@/i18n/i18n-context';
import { StorageService } from '@/services/storage.service';
import { useAuthStore } from '@/store/auth.store';
import * as ImagePicker from 'expo-image-picker';
import { usePermissionStore } from '@/store/permission.store';

import { getMediaUrl } from '@/utils/media';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const { driver, logout } = useAuth();
  const isDark = theme.isDark;

  const [logoutVisible, setLogoutVisible] = useState(false);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [editNameModalVisible, setEditNameModalVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [nameInput, setNameInput] = useState(driver?.name || '');
  const [savingName, setSavingName] = useState(false);

  const activePhotoUri = getMediaUrl(driver?.photoUrl);
  const activeDriverName = driver?.name || 'Driver';

  const handleLogoutConfirm = async () => {
    setLogoutVisible(false);
    await logout();
    toast.success('Successfully logged out.');
    router.replace('/(auth)/login');
  };

  const handleSavePhoto = async (uri: string | null) => {
    setUploadingPhoto(true);
    try {
      if (uri) {
        await useAuthStore.getState().uploadDriverPhoto(uri);
        toast.success('Profile photo updated successfully.');
      } else {
        await useAuthStore.getState().removeDriverPhoto();
        toast.success('Profile photo removed.');
      }
      setPhotoSheetVisible(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSelectCamera = async () => {
    const cameraGrantedStore = usePermissionStore.getState().cameraGranted;
    if (!cameraGrantedStore) {
      setPhotoSheetVisible(false);
      toast.error('This feature is disabled. Please enable Camera Permission in Privacy & Safety to continue.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleSavePhoto(result.assets[0].uri);
      }
    } catch (err) {
      toast.error('Could not open camera.');
    }
  };

  const handleSelectGallery = async () => {
    const galleryGrantedStore = usePermissionStore.getState().galleryGranted;
    if (!galleryGrantedStore) {
      setPhotoSheetVisible(false);
      toast.error('This feature is disabled. Please enable Gallery Permission in Privacy & Safety to continue.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleSavePhoto(result.assets[0].uri);
      }
    } catch (err) {
      toast.error('Could not open gallery.');
    }
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) {
      toast.error('Driver name cannot be empty');
      return;
    }
    setSavingName(true);
    try {
      await useAuthStore.getState().updateDriverProfile({ name: nameInput.trim() });
      toast.success('Driver name updated successfully.');
      setEditNameModalVisible(false);
    } catch (err) {
      toast.error('Failed to update driver name.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <ScreenWrapper safe style={{ backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* DRIVER IDENTITY HEADER WITH AMBIENT PURPLE HALO GLOW */}
        <View style={styles.identityHeader}>
          <View style={styles.avatarWrapper}>
            {/* Soft Purple Ambient Glow in Dark Mode */}
            {isDark && <View style={styles.ambientGlow} />}

            <Pressable onPress={() => setPhotoSheetVisible(true)} style={styles.avatarPressable}>
              {activePhotoUri ? (
                <Image source={{ uri: activePhotoUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#38BDF8' : theme.colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {activeDriverName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              {/* Camera Badge Overlay */}
              <View style={[styles.cameraBadge, { backgroundColor: isDark ? '#202544' : '#FFFFFF', borderColor: theme.colors.border }]}>
                <Ionicons name="camera" size={14} color={isDark ? '#38BDF8' : theme.colors.primary} />
              </View>
            </Pressable>
          </View>

          {/* EDITABLE DRIVER NAME ROW */}
          <View style={styles.nameEditRow}>
            <Text style={[styles.driverNameText, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
              {activeDriverName}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setNameInput(activeDriverName);
                setEditNameModalVisible(true);
              }}
              style={[styles.editPencilBtn, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF' }]}
            >
              <Ionicons name="pencil" size={13} color={theme.colors.primary} />
              <Text style={[styles.editPencilText, { fontFamily: theme.fonts.bold, color: theme.colors.primary }]}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          {/* VERIFIED DRIVER BADGE */}
          <View
            style={[
              styles.verifiedBadge,
              { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : theme.colors.primarySurface },
            ]}
          >
            <Ionicons name="checkmark-sharp" size={14} color={isDark ? '#38BDF8' : theme.colors.primary} />
            <Text
              style={[
                styles.verifiedBadgeText,
                { color: isDark ? '#38BDF8' : theme.colors.primary, fontFamily: theme.fonts.mono },
              ]}
            >
              {t('verified_driver')}
            </Text>
          </View>
        </View>

        {/* READ-ONLY DRIVER DETAILS CARD (NO VEHICLE NICKNAME) */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.cardBackground,
              borderColor: theme.colors.cardBorder,
              shadowColor: theme.colors.cardShadow,
            },
          ]}
        >
          {/* DRIVER ID ROW */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : theme.colors.primarySurface }]}>
              <Ionicons name="stop-outline" size={18} color={isDark ? '#38BDF8' : theme.colors.primary} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={[styles.infoLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.mono }]}>
                {t('driver_id')}
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.textPrimary, fontFamily: theme.fonts.mono }]}>
                {driver?.id ? `DRV-${driver.id.padStart(4, '0')}` : t('not_available')}
              </Text>
            </View>
            <Text style={[styles.readOnlyBadge, { fontFamily: theme.fonts.mono, color: theme.colors.textTertiary }]}>READ-ONLY</Text>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: theme.colors.borderSubtle }]} />

          {/* PHONE ROW */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : theme.colors.primarySurface }]}>
              <Ionicons name="call-outline" size={18} color={isDark ? '#38BDF8' : theme.colors.primary} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={[styles.infoLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.mono }]}>
                {t('phone')}
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.textPrimary, fontFamily: theme.fonts.mono }]}>
                {driver?.phone ?? t('not_available')}
              </Text>
            </View>
            <Text style={[styles.readOnlyBadge, { fontFamily: theme.fonts.mono, color: theme.colors.textTertiary }]}>READ-ONLY</Text>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: theme.colors.borderSubtle }]} />

          {/* ASSIGNED BUS ROW */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : theme.colors.primarySurface }]}>
              <Ionicons name="bus-outline" size={18} color={isDark ? '#38BDF8' : theme.colors.primary} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={[styles.infoLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.mono }]}>
                {t('assigned_bus')}
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.textPrimary, fontFamily: theme.fonts.mono }]}>
                {driver?.assignedBus?.busNumber ?? t('not_available')}
              </Text>
            </View>
            <Text style={[styles.readOnlyBadge, { fontFamily: theme.fonts.mono, color: theme.colors.textTertiary }]}>READ-ONLY</Text>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: theme.colors.borderSubtle }]} />

          {/* ROUTE ROW */}
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : theme.colors.primarySurface }]}>
              <Ionicons name="navigate-outline" size={18} color={isDark ? '#38BDF8' : theme.colors.primary} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={[styles.infoLabel, { color: theme.colors.textTertiary, fontFamily: theme.fonts.mono }]}>
                {t('assigned_route')}
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
                {driver?.assignedRoute ?? t('not_available')}
              </Text>
            </View>
            <Text style={[styles.readOnlyBadge, { fontFamily: theme.fonts.mono, color: theme.colors.textTertiary }]}>READ-ONLY</Text>
          </View>
        </View>

        {/* QUICK NAVIGATION ACTION BUTTONS */}
        <View style={styles.actionList}>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={[
              styles.actionRowBtn,
              { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
            ]}
          >
            <Ionicons name="settings-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.actionRowText, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
              {t('settings_title')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* LOG OUT BUTTON */}
        <TouchableOpacity
          onPress={() => setLogoutVisible(true)}
          style={[
            styles.logoutPillBtn,
            {
              backgroundColor: isDark ? 'rgba(248, 113, 113, 0.12)' : theme.colors.dangerSurface,
              borderColor: isDark ? 'rgba(248, 113, 113, 0.25)' : '#FEE2E2',
            },
          ]}
        >
          <Text style={[styles.logoutPillText, { color: isDark ? '#F87171' : theme.colors.danger, fontFamily: theme.fonts.bold }]}>
            {t('btn_log_out')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* CHANGE PROFILE PHOTO BOTTOM SHEET */}
      <Modal visible={photoSheetVisible} transparent={true} animationType="slide" onRequestClose={() => setPhotoSheetVisible(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setPhotoSheetVisible(false)} style={modalStyles.overlay}>
          <TouchableOpacity activeOpacity={1} style={[modalStyles.sheetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={modalStyles.handle} />
            <Text style={[modalStyles.sheetTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
              {t('change_photo')}
            </Text>

            <TouchableOpacity onPress={handleSelectCamera} style={[styles.sheetOption, { backgroundColor: isDark ? '#202544' : '#F3F4F6' }]}>
              <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.sheetOptionText, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                {t('btn_camera')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSelectGallery} style={[styles.sheetOption, { backgroundColor: isDark ? '#202544' : '#F3F4F6' }]}>
              <Ionicons name="images-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.sheetOptionText, { fontFamily: theme.fonts.bold, color: theme.colors.textPrimary }]}>
                {t('btn_gallery')}
              </Text>
            </TouchableOpacity>

            {activePhotoUri && (
              <TouchableOpacity onPress={() => handleSavePhoto(null)} style={[styles.sheetOption, { backgroundColor: isDark ? 'rgba(248,113,113,0.15)' : '#FEF2F2' }]}>
                <Ionicons name="trash-outline" size={20} color={isDark ? '#F87171' : '#DC2626'} />
                <Text style={[styles.sheetOptionText, { fontFamily: theme.fonts.bold, color: isDark ? '#F87171' : '#DC2626' }]}>
                  {t('btn_remove_photo')}
                </Text>
              </TouchableOpacity>
            )}

            <Button title={t('btn_cancel')} variant="secondary" onPress={() => setPhotoSheetVisible(false)} style={{ marginTop: 8 }} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* EDIT DRIVER NAME MODAL */}
      <Modal visible={editNameModalVisible} transparent={true} animationType="fade" onRequestClose={() => setEditNameModalVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.dialogContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[modalStyles.dialogTitle, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
              {t('edit_name_title')}
            </Text>
            <Text style={[modalStyles.dialogSub, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
              {t('label_current_name')}
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter driver name..."
              placeholderTextColor={theme.colors.textTertiary}
              style={[
                modalStyles.input,
                {
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.inputBackground,
                  fontFamily: theme.fonts.medium,
                },
              ]}
              autoFocus
            />

            <View style={modalStyles.buttonRow}>
              <Button title={t('btn_cancel')} variant="secondary" onPress={() => setEditNameModalVisible(false)} style={{ flex: 1 }} />
              <Button title={t('btn_save')} variant="primary" loading={savingName} onPress={handleSaveName} style={{ flex: 1 }} />
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
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 20,
  },
  identityHeader: {
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(167, 139, 250, 0.25)',
    filter: Platform.OS === 'web' ? 'blur(16px)' : undefined,
  },
  avatarPressable: {
    position: 'relative',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverNameText: {
    fontSize: 22,
  },
  editPencilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  editPencilText: {
    fontSize: 11,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    gap: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextGroup: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 15,
  },
  readOnlyBadge: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  rowDivider: {
    height: 1,
    width: '100%',
  },
  actionList: {
    gap: 10,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  actionRowText: {
    flex: 1,
    fontSize: 15,
  },
  logoutPillBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutPillText: {
    fontSize: 15,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  sheetOptionText: {
    fontSize: 15,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  dialogContainer: {
    width: '90%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    gap: 12,
  },
  dialogTitle: {
    fontSize: 18,
  },
  dialogSub: {
    fontSize: 13,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
