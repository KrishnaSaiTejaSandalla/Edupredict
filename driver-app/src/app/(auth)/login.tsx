import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { IoniconName } from '@/types/icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { StorageService } from '@/services/storage.service';
import { isValidMobileNumber, normalizePhoneInput } from '@/utils/phone';
import { ENV } from '@/config/env';

type FieldName = 'mobileNumber' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

interface LoginFieldProps extends TextInputProps {
  label: string;
  icon: IoniconName;
  error?: string;
  trailing?: React.ReactNode;
}

function LoginField({ label, icon, error, trailing, onFocus, onBlur, ...props }: LoginFieldProps) {
  const theme = useTheme();
  const focus = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      [
        error ? theme.colors.danger : theme.colors.border,
        theme.colors.primary,
      ],
    ),
  }));

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
        {label}
      </Text>
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.inputBackground,
            borderRadius: theme.radius.md,
          },
          animatedStyle,
        ]}
      >
        <Ionicons name={icon} size={20} color={error ? theme.colors.danger : theme.colors.textTertiary} style={styles.fieldIcon} />
        <TextInput
          {...props}
          placeholderTextColor={theme.colors.inputPlaceholder}
          style={[styles.input, { color: theme.colors.textPrimary, fontFamily: theme.fonts.regular }]}
          onFocus={(event) => {
            focus.value = withTiming(1, { duration: 160 });
            onFocus?.(event);
          }}
          onBlur={(event) => {
            focus.value = withTiming(0, { duration: 160 });
            onBlur?.(event);
          }}
        />
        {trailing}
      </Animated.View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={theme.colors.danger} />
          <Text style={[styles.fieldError, { color: theme.colors.danger, fontFamily: theme.fonts.medium }]}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { login, loading, clearError } = useAuth();

  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const logoSource = require('@/assets/images/logo.png');

  const canSubmit = useMemo(
    () => mobileNumber.trim().length > 0 && password.trim().length > 0 && !loading,
    [loading, mobileNumber, password],
  );

  useEffect(() => {
    async function loadSavedMobile() {
      const [savedRememberMe, savedMobile] = await Promise.all([
        StorageService.getRememberMe(),
        StorageService.getSavedMobile(),
      ]);

      setRememberMe(savedRememberMe);
      if (savedRememberMe && savedMobile) {
        setMobileNumber(savedMobile);
      }
    }

    loadSavedMobile();
    clearError();
  }, [clearError]);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    const trimmedMobile = mobileNumber.trim();

    if (!trimmedMobile) {
      nextErrors.mobileNumber = 'Mobile number is required.';
    } else if (!isValidMobileNumber(trimmedMobile)) {
      nextErrors.mobileNumber = 'Enter a valid mobile number.';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    try {
      await login({
        mobileNumber: mobileNumber.trim(),
        password,
        rememberMe,
      });
      toast.success('Welcome back.');
      router.replace('/(tabs)/home');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed. Please try again.');
    }
  }

  function handleForgotPassword() {
    toast.info('Please contact your school transport administrator to reset your password.');
  }

  return (
    <ScreenWrapper safe={false} style={{ backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWrap}>
            <View style={styles.headerSection}>
              <View
                style={[
                  styles.logoOuterCircle,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderSubtle,
                    shadowColor: theme.colors.primary,
                  },
                ]}
              >
                <View style={[styles.logoWrapper, { backgroundColor: theme.colors.primarySurface }]}>
                  <Ionicons name="bus" size={36} color={theme.colors.primary} />
                </View>
              </View>
              <Text style={[styles.title, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
                EduPredict
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.primary, fontFamily: theme.fonts.mono }]}>
                DRIVER COMPANION
              </Text>
            </View>

            <View
              style={[
                styles.formCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: 28,
                  shadowColor: theme.colors.cardShadow,
                },
              ]}
            >
              <Text style={[styles.welcomeMsg, { color: theme.colors.textPrimary, fontFamily: theme.fonts.bold }]}>
                Welcome back
              </Text>
              <Text style={[styles.welcomeSubmsg, { color: theme.colors.textSecondary, fontFamily: theme.fonts.regular }]}>
                Sign in to start today's routes
              </Text>

              <LoginField
                label="MOBILE NUMBER"
                icon="call-outline"
                value={mobileNumber}
                error={errors.mobileNumber}
                onChangeText={(value) => {
                  setMobileNumber(normalizePhoneInput(value));
                  if (errors.mobileNumber) setErrors((current) => ({ ...current, mobileNumber: undefined }));
                }}
                placeholder="93929 79366"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
              />

              <LoginField
                label="PASSWORD"
                icon="lock-closed-outline"
                value={password}
                error={errors.password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                }}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    hitSlop={10}
                    style={styles.iconButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </Pressable>
                }
              />

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => setRememberMe((current) => !current)}
                  style={styles.rememberRow}
                  hitSlop={8}
                >
                  <Ionicons
                    name={rememberMe ? 'toggle' : 'toggle-outline'}
                    size={24}
                    color={rememberMe ? theme.colors.primary : theme.colors.textTertiary}
                  />
                  <Text style={[styles.rememberText, { color: theme.colors.textSecondary, fontFamily: theme.fonts.medium }]}>
                    Remember me
                  </Text>
                </Pressable>

                <Pressable onPress={handleForgotPassword} hitSlop={8}>
                  <Text style={[styles.forgotText, { color: theme.colors.primary, fontFamily: theme.fonts.semiBold }]}>
                    Forgot password?
                  </Text>
                </Pressable>
              </View>

              <Button
                title={loading ? 'Signing in...' : 'Sign In'}
                loading={loading}
                disabled={!canSubmit}
                onPress={handleLogin}
                style={[
                  styles.loginButton,
                  {
                    borderRadius: 22,
                    backgroundColor: theme.colors.accent,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.footerSection}>
            <Text style={[styles.footerText, { color: theme.colors.textTertiary, fontFamily: theme.fonts.mono }]}>
              v3.0  •  Build 2026.07  •  Encrypted session
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 24,
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoOuterCircle: {
    padding: 10,
    borderRadius: 9999,
    borderWidth: 1,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: 16,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '60%',
    height: '60%',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  formCard: {
    borderWidth: 1,
    padding: 24,
  },
  welcomeMsg: {
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 6,
  },
  welcomeSubmsg: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    minHeight: 54,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fieldIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 0,
    fontSize: 15,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  fieldError: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
  },
  rememberText: {
    fontSize: 14,
  },
  forgotText: {
    fontSize: 14,
  },
  loginButton: {
    height: 54,
    marginTop: 8,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerTextSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    opacity: 0.7,
  },
});
