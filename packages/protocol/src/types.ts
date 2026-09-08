export const PROTOCOL_VERSION = "1" as const;

export interface CreateRoomBody {
  readonly displayName?: string;
}

export interface JoinRoomBody {
  readonly displayName?: string;
}

export interface StartMatchBody {
  readonly commandId?: string;
}

export type WireIntent =
  | { readonly type: "STRIKE"; readonly targetId: string; readonly funding: 0 | 1 }
  | { readonly type: "RECOVER" }
  | { readonly type: "REACT"; readonly choice: "guard" | "challenge" | "yield" };

export interface CommandEnvelope {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly roomCode: string;
  readonly matchId: string;
  readonly commandId: string;
  readonly expectedRevision: number;
  readonly phaseToken: string;
  readonly intent: WireIntent;
}

export interface ParseError {
  readonly code: "InvalidPayload";
  readonly message: string;
}

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ParseError };

export interface WireError {
  readonly code: string;
  readonly message: string;
}

export interface WireRoomMemberView {
  readonly playerId: string;
  readonly displayName: string;
  readonly connected: boolean;
}

export interface WireRoomView {
  readonly roomId: string;
  readonly roomCode: string;
  readonly status: "LOBBY" | "PLAYING" | "FINISHED";
  readonly hostPlayerId: string;
  readonly members: readonly WireRoomMemberView[];
  readonly matchId?: string;
}

export type WireLegalIntent =
  | {
      readonly type: "STRIKE";
      readonly targetIds: readonly string[];
      readonly funding: readonly (0 | 1)[];
    }
  | { readonly type: "RECOVER" }
  | { readonly type: "REACT"; readonly choices: readonly ("guard" | "challenge" | "yield")[] };

export type WirePhaseView =
  | { readonly kind: "ACTIVE_TURN"; readonly activePlayerId: string; readonly phaseToken: string }
  | {
      readonly kind: "REACTION";
      readonly activePlayerId: string;
      readonly attackerId: string;
      readonly targetId: string;
      readonly phaseToken: string;
      readonly pendingFunding?: 0 | 1;
    }
  | { readonly kind: "FINISHED"; readonly winnerId: string };

export interface WirePlayerView {
  readonly playerId: string;
  readonly displayName: string;
  readonly influence: number;
  readonly power: number;
  readonly eliminated: boolean;
  readonly connected: boolean;
}

export interface WireMatchView {
  readonly roomCode: string;
  readonly status: "PLAYING" | "FINISHED";
  readonly matchId: string;
  readonly viewerPlayerId: string;
  readonly revision: number;
  readonly round: number;
  readonly seatOrder: readonly string[];
  readonly players: readonly WirePlayerView[];
  readonly phase: WirePhaseView;
  readonly legalIntents: readonly WireLegalIntent[];
}

export interface WireDomainEvent {
  readonly matchId?: string;
  readonly revision?: number;
  readonly ordinal?: number;
  readonly type: string;
  readonly [field: string]: unknown;
}

export interface WireNotification {
  readonly room: WireRoomView;
  readonly match?: WireMatchView;
  readonly events: readonly WireDomainEvent[];
}
