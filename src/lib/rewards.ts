import { postApi } from './api';
import { ref, get, set, push, update, remove, serverTimestamp } from "firebase/database";
import { db } from "./firebase";
import type { Reward, RewardRedemption } from "./types/misc";
import { auth } from "./firebase";

export async function getActiveRewards(): Promise<Reward[]> {
  const snap = await get(ref(db, "rewards"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).isActive)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Reward))
    .sort((a, b) => a.pointsCost - b.pointsCost);
}

export async function getAllRewards(): Promise<Reward[]> {
  const snap = await get(ref(db, "rewards"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Reward));
}

export async function createReward(data: Omit<Reward, "id" | "createdAt">): Promise<string> {
  const newRef = push(ref(db, "rewards"));
  await set(newRef, { ...data, createdAt: serverTimestamp() });
  return newRef.key!;
}

export async function updateReward(rewardId: string, data: Partial<Reward>): Promise<void> {
  await update(ref(db, `rewards/${rewardId}`), data);
}

export async function deleteReward(rewardId: string): Promise<void> {
  await remove(ref(db, `rewards/${rewardId}`));
}

export async function redeemReward(userId: string, rewardId: string): Promise<string> {
  if (userId !== auth.currentUser?.uid) throw new Error('Saldo bukan milik Anda.');
  const result = await postApi<{ id: string }>('redeem-reward', { rewardId });
  return result.id;
}

export async function getUserRedemptions(userId: string): Promise<RewardRedemption[]> {
  const snap = await get(ref(db, "reward_redemptions"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).userId === userId)
    .map(([id, v]: [string, any]) => ({ id, ...v } as RewardRedemption))
    .sort((a, b) => (Number(b.redeemedAt) || 0) - (Number(a.redeemedAt) || 0));
}

export async function getAllRedemptions(): Promise<RewardRedemption[]> {
  const snap = await get(ref(db, "reward_redemptions"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ id, ...v } as RewardRedemption))
    .sort((a, b) => (Number(b.redeemedAt) || 0) - (Number(a.redeemedAt) || 0));
}

export async function processRedemption(redemptionId: string, status: 'approved' | 'rejected' | 'fulfilled', _processedBy: string): Promise<void> {
  await postApi('process-redemption', { redemptionId, status });
}
