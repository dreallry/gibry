import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";
import {
  createAnnouncement,
  deleteAnnouncement,
  createReadingList,
  deleteReadingList,
  createSeasonalEvent,
  deleteSeasonalEvent,
  createReward,
  deleteReward,
  processRedemption,
} from "@/lib/firestore";
import type { useAdminData } from './useAdminData';
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useAdminPrograms({ user, toast, loadData, setConfirmAction }: {
  user: ReturnType<typeof useAuth>["user"];
  toast: ReturnType<typeof useToast>["toast"];
  loadData: ReturnType<typeof useAdminData>["loadData"];
  setConfirmAction: import("react").Dispatch<import("react").SetStateAction<import("./types").AdminConfirmAction | null>>;
}) {

  // Announcement form
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);

  const [announcementTitle, setAnnouncementTitle] = useState("");

  const [announcementBody, setAnnouncementBody] = useState("");

  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);

  // Reading list form
  const [showAddReadingList, setShowAddReadingList] = useState(false);

  const [readingListTitle, setReadingListTitle] = useState("");

  const [readingListDesc, setReadingListDesc] = useState("");

  const [readingListBookIds, setReadingListBookIds] = useState<string[]>([]);

  const [creatingReadingList, setCreatingReadingList] = useState(false);

  // Event form
  const [showAddEvent, setShowAddEvent] = useState(false);

  const [eventTitle, setEventTitle] = useState("");

  const [eventDesc, setEventDesc] = useState("");

  const [eventType, setEventType] = useState<"reading_challenge" | "streak_challenge" | "genre_challenge">("reading_challenge");

  const [eventStartDate, setEventStartDate] = useState("");

  const [eventEndDate, setEventEndDate] = useState("");

  const [eventTarget, setEventTarget] = useState(10);

  const [eventPoints, setEventPoints] = useState(100);

  const [creatingEvent, setCreatingEvent] = useState(false);

  // Reward form
  const [showAddReward, setShowAddReward] = useState(false);

  const [rewardTitle, setRewardTitle] = useState("");

  const [rewardDesc, setRewardDesc] = useState("");

  const [rewardPoints, setRewardPoints] = useState(100);

  const [rewardStock, setRewardStock] = useState(10);

  const [rewardType, setRewardType] = useState<"priority_borrow" | "extended_deadline" | "physical_prize" | "badge">("priority_borrow");

  const [creatingReward, setCreatingReward] = useState(false);

  async function handleCreateAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !announcementTitle.trim() || !announcementBody.trim()) return;
    setCreatingAnnouncement(true);
    try {
      await createAnnouncement({
        title: announcementTitle.trim(),
        body: announcementBody.trim(),
        createdBy: user.uid,
      });
      toast("success", "Pengumuman berhasil dibuat!");
      setShowAddAnnouncement(false);
      setAnnouncementTitle("");
      setAnnouncementBody("");
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    finally { setCreatingAnnouncement(false); }
  }

  async function handleDeleteAnnouncement(id: string) {
    try {
      await deleteAnnouncement(id);
      toast("info", "Pengumuman dihapus");
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    setConfirmAction(null);
  }

  async function handleCreateReadingList(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !readingListTitle.trim()) return;
    setCreatingReadingList(true);
    try {
      await createReadingList({
        title: readingListTitle.trim(),
        description: readingListDesc.trim(),
        bookIds: readingListBookIds,
        createdBy: user.uid,
        isPublic: true,
      });
      toast("success", "Koleksi berhasil dibuat!");
      setShowAddReadingList(false);
      setReadingListTitle("");
      setReadingListDesc("");
      setReadingListBookIds([]);
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    finally { setCreatingReadingList(false); }
  }

  async function handleDeleteReadingList(id: string) {
    try {
      await deleteReadingList(id);
      toast("info", "Koleksi dihapus");
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    setConfirmAction(null);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !eventTitle.trim()) return;
    setCreatingEvent(true);
    try {
      await createSeasonalEvent({
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        type: eventType,
        startDate: eventStartDate,
        endDate: eventEndDate,
        rules: { target: eventTarget, bonusMultiplier: 2 },
        rewards: { points: eventPoints },
      });
      toast("success", "Event berhasil dibuat!");
      setShowAddEvent(false);
      setEventTitle("");
      setEventDesc("");
      setEventStartDate("");
      setEventEndDate("");
      setEventTarget(10);
      setEventPoints(100);
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    finally { setCreatingEvent(false); }
  }

  async function handleDeleteEvent(id: string) {
    try {
      await deleteSeasonalEvent(id);
      toast("info", "Event dihapus");
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    setConfirmAction(null);
  }

  async function handleCreateReward(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !rewardTitle.trim()) return;
    setCreatingReward(true);
    try {
      await createReward({
        title: rewardTitle.trim(),
        description: rewardDesc.trim(),
        pointsCost: rewardPoints,
        stock: rewardStock,
        isActive: true,
        type: rewardType,
      });
      toast("success", "Reward berhasil dibuat!");
      setShowAddReward(false);
      setRewardTitle("");
      setRewardDesc("");
      setRewardPoints(100);
      setRewardStock(10);
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    finally { setCreatingReward(false); }
  }

  async function handleDeleteReward(id: string) {
    try {
      await deleteReward(id);
      toast("info", "Reward dihapus");
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    setConfirmAction(null);
  }

  async function handleProcessRedemption(id: string, status: "approved" | "rejected") {
    if (!user) return;
    try {
      await processRedemption(id, status, user.uid);
      toast("success", status === "approved" ? "Penukaran disetujui" : "Penukaran ditolak");
      loadData();
    } catch (err) { toast("error", getErrorMessage(err)); }
    setConfirmAction(null);
  }

  return {
    showAddAnnouncement,
    setShowAddAnnouncement,
    announcementTitle,
    setAnnouncementTitle,
    announcementBody,
    setAnnouncementBody,
    creatingAnnouncement,
    showAddReadingList,
    setShowAddReadingList,
    readingListTitle,
    setReadingListTitle,
    readingListDesc,
    setReadingListDesc,
    readingListBookIds,
    setReadingListBookIds,
    creatingReadingList,
    showAddEvent,
    setShowAddEvent,
    eventTitle,
    setEventTitle,
    eventDesc,
    setEventDesc,
    eventType,
    setEventType,
    eventStartDate,
    setEventStartDate,
    eventEndDate,
    setEventEndDate,
    eventTarget,
    setEventTarget,
    eventPoints,
    setEventPoints,
    creatingEvent,
    showAddReward,
    setShowAddReward,
    rewardTitle,
    setRewardTitle,
    rewardDesc,
    setRewardDesc,
    rewardPoints,
    setRewardPoints,
    rewardStock,
    setRewardStock,
    rewardType,
    setRewardType,
    creatingReward,
    handleCreateAnnouncement,
    handleDeleteAnnouncement,
    handleCreateReadingList,
    handleDeleteReadingList,
    handleCreateEvent,
    handleDeleteEvent,
    handleCreateReward,
    handleDeleteReward,
    handleProcessRedemption,
  };
}
