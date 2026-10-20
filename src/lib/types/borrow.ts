export type BorrowStatus = "Menunggu Pengambilan" | "Dipinjam" | "Dikembalikan" | "Terlambat" | "Kadaluarsa";

export interface Borrow {
  id: string;
  userId: string;
  bookId: string;
  bookTitle?: string;
  bookCover?: string;
  bookPenulis?: string;
  bookGenre?: string;
  bookType?: "digital" | "fisik";
  pdfUrl?: string;
  lokasiRak?: string;
  kodePinjam?: string;
  tanggalPinjam: string;
  batasKembali: string;
  deadlineDays?: number;
  fineRate?: number;
  tanggalKembali: string | null;
  status: BorrowStatus;
  denda: number;
  dendaStatus?: "belum" | "lunas" | "waived";
  dendaPaidAt?: number;
  paymentMethod?: string;
  paymentTransactionId?: string;
  dendaWaivedReason?: string;
  userName?: string;
  createdAt?: number;
}
