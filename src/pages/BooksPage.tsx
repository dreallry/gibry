import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { getBooks, getDistinctYears, getUserFavorites, createReservation, toggleFavorite, borrowBook, borrowBooks, getGenreCategories, getFineRate, toggleWishlist, getSmartRecommendations, type Book } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { Search, Heart, X, Loader2, BookOpen, AlertCircle, SlidersHorizontal, BookMarked, Smartphone, Bookmark, MapPin, Barcode, Sparkles, Lightbulb, ShoppingCart, Trash2 } from "lucide-react";
import { BookGridSkeleton } from "@/components/Skeleton";
import { BookReviews } from "@/components/book/BookReviews";
import { BookDiscussions } from "@/components/book/BookDiscussions";
import { ReadingLists } from "@/components/book/ReadingLists";
import { PageTransition } from "@/components/PageTransition";
import { ISBNScannerModal } from "@/components/book/ISBNScannerModal";
import { BookSuggestionModal } from "@/components/book/BookSuggestionModal";

export default function BooksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<number[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [reservationCounts, setReservationCounts] = useState<Record<string, number>>({});
  const [borrowing, setBorrowing] = useState(false);
  const [borrowMsg, setBorrowMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [selectedDeadline, setSelectedDeadline] = useState(14);
  const [bookDetailTab, setBookDetailTab] = useState<"ulasan" | "diskusi">("ulasan");
  const [cartBooks, setCartBooks] = useState<Book[]>([]);
  const [showIsbnModal, setShowIsbnModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [smartRecs, setSmartRecs] = useState<{
    personalized: Book[];
    becauseYouRead?: { baseBook: string; books: Book[] };
  } | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const year = searchParams.get("year") || "";
  const sort = searchParams.get("sort") || "newest";
  const bookType = searchParams.get("type") || "";

  // Initialize search input from URL
  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [booksData, yearsData] = await Promise.all([
        getBooks({ search: search || undefined, status: status !== "all" ? status : undefined, year: year ? Number(year) : undefined, genre: searchParams.get("genre") || undefined, sort, type: bookType || undefined }),
        getDistinctYears(),
      ]);
      setBooks(booksData);
      setYears(yearsData);
      setReservationCounts({});
      setFavorites([]);
      setWishlist([]);
      setSmartRecs(null);
      if (user) {
        const counts: Record<string, number> = {};
        const rSnap = await get(ref(db, "book_reservations"));
        if (rSnap.exists()) {
          const allReservations = Object.values(rSnap.val()) as any[];
          for (const r of allReservations) {
            if (r.status === "waiting" && (!r.expiresAt || r.expiresAt > Date.now()) && r.bookId) {
              counts[r.bookId] = (counts[r.bookId] || 0) + 1;
            }
          }
        }
        setReservationCounts(counts);
        setFavorites(await getUserFavorites(user.uid));
        // Load wishlist
        const wishSnap = await get(ref(db, "wishlists"));
        const wishlistIds: string[] = [];
        if (wishSnap.exists()) {
          for (const val of Object.values(wishSnap.val())) {
            if ((val as any).userId === user.uid) wishlistIds.push((val as any).bookId);
          }
        }
        setWishlist(wishlistIds);

        // Load AI Smart Recommendations
        getSmartRecommendations(user.uid).then(setSmartRecs).catch(() => { });
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [search, status, year, sort, bookType, searchParams, user]);

  useEffect(() => { setSearchInput(search); }, [search]);

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      updateFilter("search", value);
    }, 300);
  }, [updateFilter]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setCartBooks([]); }, [user?.uid]);
  useEffect(() => {
    if (!selectedBook) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedBook(null); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBook]);

  async function handleToggleFav(bookId: string) {
    if (!user) return;
    const action = await toggleFavorite(user.uid, bookId);
    setFavorites((prev) => action === "added" ? [...prev, bookId] : prev.filter((id) => id !== bookId));
    if (action === "added") {
      toast("success", "Berhasil ditambahkan ke favorit!");
    } else {
      toast("info", "Dihapus dari favorit");
    }
  }

  async function handleToggleWishlist(bookId: string) {
    if (!user) return;
    const added = await toggleWishlist(user.uid, bookId);
    setWishlist((prev) => added ? [...prev, bookId] : prev.filter((id) => id !== bookId));
    toast("success", added ? "Ditambahkan ke 'Ingin Dibaca'!" : "Dihapus dari wishlist");
  }

  async function handleReserve(bookId: string) {
    if (!user) return;
    try {
      await createReservation(user.uid, bookId);
      toast("success", "Berhasil mengantri! Anda akan diberitahu saat buku tersedia.");
    } catch (err: any) {
      toast("error", err.message || "Gagal mengantri buku");
    }
  }

  async function handleBorrow(bookId: string) {
    if (!user) return;
    setBorrowing(true); setBorrowMsg(null);
    try {
      const book = books.find(b => b.id === bookId);
      await borrowBook(user.uid, bookId, selectedDeadline);
      setCartBooks((current) => current.filter((item) => item.id !== bookId));
      setSelectedBook((current) => current ? { ...current, status: "Dipinjam" } : null);

      const msg = book?.type === "fisik"
        ? `Buku fisik berhasil dibooking! Silakan ambil di perpustakaan.`
        : `Akses E-Book gratis aktif! Tenggat: ${selectedDeadline} hari.`;
      setBorrowMsg({ type: "ok", text: msg });
      toast("success", msg);
      const updated = await getBooks({ search: search || undefined, status: status !== "all" ? status : undefined, year: year ? Number(year) : undefined, genre: searchParams.get("genre") || undefined, sort, type: bookType || undefined });
      setBooks(updated);
      const fresh = updated.find((b) => b.id === bookId);
      if (fresh) setSelectedBook(fresh);
      if (user) setFavorites(await getUserFavorites(user.uid));
    } catch (err: any) { setBorrowMsg({ type: "err", text: err.message || "Gagal meminjam buku" }); toast("error", err.message || "Gagal meminjam buku"); } finally { setBorrowing(false); }
  }

  function addToCart(book: Book) {
    if (cartBooks.some((item) => item.id === book.id)) return toast("info", "Buku sudah ada di keranjang.");
    if (cartBooks.length >= 3) return toast("error", "Maksimal 3 buku dalam satu peminjaman.");
    setCartBooks((current) => [...current, book]);
    toast("success", `"${book.judul}" masuk keranjang peminjaman.`);
  }

  async function handleBorrowCart() {
    if (!user || cartBooks.length === 0) return;
    const bookIds = cartBooks.map((book) => book.id);
    const cartSize = cartBooks.length;
    setBorrowing(true);
    try {
      await borrowBooks(user.uid, bookIds, selectedDeadline);
      setCartBooks([]);
      setSelectedBook(null);
      toast("success", `${cartSize} buku berhasil dipinjam gratis.`);
      await loadData();
    } catch (err: any) {
      toast("error", err.message || "Gagal meminjam buku dari keranjang.");
    } finally { setBorrowing(false); }
  }

  const activeFilterCount = [status !== "all", !!year, !!searchParams.get("genre"), !!bookType].filter(Boolean).length;

  return (
    <PageTransition>
      <div className="tile">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-display-lg mb-2">Koleksi Buku</h1>
            <p style={{ color: "var(--color-muted-foreground)" }}>{loading ? "Memuat..." : `${books.length} buku ditemukan`}</p>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={18} style={{ color: "var(--color-muted-foreground)" }} />
              <input type="text" value={searchInput} onChange={(e) => handleSearchChange(e.target.value)} className="search-pill search-pill-icon pr-12" placeholder="Cari berdasarkan judul, penulis, atau penerbit..." />
              {searchInput && <button onClick={() => { setSearchInput(""); updateFilter("search", ""); }} className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "var(--color-muted-foreground)" }}><X size={16} /></button>}
            </div>
          </div>

          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all" style={{ background: showFilters || activeFilterCount > 0 ? "var(--color-primary)" : "var(--color-card)", color: showFilters || activeFilterCount > 0 ? "var(--color-primary-foreground)" : "var(--color-foreground)", borderColor: showFilters || activeFilterCount > 0 ? "var(--color-primary)" : "var(--color-border)" }}>
                <SlidersHorizontal size={14} /> Filter {activeFilterCount > 0 && <span className="w-5 h-5 rounded-full text-[10px] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>{activeFilterCount}</span>}
              </button>
              {["all", "Tersedia", "Dipinjam"].map((s) => (
                <button key={s} onClick={() => updateFilter("status", s === "all" ? "" : s)} className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all" style={{ background: (s === "all" && status === "all") || status === s ? "var(--color-primary)" : "var(--color-card)", color: (s === "all" && status === "all") || status === s ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)", borderColor: (s === "all" && status === "all") || status === s ? "var(--color-primary)" : "var(--color-border)" }}>
                  {s === "all" ? "Semua" : s}
                </button>
              ))}
              <button onClick={() => updateFilter("type", bookType === "digital" ? "fisik" : bookType === "fisik" ? "" : "digital")} className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5" style={{ background: bookType ? "var(--color-primary)" : "var(--color-card)", color: bookType ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)", borderColor: bookType ? "var(--color-primary)" : "var(--color-border)" }}>
                {bookType === "digital" ? <><Smartphone size={12} /> Digital</> : bookType === "fisik" ? <><BookMarked size={12} /> Fisik</> : <><BookOpen size={12} /> Semua Tipe</>}
              </button>
              <button
                onClick={() => setShowIsbnModal(true)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 bg-[#fcfaf7] border-[#dbd0ba] text-[#7d6b56] hover:bg-[#ede5d8]"
              >
                <Barcode size={14} />
                <span>Pindai ISBN</span>
              </button>
              <button
                onClick={() => setShowSuggestModal(true)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
              >
                <Lightbulb size={14} className="text-amber-600" />
                <span>Usulkan Buku</span>
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2 p-4 rounded-2xl" style={{ background: "var(--color-muted)" }}>
                <select value={year} onChange={(e) => updateFilter("year", e.target.value)} className="px-3 py-1.5 rounded-full text-xs font-medium border outline-none" style={{ borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)" }}>
                  <option value="">Semua Tahun</option>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={searchParams.get("genre") || ""} onChange={(e) => updateFilter("genre", e.target.value)} className="px-3 py-1.5 rounded-full text-xs font-medium border outline-none" style={{ borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)" }}>
                  <option value="">Semua Genre</option>
                  {getGenreCategories().map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={sort} onChange={(e) => updateFilter("sort", e.target.value)} className="px-3 py-1.5 rounded-full text-xs font-medium border outline-none" style={{ borderColor: "var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)" }}>
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="title">Judul A-Z</option>
                  <option value="pages">Halaman Terbanyak</option>
                </select>
                {activeFilterCount > 0 && <button onClick={() => { setSearchParams({}); setShowFilters(false); }} className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border border-dashed" style={{ color: "var(--color-muted-foreground)", borderColor: "var(--color-border)" }}><X size={12} /> Reset Semua</button>}
              </div>
            )}
          </div>

          {user && cartBooks.length > 0 && (
            <div className="mb-6 rounded-2xl border p-4" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2 font-semibold text-sm"><ShoppingCart size={17} /> Keranjang Peminjaman ({cartBooks.length}/3)</div>
                <div className="flex items-center gap-2">
                  <label htmlFor="cart-deadline" className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Durasi</label>
                  <input id="cart-deadline" type="number" min={1} max={30} value={selectedDeadline} onChange={(event) => setSelectedDeadline(Math.max(1, Math.min(30, Number(event.target.value) || 1)))} className="w-16 min-h-[44px] text-center rounded-lg text-xs font-bold border" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }} />
                  <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>hari</span>
                </div>
                <button onClick={handleBorrowCart} disabled={borrowing} className="px-4 min-h-[44px] rounded-full text-xs font-bold text-white disabled:opacity-50" style={{ background: "var(--color-primary)" }}>
                  {borrowing ? "Memproses..." : "Pinjam Semua"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {cartBooks.map((book) => {
                  return <span key={book.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs" style={{ background: "var(--color-muted)" }}>
                    {book.judul}
                    <button className="w-10 h-10 inline-flex items-center justify-center" aria-label={`Hapus ${book.judul}`} onClick={() => setCartBooks((current) => current.filter((item) => item.id !== book.id))}><Trash2 size={12} /></button>
                  </span>;
                })}
              </div>
            </div>
          )}

          {/* AI Smart Recommendation Shelf: Karena Kamu Membaca X */}
          {!search && smartRecs?.becauseYouRead && smartRecs.becauseYouRead.books.length > 0 && (
            <div className="mb-8 p-5 bg-[#fcfaf7] border border-[#dbd0ba] rounded-3xl shadow-2xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-serif text-[#4a3f35]">
                    Karena Kamu Membaca <span className="text-amber-800">"{smartRecs.becauseYouRead.baseBook}"</span>
                  </h3>
                  <p className="text-[11px] text-[#7d6b56]">Rekomendasi buku dengan genre dan tema serupa</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {smartRecs.becauseYouRead.books.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => { setSelectedBook(rec); setBorrowMsg(null); }}
                    className="bg-white rounded-2xl p-2.5 border border-[#ede5d8] cursor-pointer hover:shadow-sm transition-all"
                  >
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#e8dfcf] mb-2">
                      {rec.cover ? (
                        <img src={rec.cover} alt={rec.judul} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#7d6b56]">
                          <BookOpen size={20} />
                        </div>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-[#4a3f35] truncate">{rec.judul}</h4>
                    <p className="text-[10px] text-[#7d6b56] truncate">{rec.penulis}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? <BookGridSkeleton /> : books.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={48} className="mx-auto mb-4" style={{ color: "var(--color-border)" }} />
              <p style={{ color: "var(--color-muted-foreground)" }} className="text-sm">Tidak ada buku ditemukan.</p>
              {(search || status !== "all" || year) && <button onClick={() => setSearchParams({})} className="mt-3 text-sm font-medium underline" style={{ color: "var(--color-primary)" }}>Reset filter</button>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {books.map((book) => (
                <div key={book.id} className="group cursor-pointer book-card" onClick={() => { setSelectedBook(book); setBorrowMsg(null); }}>
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3" style={{ background: "var(--color-muted)" }}>
                    {book.cover ? <img src={book.cover} alt={book.judul} className="w-full h-full object-cover product-shadow group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={32} style={{ color: "var(--color-border)" }} /></div>}
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: book.status === "Tersedia" ? "rgba(34,197,94,0.9)" : "rgba(74,63,53,0.8)", color: "white" }}>{book.status}</span>
                    {book.status !== "Tersedia" && (reservationCounts[book.id] || 0) > 0 && (
                      <span className="absolute top-2.5 left-2.5 mt-5 text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(251,146,60,0.9)", color: "white" }}>
                        {reservationCounts[book.id]} antrian
                      </span>
                    )}
                    {book.type && <span className="absolute top-2.5 right-2.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: "var(--color-card)", color: "var(--color-primary)", border: `1px solid var(--color-border)` }}>{book.type === "digital" ? <Smartphone size={8} /> : <BookMarked size={8} />} {book.type === "digital" ? "Digital" : "Fisik"}</span>}
                    {user && <button onClick={(e) => { e.stopPropagation(); handleToggleFav(book.id); }} className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90" style={{ background: "var(--color-card)" }}><Heart size={12} className={favorites.includes(book.id) ? "fill-red-500 text-red-500" : ""} style={!favorites.includes(book.id) ? { color: "var(--color-muted-foreground)" } : {}} /></button>}
                    {user && <button onClick={(e) => { e.stopPropagation(); handleToggleWishlist(book.id); }} className="absolute bottom-2.5 right-[38px] w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90" style={{ background: "var(--color-card)" }}><Bookmark size={12} className={wishlist.includes(book.id) ? "fill-amber-500 text-amber-500" : ""} style={!wishlist.includes(book.id) ? { color: "var(--color-muted-foreground)" } : {}} /></button>}
                  </div>
                  <h3 className="text-sm font-semibold line-clamp-1 transition-colors" style={{ color: "var(--color-foreground)" }}>{book.judul}</h3>
                  <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>{book.penulis}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Curated Reading Lists */}
        <div className="max-w-6xl mx-auto px-5 py-8">
          <h2 className="text-tagline mb-4 flex items-center gap-2">
            <BookMarked size={18} className="text-amber-800" />
            <span>Koleksi Pilihan</span>
          </h2>
          <ReadingLists />
        </div>

        {selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setSelectedBook(null)}>
            <div className="rounded-3xl max-w-[900px] w-full max-h-[90vh] overflow-y-auto p-6 md:p-10 shadow-2xl" style={{ background: "var(--color-card)" }} onClick={(e) => e.stopPropagation()}>
              <div className="grid md:grid-cols-[300px_1fr] gap-8">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden" style={{ background: "var(--color-muted)" }}>
                  {selectedBook.cover ? <img src={selectedBook.cover} alt={selectedBook.judul} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={48} style={{ color: "var(--color-border)" }} /></div>}
                </div>
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{selectedBook.judul}</h2>
                      <p className="mt-1" style={{ color: "var(--color-muted-foreground)" }}>{selectedBook.penulis}</p>
                      {selectedBook.type && <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--color-accent)", color: "var(--color-primary)" }}>{selectedBook.type === "digital" ? <Smartphone size={12} /> : <BookMarked size={12} />} {selectedBook.type === "digital" ? "Buku Digital" : "Buku Fisik"}</span>}
                    </div>
                    <button onClick={() => setSelectedBook(null)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: "var(--color-muted)" }}><X size={16} /></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-6">
                    {[
                      { label: "Penerbit", value: selectedBook.penerbit },
                      { label: "Tahun", value: selectedBook.tahun },
                      { label: "Halaman", value: selectedBook.halaman },
                      { label: "ISBN", value: selectedBook.isbn || "-" },
                      ...(selectedBook.lokasiRak ? [{ label: "Lokasi Rak", value: selectedBook.lokasiRak }] : []),
                    ].map(item => (
                      <div key={item.label} className="rounded-xl p-3" style={{ background: "var(--color-muted)" }}>
                        <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-muted-foreground)" }}>
                          {item.label === "Lokasi Rak" && <MapPin size={12} className="text-amber-600" />}
                          {item.label}
                        </span>
                        <p className="font-medium">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--color-secondary-foreground)" }}>{selectedBook.deskripsi}</p>

                  {borrowMsg && (
                    <div className={`flex items-start gap-2 text-sm px-4 py-3 rounded-xl mb-4 transition-all ${borrowMsg.type === "ok" ? "" : ""}`} style={{ background: borrowMsg.type === "ok" ? "rgba(34,197,94,0.1)" : "rgba(181,74,53,0.1)", color: borrowMsg.type === "ok" ? "#16a34a" : "var(--color-destructive)" }}>
                      {borrowMsg.type === "ok" ? <BookOpen size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
                      {borrowMsg.text}
                    </div>
                  )}

                  {/* Deadline selector & Pricing Rules */}
                  {user && selectedBook.status === "Tersedia" && (
                    <div className="mb-4 p-4 rounded-xl" style={{ background: "var(--color-muted)" }}>
                      <label className="block text-sm font-medium mb-2">Durasi Peminjaman / Baca</label>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDeadline(Math.max(1, selectedDeadline - 1))}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
                            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={selectedDeadline}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setSelectedDeadline(Math.max(1, Math.min(30, val)));
                            }}
                            className="w-16 h-8 text-center rounded-lg text-sm font-bold border outline-none"
                            style={{ background: "var(--color-card)", borderColor: "var(--color-border)", color: "var(--color-foreground)" }}
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedDeadline(Math.min(30, selectedDeadline + 1))}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all border"
                            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-medium">hari</span>
                      </div>

                      {/* Informasi akses dan denda */}
                      {selectedBook.type === "digital" ? (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                          <span>✨ E-Book gratis</span>
                          <span className="text-[11px] font-normal">Fasilitas sekolah, tanpa biaya sewa</span>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 rounded-lg" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>Denda per hari terlambat (Buku Fisik)</span>
                              <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
                                Rp {getFineRate(selectedDeadline).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-4 gap-1">
                            {[
                              { range: "1-5", rate: "2.000", active: selectedDeadline <= 5 },
                              { range: "6-10", rate: "5.000", active: selectedDeadline >= 6 && selectedDeadline <= 10 },
                              { range: "11-14", rate: "10.000", active: selectedDeadline >= 11 && selectedDeadline <= 14 },
                              { range: "15+", rate: "15.000", active: selectedDeadline >= 15 },
                            ].map((tier) => (
                              <div
                                key={tier.range}
                                className="text-center py-1.5 rounded-md text-[10px] transition-all"
                                style={{
                                  background: tier.active ? "var(--color-primary)" : "var(--color-card)",
                                  color: tier.active ? "white" : "var(--color-muted-foreground)",
                                }}
                              >
                                <div className="font-medium">{tier.range} hr</div>
                                <div>Rp {tier.rate}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: selectedBook.status === "Tersedia" ? "rgba(34,197,94,0.1)" : "var(--color-muted)", color: selectedBook.status === "Tersedia" ? "#16a34a" : "var(--color-muted-foreground)" }}>{selectedBook.status}</span>
                    {!user ? (
                      <a href="/login" className="px-6 py-2.5 text-white rounded-full text-sm font-medium transition-all inline-flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--color-primary)" }}>Masuk untuk Meminjam</a>
                    ) : selectedBook.status === "Tersedia" ? (
                      <>
                        <button onClick={() => addToCart(selectedBook)} disabled={borrowing || cartBooks.some((book) => book.id === selectedBook.id)} className="px-4 min-h-[44px] py-2.5 rounded-full text-sm font-medium transition-all inline-flex items-center gap-2 border disabled:opacity-50" style={{ borderColor: "var(--color-border)" }}>
                          <ShoppingCart size={16} /> {cartBooks.some((book) => book.id === selectedBook.id) ? "Sudah di Keranjang" : "Tambah ke Keranjang"}
                        </button>
                        <button onClick={() => handleBorrow(selectedBook.id)} disabled={borrowing} className="px-5 py-2.5 text-white rounded-full text-sm font-medium transition-all inline-flex items-center gap-2 disabled:opacity-50" style={{ background: "var(--color-primary)" }}>
                          {borrowing ? <Loader2 size={16} className="animate-spin" /> : selectedBook.type === "fisik" ? <BookMarked size={16} /> : <BookOpen size={16} />}
                          {borrowing ? "Memproses..." : selectedBook.type === "fisik" ? "Booking Buku Fisik" : "Pinjam Gratis"}
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>Buku ini sedang dipinjam</span>
                        <button onClick={() => handleReserve(selectedBook.id)} className="px-4 py-2 text-sm font-medium rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: "rgba(251,146,60,0.15)", color: "#ea580c", border: "1px solid rgba(251,146,60,0.3)" }}>
                          Antri Buku
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--color-border)" }}>
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background: "var(--color-muted)" }}>
                      <button
                        onClick={() => setBookDetailTab("ulasan")}
                        className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                        style={{
                          background: bookDetailTab === "ulasan" ? "var(--color-card)" : "transparent",
                          color: bookDetailTab === "ulasan" ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                          boxShadow: bookDetailTab === "ulasan" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        }}
                      >
                        Ulasan
                      </button>
                      <button
                        onClick={() => setBookDetailTab("diskusi")}
                        className="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
                        style={{
                          background: bookDetailTab === "diskusi" ? "var(--color-card)" : "transparent",
                          color: bookDetailTab === "diskusi" ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                          boxShadow: bookDetailTab === "diskusi" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                        }}
                      >
                        Diskusi
                      </button>
                    </div>

                    {bookDetailTab === "ulasan" ? (
                      <BookReviews bookId={selectedBook.id} />
                    ) : (
                      <BookDiscussions bookId={selectedBook.id} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ISBN Barcode Scanner Modal */}
        <ISBNScannerModal
          isOpen={showIsbnModal}
          onClose={() => setShowIsbnModal(false)}
          onSelectBook={(book) => {
            setSelectedBook(book);
            setBorrowMsg(null);
          }}
        />

        {/* Book Suggestion & Voting Modal */}
        <BookSuggestionModal
          isOpen={showSuggestModal}
          onClose={() => setShowSuggestModal(false)}
        />
      </div>
    </PageTransition>
  );
}
