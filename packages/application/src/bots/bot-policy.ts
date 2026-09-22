import type {
  LegalIntentDescription,
  MatchState,
  PlayerId,
  SchemeType,
  Threat,
} from "@shadow-council/domain";
import type { BotDifficulty, SubmittedIntent } from "../contracts.js";

export type BotRandom = () => number;

export interface BotDecisionContext {
  readonly own: {
    readonly playerId: PlayerId;
    readonly influence: number;
    readonly power: number;
    readonly activeScheme?: SchemeType;
  };
  readonly opponents: readonly {
    readonly playerId: PlayerId;
    readonly influence: number;
  }[];
  readonly phase:
    | { readonly kind: "ACTIVE_TURN" }
    | { readonly kind: "REACTION"; readonly threat: Threat };
}

const choose = <T>(items: readonly T[], random: BotRandom): T | undefined => {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
};

export const botDecisionPlayerId = (state: MatchState): PlayerId | undefined => {
  if (state.phase.kind === "FINISHED") return undefined;
  return state.phase.kind === "REACTION"
    ? state.phase.pendingStrike.targetId
    : state.phase.activePlayerId;
};

export const buildBotDecisionContext = (
  state: MatchState,
  botPlayerId: PlayerId,
): BotDecisionContext | undefined => {
  const own = state.players.find((player) => player.playerId === botPlayerId);
  if (!own) return undefined;

  const opponents = state.players
    .filter((player) => player.playerId !== botPlayerId && player.influence > 0)
    .map((player) => ({
      playerId: player.playerId,
      influence: player.influence,
    }));

  const phase: BotDecisionContext["phase"] =
    state.phase.kind === "REACTION"
      ? { kind: "REACTION", threat: state.phase.pendingStrike.threat }
      : { kind: "ACTIVE_TURN" };

  return {
    own: {
      playerId: own.playerId,
      influence: own.influence,
      power: own.power,
      ...(own.activeScheme !== undefined ? { activeScheme: own.activeScheme } : {}),
    },
    opponents,
    phase,
  };
};

export const botDelayMs = (
  difficulty: BotDifficulty,
  random: BotRandom = Math.random,
): number => {
  switch (difficulty) {
    case "EASY":
      return 1200 + random() * 1000;
    case "HARD":
      return 300 + random() * 500;
    case "MEDIUM":
    default:
      return 700 + random() * 700;
  }
};

