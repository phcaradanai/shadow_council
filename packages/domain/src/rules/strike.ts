import type { RuleError } from "../errors.js";
import type { DomainEventData } from "../events.js";
import type { Funding, PlayerId, PlayerState, ReactionChoice, Result } from "../model.js";
import { failure, success } from "../model.js";
import { isAlive } from "./victory.js";

export interface StrikeValidationInput {
  readonly actorId: PlayerId;
  readonly targetId: PlayerId;
  readonly funding: unknown;
}

export const validateStrike = (
  players: readonly PlayerState[],
  input: StrikeValidationInput,
): Result<Funding, RuleError> => {
  const actor = players.find((player) => player.playerId === input.actorId);
  const target = players.find((player) => player.playerId === input.targetId);
  if (actor === undefined || target === undefined) {
    return failure({
      code: "UnknownPlayer",
      message: "Both attacker and target must be in the match.",
    });
  }
  if (input.actorId === input.targetId || !isAlive(target)) {
    return failure({ code: "InvalidTarget", message: "A Strike needs a different living target." });
  }
  if (input.funding !== 0 && input.funding !== 1) {
    return failure({ code: "InvalidFunding", message: "Funding must be exactly 0 or 1." });
  }
  if (input.funding === 1 && actor.power < 1) {
    return failure({ code: "InsufficientPower", message: "Funding a Strike requires 1 Power." });
  }
  return success(input.funding);
};

export interface StrikeResolution {
  readonly players: readonly PlayerState[];
  readonly events: readonly DomainEventData[];
  readonly eliminated: readonly PlayerId[];
}

const clampInfluence = (value: number): number => Math.max(0, value);

export const resolveStrike = (
  players: readonly PlayerState[],
  attackerId: PlayerId,
  targetId: PlayerId,
  funding: Funding,
  reaction: ReactionChoice,
): StrikeResolution => {
  const attacker = players.find((player) => player.playerId === attackerId);
  const target = players.find((player) => player.playerId === targetId);
  if (attacker === undefined || target === undefined) {
    throw new Error("strike participants must exist after validation");
  }

  const attackerPowerCost = funding;
  const targetPowerCost = reaction === "guard" ? 1 : 0;
  let attackerInfluenceLoss = 0;
  let targetInfluenceLoss = 0;
  if (reaction === "challenge") {
    if (funding === 1) {
      targetInfluenceLoss = 2;
    } else {
      attackerInfluenceLoss = 1;
    }
  } else if (reaction === "yield") {
    targetInfluenceLoss = 1;
  }

  const attackerPower = attacker.power - attackerPowerCost;
  const targetPower = target.power - targetPowerCost;
  const attackerInfluence = clampInfluence(attacker.influence - attackerInfluenceLoss);
  const targetInfluence = clampInfluence(target.influence - targetInfluenceLoss);
  const nextPlayers = players.map((player) => {
    if (player.playerId === attackerId) {
      return { ...player, power: attackerPower, influence: attackerInfluence };
    }
    if (player.playerId === targetId) {
      return { ...player, power: targetPower, influence: targetInfluence };
    }
    return player;
  });

  const eliminated: PlayerId[] = [];
  if (attacker.influence > 0 && attackerInfluence === 0) eliminated.push(attackerId);
  if (target.influence > 0 && targetInfluence === 0) eliminated.push(targetId);
  const events: DomainEventData[] = [
    {
      type: "AttackResolved",
      attackerId,
      targetId,
      reaction,
      attackerPowerCost,
      targetPowerCost,
      attackerInfluenceLoss,
      targetInfluenceLoss,
      attackerPower,
      targetPower,
      attackerInfluence,
      targetInfluence,
    },
  ];
  if (funding === 0 && (reaction === "guard" || reaction === "yield")) {
    events.push({ type: "BluffSucceeded", attackerId, targetId, reaction });
  }
  for (const playerId of eliminated) events.push({ type: "PlayerEliminated", playerId });
  return { players: nextPlayers, events, eliminated };
};
