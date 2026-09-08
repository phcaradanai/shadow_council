import type { DomainEventData } from "../events.js";
import type { RuleError } from "../errors.js";
import type { MatchSetup, MatchState, PlayerState, Result } from "../model.js";
import { failure, success } from "../model.js";
import type { Transition } from "../transition.js";
import type { RandomProvider } from "../random/random-provider.js";
import { phaseTokenFor, queueFor } from "../rules/turn.js";

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;
const DEFAULT_RULES_VERSION = "mvp-0.1";
const DEFAULT_INFLUENCE = 3;
const DEFAULT_POWER = 2;

const shuffle = <T>(
  values: readonly T[],
  randomProvider: RandomProvider,
  randomState: MatchState["randomState"],
): {
  readonly values: readonly T[];
  readonly randomState: MatchState["randomState"];
} => {
  const output = [...values];
  let state = randomState;
  for (let index = output.length - 1; index > 0; index -= 1) {
    const draw = randomProvider.nextInt(state, index + 1);
    state = draw.nextState;
    const selected = output[index];
    const replacement = output[draw.value];
    if (selected === undefined || replacement === undefined)
      throw new Error("shuffle index missing");
    output[index] = replacement;
    output[draw.value] = selected;
  }
  return { values: output, randomState: state };
};

export const createMatch = (
  setup: MatchSetup,
  randomProvider: RandomProvider,
): Result<Transition, RuleError> => {
  const ids = setup.playerIds;
  const rulesVersion = setup.rulesVersion ?? DEFAULT_RULES_VERSION;
  const influence = setup.initialInfluence ?? DEFAULT_INFLUENCE;
  const power = setup.initialPower ?? DEFAULT_POWER;
  if (setup.matchId.length === 0 || setup.seed.trim().length === 0) {
    return failure({ code: "InvalidSetup", message: "Match ID and seed are required." });
  }
  if (ids.length < MIN_PLAYERS || ids.length > MAX_PLAYERS) {
    return failure({ code: "InvalidSetup", message: "A match needs between 2 and 6 players." });
  }
  if (new Set(ids).size !== ids.length) {
    return failure({ code: "InvalidSetup", message: "Player IDs must be unique." });
  }
  if (!Number.isInteger(influence) || influence < 1 || influence > 3) {
    return failure({ code: "InvalidSetup", message: "Initial Influence must be between 1 and 3." });
  }
  if (!Number.isInteger(power) || power < 0 || power > 3) {
    return failure({ code: "InvalidSetup", message: "Initial Power must be between 0 and 3." });
  }

  const initialRandomState = setup.randomState ?? randomProvider.initialize?.(setup.seed);
  if (initialRandomState === undefined) {
    return failure({ code: "InvalidSetup", message: "A random initial state is required." });
  }
  const shuffled = shuffle(ids, randomProvider, initialRandomState);
  const players: readonly PlayerState[] = shuffled.values.map((playerId) => ({
    playerId,
    influence,
    power,
  }));
  const phaseToken = phaseTokenFor(setup.matchId, 0, "ACTIVE_TURN");
  const queue = queueFor(shuffled.values, players);
  const activePlayerId = queue[0];
  if (activePlayerId === undefined) throw new Error("setup produced an empty queue");
  const state: MatchState = {
    matchId: setup.matchId,
    rulesVersion,
    revision: 0,
    round: 1,
    seatOrder: shuffled.values,
    players,
    randomState: shuffled.randomState,
    phase: {
      kind: "ACTIVE_TURN",
      activePlayerId,
      turnQueue: queue,
      turnCursor: 0,
      phaseToken,
    },
  };
  const eventInputs: readonly DomainEventData[] = [
    { type: "MatchStarted", seatOrder: state.seatOrder, rulesVersion },
    { type: "RoundStarted", round: 1, turnQueue: queue },
    { type: "TurnStarted", round: 1, activePlayerId, phaseToken },
  ];
  return success({
    state,
    events: eventInputs.map((event, ordinal) => ({
      matchId: setup.matchId,
      revision: 0,
      ordinal,
      ...event,
    })),
  });
};
