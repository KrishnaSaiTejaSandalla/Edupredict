/**
 * Web shim for expo-secure-store.
 *
 * expo-secure-store v57's built-in web shim is an empty default export (`export default {}`),
 * which causes runtime errors when any public API (e.g. `getItemAsync`) is called because
 * it delegates to `ExpoSecureStore.getValueWithKeyAsync` — a function that doesn't exist
 * on the empty web stub.
 *
 * This shim provides no-op / localStorage-backed implementations of the public API so
 * that any transitive import of expo-secure-store on web never crashes.
 *
 * NOTE: The primary storage access path (StorageService) already guards with `Platform.OS`,
 * so these functions should rarely (if ever) be reached directly. They exist purely as a
 * safety net.
 */

export const AFTER_FIRST_UNLOCK = 0;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 1;
export const ALWAYS = 2;
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 3;
export const ALWAYS_THIS_DEVICE_ONLY = 4;
export const WHEN_UNLOCKED = 5;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;

export async function isAvailableAsync(): Promise<boolean> {
  return false;
}

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently fail on web if localStorage is unavailable
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
}

export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently fail
  }
}

export function canUseBiometricAuthentication(): boolean {
  return false;
}
