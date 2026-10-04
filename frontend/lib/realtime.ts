import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

import { API_URL } from "@/lib/api";

type Handler = (body: unknown) => void;
export type RealtimeStatus = "offline" | "connecting" | "live";

/**
 * Một kết nối STOMP/WebSocket dùng chung cho cả ứng dụng. Tự kết nối lại và tự đăng ký lại
 * mọi subscription sau khi mất kết nối. Backend kiểm tra JWT ở CONNECT và quyền ở SUBSCRIBE.
 */
class RealtimeManager {
  private client: Client | null = null;
  private token: string | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private active = new Map<string, StompSubscription>();
  private status: RealtimeStatus = "offline";
  private listeners = new Set<() => void>();

  getStatus = () => this.status;

  onStatus = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  private setStatus(s: RealtimeStatus) {
    if (this.status === s) return;
    this.status = s;
    this.listeners.forEach((l) => l());
  }

  setToken(token: string | null) {
    if (token === this.token) return;
    this.token = token;
    this.disconnect();
    if (token && this.handlers.size > 0) this.connect();
  }

  subscribe(destination: string, handler: Handler): () => void {
    let set = this.handlers.get(destination);
    if (!set) {
      set = new Set();
      this.handlers.set(destination, set);
    }
    set.add(handler);
    if (this.client?.connected) this.attach(destination);
    else if (!this.client && this.token) this.connect();

    return () => {
      const current = this.handlers.get(destination);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) {
        this.handlers.delete(destination);
        this.active.get(destination)?.unsubscribe();
        this.active.delete(destination);
      }
      if (this.handlers.size === 0) this.disconnect();
    };
  }

  private connect() {
    if (!this.token || this.client) return;
    this.setStatus("connecting");
    const client = new Client({
      brokerURL: API_URL.replace(/^http/, "ws") + "/ws",
      connectHeaders: { Authorization: `Bearer ${this.token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });
    client.onConnect = () => {
      this.active.clear();
      this.handlers.forEach((_, dest) => this.attach(dest));
      this.setStatus("live");
    };
    client.onWebSocketClose = () => this.setStatus(this.token ? "connecting" : "offline");
    client.onStompError = () => this.setStatus("connecting");
    client.activate();
    this.client = client;
  }

  private attach(destination: string) {
    if (!this.client?.connected || this.active.has(destination)) return;
    const sub = this.client.subscribe(destination, (msg: IMessage) => {
      let body: unknown = msg.body;
      try {
        body = JSON.parse(msg.body);
      } catch {
        /* giữ nguyên chuỗi */
      }
      this.handlers.get(destination)?.forEach((h) => h(body));
    });
    this.active.set(destination, sub);
  }

  private disconnect() {
    this.active.clear();
    const c = this.client;
    this.client = null;
    if (c) void c.deactivate();
    this.setStatus("offline");
  }
}

export const realtime = new RealtimeManager();
