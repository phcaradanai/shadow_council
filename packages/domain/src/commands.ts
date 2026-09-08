import type { Funding, MatchId, PlayerId, ReactionChoice } from "./model.js";

export interface StrikeCommand {
  readonly type: "STRIKE";
  readonly actorId: PlayerId;
  readonly targetId: PlayerId;
  readonly funding: Funding;
}

export interface RecoverCommand {
  readonly type: "RECOVER";
  readonly actorId: PlayerId;
}

export interface ReactCommand {
  readonly type: "REACT";
  readonly actorId: PlayerId;
  readonly choice: ReactionChoice;
}

export interface ExpirePhaseCommand {
  readonly type: "EXPIRE_PHASE";
  readonly phaseToken: string;
}

export type MatchCommand = StrikeCommand | RecoverCommand | ReactCommand | ExpirePhaseCommand;

export const strike = (actorId: PlayerId, targetId: PlayerId, funding: Funding): StrikeCommand => ({
  type: "STRIKE",
  actorId,
  targetId,
  funding,
});

export const recover = (actorId: PlayerId): RecoverCommand => ({ type: "RECOVER", actorId });

export const react = (actorId: PlayerId, choice: ReactionChoice): ReactCommand => ({
  type: "REACT",
  actorId,
  choice,
});

export const expirePhase = (phaseToken: string): ExpirePhaseCommand => ({
  type: "EXPIRE_PHASE",
  phaseToken,
});

export interface ClientIntent {
  readonly type: "STRIKE" | "RECOVER" | "REACT";
  readonly targetId?: PlayerId;
  readonly funding?: Funding;
  readonly choice?: ReactionChoice;
}

export interface CommandContext {
  readonly matchId: MatchId;
  readonly expectedRevision: number;
  readonly phaseToken: string;
  readonly commandId: string;
}
