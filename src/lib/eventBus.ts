/**
 * DigiPus Event Bus
 * Decoupled event bus to safely notify USP features (Quests, Stamps, Smart Notifications)
 * without modifying or endangering core business logic.
 */

export type DigiPusEvent =
  | { type: "book:borrowed"; payload: { userId: string; bookId: string; genre?: string } }
  | { type: "book:returned"; payload: { userId: string; borrowId: string; daysKept?: number } }
  | { type: "book:reviewed"; payload: { userId: string; bookId: string; rating: number } }
  | { type: "book:favorited"; payload: { userId: string; bookId: string } }
  | { type: "book:wishlisted"; payload: { userId: string; bookId: string } }
  | { type: "attendance:checked_in"; payload: { userId: string; streak?: number } }
  | { type: "discussion:created"; payload: { userId: string; bookId: string } }
  | { type: "club:joined"; payload: { userId: string; clubId: string } }
  | { type: "message:sent"; payload: { userId: string; receiverId: string } }
  | { type: "quest:completed"; payload: { userId: string; questId: string; points: number } }
  | { type: "stamp:unlocked"; payload: { userId: string; stampId: string; stampTitle: string } };

type EventHandler<T extends DigiPusEvent = DigiPusEvent> = (event: T) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();

  on<T extends DigiPusEvent["type"]>(
    type: T,
    handler: (event: Extract<DigiPusEvent, { type: T }>) => void | Promise<void>
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    const set = this.handlers.get(type)!;
    set.add(handler);
    return () => set.delete(handler);
  }

  emit(event: DigiPusEvent): void {
    const set = this.handlers.get(event.type);
    if (set) {
      set.forEach((handler) => {
        try {
          const res = handler(event);
          if (res instanceof Promise) {
            res.catch((err) => console.error(`[EventBus] Async error in handler for ${event.type}:`, err));
          }
        } catch (err) {
          console.error(`[EventBus] Error in handler for ${event.type}:`, err);
        }
      });
    }
  }
}

export const eventBus = new EventBus();
