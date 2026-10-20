import { useState, useEffect } from "react";
import { getPublicReadingLists, getReadingListWithBooks, type ReadingList, type Book } from "@/lib/firestore";
import { BookOpen, ChevronRight, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ReadingLists() {
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<ReadingList | null>(null);
  const [loadingBooks, setLoadingBooks] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  async function loadLists() {
    setLoading(true);
    try {
      setLists(await getPublicReadingLists());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectList(list: ReadingList) {
    setLoadingBooks(true);
    try {
      const full = await getReadingListWithBooks(list.id);
      if (full) setSelectedList(full);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBooks(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-primary)" }} />
      </div>
    );
  }

  if (lists.length === 0) return null;

  return (
    <>
      <div className="space-y-4">
        {lists.map((list) => (
          <div
            key={list.id}
            onClick={() => handleSelectList(list)}
            className="card p-4 cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm group-hover:underline">{list.title}</h3>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--color-muted-foreground)" }}>
                  {list.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--color-muted)", color: "var(--color-muted-foreground)" }}>
                    {list.bookIds?.length || 0} buku
                  </span>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--color-muted-foreground)" }} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedList && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
            onClick={() => setSelectedList(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
              style={{ background: "var(--color-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selectedList.title}</h2>
                  <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>{selectedList.description}</p>
                </div>
                <button onClick={() => setSelectedList(null)} className="p-1 rounded-full hover:bg-black/5">
                  <X size={18} />
                </button>
              </div>

              {loadingBooks ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin" style={{ color: "var(--color-primary)" }} />
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedList.books?.map((book, idx) => (
                    <div key={book.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--color-muted)" }}>
                      <span className="text-xs font-bold w-5 text-center" style={{ color: "var(--color-primary)" }}>{idx + 1}</span>
                      <div className="w-8 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "var(--color-card)" }}>
                        {book.cover ? (
                          <img src={book.cover} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen size={12} style={{ color: "var(--color-border)" }} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{book.judul}</p>
                        <p className="text-[10px]" style={{ color: "var(--color-muted-foreground)" }}>{book.penulis}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
