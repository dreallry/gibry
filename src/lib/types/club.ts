export interface BookClub {
  id: string;
  name: string;
  description: string;
  bookId?: string;
  bookTitle?: string;
  createdBy: string;
  memberCount: number;
  createdAt?: number;
}

export interface ClubMember {
  id: string;
  userId: string;
  clubId: string;
  role: "admin" | "member";
  joinedAt?: number;
}

export interface ClubMessage {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt?: number;
}

export interface DetailedClubMember {
  memberId: string;
  userId: string;
  clubId: string;
  role: "admin" | "member";
  joinedAt?: number;
  nama: string;
  username?: string;
  photoURL?: string;
  totalPoints?: number;
  displayBadge?: string;
  isCreator?: boolean;
}
