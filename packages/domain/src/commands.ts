import type { Force, MatchId, PlayerId, ReactionChoice, SchemeType, Threat } from "./model.js";

export interface StrikeCommand {
  readonly type: "STRIKE";
  readonly actorId: PlayerId;
  readonly targetId: PlayerId;
  readonly threat: Threat;
  readonly force: Force;
  // Backward compatibility alias:
  readonly funding?: Force;
}

export interface RecoverCommand {
  readonly type: "RECOVER";
  readonly actorId: PlayerId;
}

export interface SchemeCommand {
  readonly type: "SCHEME";
  readonly actorId: PlayerId;
  readonly schemeType: SchemeType;
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

export type MatchCommand =
  | StrikeCommand
  | RecoverCommand
  | SchemeCommand
  | ReactCommand
  | ExpirePhaseCommand;

export const strike = (
  actorId: PlayerId,
  targetId: PlayerId,
  threatOrFunding: Threat | Force,
  force?: Force,
): StrikeCommand => {
  if (force !== undefined) {
    const threat = threatOrFunding as Threat;
    return { type: "STRIKE", actorId, targetId, threat, force, funding: force };
  }
  // Backward compatibility for strike(actorId, targetId, funding: 0 | 1)
  // When only 1 value is passed, threat = max(1, funding), force = funding
  const f = threatOrFunding as Force;
  const threat: Threat = (f === 0 ? 1 : f) as Threat;
  return { type: "STRIKE", actorId, targetId, threat, force: f, funding: f };
};

export const recover = (actorId: PlayerId): RecoverCommand => ({ type: "RECOVER", actorId });

export const scheme = (actorId: PlayerId, schemeType: SchemeType): SchemeCommand => ({
  type: "SCHEME",
  actorId,
  schemeType,
});

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
  readonly type: "STRIKE" | "RECOVER" | "SCHEME" | "REACT";
  readonly targetId?: PlayerId;
  readonly threat?: Threat;
  readonly force?: Force;
  readonly funding?: Force;
  readonly schemeType?: SchemeType;
  readonly choice?: ReactionChoice;
}

export interface CommandContext {
  readonly matchId: MatchId;
  readonly expectedRevision: number;
  readonly phaseToken: string;
  readonly commandId: string;
}
