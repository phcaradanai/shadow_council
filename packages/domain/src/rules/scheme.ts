import type { RuleError } from "../errors.js";
import type { PlayerId, PlayerState, Result, SchemeType } from "../model.js";
import { failure, success } from "../model.js";

export const SCHEME_POWER_COST = 1;

export interface SchemeResult {
  readonly players: readonly PlayerState[];
  readonly schemeType: SchemeType;
}

export const prepareScheme = (
  players: readonly PlayerState[],
  actorId: PlayerId,
  schemeType: SchemeType,
): Result<SchemeResult, RuleError> => {
  const actor = players.find((player) => player.playerId === actorId);
  if (actor === undefined) {
    return failure({ code: "UnknownPlayer", message: "The acting player is not in this match." });
  }
  if (schemeType !== "ambush" && schemeType !== "bulwark") {
    return failure({ code: "InvalidScheme", message: "Scheme must be ambush or bulwark." });
  }
  if (actor.power < SCHEME_POWER_COST) {
    return failure({ code: "InsufficientPower", message: "Preparing a Scheme requires 1 Power." });
  }

  const nextPower = actor.power - SCHEME_POWER_COST;
  return success({
    schemeType,
    players: players.map((player) =>
      player.playerId === actorId
        ? { ...player, power: nextPower, activeScheme: schemeType }
        : player,
    ),
  });
};
