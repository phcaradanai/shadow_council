import type { DomainEventData } from "../events.js";
import type { ActiveTurnPhase, MatchState, PlayerId, PlayerState } from "../model.js";
import { livingPlayers } from "./victory.js";

export const phaseTokenFor = (
  matchId: string,
  revision: number,
  phase: "ACTIVE_TURN" | "REACTION",
): string => {
  let hash = 2166136261;
  const input = `${matchId}:${revision}:${phase}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${phase.toLowerCase()}-${hash.toString(16).padStart(8, "0")}`;
};

export const queueFor = (
  seatOrder: readonly PlayerId[],
  players: readonly PlayerState[],
): readonly PlayerId[] => {
  const living = new Set(livingPlayers(players).map((player) => player.playerId));
  return seatOrder.filter((playerId) => living.has(playerId));
};

export interface AdvanceResult {
  readonly phase: ActiveTurnPhase;
  readonly round: number;
  readonly events: readonly DomainEventData[];
}

export const advanceAfterTurn = (
  state: Pick<MatchState, "matchId" | "round" | "seatOrder" | "phase">,
  players: readonly PlayerState[],
  revision: number,
): AdvanceResult => {
  const current = state.phase;
  if (current.kind === "FINISHED") {
    throw new Error("cannot advance a finished match");
  }

  for (let cursor = current.turnCursor + 1; cursor < current.turnQueue.length; cursor += 1) {
    const candidate = current.turnQueue[cursor];
    if (
      candidate !== undefined &&
      players.some((player) => player.playerId === candidate && player.influence > 0)
    ) {
      const phase: ActiveTurnPhase = {
        kind: "ACTIVE_TURN",
        activePlayerId: candidate,
        turnQueue: current.turnQueue,
        turnCursor: cursor,
        phaseToken: phaseTokenFor(state.matchId, revision, "ACTIVE_TURN"),
      };
      return {
        phase,
        round: state.round,
        events: [
          {
            type: "TurnStarted",
            round: state.round,
            activePlayerId: candidate,
            phaseToken: phase.phaseToken,
          },
        ],
      };
    }
  }

  const nextRound = state.round + 1;
  const nextQueue = queueFor(state.seatOrder, players);
  const nextPlayer = nextQueue[0];
  if (nextPlayer === undefined) {
    throw new Error("a non-terminal match must have a living player");
  }
  const phase: ActiveTurnPhase = {
    kind: "ACTIVE_TURN",
    activePlayerId: nextPlayer,
    turnQueue: nextQueue,
    turnCursor: 0,
    phaseToken: phaseTokenFor(state.matchId, revision, "ACTIVE_TURN"),
  };
  return {
    phase,
    round: nextRound,
    events: [
      { type: "RoundEnded", round: state.round },
      { type: "RoundStarted", round: nextRound, turnQueue: nextQueue },
      {
        type: "TurnStarted",
        round: nextRound,
        activePlayerId: nextPlayer,
        phaseToken: phase.phaseToken,
      },
    ],
  };
};
