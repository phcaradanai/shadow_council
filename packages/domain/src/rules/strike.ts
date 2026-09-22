import type { RuleError } from "../errors.js";
import type { DomainEventData } from "../events.js";
import type {
  DefensePlan,
  Force,
  Funding,
  PlayerId,
  PlayerState,
  ReactionChoice,
  Result,
  SchemeType,
  Threat,
} from "../model.js";
import { failure, success } from "../model.js";
import { isAlive } from "./victory.js";

export interface StrikeValidationInput {
  readonly actorId: PlayerId;
  readonly targetId: PlayerId;
  readonly threat?: unknown;
  readonly force?: unknown;
  readonly funding?: unknown;
}

export interface ValidatedStrike {
  readonly threat: Threat;
  readonly force: Force;
}

export const validateStrike = (
  players: readonly PlayerState[],
  input: StrikeValidationInput,
): Result<ValidatedStrike, RuleError> => {
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

  // Support threat/force or backward-compat funding (0 | 1)
  let threat: Threat;
  let force: Force;

  if (input.threat !== undefined || input.force !== undefined) {
    if (input.threat !== 1 && input.threat !== 2 && input.threat !== 3) {
      return failure({ code: "InvalidThreat", message: "Threat must be 1, 2, or 3." });
    }
    if (input.force !== 0 && input.force !== 1 && input.force !== 2 && input.force !== 3) {
      return failure({ code: "InvalidForce", message: "Force must be 0, 1, 2, or 3." });
    }
    threat = input.threat;
    force = input.force;
  } else if (input.funding !== undefined) {
    if (input.funding !== 0 && input.funding !== 1) {
      return failure({ code: "InvalidFunding", message: "Funding must be 0 or 1." });
    }
    force = input.funding as Force;
    threat = (force === 0 ? 1 : force) as Threat;
  } else {
    return failure({ code: "InvalidThreat", message: "Threat and Force must be specified." });
  }

  if (force > threat) {
    return failure({
      code: "InvalidForce",
      message: `Committed Force (${force}) cannot exceed declared Threat (${threat}).`,
    });
  }
  if (actor.power < force) {
    return failure({
      code: "InsufficientPower",
      message: `Committed Force (${force}) exceeds available Power (${actor.power}).`,
    });
  }

  return success({ threat, force });
};

export const normalizeDefensePlan = (reaction: ReactionChoice): DefensePlan => {
  if (reaction === "yield") return { guard: 0, challenge: false };
  if (reaction === "challenge") return { guard: 0, challenge: true };
  if (typeof reaction === "object" && "type" in reaction && reaction.type === "guard") {
    return { guard: reaction.amount, challenge: false };
  }
  return reaction;
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
  threat: Threat,
  force: Force,
  reaction: ReactionChoice,
): StrikeResolution => {
  const attacker = players.find((player) => player.playerId === attackerId);
  const target = players.find((player) => player.playerId === targetId);
  if (attacker === undefined || target === undefined) {
    throw new Error("strike participants must exist after validation");
  }

  const plan = normalizeDefensePlan(reaction);
  const attackerPowerCost = force;
  const targetPowerCost = plan.guard + (plan.challenge ? 1 : 0);
  let attackerInfluenceLoss = 0;
  let targetInfluenceLoss = 0;
  let damageAbsorbed = 0;
  let ambushDamage = 0;

  const targetScheme: SchemeType | undefined = target.activeScheme;
  const usesAmbush = targetScheme === "ambush" && plan.challenge;
  const usesBulwark = targetScheme === "bulwark" && plan.guard > 0;
  const triggeredScheme: SchemeType | undefined = usesAmbush
    ? "ambush"
    : usesBulwark
      ? "bulwark"
      : undefined;

  const effectiveGuard = plan.guard + (usesBulwark ? 1 : 0);

  if (plan.challenge) {
    if (force < threat) {
      // Successful bluff call cancels incoming damage. Ambush increases the attacker's penalty.
      attackerInfluenceLoss = usesAmbush ? 2 : 1;
      ambushDamage = usesAmbush ? 1 : 0;
    } else {
      // Wrong call has fixed danger 2, but any committed Guard still mitigates it.
      targetInfluenceLoss = Math.max(0, 2 - effectiveGuard);
      damageAbsorbed = Math.min(2, effectiveGuard);
    }
  } else if (plan.guard > 0) {
    targetInfluenceLoss = Math.max(0, force - effectiveGuard);
    damageAbsorbed = Math.min(force, effectiveGuard);
  } else {
    // Yield: controlled loss, no Power spent.
    targetInfluenceLoss = 1;
  }

  const attackerPower = attacker.power - attackerPowerCost;
  const targetPower = target.power - targetPowerCost;
  const attackerInfluence = clampInfluence(attacker.influence - attackerInfluenceLoss);
  const targetInfluence = clampInfluence(target.influence - targetInfluenceLoss);

  // If target's scheme triggered (or consumed upon being attacked), reset target's activeScheme
  const nextTargetScheme = triggeredScheme ? undefined : target.activeScheme;

  const nextPlayers = players.map((player) => {
    if (player.playerId === attackerId) {
      return { ...player, power: attackerPower, influence: attackerInfluence };
    }
    if (player.playerId === targetId) {
      return {
        ...player,
        power: targetPower,
        influence: targetInfluence,
        activeScheme: nextTargetScheme,
      };
    }
    return player;
  });

  const eliminated: PlayerId[] = [];
  if (attacker.influence > 0 && attackerInfluence === 0) eliminated.push(attackerId);
  if (target.influence > 0 && targetInfluence === 0) eliminated.push(targetId);

  const genuine = force === threat;

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
      ...(damageAbsorbed > 0 ? { damageAbsorbed } : {}),
      ...(ambushDamage > 0 ? { ambushDamage } : {}),
    },
  ];

  if (!genuine && !plan.challenge) {
    events.push({
      type: "BluffSucceeded",
      attackerId,
      targetId,
      reaction: plan,
      outcome: plan.guard > 0 ? "guard" : "yield",
    });
  }

  for (const playerId of eliminated) {
    events.push({ type: "PlayerEliminated", playerId });
  }

  return { players: nextPlayers, events, eliminated };
};
