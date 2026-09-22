import type { Force, MatchState, PlayerId, ReactionChoice, SchemeType, Threat } from "./model.js";
import { POWER_CAP } from "./rules/recover.js";
import { SCHEME_POWER_COST } from "./rules/scheme.js";
import { validateStrike } from "./rules/strike.js";
import { isAlive } from "./rules/victory.js";

export type LegalIntentDescription =
  | {
      readonly type: "STRIKE";
      readonly targetIds: readonly PlayerId[];
      readonly threats: readonly Threat[];
      readonly forces: readonly Force[];
      // Backward compatibility alias:
      readonly funding: readonly (0 | 1)[];
    }
  | { readonly type: "RECOVER" }
  | { readonly type: "SCHEME"; readonly schemeTypes: readonly SchemeType[] }
  | { readonly type: "REACT"; readonly choices: readonly ReactionChoice[] };

export const legalIntentsFor = (
  state: MatchState,
  viewerId: PlayerId,
): readonly LegalIntentDescription[] => {
  if (state.phase.kind === "FINISHED") return [];
  if (state.phase.kind === "ACTIVE_TURN") {
    if (state.phase.activePlayerId !== viewerId) return [];
    const actor = state.players.find((player) => player.playerId === viewerId);
    if (actor === undefined || !isAlive(actor)) return [];
    const targets = state.players
      .filter((player) => player.playerId !== viewerId && isAlive(player))
      .map((player) => player.playerId);

    const intents: LegalIntentDescription[] = [];

    if (targets.length > 0) {
      const allThreats: Threat[] = [1, 2, 3];
      const maxForce = Math.min(3, actor.power) as Force;
      const forces: Force[] = [];
      for (let f = 0; f <= maxForce; f++) {
        forces.push(f as Force);
      }
      const legacyFunding = forces.filter((f) => f === 0 || f === 1) as (0 | 1)[];

      intents.push({
        type: "STRIKE",
        targetIds: targets,
        threats: allThreats,
        forces,
        funding: legacyFunding,
      });
    }

    if (actor.power < POWER_CAP) {
      intents.push({ type: "RECOVER" });
    }

    if (actor.power >= SCHEME_POWER_COST) {
      intents.push({
        type: "SCHEME",
        schemeTypes: ["ambush", "bulwark"],
      });
    }

    return intents;
  }

  if (state.phase.pendingStrike.targetId !== viewerId) return [];
  const target = state.players.find((player) => player.playerId === viewerId);
  if (target === undefined || !isAlive(target)) return [];

  const choices: ReactionChoice[] = ["challenge", "yield"];
  const maxGuard = Math.min(3, target.power);
  for (let g = 1; g <= maxGuard; g++) {
    choices.push({ type: "guard", amount: g as 1 | 2 | 3 });
  }

  return [{ type: "REACT", choices }];
};

export const getLegalIntents = legalIntentsFor;
