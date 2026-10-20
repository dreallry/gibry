import { ref, get, set, push, update, query, orderByChild, equalTo, serverTimestamp } from 'firebase/database';
import { db } from './firebase';
import { eventBus } from './eventBus';
import type { Attendance } from './types/user';
function getNowWIB(): { date: Date; dateStr: string; timeStr: string; fullStr: string } {
  const now = new Date();
  const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(wibMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const timeStr = `${hh}:${mi}`;
  return { date: new Date(now.getTime()), dateStr, timeStr, fullStr: `${dateStr}T${timeStr}` };
}

function parseWIBString(wibStr: string): Date {
  const [datePart, timePart] = wibStr.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [h, min] = (timePart || "00:00").split(":").map(Number);
  // Construct as UTC, then subtract 7h to get real UTC
  return new Date(Date.UTC(y, m - 1, d, h, min) - 7 * 60 * 60 * 1000);
}

export function getTodayWIBDate(): string {
  return getNowWIB().dateStr;
}

export async function addAttendance(data: { userId: string; nama: string; email: string; photoURL?: string; waktuKunjungan: string; tujuan: string }): Promise<string | null> {
  const today = getTodayWIBDate();
  const snap = await get(query(ref(db, 'daftar_hadir'), orderByChild('userId'), equalTo(data.userId)));
  if (snap.exists()) {
    const all = snap.val();
    for (const [, v] of Object.entries(all) as [string, any][]) {
      if (v.userId === data.userId && v.status === "hadir" && (v.waktuKunjungan || "") >= today) {
        return null; // Already checked in today
      }
    }
  }
  const newRef = push(ref(db, "daftar_hadir"));
  await set(newRef, { ...data, status: "hadir", createdAt: serverTimestamp() });
  try {
    eventBus.emit({
      type: "attendance:checked_in",
      payload: { userId: data.userId },
    });
  } catch {}
  return newRef.key!;
}

export async function checkOutAttendance(attendanceId: string): Promise<void> {
  const snap = await get(ref(db, `daftar_hadir/${attendanceId}`));
  if (!snap.exists()) return;
  const data = snap.val();
  const nowWIB = getNowWIB();
  const waktuKeluar = nowWIB.fullStr;
  const checkInDate = parseWIBString(data.waktuKunjungan);
  const durasi = Math.round((nowWIB.date.getTime() - checkInDate.getTime()) / 60000);
  await update(ref(db, `daftar_hadir/${attendanceId}`), {
    waktuKeluar,
    durasi: Math.max(0, durasi),
    status: "selesai",
  });
}

export async function getActiveAttendanceForUser(userId: string): Promise<Attendance | null> {
  const today = getTodayWIBDate();
  const snap = await get(query(ref(db, 'daftar_hadir'), orderByChild('userId'), equalTo(userId)));
  if (!snap.exists()) return null;
  const all = snap.val();
  for (const [id, v] of Object.entries(all) as [string, any][]) {
    if (v.userId === userId && v.status === "hadir" && (v.waktuKunjungan || "") >= today) {
      return { id, ...v } as Attendance;
    }
  }
  return null;
}

export async function getTodayAttendance(userId?: string): Promise<Attendance[]> {
  const today = getTodayWIBDate();
  const attendanceRef = userId
    ? query(ref(db, 'daftar_hadir'), orderByChild('userId'), equalTo(userId))
    : ref(db, 'daftar_hadir');
  const snap = await get(attendanceRef);
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => {
      const dt = (v as any).waktuKunjungan || "";
      return dt.slice(0, 10) === today;
    })
    .map(([id, v]: [string, any]) => ({ id, ...v } as Attendance))
    .sort((a, b) => b.waktuKunjungan.localeCompare(a.waktuKunjungan));
}

export async function getAllAttendance(): Promise<Attendance[]> {
  const snap = await get(ref(db, "daftar_hadir"));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Attendance))
    .sort((a, b) => (b.waktuKunjungan || "").localeCompare(a.waktuKunjungan || ""));
}

export async function getUserAttendance(userId: string, limit = 20): Promise<Attendance[]> {
  const snap = await get(query(ref(db, 'daftar_hadir'), orderByChild('userId'), equalTo(userId)));
  if (!snap.exists()) return [];
  const all = snap.val();
  return Object.entries(all)
    .filter(([, v]: [string, any]) => (v as any).userId === userId)
    .map(([id, v]: [string, any]) => ({ id, ...v } as Attendance))
    .sort((a, b) => (b.waktuKunjungan || "").localeCompare(a.waktuKunjungan || ""))
    .slice(0, limit);
}

export async function getUserAttendanceStats(userId: string): Promise<{ totalVisits: number; totalDurationMinutes: number; avgDurationMinutes: number }> {
  const records = await getUserAttendance(userId, Infinity);
  const totalVisits = records.length;
  const durations = records.filter(r => r.durasi && r.durasi > 0).map(r => r.durasi!);
  const totalDurationMinutes = durations.reduce((sum, d) => sum + d, 0);
  const avgDurationMinutes = durations.length > 0 ? Math.round(totalDurationMinutes / durations.length) : 0;
  return { totalVisits, totalDurationMinutes, avgDurationMinutes };
}

export interface PresensiConfig {
  qrCode: string;          // permanent QR code value, e.g. "DIGIPUS-PERPUS-2026"
  generatedBy: string;
  generatedAt: number;
}

function generateQRCodeValue(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `DIGIPUS-PERPUS-${code}`;
}

export async function getPresensiConfig(): Promise<PresensiConfig | null> {
  const snap = await get(ref(db, "presensi_config"));
  if (!snap.exists()) return null;
  return snap.val() as PresensiConfig;
}

export async function generateQRCode(adminUid: string): Promise<PresensiConfig> {
  const config: PresensiConfig = {
    qrCode: generateQRCodeValue(),
    generatedBy: adminUid,
    generatedAt: Date.now(),
  };
  await set(ref(db, "presensi_config"), config);
  return config;
}

export async function validateQRCode(qrValue: string): Promise<boolean> {
  const config = await getPresensiConfig();
  if (!config) return false;
  // Token expires after 24 hours
  if (config.generatedAt && (Date.now() - config.generatedAt > 24 * 60 * 60 * 1000)) {
    return false;
  }
  return config.qrCode === qrValue;
}
