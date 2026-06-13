// ==================== AI Generation Types ====================

export type AIGenerationType =
  | 'AVATAR'
  | 'PERFORMANCE_PREDICTION'
  | 'REPORT_GENERATION'
  | 'RESULT_ANALYSIS'
  | 'ATTENDANCE_RISK'
  | 'RECOMMENDATION';

export type AIGenerationStatus = 'pending' | 'completed' | 'failed';

export type AvatarStyle =
  | 'professional'
  | 'modern-cartoon'
  | 'student-friendly'
  | 'minimal-illustration'
  | 'premium-saas';

export interface GeneratedAvatar {
  style: AvatarStyle;
  styleLabel: string;
  imageUrl: string;
}

export interface AIGenerationRecord {
  id?: number;
  userId: number;
  type: AIGenerationType;
  prompt?: string;
  status: AIGenerationStatus;
  resultUrl?: string;
  createdAt?: Date;
}
