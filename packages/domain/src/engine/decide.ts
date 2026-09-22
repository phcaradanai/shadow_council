import type { MatchCommand } from "../commands.js";
import { createEventBatch, type DomainEventData } from "../events.js";
import type { RuleError } from "../errors.js";
import type {
  ActiveTurnPhase,
  MatchState,
  PlayerId,
  PlayerState,
  ReactionChoice,
  Result,
} from "../model.js";
import { failure, success } from "../model.js";
import type { Transition } from "../transition.js";
import type { RandomProvider } from "../random/random-provider.js";
import { recoverPower } from "../rules/recover.js";
import { prepareScheme } from "../rules/scheme.js";
import { advanceAfterTurn, phaseTokenFor } from "../rules/turn.js";
import { resolveStrike, validateStrike } from "../rules/strike.js";
import { soleSurvivor } from "../rules/victory.js";

const nextRevision = (state: MatchState): number => state.revision + 1;

const transition = (
  state: MatchState,
  phase: MatchState["phase"],
  players: readonly PlayerState[],
  inputs: readonly DomainEventData[],
  round = state.round,
): Transition => {
  const revision = nextRevision(state);
  return {
    state: { ...state, revision, round, phase, players },
    events: createEventBatch(state.matchId, revision, inputs),
  };
};

const ensureActiveActor = (
  phase: ActiveTurnPhase,
  actorId: PlayerId,
  players: readonly PlayerState[],
): RuleError | undefined => {
  if (phase.activePlayerId !== actorId) {
    return { code: "NotYourTurn", message: "Only the active player may act." };
  }
  const actor = players.find((player) => player.playerId === actorId);
  if (actor === undefined || actor.influence <= 0) {
    return { code: "NotYourTurn", message: "An eliminated player cannot act." };
  }
  return undefined;
};

const advanceInputs = (
  state: MatchState,
  players: readonly PlayerState[],
  revision: number,
): ReturnType<typeof advanceAfterTurn> => advanceAfterTurn(state, players, revision);

const resolveReaction = (
  state: MatchState,
  choice: ReactionChoice,
  timedOut: boolean,
): Result<Transition, RuleError> => {
  if (state.phase.kind !== "REACTION") {
    return failure({ code: "WrongPhase", message: "A reaction is not currently pending." });
  }
  const phase = state.phase;
  const target = state.players.find((player) => player.playerId === phase.pendingStrike.targetId);
  if (target === undefined || target.influence <= 0) {
    return failure({ code: "InvalidTarget", message: "The reaction target is no longer living." });
  }

  // Validate Guard power
  if (typeof choice === "object" && choice.type === "guard") {
    if (choice.amount !== 1 && choice.amount !== 2 && choice.amount !== 3) {
      return failure({ code: "InvalidReaction", message: "Guard amount must be 1, 2, or 3." });
    }
    if (target.power < choice.amount) {
      return failure({
        code: "InsufficientPower",
        message: `Guard (${choice.amount}) requires ${choice.amount} Power (you have ${target.power}).`,
      });
    }
  } else if ((choice as unknown) === "guard") {
    if (target.power < 1) {
      return failure({ code: "InsufficientPower", message: "Guard requires 1 Power." });
    }
  }

  const threat = phase.pendingStrike.threat ?? (phase.pendingStrike.funding === 0 ? 1 : (phase.pendingStrike.funding as 1));
  const force = phase.pendingStrike.force ?? phase.pendingStrike.funding ?? 0;

  const resolution = resolveStrike(
    state.players,
    phase.pendingStrike.attackerId,
    phase.pendingStrike.targetId,
    threat,
    force,
    choice,
  );
  const revision = nextRevision(state);
  const genuine = force >= threat;

  const inputs: DomainEventData[] = [
    {
      type: "ReactionCommitted",
      targetId: phase.pendingStrike.targetId,
      choice,
      ...(timedOut ? { timedOut: true } : {}),
    },
    {
      type: "ActionRevealed",
      attackerId: phase.pendingStrike.attackerId,
      targetId: phase.pendingStrike.targetId,
      threat,
      force,
      funding: force,
      genuine,
      triggeredScheme: target.activeScheme,
    },
    ...resolution.events,
    { type: "TurnEnded", playerId: phase.pendingStrike.attackerId },
  ];
  const survivor = soleSurvivor({ players: resolution.players });
  if (survivor !== undefined) {
    inputs.push({ type: "VictoryAchieved", winnerId: survivor });
    return success(
      transition(state, { kind: "FINISHED", winnerId: survivor }, resolution.players, inputs),
    );
  }
  const advanced = advanceInputs(state, resolution.players, revision);
  return success(
    transition(
      state,
      advanced.phase,
      resolution.players,
      [...inputs, ...advanced.events],
      advanced.round,
    ),
  );
};

