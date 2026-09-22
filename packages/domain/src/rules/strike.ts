import type { RuleError } from "../errors.js";
import type { DomainEventData } from "../events.js";
import type {
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

  if (actor.power < force) {
    return failure({
      code: "InsufficientPower",
      message: `Committed Force (${force}) exceeds available Power (${actor.power}).`,
    });
  }

  return success({ threat, force });
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

  const attackerPowerCost = force;
  let targetPowerCost = 0;
  let attackerInfluenceLoss = 0;
  let targetInfluenceLoss = 0;
  let damageAbsorbed = 0;
  let ambushDamage = 0;

  const targetScheme: SchemeType | undefined = target.activeScheme;
  let triggeredScheme: SchemeType | undefined = undefined;

  // Bulwark: if target has activeScheme === "bulwark", absorbs 1 damage from incoming strike (unless challenge backfires)
  // Ambush: if reaction === "challenge" and force === 0 (bluff caught), ambush deals +1 damage to attacker!

  if (reaction === "yield") {
    // Yield: Target takes Threat damage. If target has Bulwark, absorb 1 damage.
    let effectiveDamage: number = threat;
    if (targetScheme === "bulwark") {
      triggeredScheme = "bulwark";
      damageAbsorbed = 1;
      effectiveDamage = Math.max(0, effectiveDamage - 1);
    }
    targetInfluenceLoss = effectiveDamage;
  } else if (reaction === "challenge") {
    if (force >= threat) {
      // Genuine Strike: Target takes (Threat + 1) damage. Bulwark absorbs 1 damage.
      let effectiveDamage: number = threat + 1;
      if (targetScheme === "bulwark") {
        triggeredScheme = "bulwark";
        damageAbsorbed = 1;
        effectiveDamage = Math.max(0, effectiveDamage - 1);
      }
      targetInfluenceLoss = effectiveDamage;
    } else {
      // Bluff caught: Attacker takes 1 damage.
      // If target had Ambush active, Ambush triggers: Attacker takes +1 damage (total 2).
      let attackerDamage = 1;
      if (targetScheme === "ambush") {
        triggeredScheme = "ambush";
        ambushDamage = 1;
        attackerDamage += 1;
      }
      attackerInfluenceLoss = attackerDamage;
    }
  } else if (typeof reaction === "object" && reaction.type === "guard") {
    // Guard (G): Target spends G Power (1-3).
    // Target absorbs G damage.
    // If target has Bulwark, Bulwark absorbs an additional 1 damage!
    const guardAmount = reaction.amount;
    targetPowerCost = guardAmount;

    let totalDefense = guardAmount;
    if (targetScheme === "bulwark") {
      triggeredScheme = "bulwark";
      damageAbsorbed = 1;
      totalDefense += 1;
    }

    const netDamage = Math.max(0, force - totalDefense);
    targetInfluenceLoss = netDamage;
  } else if ((reaction as unknown) === "guard") {
    // Backward compatibility for legacy "guard" string (amount 1)
    targetPowerCost = 1;
    let totalDefense = 1;
    if (targetScheme === "bulwark") {
      triggeredScheme = "bulwark";
      damageAbsorbed = 1;
      totalDefense += 1;
    }
    const netDamage = Math.max(0, force - totalDefense);
    targetInfluenceLoss = netDamage;
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

  const genuine = force >= threat;

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

  const isGuardReaction =
    (typeof reaction === "object" && reaction.type === "guard") ||
    (reaction as unknown) === "guard";

  if (!genuine && (isGuardReaction || reaction === "yield")) {
    events.push({
      type: "BluffSucceeded",
      attackerId,
      targetId,
      reaction,
      outcome: reaction === "yield" ? "yield" : "guard",
    });
  }

  for (const playerId of eliminated) {
    events.push({ type: "PlayerEliminated", playerId });
  }

  return { players: nextPlayers, events, eliminated };
};
