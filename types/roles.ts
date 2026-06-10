export const roles = ['admin', 'teacher', 'parent', 'student'] as const;

export type Role = (typeof roles)[number];
