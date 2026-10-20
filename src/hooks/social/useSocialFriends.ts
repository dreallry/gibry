import { getErrorMessage } from "@/lib/errors";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  searchUsers,
  sendFriendRequest,
  getFriends,
  getPendingFriendRequests,
  respondFriendRequest,
  onUserStatusChanged,
  removeFriend,
  type UserProfile,
  type FriendRequest,
  type Friend,
} from "@/lib/firestore";
import type { useAuth } from "@/contexts/AuthContext";
import type { useToast } from "@/components/Toast";

export function useSocialFriends({ user, profile, toast, unfriendTarget, setUnfriendTarget }: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  toast: ReturnType<typeof useToast>["toast"];
  unfriendTarget: { id: string; name: string } | null;
  setUnfriendTarget: import("react").Dispatch<import("react").SetStateAction<{ id: string; name: string } | null>>;
}) {

  // Friends & Status
  const [friends, setFriends] = useState<Friend[]>([]);

  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);

  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});

  // Search Users
  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

  const [searching, setSearching] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Setup online status listeners for friends
  const loadFriendsData = useCallback(async () => {
    if (!user) return;
    try {
      const [f, p] = await Promise.all([
        getFriends(user.uid),
        getPendingFriendRequests(user.uid),
      ]);
      setFriends(f);
      setPendingRequests(p);
    } catch (err) {
      console.error("Error loading friends:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user || friends.length === 0) return;
    const unsubscribes: (() => void)[] = [];

    friends.forEach((f) => {
      const friendId = f.fromUserId === user.uid ? f.toUserId : f.fromUserId;
      const unsub = onUserStatusChanged(friendId, (isOnline) => {
        setOnlineStatuses((prev) => ({ ...prev, [friendId]: isOnline }));
      });
      if (unsub) unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [user, friends]);

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsers(q);
        setSearchResults(results.filter((u) => u.uid !== user?.uid));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function handleSendRequest(toUserId: string) {
    if (!user || !profile) return;
    try {
      await sendFriendRequest(user.uid, profile.nama, profile.photoURL, toUserId);
      toast("success", "Permintaan pertemanan terkirim!");
      loadFriendsData();
    } catch (err) {
      toast("error", getErrorMessage(err));
    }
  }

  async function handleRespond(requestId: string, status: "accepted" | "declined") {
    try {
      await respondFriendRequest(requestId, status);
      toast("success", status === "accepted" ? "Teman berhasil ditambahkan!" : "Permintaan ditolak");
      loadFriendsData();
    } catch (err) {
      toast("error", getErrorMessage(err));
    }
  }

  async function confirmUnfriend() {
    if (!user || !unfriendTarget) return;
    try {
      await removeFriend(user.uid, unfriendTarget.id);
      toast("success", `${unfriendTarget.name} telah dihapus dari daftar teman.`);
      setUnfriendTarget(null);
      await loadFriendsData();
    } catch (err) {
      toast("error", "Gagal menghapus pertemanan: " + getErrorMessage(err));
    }
  }

  return {
    friends,
    pendingRequests,
    onlineStatuses,
    searchQuery,
    searchResults,
    searching,
    loadFriendsData,
    handleSearch,
    handleSendRequest,
    handleRespond,
    confirmUnfriend,
  };
}
