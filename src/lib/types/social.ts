export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  toUserId: string;
  toUserName?: string;
  toUserPhoto?: string;
  status: "pending" | "accepted" | "declined";
  createdAt?: number;
}

export interface Friend extends FriendRequest {
  friendId: string;
  friendName: string;
  friendPhoto: string;
  friendBadge: string | null;
  friendPoints: number;
  fromDisplayBadge?: string | null;
  toDisplayBadge?: string | null;
  fromTotalPoints?: number;
  toTotalPoints?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt?: number;
  deleted?: boolean;
  deletedAt?: number;
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  type: "borrow" | "return" | "review" | "favorite" | "attendance";
  bookTitle?: string;
  rating?: number;
  comment?: string;
  createdAt?: number;
}

export interface CommunityPost {
  id: string;
  type: "quote" | "ask" | "thought";
  userId: string;
  userName: string;
  userUsername?: string;
  userPhoto?: string;
  userDisplayBadge?: string | null;
  userLevel?: number;

  // Content
  content: string;

  // For type === "quote"
  bookId?: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookCover?: string;
  pageNumber?: number;
  reflection?: string;

  // For type === "ask"
  topicTags?: string[];

  // Social interactions
  likesCount: number;
  likedBy?: Record<string, boolean>;
  savedCount: number;
  savedBy?: Record<string, boolean>;
  repliesCount: number;

  createdAt?: number;
}

export interface CommunityReply {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userRole?: string;
  text: string;

  linkedBook?: {
    id: string;
    judul: string;
    penulis: string;
    cover?: string;
  };

  createdAt?: number;
}
