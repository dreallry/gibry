import { postApi } from './api';
import { eventBus } from './eventBus';

export async function borrowBook(userId: string, bookId: string, deadlineDays = 14): Promise<void> {
  await postApi('borrow-book', { userId, bookId, deadlineDays });
  eventBus.emit({ type: 'book:borrowed', payload: { userId, bookId } });
}

export async function borrowBooks(userId: string, bookIds: string[], deadlineDays = 14): Promise<void> {
  await postApi('borrow-books', { userId, bookIds, deadlineDays });
  for (const bookId of bookIds) eventBus.emit({ type: 'book:borrowed', payload: { userId, bookId } });
}

export async function adminDirectBorrow(userId: string, bookId: string, deadlineDays = 14): Promise<void> {
  await borrowBook(userId, bookId, deadlineDays);
}

export async function returnBook(userId: string, borrowId: string): Promise<number> {
  const result = await postApi<{ denda: number }>('return-book', { borrowId });
  eventBus.emit({ type: 'book:returned', payload: { userId, borrowId } });
  return result.denda;
}

export function getFineRate(deadlineDays: number): number {
  if (deadlineDays <= 5) return 2000;
  if (deadlineDays <= 10) return 5000;
  if (deadlineDays <= 14) return 10000;
  return 15000;
}
