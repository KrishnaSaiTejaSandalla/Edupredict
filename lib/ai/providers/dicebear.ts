/**
 * DiceBear API Provider
 * Free, no-API-key deterministic avatar generation.
 * Supports multiple styles for avatar previews.
 * Can be swapped for DALL-E / Stability AI by replacing this provider.
 */

export type DiceBearStyle =
  | 'personas'
  | 'avataaars'
  | 'adventurer'
  | 'open-peeps'
  | 'notionists'
  | 'lorelei';

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x';

export interface DiceBearOptions {
  seed: string;
  style: DiceBearStyle;
  size?: number;
  backgroundColor?: string[];
  flip?: boolean;
}

export function buildDiceBearUrl(options: DiceBearOptions): string {
  const { seed, style, size = 256, backgroundColor = [] } = options;
  const params = new URLSearchParams({
    seed,
    size: size.toString(),
    backgroundType: 'solid',
    backgroundRotation: '0',
  });

  if (backgroundColor.length > 0) {
    params.set('backgroundColor', backgroundColor.join(','));
  }

  return `${DICEBEAR_BASE}/${style}/svg?${params.toString()}`;
}

/** The 5 actual profile-style avatars mapped to key names */
export const AVATAR_STYLE_MAP: Array<{
  key: string;
  label: string;
  style: DiceBearStyle;
  description: string;
}> = [
  {
    key: 'professional-portrait',
    label: 'Professional Portrait',
    style: 'personas',
    description: 'Clean, workplace-ready portrait',
  },
  {
    key: 'corporate-cartoon',
    label: 'Corporate Cartoon',
    style: 'avataaars',
    description: 'Modern, expressive profile cartoon',
  },
  {
    key: 'student-avatar',
    label: 'Student Avatar',
    style: 'adventurer',
    description: 'Creative, approach-friendly student cartoon',
  },
  {
    key: 'teacher-avatar',
    label: 'Teacher Avatar',
    style: 'open-peeps',
    description: 'Elegant hand-drawn education illustration',
  },
  {
    key: 'saas-illustration',
    label: 'SaaS Illustration',
    style: 'notionists',
    description: 'Minimal black & white Notion-style drawing',
  },
];
