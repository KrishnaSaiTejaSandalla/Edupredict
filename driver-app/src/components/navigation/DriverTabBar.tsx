import React from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { IoniconName } from '@/types/icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n/i18n-context';
import { TranslationKey } from '@/i18n/translations';

const TAB_CONFIG: Record<
  string,
  {
    labelKey: TranslationKey;
    activeIcon: IoniconName;
    inactiveIcon: IoniconName;
  }
> = {
  home: { labelKey: 'nav_home', activeIcon: 'home', inactiveIcon: 'home-outline' },
  trip: { labelKey: 'nav_trip', activeIcon: 'navigate', inactiveIcon: 'navigate-outline' },
  students: { labelKey: 'nav_students', activeIcon: 'people', inactiveIcon: 'people-outline' },
  profile: { labelKey: 'nav_profile', activeIcon: 'person', inactiveIcon: 'person-outline' },
};

interface TabRoute {
  key: string;
  name: string;
  params?: object;
}

interface DriverTabBarProps {
  state: {
    index: number;
    routes: TabRoute[];
  };
  navigation: {
    emit: (event: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: object) => void;
  };
}

function DriverTabItem({
  label,
  activeIcon,
  inactiveIcon,
  focused,
  onPress,
}: {
  label: string;
  activeIcon: IoniconName;
  inactiveIcon: IoniconName;
  focused: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const pressed = useSharedValue(0);
  const isDark = theme.isDark;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(focused ? 1.04 : 1, theme.spring.gentle) },
      { scale: 1 - pressed.value * 0.04 },
    ],
  }));

  const activeBg = isDark ? 'rgba(56, 189, 248, 0.15)' : theme.colors.primarySurface;
  const activeBorder = isDark ? 'rgba(56, 189, 248, 0.3)' : 'transparent';
  const activeColor = isDark ? '#38BDF8' : theme.colors.primary;
  const inactiveColor = isDark ? '#8E98B8' : theme.colors.textTertiary;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 80 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, theme.spring.gentle);
      }}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          styles.tabInner,
          focused && styles.tabInnerFocused,
          focused && {
            backgroundColor: activeBg,
            borderColor: activeBorder,
            borderWidth: isDark ? 1 : 0,
          },
          animatedStyle,
        ]}
      >
        <Ionicons
          name={focused ? activeIcon : inactiveIcon}
          size={20}
          color={focused ? activeColor : inactiveColor}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: focused ? activeColor : inactiveColor,
              fontFamily: focused ? theme.fonts.bold : theme.fonts.medium,
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function DriverTabBar({ state, navigation }: DriverTabBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const visibleRoutes = state.routes.filter((route) => TAB_CONFIG[route.name]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.tabBackground,
          borderColor: theme.colors.tabBorder,
          shadowColor: theme.colors.cardShadow,
        },
      ]}
    >
      {visibleRoutes.map((route) => {
        const routeIndex = state.routes.findIndex((item) => item.key === route.key);
        const focused = state.index === routeIndex;
        const config = TAB_CONFIG[route.name];
        return (
          <DriverTabItem
            key={route.key}
            focused={focused}
            label={t(config.labelKey)}
            activeIcon={config.activeIcon}
            inactiveIcon={config.inactiveIcon}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    height: 66,
    borderWidth: 1,
    borderRadius: 33,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    elevation: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingVertical: 6,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 3,
  },
  tabInnerFocused: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
