export interface ContentReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType:
    | 'message'
    | 'community_post'
    | 'community_reply'
    | 'discussion'
    | 'review'
    | 'club_message'
    | 'user_profile';
  targetId: string;
  targetUserId: string;
  targetUserName: string;
  contentSnapshot: string;
  reason:
    | 'kata_kasar'
    | 'bullying'
    | 'sara'
    | 'spam'
    | 'konten_dewasa'
    | 'impersonasi'
    | 'lainnya';
  description?: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  adminNote?: string;
  actionTaken?: 'warning' | 'content_deleted' | 'user_banned' | 'none';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface UserBlock {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface InvitationCode {
  id: string;
  code: string;
  kelas: string;
  isActive: boolean;
  expiresAt: number; // Unix timestamp ms
  createdBy: string;
  createdAt: string;
  usedBy?: string | null;
  usedAt?: number | null;
}

export interface InvitationCodeLookup {
  codeId: string;
  kelas: string;
  isActive: boolean;
  expiresAt: number;
}
