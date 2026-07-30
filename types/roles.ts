export const roles = ['admin', 'teacher', 'parent', 'student', 'driver'] as const;

export type Role = (typeof roles)[number];
