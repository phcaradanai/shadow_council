import {
  PROTOCOL_VERSION,
  type CommandEnvelope,
  type WireIntent,
  type WireMatchView,
  type WireRoomView,
  type WireDomainEvent,
} from "@shadow-council/protocol";

export interface SessionResponse {
  readonly room: WireRoomView;
  readonly playerId: string;
}

export interface ViewResponse {
  readonly room: WireRoomView;
  readonly match?: WireMatchView;
}

export interface MatchCommandResponse {
  readonly match: WireMatchView;
  readonly events: readonly WireDomainEvent[];
  readonly revision: number;
  readonly duplicate: boolean;
}

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const code = typeof data.code === "string" ? data.code : "RequestFailed";
    const message = typeof data.message === "string" ? data.message : "Request failed";
    throw new ApiError(code, message);
  }
  return data as T;
};

export const api = {
  async createRoom(displayName: string): Promise<SessionResponse> {
    return requestJson<SessionResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify({ displayName }),
    });
  },

  async joinRoom(roomCode: string, displayName: string): Promise<SessionResponse> {
    return requestJson<SessionResponse>(`/rooms/${encodeURIComponent(roomCode)}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName }),
    });
  },

  async leaveRoom(roomCode: string): Promise<{ readonly room: WireRoomView | null }> {
    return requestJson<{ readonly room: WireRoomView | null }>(
      `/rooms/${encodeURIComponent(roomCode)}/leave`,
      { method: "POST", body: "{}" },
    );
  },

  async startMatch(
    roomCode: string,
    commandId?: string,
  ): Promise<{
    readonly room: WireRoomView;
    readonly match: WireMatchView;
    readonly events: readonly WireDomainEvent[];
  }> {
    return requestJson(`/rooms/${encodeURIComponent(roomCode)}/start`, {
      method: "POST",
      body: JSON.stringify(commandId !== undefined ? { commandId } : {}),
    });
  },

  async rematch(roomCode: string, commandId?: string): Promise<{ readonly room: WireRoomView }> {
    return requestJson<{ readonly room: WireRoomView }>(
      `/rooms/${encodeURIComponent(roomCode)}/rematch`,
      {
        method: "POST",
        body: JSON.stringify(commandId !== undefined ? { commandId } : {}),
      },
    );
  },

  async fetchView(roomCode: string): Promise<ViewResponse> {
    return requestJson<ViewResponse>(`/rooms/${encodeURIComponent(roomCode)}/view`);
  },

  async submitCommand(
    roomCode: string,
    matchId: string,
    commandId: string,
    expectedRevision: number,
    phaseToken: string,
    intent: WireIntent,
  ): Promise<MatchCommandResponse> {
    const envelope: CommandEnvelope = {
      protocolVersion: PROTOCOL_VERSION,
      roomCode,
      matchId,
      commandId,
      expectedRevision,
      phaseToken,
      intent,
    };
    return requestJson<MatchCommandResponse>(`/rooms/${encodeURIComponent(roomCode)}/commands`, {
      method: "POST",
      body: JSON.stringify(envelope),
    });
  },
};
