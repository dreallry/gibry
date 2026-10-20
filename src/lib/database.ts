

// ===== Helpers =====
export function snapshotToArray<T>(snap: import("firebase/database").DataSnapshot): T[] {
  if (!snap.exists()) return [];
  const data = snap.val();
  return Object.entries(data).map(([id, val]) => ({ id, ...(val as any) } as T));
}
