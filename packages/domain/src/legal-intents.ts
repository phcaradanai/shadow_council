import type { Funding, MatchState, PlayerId } from "./model.js";
import { POWER_CAP } from "./rules/recover.js";
import { validateStrike } from "./rules/strike.js";
import { isAlive } from "./rules/victory.js";

export type LegalIntentDescription =
  | {
      readonly type: "STRIKE";
      readonly targetIds: readonly PlayerId[];
      readonly funding: readonly (0 | 1)[];
    }
  | { readonly type: "RECOVER" }
  | { readonly type: "REACT"; readonly choices: readonly ("guard" | "challenge" | "yield")[] };

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
    if (targets.length === 0) {
      return actor.power < POWER_CAP ? [{ type: "RECOVER" }] : [];
    }
    const fundingOptions = ([0, 1] as Funding[]).filter((funding) =>
      targets.some(
        (targetId) => validateStrike(state.players, { actorId: viewerId, targetId, funding }).ok,
      ),
    );
    const intents: LegalIntentDescription[] = [
      { type: "STRIKE", targetIds: targets, funding: fundingOptions },
    ];
    if (actor.power < POWER_CAP) intents.push({ type: "RECOVER" });
    return intents;
  }
  if (state.phase.pendingStrike.targetId !== viewerId) return [];
  const target = state.players.find((player) => player.playerId === viewerId);
  if (target === undefined || !isAlive(target)) return [];
  const choices: ("guard" | "challenge" | "yield")[] = ["challenge", "yield"];
  if (target.power >= 1) choices.unshift("guard");
  return [{ type: "REACT", choices }];
};

export const getLegalIntents = legalIntentsFor;