export const selectBotIntent = (
  difficulty: BotDifficulty,
  context: BotDecisionContext,
  legal: readonly LegalIntentDescription[],
  random: BotRandom = Math.random,
): SubmittedIntent | undefined => {
  if (legal.length === 0) return undefined;

  const strikeOption = legal.find((intent) => intent.type === "STRIKE") as
    | Extract<LegalIntentDescription, { type: "STRIKE" }>
    | undefined;
  const recoverOption = legal.find((intent) => intent.type === "RECOVER");
  const schemeOption = legal.find((intent) => intent.type === "SCHEME") as
    | Extract<LegalIntentDescription, { type: "SCHEME" }>
    | undefined;
  const reactOption = legal.find((intent) => intent.type === "REACT") as
    | Extract<LegalIntentDescription, { type: "REACT" }>
    | undefined;

  const botPower = context.own.power;

  if (reactOption) {
    const plans = reactOption.defensePlans ?? [];
    if (plans.length > 0) {
      const hybrids = plans.filter((plan) => plan.guard > 0 && plan.challenge);
      const guards = plans.filter((plan) => plan.guard > 0 && !plan.challenge);
      const challenges = plans.filter((plan) => plan.guard === 0 && plan.challenge);
      const yields = plans.filter((plan) => plan.guard === 0 && !plan.challenge);

      let pool = plans;
      if (difficulty === "MEDIUM") {
        const roll = random();
        pool =
          roll < 0.35 && hybrids.length > 0
            ? hybrids
            : roll < 0.7 && guards.length > 0
              ? guards
              : roll < 0.88 && challenges.length > 0
                ? challenges
                : yields.length > 0
                  ? yields
                  : plans;
      } else if (difficulty === "HARD") {
        const publicThreat = context.phase.kind === "REACTION" ? context.phase.threat : 1;
        const wantsInsurance = publicThreat >= 2 || context.own.influence <= 1;
        pool =
          wantsInsurance && hybrids.length > 0
            ? hybrids
            : guards.length > 0
              ? guards
              : challenges.length > 0
                ? challenges
                : plans;
      }

      const plan = choose(pool, random);
      return plan === undefined ? undefined : { type: "REACT", choice: plan };
    }

    const choice = choose(reactOption.choices, random);
    return choice === undefined ? undefined : { type: "REACT", choice };
  }

  if (difficulty === "EASY") {
    const availableTypes: ("STRIKE" | "RECOVER" | "SCHEME")[] = [];
    if (strikeOption && strikeOption.targetIds.length > 0) availableTypes.push("STRIKE");
    if (recoverOption) availableTypes.push("RECOVER");
    if (schemeOption && schemeOption.schemeTypes.length > 0 && !context.own.activeScheme) {
      availableTypes.push("SCHEME");
    }

    const chosenType = choose(availableTypes, random);
    if (chosenType === undefined) return undefined;
    if (chosenType === "RECOVER") return { type: "RECOVER" };
    if (chosenType === "SCHEME") {
      const schemeType = choose(schemeOption?.schemeTypes ?? [], random);
      return schemeType === undefined ? undefined : { type: "SCHEME", schemeType };
    }

    const targetId = choose(strikeOption?.targetIds ?? [], random);
    const threat = choose(strikeOption?.threats ?? [1, 2, 3], random);
    if (targetId === undefined || threat === undefined) return undefined;
    const legalForces = (strikeOption?.forces ?? [0]).filter((force) => force <= threat);
    const force = choose(legalForces, random) ?? 0;
    return { type: "STRIKE", targetId, threat, force, funding: force };
  }

  if (difficulty === "MEDIUM") {
    if (
      schemeOption &&
      botPower >= 1 &&
      !context.own.activeScheme &&
      random() < 0.25
    ) {
      return { type: "SCHEME", schemeType: random() < 0.5 ? "ambush" : "bulwark" };
    }

    if (recoverOption) {
      if (botPower === 0 && random() < 0.85) return { type: "RECOVER" };
      if (botPower < 2 && random() < 0.45) return { type: "RECOVER" };
    }

    if (strikeOption && strikeOption.targetIds.length > 0) {
      const opponents = context.opponents
        .filter((player) => strikeOption.targetIds.includes(player.playerId))
        .sort((a, b) => b.influence - a.influence);

      const randomTarget = choose(strikeOption.targetIds, random);
      const targetId =
        random() < 0.6 && opponents.length > 0 ? opponents[0]!.playerId : randomTarget;
      const threat = choose(strikeOption.threats ?? [1, 2, 3], random);
      if (targetId === undefined || threat === undefined) return undefined;
      const forces = (strikeOption.forces ?? [0]).filter((force) => force <= threat);
      const force = botPower >= threat && random() < 0.55 ? threat : (choose(forces, random) ?? 0);
      return { type: "STRIKE", targetId, threat, force, funding: force };
    }

    if (recoverOption) return { type: "RECOVER" };
  }

  if (
    schemeOption &&
    botPower >= 1 &&
    !context.own.activeScheme &&
    context.own.influence <= 2 &&
    random() < 0.4
  ) {
    return { type: "SCHEME", schemeType: "bulwark" };
  }

  if (strikeOption && strikeOption.targetIds.length > 0) {
    const vulnerable = context.opponents.find(
      (player) => strikeOption.targetIds.includes(player.playerId) && player.influence === 1,
    );
    if (vulnerable && random() < 0.9) {
      const threat = 1;
      const force = botPower >= 1 ? 1 : 0;
      return { type: "STRIKE", targetId: vulnerable.playerId, threat, force, funding: force };
    }
  }

  if (recoverOption) {
    if (botPower === 0 && random() < 0.95) return { type: "RECOVER" };
    if (botPower < 2 && random() < 0.6) return { type: "RECOVER" };
  }

  if (strikeOption && strikeOption.targetIds.length > 0) {
    const targetId = context.opponents
      .filter((player) => strikeOption.targetIds.includes(player.playerId))
      .sort((a, b) => b.influence - a.influence)[0]?.playerId;
    if (targetId === undefined) return undefined;

    const threat = Math.min(2, Math.max(1, botPower)) as 1 | 2;
    const force = botPower >= threat && random() < 0.65 ? threat : 0;
    return { type: "STRIKE", targetId, threat, force, funding: force };
  }

  return recoverOption ? { type: "RECOVER" } : undefined;
};
