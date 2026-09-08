export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type MatchId = Brand<string, "MatchId">;
export type PlayerId = Brand<string, "PlayerId">;

export const asMatchId = (value: string): MatchId => value as MatchId;
export const asPlayerId = (value: string): PlayerId => value as PlayerId;

export type Funding = 0 | 1;
export type ReactionChoice = "guard" | "challenge" | "yield";

export interface RandomState {
  readonly algorithmVersion: string;
  readonly seed: string;
  readonly cursor: number;
  readonly value: number;
}

export interface PlayerState {
  readonly playerId: PlayerId;
  readonly influence: number;
  readonly power: number;
}

export interface PendingStrike {
  readonly attackerId: PlayerId;
  readonly targetId: PlayerId;
  readonly funding: Funding;
}

export interface ActiveTurnPhase {
  readonly kind: "ACTIVE_TURN";
  readonly activePlayerId: PlayerId;
  readonly turnQueue: readonly PlayerId[];
  readonly turnCursor: number;
  readonly phaseToken: string;
}

export interface ReactionPhase {
  readonly kind: "REACTION";
  readonly activePlayerId: PlayerId;
  readonly turnQueue: readonly PlayerId[];
  readonly turnCursor: number;
  readonly phaseToken: string;
  readonly pendingStrike: PendingStrike;
}

export interface FinishedPhase {
  readonly kind: "FINISHED";
  readonly winnerId: PlayerId;
}

export type MatchPhase = ActiveTurnPhase | ReactionPhase | FinishedPhase;

export interface MatchState {
  readonly matchId: MatchId;
  readonly rulesVersion: string;
  readonly revision: number;
  readonly round: number;
  readonly seatOrder: readonly PlayerId[];
  readonly players: readonly PlayerState[];
  readonly randomState: RandomState;
  readonly phase: MatchPhase;
}

export interface MatchSetup {
  readonly matchId: MatchId;
  readonly playerIds: readonly PlayerId[];
  readonly seed: string;
  readonly randomState?: RandomState;
  readonly rulesVersion?: string;
  readonly initialInfluence?: number;
  readonly initialPower?: number;
}

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const success = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const failure = <E>(error: E): Result<never, E> => ({ ok: false, error });
