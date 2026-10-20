import type { Book } from "./book";

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  bookId: string;
  rating: number;
  comment: string;
  createdAt?: number;
}

export interface Discussion {
  id: string;
  bookId: string;
  userId: string;
  text: string;
  parentId?: string | null;
  likes?: number;
  likedBy?: string[];
  createdAt?: number;
  userName?: string;
  userPhoto?: string;
}

export interface ReadingNote {
  id: string;
  userId: string;
  bookId: string;
  bookTitle?: string;
  content: string;
  page?: number;
  createdAt?: number;
}

export interface ReadingGoal {
  id: string;
  userId: string;
  month: string;
  target: number;
  current: number;
  createdAt?: number;
}

export interface ReadingList {
  id: string;
  title: string;
  description: string;
  bookIds: string[];
  createdBy: string;
  isPublic: boolean;
  createdAt?: number;
  books?: Book[];
}
