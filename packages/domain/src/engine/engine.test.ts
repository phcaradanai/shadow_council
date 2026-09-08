import { describe, expect, it } from "vitest";
import {
  asMatchId,
  asPlayerId,
  createMatch,
  decide,
  expirePhase,
  react,
  recover,
  seededRandom,
  strike,
  type MatchState,
  type PlayerId,
  type Transition,
} from "../index.js";

const provider = seededRandom;
const players = ["a", "b", "c"].map(asPlayerId);

const setup = (ids: readonly PlayerId[] = players): Transition => {
  const result = createMatch(
    { matchId: asMatchId("match-1"), playerIds: ids, seed: "golden" },
    provider,
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const findPlayer = (state: MatchState, id: string) => {
  const player = state.players.find((candidate) => candidate.playerId === id);
  if (player === undefined) throw new Error(`missing player ${id}`);
  return player;
};

const play = (state: MatchState, command: Parameters<typeof decide>[1]): Transition => {
  const result = decide(state, command, provider);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

describe("domain setup", () => {
  it("creates a deterministic shuffled active turn", () => {
    const first = setup();
    const second = setup();
    expect(first.state).toEqual(second.state);
    expect(first.events).toEqual(second.events);
    expect(first.state.revision).toBe(0);
    expect(
      first.state.players.every((player) => player.influence === 3 && player.power === 2),
    ).toBe(true);
  });

  it("rejects an invalid roster without consuming randomness", () => {
    const result = createMatch(
      { matchId: asMatchId("match-1"), playerIds: [asPlayerId("a")], seed: "golden" },
      provider,
    );
    expect(result.ok).toBe(false);
  });
});

describe("Strike and reactions", () => {
  it.each([
    ["guard", 1, 1, 1, 3, 3],
    ["challenge", 1, 1, 2, 1, 3],
    ["yield", 1, 1, 2, 2, 3],
    ["guard", 0, 2, 1, 3, 3],
    ["challenge", 0, 2, 2, 3, 2],
    ["yield", 0, 2, 2, 2, 3],
  ] as const)(
    "resolves %s with funding %d",
    (
      choice,
      funding,
      expectedAttackerPower,
      expectedTargetPower,
      expectedTargetInfluence,
      expectedAttackerInfluence,
    ) => {
      const initial = setup();
      if (initial.state.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
      const attacker = initial.state.phase.activePlayerId;
      const target = initial.state.seatOrder.find((id) => id !== attacker);
      if (target === undefined) throw new Error("missing target");
      const committed = play(initial.state, strike(attacker, target, funding));
      expect(committed.state.phase.kind).toBe("REACTION");
      const resolved = play(committed.state, react(target, choice));
      const attackerState = findPlayer(resolved.state, attacker);
      const targetState = findPlayer(resolved.state, target);
      expect(attackerState.power).toBe(2 - funding);
      expect(targetState.power).toBe(2 - (choice === "guard" ? 1 : 0));
      expect(attackerState.power).toBe(expectedAttackerPower);
      expect(targetState.power).toBe(expectedTargetPower);
      expect(targetState.influence).toBe(expectedTargetInfluence);
      expect(attackerState.influence).toBe(expectedAttackerInfluence);
      expect(resolved.events.map((event) => event.type)).toContain("ActionRevealed");
    },
  );

  it("keeps funding private in state until reaction and rejects non-target reaction", () => {
    const initial = setup();
    if (initial.state.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    const attacker = initial.state.phase.activePlayerId;
    const target = initial.state.seatOrder.find((id) => id !== attacker);
    if (target === undefined) throw new Error("missing target");
    const committed = play(initial.state, strike(attacker, target, 0));
    expect(
      committed.state.phase.kind === "REACTION" && committed.state.phase.pendingStrike.funding,
    ).toBe(0);
    const invalid = decide(committed.state, react(attacker, "yield"), provider);
    expect(invalid.ok).toBe(false);
    expect(invalid.ok ? undefined : invalid.error.code).toBe("NotYourTurn");
  });

  it("expires an active turn as a pass and a reaction as Yield", () => {
    const initial = setup();
    if (initial.state.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    const passed = play(initial.state, expirePhase(initial.state.phase.phaseToken));
    expect(passed.events[0]?.type).toBe("TurnPassed");
    if (passed.state.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    const target = passed.state.seatOrder.find((id) => id !== passed.state.phase.activePlayerId);
    if (target === undefined) throw new Error("missing target");
    const committed = play(passed.state, strike(passed.state.phase.activePlayerId, target, 0));
    if (committed.state.phase.kind !== "REACTION") throw new Error("expected reaction");
    const yielded = play(committed.state, expirePhase(committed.state.phase.phaseToken));
    expect(
      yielded.events.some((event) => event.type === "ReactionCommitted" && event.timedOut === true),
    ).toBe(true);
    expect(yielded.events.some((event) => event.type === "ActionRevealed")).toBe(true);
  });
});

describe("lifecycle", () => {
  it("recovers power, rolls the round, and preserves revision semantics", () => {
    let current = setup([asPlayerId("a"), asPlayerId("b")]);
    if (current.state.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    const recovered = play(current.state, recover(current.state.phase.activePlayerId));
    expect(recovered.state.revision).toBe(1);
    expect(recovered.events[0]?.type).toBe("PowerRecovered");
    current = recovered;
    if (current.state.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    const next = current.state.phase.activePlayerId;
    const rolled = play(current.state, recover(next));
    expect(rolled.events.some((event) => event.type === "RoundEnded")).toBe(true);
    expect(rolled.state.round).toBe(2);
  });

  it("finishes when a genuine challenged Strike removes the last target", () => {
    let current = setup([asPlayerId("a"), asPlayerId("b")]);
    if (current.state.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    const attacker = current.state.phase.activePlayerId;
    const target = current.state.seatOrder.find((id) => id !== attacker);
    if (target === undefined) throw new Error("missing target");
    const weakened: MatchState = {
      ...current.state,
      players: current.state.players.map((player) =>
        player.playerId === target ? { ...player, influence: 1 } : player,
      ),
    };
    current = play(weakened, strike(attacker, target, 1));
    current = play(current.state, react(target, "challenge"));
    expect(current.state.phase.kind).toBe("FINISHED");
    expect(current.events.at(-1)?.type).toBe("VictoryAchieved");
  });

  it("leaves rejected decisions unchanged", () => {
    const initial = setup();
    if (initial.state.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    const invalid = decide(initial.state, recover(initial.state.phase.activePlayerId), provider);
    expect(invalid.ok).toBe(true);
    if (!invalid.ok) throw new Error("unexpected rejection");
    const capped = {
      ...invalid.value.state,
      players: invalid.value.state.players.map((player) => ({ ...player, power: 3 })),
    };
    const rejected = decide(capped, recover(capped.phase.activePlayerId), provider);
    expect(rejected.ok).toBe(false);
    expect(rejected.ok ? undefined : rejected.error.code).toBe("PowerAtCap");
  });
});
