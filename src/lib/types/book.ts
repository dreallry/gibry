export interface Book {
  id: string;
  judul: string;
  penulis: string;
  penerbit: string;
  tahun: number;
  halaman: number;
  isbn: string;
  deskripsi: string;
  cover: string;
  coverUrl?: string;
  rating?: number;
  status: "Tersedia" | "Dipinjam";
  type?: "digital" | "fisik";
  pdfUrl?: string;
  lokasiRak?: string;
  genre?: string;
  createdAt?: number;
}

export interface BookFilters {
  search?: string;
  status?: string;
  year?: number;
  sort?: string;
  genre?: string;
  type?: string;
}
