/**
 * Connection Manager for Firebase RTDB
 * Mitigates Spark 100 concurrent connection limit:
 * - Detaches listeners when the browser tab is hidden
 * - Re-attaches listeners when the tab becomes visible
 */

type ListenerEntry = {
  id: string;
  attach: () => (() => void) | void;
  detach?: () => void;
  cleanup?: () => void;
};

class ConnectionManager {
  private listeners: Map<string, ListenerEntry> = new Map();
  private isTabVisible: boolean = typeof document === 'undefined' || !document.hidden;

  constructor() {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    const visible = !document.hidden;
    if (this.isTabVisible === visible) return;
    this.isTabVisible = visible;

    if (visible) {
      // Re-attach all registered listeners
      this.listeners.forEach((entry) => {
        try {
          const cleanup = entry.attach();
          if (typeof cleanup === "function") {
            entry.cleanup = cleanup;
          }
        } catch (err) {
          console.warn(`[ConnectionManager] Failed to reattach listener: ${entry.id}`, err);
        }
      });
    } else {
      // Detach listeners to release connection
      this.listeners.forEach((entry) => {
        try {
          if (entry.cleanup) {
            entry.cleanup();
            entry.cleanup = undefined;
          } else if (entry.detach) {
            entry.detach();
          }
        } catch (err) {
          console.warn(`[ConnectionManager] Failed to detach listener: ${entry.id}`, err);
        }
      });
    }
  };

  /**
   * Register a listener that automatically pauses when tab is hidden
   * @param id Unique identifier for the listener
   * @param attach Function to attach listener; should return a cleanup function
   * @returns Cleanup function to unregister completely
   */
  public register(id: string, attach: () => (() => void) | void): () => void {
    this.listeners.get(id)?.cleanup?.();
    const entry: ListenerEntry = {
      id,
      attach,
    };

    if (this.isTabVisible) {
      try {
        const cleanup = attach();
        if (typeof cleanup === "function") {
          entry.cleanup = cleanup;
        }
      } catch (err) {
        console.warn(`[ConnectionManager] Initial attach error for ${id}:`, err);
      }
    }

    this.listeners.set(id, entry);

    // Return unregister function
    return () => {
      if (entry.cleanup) {
        entry.cleanup();
      }
      if (this.listeners.get(id) === entry) this.listeners.delete(id);
    };
  }

  public getActiveCount(): number {
    return this.listeners.size;
  }
}

export const connectionManager = new ConnectionManager();
