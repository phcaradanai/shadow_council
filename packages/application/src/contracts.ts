import type {
  DomainEvent,
  Funding,
  MatchCommand,
  MatchId,
  PlayerId,
  ReactionChoice,
} from "@shadow-council/domain";
import { applicationError } from "./errors.js";
import type { DeadlineRecord, StoredMatch } from "./ports.js";
import type { MatchView, RoomView } from "./views/projection.js";

export const ACTION_DEADLINE_MS = 45_000;
export const REACTION_DEADLINE_MS = 20_000;
export const MAX_ROOM_MEMBERS = 6;

export type SubmittedIntent =
  | { readonly type: "STRIKE"; readonly targetId: PlayerId; readonly funding: Funding }
  | { readonly type: "RECOVER" }
  | { readonly type: "REACT"; readonly choice: ReactionChoice };

export interface CreateRoomResult {
  readonly room: RoomView;
  readonly playerId: PlayerId;
  readonly credential: string;
}

export type JoinRoomResult = CreateRoomResult;

export interface StartMatchResult {
  readonly room: RoomView;
  readonly match: MatchView;
  readonly events: readonly DomainEvent[];
}

export interface ReadViewResult {
  readonly room: RoomView;
  readonly match?: MatchView;
}

export interface SubmitIntentInput {
  readonly roomCode: string;
  readonly credential: string;
  readonly commandId: string;
  readonly expectedRevision: number;
  readonly phaseToken: string;
  readonly matchId: MatchId;
  readonly intent: SubmittedIntent;
}

export interface SubmitIntentResult {
  readonly match: MatchView;
  readonly events: readonly DomainEvent[];
  readonly revision: number;
  readonly duplicate: boolean;
}

export const validateDisplayName = (value: string | undefined): string => {
  const name = value?.trim() ?? "";
  if (name.length === 0 || name.length > 32) {
    throw applicationError("InvalidDisplayName", "Display name must be 1–32 characters.");
  }
  return name;
};

export const commandFingerprint = (input: SubmitIntentInput): string =>
  JSON.stringify({
    matchId: input.matchId,
    expectedRevision: input.expectedRevision,
    phaseToken: input.phaseToken,
    intent: input.intent,
  });

export const phaseTokenOf = (match: StoredMatch): string | undefined => {
  const phase = match.state.phase;
  return phase.kind === "FINISHED" ? undefined : phase.phaseToken;
};

export const deadlineFor = (match: StoredMatch, now: number): DeadlineRecord | undefined => {
  const phase = match.state.phase;
  if (phase.kind === "FINISHED") return undefined;
  return {
    phaseToken: phase.phaseToken,
    deadlineAt: now + (phase.kind === "ACTIVE_TURN" ? ACTION_DEADLINE_MS : REACTION_DEADLINE_MS),
    kind: phase.kind,
  };
};

export const commandFor = (playerId: PlayerId, intent: SubmittedIntent): MatchCommand => {
  if (intent.type === "STRIKE") {
    return {
      type: "STRIKE",
      actorId: playerId,
      targetId: intent.targetId,
      funding: intent.funding,
    };
  }
  if (intent.type === "RECOVER") return { type: "RECOVER", actorId: playerId };
  return { type: "REACT", actorId: playerId, choice: intent.choice };
};
