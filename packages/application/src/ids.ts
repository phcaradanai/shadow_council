import { asMatchId, asPlayerId } from "@shadow-council/domain";

export const matchIdFromWire = (value: string) => asMatchId(value);
export const playerIdFromWire = (value: string) => asPlayerId(value);

export type { MatchId, PlayerId } from "@shadow-council/domain";
