/**
 * Shared Singleton Realtime SSE Client
 * Manages a single robust EventSource connection for the entire application.
 * Prevents multiple components from opening duplicate connections or spamming the server on reconnects.
 */

type EventCallback = (event: { type: string; payload: any; timestamp: string }) => void;

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<EventCallback> = new Set();
  private reconnectTimeout: any = null;
  private retryDelay = 3000;
  private isConnecting = false;
  private isDestroyed = false;

  public subscribe(callback: EventCallback): () => void {
    this.listeners.add(callback);
    this.ensureConnected();

    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        // Schedule disconnect if no listeners remain after 15 seconds
        setTimeout(() => {
          if (this.listeners.size === 0) {
            this.disconnect();
          }
        }, 15000);
      }
    };
  }

  private ensureConnected() {
    if (this.isDestroyed || typeof window === 'undefined' || !window.EventSource) return;
    if (this.eventSource && (this.eventSource.readyState === EventSource.OPEN || this.eventSource.readyState === EventSource.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/events');

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        this.retryDelay = 3000; // reset retry delay on successful connect
      };

      this.eventSource.onmessage = (e) => {
        try {
          if (!e.data || e.data.trim() === '' || e.data.startsWith(':')) return;
          const parsed = JSON.parse(e.data);
          this.listeners.forEach((listener) => {
            try {
              listener(parsed);
            } catch (cbErr) {
              console.error('Error in SSE listener:', cbErr);
            }
          });
        } catch (parseErr) {
          // Ignore non-JSON heartbeat pings
        }
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Exponential backoff up to 30s to prevent spamming Network tab
        if (!this.reconnectTimeout && this.listeners.size > 0) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.retryDelay = Math.min(this.retryDelay * 1.5, 30000);
            this.ensureConnected();
          }, this.retryDelay);
        }
      };
    } catch (err) {
      this.isConnecting = false;
      console.warn('SSE connection init error:', err);
    }
  }

  private disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }
}

export const realtimeClient = new RealtimeClient();

export function useRealtimeEvent(callback: EventCallback, deps: any[] = []) {
  // Can be used in React components or direct subscription
}
