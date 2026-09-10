import type {
  WireDomainEvent,
  WireMatchView,
  WireNotification,
  WireRoomView,
} from "@shadow-council/protocol";

export type NotificationHandler = (
  room: WireRoomView,
  match: WireMatchView | undefined,
  events: readonly WireDomainEvent[],
) => void;

export type StatusHandler = (status: "connected" | "connecting" | "disconnected") => void;

export class RealtimeClient {
  private source: EventSource | undefined;
  private seenEventIds = new Set<string>();
  private lastRevision = -1;
  private retryTimeout: number | undefined;

  constructor(
    private readonly onNotification: NotificationHandler,
    private readonly onStatusChange?: StatusHandler,
  ) {}

  connect(roomCode: string): void {
    this.disconnect();
    if (roomCode.trim().length === 0) return;

    this.onStatusChange?.("connecting");
    const source = new EventSource(`/rooms/${encodeURIComponent(roomCode)}/events`);
    this.source = source;

    source.onopen = () => {
      this.onStatusChange?.("connected");
    };

    source.onmessage = (messageEvent) => {
      try {
        const payload = JSON.parse(messageEvent.data as string) as WireNotification;
        const incomingRevision = payload.match?.revision ?? -1;
        if (incomingRevision >= 0 && incomingRevision < this.lastRevision) {
          return;
        }

        const freshEvents = (payload.events ?? []).filter((item) => {
          if (
            item.matchId === undefined ||
            item.revision === undefined ||
            item.ordinal === undefined
          ) {
            return true;
          }
          const eventId = `${item.matchId}:${item.revision}:${item.ordinal}`;
          if (this.seenEventIds.has(eventId)) return false;
          this.seenEventIds.add(eventId);
          return true;
        });

        if (incomingRevision >= 0) {
          this.lastRevision = Math.max(this.lastRevision, incomingRevision);
        }

        this.onNotification(payload.room, payload.match, freshEvents);
      } catch {
        // Ignore unparseable notifications
      }
    };

    source.onerror = () => {
      this.onStatusChange?.("disconnected");
      // EventSource auto-retries in the browser
    };
  }

  resetRevisionTracking(): void {
    this.lastRevision = -1;
    this.seenEventIds.clear();
  }

  disconnect(): void {
    if (this.retryTimeout !== undefined) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = undefined;
    }
    if (this.source !== undefined) {
      this.source.close();
      this.source = undefined;
      this.onStatusChange?.("disconnected");
    }
  }
}
