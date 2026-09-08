import type { MatchState, PlayerId, PlayerState } from "../model.js";

export const isAlive = (player: PlayerState): boolean => player.influence > 0;

export const livingPlayers = (players: readonly PlayerState[]): readonly PlayerState[] =>
  players.filter(isAlive);

export const livingPlayerIds = (players: readonly PlayerState[]): readonly PlayerId[] =>
  livingPlayers(players).map((player) => player.playerId);

export const soleSurvivor = (state: Pick<MatchState, "players">): PlayerId | undefined => {
  const living = livingPlayerIds(state.players);
  return living.length === 1 ? living[0] : undefined;
};
