import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  style,
}: BottomSheetProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={[styles.dismissBackdrop, { backgroundColor: theme.colors.overlay }]}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            },
            style,
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          {title && (
            <View style={styles.header}>
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
            </View>
          )}

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissBackdrop: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    maxHeight: '75%',
    paddingBottom: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
});
