import React, { useState } from "react";
import { X, Search, BookOpen, CheckCircle2, AlertCircle, Loader2, Barcode, ArrowRight } from "lucide-react";
import { getBookByISBN, type Book } from "@/lib/firestore";
import { useNavigate } from "react-router-dom";

interface ISBNScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBook?: (book: Book) => void;
}

export const ISBNScannerModal: React.FC<ISBNScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectBook,
}) => {
  const navigate = useNavigate();
  const [isbnInput, setIsbnInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundBook, setFoundBook] = useState<Book | null>(null);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  async function handleSearch() {
    if (!isbnInput.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const book = await getBookByISBN(isbnInput.trim());
      setFoundBook(book);
    } catch (err) {
      console.error(err);
      setFoundBook(null);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenBook(book: Book) {
    onClose();
    if (onSelectBook) {
      onSelectBook(book);
    } else {
      navigate(`/books?search=${encodeURIComponent(book.judul)}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#fffdfa] rounded-3xl p-6 max-w-md w-full border border-[#dbd0ba] shadow-2xl relative text-[#4a3f35]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#ede5d8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Barcode size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base font-serif">Pindai / Cari ISBN</h3>
              <p className="text-[11px] text-[#7d6b56]">Cari buku fisik melalui nomor barcode ISBN</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f0e7d8] hover:bg-[#e2d5c1] flex items-center justify-center text-[#7d6b56] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input Bar */}
        <div className="mt-5 space-y-3">
          <label className="text-xs font-bold text-[#4a3f35] block">
            Nomor ISBN Buku
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={isbnInput}
                onChange={(e) => {
                  setIsbnInput(e.target.value);
                  setSearched(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Contoh: 978-602-03-8888-8"
                className="w-full pl-3.5 pr-3 py-2.5 bg-[#fcfaf7] border border-[#dbd0ba] rounded-xl text-xs text-[#4a3f35] focus:outline-none focus:border-amber-600"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !isbnInput.trim()}
              className="px-4 py-2.5 bg-[#8c6d48] hover:bg-[#735839] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              <span>Cari</span>
            </button>
          </div>
          <p className="text-[11px] text-[#7d6b56]">
            Lihat bagian belakang buku di dekat kode batang untuk menemukan nomor ISBN 10 atau 13 digit.
          </p>
        </div>

        {/* Result Area */}
        <div className="mt-5 pt-4 border-t border-[#ede5d8]">
          {loading && (
            <div className="py-8 text-center text-xs text-[#7d6b56] flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-amber-700" />
              <span>Mencari data buku di katalog...</span>
            </div>
          )}

          {!loading && searched && foundBook && (
            <div className="bg-[#f7f2e7] border border-[#dbd0ba] rounded-2xl p-4 flex gap-4 items-center">
              <div className="w-16 h-20 rounded-lg bg-[#e8dfcf] overflow-hidden shrink-0">
                {foundBook.cover ? (
                  <img src={foundBook.cover} alt={foundBook.judul} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#7d6b56]">
                    <BookOpen size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Ditemukan
                </span>
                <h4 className="font-bold text-xs text-[#4a3f35] truncate mt-1">{foundBook.judul}</h4>
                <p className="text-[11px] text-[#7d6b56] truncate">{foundBook.penulis}</p>
                <p className="text-[10px] text-[#a89984] mt-0.5">ISBN: {foundBook.isbn || "-"}</p>

                <button
                  onClick={() => handleOpenBook(foundBook)}
                  className="mt-2 text-xs font-bold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1"
                >
                  <span>Buka Halaman Buku</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {!loading && searched && !foundBook && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
              <AlertCircle size={24} className="text-red-500 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-red-900">Buku Tidak Ditemukan</p>
              <p className="text-[11px] text-red-700 mt-0.5">
                Nomor ISBN "{isbnInput}" belum terdaftar di katalog Gibry. Silakan hubungi pustakawan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
