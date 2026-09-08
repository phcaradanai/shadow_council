import type { RuleError } from "../errors.js";
import type { PlayerId, PlayerState, Result } from "../model.js";
import { failure, success } from "../model.js";

export const POWER_CAP = 3;

export interface RecoverResult {
  readonly players: readonly PlayerState[];
  readonly resultingPower: number;
}

export const recoverPower = (
  players: readonly PlayerState[],
  actorId: PlayerId,
): Result<RecoverResult, RuleError> => {
  const actor = players.find((player) => player.playerId === actorId);
  if (actor === undefined) {
    return failure({ code: "UnknownPlayer", message: "The acting player is not in this match." });
  }
  if (actor.power >= POWER_CAP) {
    return failure({ code: "PowerAtCap", message: "Power is already at its maximum." });
  }
  const resultingPower = actor.power + 1;
  return success({
    resultingPower,
    players: players.map((player) =>
      player.playerId === actorId ? { ...player, power: resultingPower } : player,
    ),
  });
};
