import { ENV } from '@/config/env';

/**
 * Resolves a media URL (e.g. /uploads/profiles/...) into a full URL accessible by Image components.
 */
export function getMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  // Remove trailing /api or trailing slash from API_BASE_URL
  const baseUrl = ENV.API_BASE_URL.replace(/\/api\/?$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
}
