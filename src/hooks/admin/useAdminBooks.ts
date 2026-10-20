import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import { createBook, updateBook, deleteBook, logAuditEvent, type Book } from "@/lib/firestore";
import type { useAdminData } from './useAdminData';
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useAdminBooks({ toast, user, profile, loadData }: {
  toast: ReturnType<typeof useToast>["toast"];
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  loadData: ReturnType<typeof useAdminData>["loadData"];
}) {
  // Book CRUD form state
  const [showBookModal, setShowBookModal] = useState(false);

  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const [savingBook, setSavingBook] = useState(false);

  const [bookFormData, setBookFormData] = useState({
    judul: "",
    penulis: "",
    penerbit: "",
    tahun: new Date().getFullYear(),
    halaman: 150,
    isbn: "",
    deskripsi: "",
    cover: "",
    status: "Tersedia" as "Tersedia" | "Dipinjam",
    type: "digital" as "digital" | "fisik",
    pdfUrl: "",
    lokasiRak: "",
    genre: "Fiksi",
  });

  function handleOpenAddBook() {
    setEditingBook(null);
    setBookFormData({
      judul: "",
      penulis: "",
      penerbit: "",
      tahun: new Date().getFullYear(),
      halaman: 150,
      isbn: "",
      deskripsi: "",
      cover: "",
      status: "Tersedia",
      type: "digital",
      pdfUrl: "",
      lokasiRak: "",
      genre: "Fiksi",
    });
    setShowBookModal(true);
  }

  function handleOpenEditBook(book: Book) {
    setEditingBook(book);
    setBookFormData({
      judul: book.judul || "",
      penulis: book.penulis || "",
      penerbit: book.penerbit || "",
      tahun: book.tahun || new Date().getFullYear(),
      halaman: book.halaman || 0,
      isbn: book.isbn || "",
      deskripsi: book.deskripsi || "",
      cover: book.cover || "",
      status: book.status || "Tersedia",
      type: book.type || "digital",
      pdfUrl: book.pdfUrl || "",
      lokasiRak: book.lokasiRak || "",
      genre: book.genre || "Fiksi",
    });
    setShowBookModal(true);
  }

  async function handleSaveBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookFormData.judul || !bookFormData.penulis) {
      toast("error", "Judul dan Penulis wajib diisi!");
      return;
    }
    setSavingBook(true);
    try {
      if (editingBook) {
        await updateBook(editingBook.id, bookFormData);
        if (user) {
          logAuditEvent("update_book", user.uid, { bookId: editingBook.id, bookTitle: bookFormData.judul }, profile?.nama || user.email || "Admin");
        }
        toast("success", `Buku "${bookFormData.judul}" berhasil diperbarui!`);
      } else {
        const newBookId = await createBook(bookFormData);
        if (user) {
          logAuditEvent("create_book", user.uid, { bookId: newBookId, bookTitle: bookFormData.judul }, profile?.nama || user.email || "Admin");
        }
        toast("success", `Buku baru "${bookFormData.judul}" berhasil ditambahkan!`);
      }
      setShowBookModal(false);
      loadData();
    } catch (err) {
      toast("error", getErrorMessage(err, "Gagal menyimpan buku"));
    } finally {
      setSavingBook(false);
    }
  }

  async function handleDeleteBook(bookId: string, bookTitle: string) {
    try {
      await deleteBook(bookId);
      if (user) {
        logAuditEvent("delete_book", user.uid, { bookId, bookTitle }, profile?.nama || user.email || "Admin");
      }
      toast("success", `Buku "${bookTitle}" telah dihapus.`);
      loadData();
    } catch (err) {
      toast("error", getErrorMessage(err, "Gagal menghapus buku"));
    }
  }

  return {
    showBookModal,
    setShowBookModal,
    editingBook,
    savingBook,
    bookFormData,
    setBookFormData,
    handleOpenAddBook,
    handleOpenEditBook,
    handleSaveBook,
    handleDeleteBook,
  };
}
