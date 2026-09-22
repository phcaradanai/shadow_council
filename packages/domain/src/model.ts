export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type MatchId = Brand<string, "MatchId">;
export type PlayerId = Brand<string, "PlayerId">;

export const asMatchId = (value: string): MatchId => value as MatchId;
export const asPlayerId = (value: string): PlayerId => value as PlayerId;

export type Threat = 1 | 2 | 3;
export type Force = 0 | 1 | 2 | 3;
export type SchemeType = "ambush" | "bulwark";
export type GuardAmount = 0 | 1 | 2 | 3;

export interface DefensePlan {
  readonly guard: GuardAmount;
  readonly challenge: boolean;
}

export type LegacyReactionChoice =
  | "yield"
  | "challenge"
  | { readonly type: "guard"; readonly amount: 1 | 2 | 3 };

export type ReactionChoice = LegacyReactionChoice | DefensePlan;

// Backward-compat alias for callers expecting Funding
export type Funding = Force;

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
  readonly activeScheme?: SchemeType | undefined;
}

export interface PendingStrike {
  readonly attackerId: PlayerId;
  readonly targetId: PlayerId;
  readonly threat: Threat;
  readonly force: Force;
  // Backward compatibility alias:
  readonly funding?: Force;
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
