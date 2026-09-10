import type { WireDomainEvent, WireMatchView, WireRoomView } from "@shadow-council/protocol";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface SessionState {
  room?: WireRoomView | undefined;
  match?: WireMatchView | undefined;
  playerId?: string | undefined;
  roomCode: string;
  connectionStatus: ConnectionStatus;
  errorMessage?: string | undefined;
  isSubmitting: boolean;
  recentEvents: readonly WireDomainEvent[];
}

export type StateListener = (state: SessionState) => void;

class SessionStore {
  private state: SessionState;
  private listeners: StateListener[] = [];
  private commandSequence = 1;

  constructor() {
    let savedCode = "";
    try {
      savedCode = sessionStorage.getItem("shadow-council.roomCode") ?? "";
    } catch {
      // Storage unavailable
    }
    this.state = {
      roomCode: savedCode,
      connectionStatus: "disconnected",
      isSubmitting: false,
      recentEvents: [],
    };
  }

  getState(): SessionState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  nextCommandId(): string {
    const id = `cmd-${this.state.playerId ?? "anon"}-${this.commandSequence}`;
    this.commandSequence += 1;
    return id;
  }

  setSubmitting(isSubmitting: boolean): void {
    this.state = { ...this.state, isSubmitting };
    this.notify();
  }

  setError(errorMessage?: string): void {
    this.state = { ...this.state, errorMessage, isSubmitting: false };
    this.notify();
  }

  clearError(): void {
    if (this.state.errorMessage !== undefined) {
      this.state = { ...this.state, errorMessage: undefined };
      this.notify();
    }
  }

  setConnectionStatus(connectionStatus: ConnectionStatus): void {
    if (this.state.connectionStatus !== connectionStatus) {
      this.state = { ...this.state, connectionStatus };
      this.notify();
    }
  }

  setRoomSession(room: WireRoomView, playerId: string): void {
    try {
      sessionStorage.setItem("shadow-council.roomCode", room.roomCode);
    } catch {
      // Storage unavailable
    }
    this.state = {
      ...this.state,
      room,
      roomCode: room.roomCode,
      playerId,
      errorMessage: undefined,
      isSubmitting: false,
    };
    this.notify();
  }

  updateFromNotification(
    room: WireRoomView,
    match: WireMatchView | undefined,
    events: readonly WireDomainEvent[],
  ): void {
    let recentEvents = this.state.recentEvents;
    if (events.length > 0) {
      recentEvents = [...events, ...recentEvents].slice(0, 20);
    }
    this.state = {
      ...this.state,
      room,
      match,
      recentEvents,
      isSubmitting: false,
    };
    this.notify();
  }

  clearSession(): void {
    try {
      sessionStorage.removeItem("shadow-council.roomCode");
    } catch {
      // Storage unavailable
    }
    this.state = {
      roomCode: "",
      room: undefined,
      match: undefined,
      playerId: undefined,
      connectionStatus: "disconnected",
      errorMessage: undefined,
      isSubmitting: false,
      recentEvents: [],
    };
    this.notify();
  }
}

export const session = new SessionStore();
