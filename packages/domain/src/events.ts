import type { Funding, MatchId, PlayerId, ReactionChoice } from "./model.js";

interface EventBase {
  readonly matchId: MatchId;
  readonly revision: number;
  readonly ordinal: number;
}

export type DomainEventData =
  | {
      readonly type: "MatchStarted";
      readonly seatOrder: readonly PlayerId[];
      readonly rulesVersion: string;
    }
  | {
      readonly type: "RoundStarted";
      readonly round: number;
      readonly turnQueue: readonly PlayerId[];
    }
  | {
      readonly type: "TurnStarted";
      readonly round: number;
      readonly activePlayerId: PlayerId;
      readonly phaseToken: string;
    }
  | {
      readonly type: "ActionCommitted";
      readonly attackerId: PlayerId;
      readonly targetId: PlayerId;
      readonly action: "Strike";
      readonly phaseToken: string;
    }
  | {
      readonly type: "ReactionCommitted";
      readonly targetId: PlayerId;
      readonly choice: ReactionChoice;
      readonly timedOut?: true;
    }
  | {
      readonly type: "ActionRevealed";
      readonly attackerId: PlayerId;
      readonly targetId: PlayerId;
      readonly funding: Funding;
      readonly genuine: boolean;
    }
  | {
      readonly type: "AttackResolved";
      readonly attackerId: PlayerId;
      readonly targetId: PlayerId;
      readonly reaction: ReactionChoice;
      readonly attackerPowerCost: number;
      readonly targetPowerCost: number;
      readonly attackerInfluenceLoss: number;
      readonly targetInfluenceLoss: number;
      readonly attackerPower: number;
      readonly targetPower: number;
      readonly attackerInfluence: number;
      readonly targetInfluence: number;
    }
  | {
      readonly type: "BluffSucceeded";
      readonly attackerId: PlayerId;
      readonly targetId: PlayerId;
      readonly reaction: "guard" | "yield";
    }
  | {
      readonly type: "PowerRecovered";
      readonly playerId: PlayerId;
      readonly powerGained: number;
      readonly power: number;
    }
  | { readonly type: "TurnPassed"; readonly playerId: PlayerId; readonly reason: "timeout" }
  | { readonly type: "PlayerEliminated"; readonly playerId: PlayerId }
  | { readonly type: "TurnEnded"; readonly playerId: PlayerId }
  | { readonly type: "RoundEnded"; readonly round: number }
  | { readonly type: "VictoryAchieved"; readonly winnerId: PlayerId };

export type DomainEvent = EventBase & DomainEventData;

export const createEventBatch = (
  matchId: MatchId,
  revision: number,
  inputs: readonly DomainEventData[],
): readonly DomainEvent[] =>
  inputs.map((input, ordinal) => ({ matchId, revision, ordinal, ...input }));
