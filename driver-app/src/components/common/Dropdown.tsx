import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  label?: string;
  options: DropdownOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function Dropdown({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select option',
  style,
}: DropdownProps) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              fontFamily: theme.fonts.medium,
              fontSize: theme.fontSizes.xs,
              color: theme.colors.textSecondary,
            },
          ]}
        >
          {label}
        </Text>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text
          style={[
            styles.valueText,
            {
              fontFamily: theme.fonts.regular,
              fontSize: theme.fontSizes.base,
              color: selectedOption ? theme.colors.textPrimary : theme.colors.inputPlaceholder,
            },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down-outline"
          size={theme.iconSize.sm}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
          style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                ...theme.elevation.lg,
              },
            ]}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    onValueChange(item.value);
                    setModalVisible(false);
                  }}
                  style={styles.optionItem}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        fontFamily:
                          item.value === selectedValue
                            ? theme.fonts.semiBold
                            : theme.fonts.regular,
                        fontSize: theme.fontSizes.base,
                        color:
                          item.value === selectedValue
                            ? theme.colors.primary
                            : theme.colors.textPrimary,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <Ionicons
                      name="checkmark-outline"
                      size={theme.iconSize.md}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  valueText: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: 300,
    borderWidth: 1,
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: {
    flex: 1,
  },
  separator: {
    height: 1,
  },
});
