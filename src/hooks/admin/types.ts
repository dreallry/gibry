import type { Book } from "@/lib/types/book";

export type AdminConfirmAction =
  | { type: "promoteAdmin" | "demoteAdmin" | "ban" | "unban"; data: { userId: string; userName: string } }
  | { type: "deleteBook"; data: Book }
  | { type: "deleteAnnouncement" | "deleteReadingList" | "deleteEvent" | "deleteReward"; data: string }
  | { type: "truncateUsers" };
