export function getEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function validateEnv() {
  // Required envs
  getEnv('MYSQL_HOST');
  getEnv('MYSQL_USER');
  getEnv('MYSQL_PASSWORD');
  getEnv('MYSQL_DATABASE');
  getEnv('NEXTAUTH_SECRET', '');
}

export const SESSION_COOKIE_NAME = 'edupredict_session';
