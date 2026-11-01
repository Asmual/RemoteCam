export interface SignalingOptions {
  sessionId: string;
  role: "owner" | "target";
  onOffer?: (offer: RTCSessionDescriptionInit) => void;
  onAnswer?: (answer: RTCSessionDescriptionInit) => void;
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
  onStatusChange?: (status: string) => void;
}

export class HybridSignalingClient {
  private sessionId: string;
  private role: "owner" | "target";
  private ws: WebSocket | null = null;
  private isWsConnected = false;
  private isFallbackMode = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private lastPollTime: string;
  private processedMessageIds = new Set<string>();
  private options: SignalingOptions;
  private isClosed = false;

  constructor(options: SignalingOptions) {
    this.options = options;
    this.sessionId = options.sessionId;
    this.role = options.role;
    this.lastPollTime = new Date(Date.now() - 30000).toISOString();
    this.init();
  }

  private init() {
    if (typeof window === "undefined") return;

    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    const customWs = process.env.NEXT_PUBLIC_SIGNALING_WS_URL;

    let targetWsUrl = "";
    if (customWs && customWs.startsWith("ws") && !customWs.includes("localhost")) {
      targetWsUrl = customWs;
    } else if (isLocal) {
      targetWsUrl = "ws://localhost:3001";
    }

    if (targetWsUrl) {
      try {
        this.options.onStatusChange?.("Connecting to WebSocket signaling...");
        const ws = new WebSocket(targetWsUrl);
        this.ws = ws;

        const wsTimer = setTimeout(() => {
          if (!this.isWsConnected && !this.isClosed) {
            this.startFallback();
          }
        }, 3000);

        ws.onopen = () => {
          clearTimeout(wsTimer);
          this.isWsConnected = true;
          this.options.onStatusChange?.("Signaling connected via WebSocket");
          ws.send(
            JSON.stringify({
              type: "join-room",
              sessionId: this.sessionId,
              senderRole: this.role,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIncoming(data.type, data.payload);
          } catch (e) {
            console.error("WS parse error", e);
          }
        };

        ws.onerror = () => {
          clearTimeout(wsTimer);
          if (!this.isWsConnected && !this.isClosed) {
            this.startFallback();
          }
        };

        ws.onclose = () => {
          if (!this.isClosed && !this.isWsConnected) {
            this.startFallback();
          }
        };
      } catch {
        this.startFallback();
      }
    } else {
      this.startFallback();
    }
  }

  private startFallback() {
    if (this.isFallbackMode || this.isClosed) return;
    this.isFallbackMode = true;
    this.options.onStatusChange?.("Signaling connected via Cloud Database Sync");

    this.poll();
    this.pollInterval = setInterval(() => this.poll(), 1200);
  }

  private async poll() {
    if (this.isClosed) return;
    try {
      const res = await fetch(
        `/api/signaling?sessionId=${this.sessionId}&role=${this.role}&since=${encodeURIComponent(
          this.lastPollTime
        )}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          if (!this.processedMessageIds.has(msg.id)) {
            this.processedMessageIds.add(msg.id);
            if (msg.createdAt) this.lastPollTime = msg.createdAt;
            this.handleIncoming(msg.type, msg.payload);
          }
        }
      }
    } catch (e) {
      console.warn("[Signaling Poll]", e);
    }
  }

  private handleIncoming(type: string, payload: any) {
    if (type === "offer" && this.options.onOffer) {
      this.options.onOffer(payload);
    } else if (type === "answer" && this.options.onAnswer) {
      this.options.onAnswer(payload);
    } else if (type === "ice-candidate" && this.options.onIceCandidate) {
      this.options.onIceCandidate(payload);
    }
  }

  public async sendSignal(type: string, payload: any) {
    if (this.isClosed) return;

    if (this.isWsConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type,
          sessionId: this.sessionId,
          senderRole: this.role,
          payload,
        })
      );
      return;
    }

    try {
      await fetch("/api/signaling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          role: this.role,
          type,
          payload,
        }),
      });
    } catch (err) {
      console.error("[Signaling send failed]", err);
    }
  }

  public close() {
    this.isClosed = true;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