export const decide = (
  state: MatchState,
  command: MatchCommand,
  randomProvider: RandomProvider,
): Result<Transition, RuleError> => {
  void randomProvider;
  if (state.phase.kind === "FINISHED") {
    return failure({ code: "WrongPhase", message: "The match has already finished." });
  }

  if (state.phase.kind === "ACTIVE_TURN") {
    const phase = state.phase;
    if (command.type === "STRIKE") {
      const actorError = ensureActiveActor(phase, command.actorId, state.players);
      if (actorError !== undefined) return failure(actorError);
      const valid = validateStrike(state.players, command);
      if (!valid.ok) return valid;
      const revision = nextRevision(state);
      const reactionPhase = {
        kind: "REACTION" as const,
        activePlayerId: command.actorId,
        turnQueue: phase.turnQueue,
        turnCursor: phase.turnCursor,
        phaseToken: phaseTokenFor(state.matchId, revision, "REACTION"),
        pendingStrike: {
          attackerId: command.actorId,
          targetId: command.targetId,
          threat: valid.value.threat,
          force: valid.value.force,
          funding: valid.value.force,
        },
      };
      return success(
        transition(state, reactionPhase, state.players, [
          {
            type: "ActionCommitted",
            attackerId: command.actorId,
            targetId: command.targetId,
            action: "Strike",
            threat: valid.value.threat,
            phaseToken: reactionPhase.phaseToken,
          },
        ]),
      );
    }
    if (command.type === "RECOVER") {
      const actorError = ensureActiveActor(phase, command.actorId, state.players);
      if (actorError !== undefined) return failure(actorError);
      const recovered = recoverPower(state.players, command.actorId);
      if (!recovered.ok) return recovered;
      const revision = nextRevision(state);
      const advanced = advanceInputs(state, recovered.value.players, revision);
      return success(
        transition(
          state,
          advanced.phase,
          recovered.value.players,
          [
            {
              type: "PowerRecovered",
              playerId: command.actorId,
              powerGained: recovered.value.powerGained,
              power: recovered.value.resultingPower,
            },
            { type: "TurnEnded", playerId: command.actorId },
            ...advanced.events,
          ],
          advanced.round,
        ),
      );
    }
    if (command.type === "SCHEME") {
      const actorError = ensureActiveActor(phase, command.actorId, state.players);
      if (actorError !== undefined) return failure(actorError);
      const schemed = prepareScheme(state.players, command.actorId, command.schemeType);
      if (!schemed.ok) return schemed;
      const revision = nextRevision(state);
      const advanced = advanceInputs(state, schemed.value.players, revision);
      return success(
        transition(
          state,
          advanced.phase,
          schemed.value.players,
          [
            {
              type: "SchemePrepared",
              actorId: command.actorId,
              schemeType: command.schemeType,
            },
            { type: "TurnEnded", playerId: command.actorId },
            ...advanced.events,
          ],
          advanced.round,
        ),
      );
    }
    if (command.type === "EXPIRE_PHASE") {
      if (command.phaseToken !== phase.phaseToken) {
        return failure({ code: "StalePhase", message: "That phase has already advanced." });
      }
      const revision = nextRevision(state);
      const advanced = advanceInputs(state, state.players, revision);
      return success(
        transition(
          state,
          advanced.phase,
          state.players,
          [
            { type: "TurnPassed", playerId: phase.activePlayerId, reason: "timeout" },
            { type: "TurnEnded", playerId: phase.activePlayerId },
            ...advanced.events,
          ],
          advanced.round,
        ),
      );
    }
    return failure({
      code: "WrongPhase",
      message: "That command is not valid during an active turn.",
    });
  }

  if (command.type === "REACT") {
    const phase = state.phase;
    if (phase.kind !== "REACTION") throw new Error("phase narrowed incorrectly");
    if (phase.pendingStrike.targetId !== command.actorId) {
      return failure({ code: "NotYourTurn", message: "Only the named target may react." });
    }
    const target = state.players.find((player) => player.playerId === command.actorId);
    if (target === undefined || target.influence <= 0) {
      return failure({ code: "NotYourTurn", message: "An eliminated player cannot react." });
    }
    const isValidChoice =
      command.choice === "yield" ||
      command.choice === "challenge" ||
      (typeof command.choice === "object" && command.choice.type === "guard") ||
      (command.choice as unknown) === "guard";
    if (!isValidChoice) {
      return failure({ code: "InvalidReaction", message: "That reaction is not supported." });
    }
    return resolveReaction(state, command.choice, false);
  }
  if (command.type === "EXPIRE_PHASE") {
    const phase = state.phase;
    if (command.phaseToken !== phase.phaseToken) {
      return failure({ code: "StalePhase", message: "That phase has already advanced." });
    }
    return resolveReaction(state, "yield", true);
  }
  return failure({ code: "WrongPhase", message: "That command is not valid during a reaction." });
};
