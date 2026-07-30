import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '../ui/Button';

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmationModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
}: ConfirmationModalProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              ...theme.elevation.lg,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                fontFamily: theme.fonts.bold,
                fontSize: theme.fontSizes.lg,
                color: theme.colors.textPrimary,
              },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.message,
              {
                fontFamily: theme.fonts.regular,
                fontSize: theme.fontSizes.sm,
                color: theme.colors.textSecondary,
              },
            ]}
          >
            {message}
          </Text>

          <View style={styles.actions}>
            <Button
              title={cancelText}
              variant="secondary"
              onPress={onClose}
              style={styles.button}
            />
            <Button
              title={confirmText}
              variant={isDestructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.button}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 44,
  },
});
