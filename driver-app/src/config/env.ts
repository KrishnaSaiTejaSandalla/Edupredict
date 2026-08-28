import Constants from 'expo-constants';

type AppEnv = 'development' | 'staging' | 'production';

interface EnvConfig {
  API_BASE_URL: string;
  APP_ENV: AppEnv;
  APP_VERSION: string;
  APP_BUILD: string;
  TIMEOUT_MS: number;
}

function getEnvVar(key: string, fallback: string): string {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  return extra?.[key] ?? fallback;
}

const APP_ENV = getEnvVar('APP_ENV', 'development') as AppEnv;

export const ENV: EnvConfig = {
  API_BASE_URL: getEnvVar('API_BASE_URL', 'http://localhost:3000/api'),
  APP_ENV,
  APP_VERSION: Constants.expoConfig?.version ?? '1.0.0',
  APP_BUILD: String(Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '1'),
  TIMEOUT_MS: 15_000,
};

export const IS_DEV = APP_ENV === 'development';
export const IS_PROD = APP_ENV === 'production';
