import { describe, expect, it } from "vitest";
import {
  asMatchId,
  asPlayerId,
  type LegalIntentDescription,
  type MatchState,
} from "@shadow-council/domain";
import {
  botDecisionPlayerId,
  botDelayMs,
  buildBotDecisionContext,
  selectBotIntent,
} from "./bot-policy.js";

const bot = asPlayerId("bot");
const opponentA = asPlayerId("opponent-a");
const opponentB = asPlayerId("opponent-b");

const baseState = (opponentPowers: readonly [number, number] = [0, 3]): MatchState => ({
  matchId: asMatchId("match-bot-policy"),
  rulesVersion: "0.2.3",
  revision: 0,
  round: 1,
  seatOrder: [bot, opponentA, opponentB],
  players: [
    { playerId: bot, influence: 3, power: 2 },
    { playerId: opponentA, influence: 3, power: opponentPowers[0] },
    { playerId: opponentB, influence: 3, power: opponentPowers[1] },
  ],
  randomState: {
    algorithmVersion: "test",
    seed: "seed",
    cursor: 0,
    value: 1,
  },
  phase: {
    kind: "ACTIVE_TURN",
    activePlayerId: bot,
    turnQueue: [bot, opponentA, opponentB],
    turnCursor: 0,
    phaseToken: "phase-active",
  },
});

const activeLegal: readonly LegalIntentDescription[] = [
  {
    type: "STRIKE",
    targetIds: [opponentA, opponentB],
    threats: [1, 2, 3],
    forces: [0, 1, 2],
    funding: [0, 1],
  },
];

describe("bot policy", () => {
  it("uses the target, not the attacker, as the decision player during REACTION", () => {
    const reaction: MatchState = {
      ...baseState(),
      phase: {
        kind: "REACTION",
        activePlayerId: opponentA,
        turnQueue: [opponentA, bot, opponentB],
        turnCursor: 0,
        phaseToken: "phase-react",
        pendingStrike: {
          attackerId: opponentA,
          targetId: bot,
          threat: 2,
          force: 0,
        },
      },
    };

    expect(botDecisionPlayerId(reaction)).toBe(bot);
  });

  it("sanitizes opponent Power and pending Force out of the decision context", () => {
    const reaction: MatchState = {
      ...baseState([3, 2]),
      phase: {
        kind: "REACTION",
        activePlayerId: opponentA,
        turnQueue: [opponentA, bot, opponentB],
        turnCursor: 0,
        phaseToken: "phase-react",
        pendingStrike: {
          attackerId: opponentA,
          targetId: bot,
          threat: 2,
          force: 2,
        },
      },
    };

    const context = buildBotDecisionContext(reaction, bot);
    expect(context).toBeDefined();
    expect(context?.phase).toEqual({ kind: "REACTION", threat: 2 });
    expect(context?.opponents).toEqual([
      { playerId: opponentA, influence: 3 },
      { playerId: opponentB, influence: 3 },
    ]);
    expect(JSON.stringify(context?.opponents)).not.toContain("power");
    expect(JSON.stringify(context?.phase)).not.toContain("force");
  });

  it("does not change hard target selection when hidden opponent Power changes", () => {
    const first = buildBotDecisionContext(baseState([0, 3]), bot);
    const second = buildBotDecisionContext(baseState([3, 0]), bot);
    if (!first || !second) throw new Error("missing context");

    const lowHigh = selectBotIntent("HARD", first, activeLegal, () => 0.99);
    const highLow = selectBotIntent("HARD", second, activeLegal, () => 0.99);

    expect(lowHigh).toMatchObject({ type: "STRIKE", targetId: opponentA });
    expect(highLow).toMatchObject({ type: "STRIKE", targetId: opponentA });
  });

  it("does not inspect hidden committed Force while choosing a hard defense", () => {
    const defensePlans = [
      { guard: 0 as const, challenge: false },
      { guard: 0 as const, challenge: true },
      { guard: 1 as const, challenge: false },
      { guard: 1 as const, challenge: true },
    ];
    const legal: readonly LegalIntentDescription[] = [
      {
        type: "REACT",
        choices: ["yield", "challenge", { type: "guard", amount: 1 }],
        defensePlans,
        challengeCost: 1,
      },
    ];

    const reactionState = (force: 0 | 2): MatchState => ({
      ...baseState(),
      phase: {
        kind: "REACTION",
        activePlayerId: opponentA,
        turnQueue: [opponentA, bot, opponentB],
        turnCursor: 0,
        phaseToken: "phase-react",
        pendingStrike: {
          attackerId: opponentA,
          targetId: bot,
          threat: 2,
          force,
        },
      },
    });

    const bluffContext = buildBotDecisionContext(reactionState(0), bot);
    const backedContext = buildBotDecisionContext(reactionState(2), bot);
    if (!bluffContext || !backedContext) throw new Error("missing context");

    const bluff = selectBotIntent("HARD", bluffContext, legal, () => 0);
    const backed = selectBotIntent("HARD", backedContext, legal, () => 0);

    expect(bluff).toEqual({ type: "REACT", choice: { guard: 1, challenge: true } });
    expect(backed).toEqual(bluff);
  });

  it("keeps bot think delay inside the configured difficulty band", () => {
    expect(botDelayMs("EASY", () => 0.5)).toBe(1700);
    expect(botDelayMs("MEDIUM", () => 0.5)).toBe(1050);
    expect(botDelayMs("HARD", () => 0.5)).toBe(550);
  });
});
