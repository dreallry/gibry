import { useState, useEffect, useCallback } from "react";
import {
  getAllUsers,
  getBooks,
  getAllBorrows,
  getAnnouncements,
  getPublicReadingLists,
  getAllEvents,
  getAllRewards,
  getAllRedemptions,
  getPresensiConfig,
  getContentReports,
  getInvitationCodes,
  getBookSuggestions,
  type UserProfile,
  type Book,
  type Borrow,
  type Announcement,
  type SeasonalEvent,
  type Reward,
  type RewardRedemption,
  type PresensiConfig,
  type ContentReport,
  type InvitationCode,
  type BookSuggestion,
} from "@/lib/firestore";
import type { AdminTab } from "@/components/admin/AdminSidebar";
import type { ReadingList } from "@/lib/types/reading";

export function useAdminData({ activeTab }: {
  activeTab: AdminTab;
}) {
  const [users, setUsers] = useState<UserProfile[]>([]);

  const [books, setBooks] = useState<Book[]>([]);

  const [borrows, setBorrows] = useState<Borrow[]>([]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);

  const [events, setEvents] = useState<SeasonalEvent[]>([]);

  const [rewards, setRewards] = useState<Reward[]>([]);

  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);

  const [loading, setLoading] = useState(true);

  // Presensi / QR Token state
  const [presensiConfig, setPresensiConfig] = useState<PresensiConfig | null>(null);

  // Moderation state
  const [reports, setReports] = useState<ContentReport[]>([]);

  const [loadingReports, setLoadingReports] = useState(false);

  // Invitation codes state
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);

  const [loadingCodes, setLoadingCodes] = useState(false);

  // Book suggestions state
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);

  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const loadCoreData = useCallback(async () => {
    setLoading(true);
    try {
      const [u, b, br] = await Promise.all([
        getAllUsers(),
        getBooks(),
        getAllBorrows(),
      ]);
      setUsers(u);
      setBooks(b);
      setBorrows(br);
    } catch (err) {
      console.error("Error loading admin core data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTabData = useCallback(async () => {
    const requests: Promise<unknown>[] = [];
    const programs = activeTab === "programs";
    if (programs || activeTab === "announcements") requests.push(getAnnouncements().then(setAnnouncements));
    if (programs || activeTab === "reading_lists") requests.push(getPublicReadingLists().then(setReadingLists));
    if (programs || activeTab === "events") requests.push(getAllEvents().then(setEvents));
    if (programs || activeTab === "rewards") requests.push(getAllRewards().then(setRewards), getAllRedemptions().then(setRedemptions));
    if (["circulation", "dashboard", "fines", "presensi"].includes(activeTab)) requests.push(getPresensiConfig().then(setPresensiConfig));
    if (programs || activeTab === "moderation") {
      setLoadingReports(true);
      requests.push(getContentReports().then(setReports).finally(() => setLoadingReports(false)));
    }
    if (activeTab === "users" || activeTab === "invitations") {
      setLoadingCodes(true);
      requests.push(getInvitationCodes().then(setInvitationCodes).finally(() => setLoadingCodes(false)));
    }
    if (programs || activeTab === "suggestions") {
      setLoadingSuggestions(true);
      requests.push(getBookSuggestions().then(setSuggestions).finally(() => setLoadingSuggestions(false)));
    }
    for (const result of await Promise.allSettled(requests)) {
      if (result.status === "rejected") console.error("Error loading admin tab data:", result.reason);
    }
  }, [activeTab]);

  useEffect(() => { loadCoreData(); }, [loadCoreData]);
  useEffect(() => { loadTabData(); }, [loadTabData]);

  async function loadData() {
    await Promise.all([loadCoreData(), loadTabData()]);
  }

  const activeBorrows = borrows.filter(b => b.status === "Dipinjam").length;

  // Fines
  const finesWithBorrows = borrows.filter(b => b.denda && b.denda > 0);

  return {
    users,
    books,
    borrows,
    announcements,
    readingLists,
    events,
    rewards,
    redemptions,
    loading,
    presensiConfig,
    setPresensiConfig,
    reports,
    setReports,
    loadingReports,
    invitationCodes,
    setInvitationCodes,
    loadingCodes,
    suggestions,
    setSuggestions,
    loadingSuggestions,
    loadCoreData,
    loadData,
    activeBorrows,
    finesWithBorrows,
  };
}
