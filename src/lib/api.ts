import { auth } from './firebase';

export async function postApi<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('Silakan login terlebih dahulu.');
  const token = await user.getIdToken();
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Permintaan belum dapat diproses.');
  if (!data || typeof data !== 'object') throw new Error('Respons server tidak valid.');
  return data as T;
}
