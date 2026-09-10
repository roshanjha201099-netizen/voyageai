/**
 * WebSocket Client Singleton for VoyageAI
 * Single persistent WebSocket connection to ws://localhost:8000/ws/tour-app
 * All frontend requests flow through this client using { type, reqname, data, requestId } frames.
 */

export interface WsRequestFrame {
  type: 'request' | 'ping';
  reqname: string;
  data?: any;
  requestId?: string;
  token?: string;
}

export interface WsResponseFrame {
  type: 'response' | 'event' | 'pong';
  reqname: string;
  status?: 'success' | 'error';
  data?: any;
  error?: string;
  requestId?: string;
}

type EventListener = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private isConnecting: boolean = false;
  private reconnectTimer: any = null;

  public getIsConnecting(): boolean {
    return this.isConnecting;
  }
  private pendingRequests: Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timer: any }> = new Map();
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private isReadyPromise: Promise<void> | null = null;
  private resolveReady: (() => void) | null = null;

  constructor() {
    const envWsUrl = import.meta.env.VITE_WS_URL;
    if (envWsUrl) {
      this.url = envWsUrl;
    } else {
      const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isLocalhost) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.url = `${protocol}//${window.location.hostname}:8000/ws/tour-app`;
      } else {
        this.url = 'wss://voyageai-wp2o.onrender.com/ws/tour-app';
      }
    }
    this.connect();
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.isReadyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log(`[WS] Connected to ${this.url}`);
        this.isConnecting = false;
        if (this.resolveReady) {
          this.resolveReady();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const frame: WsResponseFrame = JSON.parse(event.data);
          this.handleIncomingFrame(frame);
        } catch (err) {
          console.error('[WS] Invalid JSON frame received:', event.data, err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS] Socket error:', err);
      };

      this.ws.onclose = () => {
        console.warn('[WS] Disconnected from server. Reconnecting in 2 seconds...');
        this.isConnecting = false;
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('[WS] Failed to establish WebSocket connection:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  private handleIncomingFrame(frame: WsResponseFrame): void {
    // 1. Check if frame matches a pending request ID
    if (frame.requestId && this.pendingRequests.has(frame.requestId)) {
      const pending = this.pendingRequests.get(frame.requestId)!;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(frame.requestId);

      if (frame.status === 'error') {
        pending.reject(new Error(frame.error || 'WebSocket request failed'));
      } else {
        pending.resolve(frame.data);
      }
      return;
    }

    // 2. Broadcast / Event frame routing
    if (frame.reqname) {
      const listeners = this.eventListeners.get(frame.reqname);
      if (listeners) {
        listeners.forEach((listener) => listener(frame.data));
      }
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (!this.isReadyPromise) {
      this.connect();
    }
    await this.isReadyPromise;
  }

  /**
   * Main method to send a request over WebSocket and await the response frame
   */
  public async sendRequest<T = any>(reqname: string, data: any = {}): Promise<T> {
    await this.ensureConnected();

    return new Promise<T>((resolve, reject) => {
      const requestId = 'req_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();

      const frame: WsRequestFrame = {
        type: 'request',
        reqname,
        data: data || {},
        requestId,
      };

      // 15-second timeout for server response
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`WebSocket request timeout for [${reqname}]`));
        }
      }, 15000);

      this.pendingRequests.set(requestId, { resolve, reject, timer });

      try {
        this.ws!.send(JSON.stringify(frame));
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        reject(err);
      }
    });
  }

  /**
   * Send un-tracked fire-and-forget payload over WebSocket
   */
  public async send(reqname: string, data: any = {}): Promise<void> {
    await this.ensureConnected();
    const frame: WsRequestFrame = {
      type: 'request',
      reqname,
      data: data || {},
    };
    this.ws!.send(JSON.stringify(frame));
  }

  /**
   * Subscribe to server push events (e.g. location broadcasts, itinerary updates)
   */
  public on(event: string, callback: EventListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }
}

export const wsClient = new WebSocketClient();
