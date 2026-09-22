import { describe, it, expect, beforeEach } from "vitest";
import { MatchStatsTracker, getPlayerColor } from "./match-stats.js";
import type { WireMatchView, WirePlayerView } from "@shadow-council/protocol";

describe("MatchStatsTracker", () => {
  let tracker: MatchStatsTracker;

  beforeEach(() => {
    tracker = new MatchStatsTracker();
    tracker.reset("test-match-1");
  });

  const samplePlayers: WirePlayerView[] = [
    {
      playerId: "p1",
      displayName: "Alice",
      influence: 3,
      power: 1,
      eliminated: false,
      connected: true,
    },
    {
      playerId: "p2",
      displayName: "Bob",
      influence: 3,
      power: 1,
      eliminated: false,
      connected: true,
    },
  ];

  it("records initial state snapshot correctly", () => {
    const matchView: WireMatchView = {
      matchId: "test-match-1",
      roomCode: "ROOM1",
      viewerPlayerId: "p1",
      seatOrder: ["p1", "p2"],
      revision: 0,
      round: 1,
      players: samplePlayers,
      legalIntents: [],
      phase: {
        kind: "ACTIVE_TURN",
        activePlayerId: "p1",
        phaseToken: "tok-1",
      },
      status: "PLAYING",
    };

    tracker.recordMatchState(matchView);
    const snapshots = tracker.getSnapshots();
    expect(snapshots.length).toBe(1);
    expect(snapshots[0]?.label).toBe("Start");
    expect(snapshots[0]?.influences["p1"]).toBe(3);
    expect(snapshots[0]?.influences["p2"]).toBe(3);
  });

  it("tracks influence reduction when attack resolves", () => {
    const initialView: WireMatchView = {
      matchId: "test-match-1",
      roomCode: "ROOM1",
      viewerPlayerId: "p1",
      seatOrder: ["p1", "p2"],
      revision: 0,
      round: 1,
      players: samplePlayers,
      legalIntents: [],
      phase: {
        kind: "ACTIVE_TURN",
        activePlayerId: "p1",
        phaseToken: "tok-1",
      },
      status: "PLAYING",
    };
    tracker.recordMatchState(initialView);

    const damagedPlayers: WirePlayerView[] = [
      {
        playerId: "p1",
        displayName: "Alice",
        influence: 3,
        power: 0,
        eliminated: false,
        connected: true,
      },
      {
        playerId: "p2",
        displayName: "Bob",
        influence: 2,
        power: 1,
        eliminated: false,
        connected: true,
      },
    ];

    const updatedView: WireMatchView = {
      matchId: "test-match-1",
      roomCode: "ROOM1",
      viewerPlayerId: "p1",
      seatOrder: ["p1", "p2"],
      revision: 1,
      round: 1,
      players: damagedPlayers,
      legalIntents: [],
      phase: {
        kind: "ACTIVE_TURN",
        activePlayerId: "p2",
        phaseToken: "tok-2",
      },
      status: "PLAYING",
    };

    tracker.recordMatchState(updatedView, [
      {
        matchId: "test-match-1",
        revision: 1,
        ordinal: 0,
        type: "ActionCommitted",
        attackerId: "p1",
        targetId: "p2",
        threat: 1,
      },
      {
        matchId: "test-match-1",
        revision: 1,
        ordinal: 1,
        type: "AttackResolved",
        attackerId: "p1",
        targetId: "p2",
        reaction: "challenge",
        attackerPowerCost: 1,
        targetPowerCost: 0,
        attackerInfluenceLoss: 0,
        targetInfluenceLoss: 1,
        attackerPower: 0,
        targetPower: 1,
        attackerInfluence: 3,
        targetInfluence: 2,
      },
    ]);

    const snapshots = tracker.getSnapshots();
    expect(snapshots.length).toBe(2);
    expect(snapshots[1]?.influences["p2"]).toBe(2);

    const summaries = tracker.getPlayerSummaries(damagedPlayers, "p1", "p1");
    const bob = summaries.find((s) => s.playerId === "p2");
    expect(bob).toBeDefined();
    expect(bob?.minInfluence).toBe(2);
    expect(bob?.strikesReceived).toBe(1);

    const alice = summaries.find((s) => s.playerId === "p1");
    expect(alice?.strikesDealt).toBe(1);
    expect(alice?.isWinner).toBe(true);
  });

  it("tracks DefensePlan and bluff metrics without double-counting a Strike", () => {
    const matchView: WireMatchView = {
      matchId: "test-match-1",
      roomCode: "ROOM1",
      viewerPlayerId: "p1",
      seatOrder: ["p1", "p2"],
      revision: 2,
      round: 1,
      players: samplePlayers,
      legalIntents: [],
      phase: {
        kind: "ACTIVE_TURN",
        activePlayerId: "p2",
        phaseToken: "tok-2",
      },
      status: "PLAYING",
    };

    const events = [
      {
        matchId: "test-match-1",
        revision: 2,
        ordinal: 0,
        type: "ActionCommitted",
        attackerId: "p1",
        targetId: "p2",
        threat: 2,
      },
      {
        matchId: "test-match-1",
        revision: 2,
        ordinal: 1,
        type: "ReactionCommitted",
        targetId: "p2",
        choice: { guard: 1, challenge: true },
      },
      {
        matchId: "test-match-1",
        revision: 2,
        ordinal: 2,
        type: "ActionRevealed",
        attackerId: "p1",
        targetId: "p2",
        threat: 2,
        force: 1,
        genuine: false,
      },
      {
        matchId: "test-match-1",
        revision: 2,
        ordinal: 3,
        type: "AttackResolved",
        attackerId: "p1",
        targetId: "p2",
        reaction: { guard: 1, challenge: true },
        attackerInfluenceLoss: 1,
        targetInfluenceLoss: 0,
      },
    ] as const;

    tracker.recordMatchState(matchView, events);
    tracker.recordMatchState(matchView, events);

    const summaries = tracker.getPlayerSummaries(samplePlayers, "p1");
    const attacker = summaries.find((summary) => summary.playerId === "p1");
    const defender = summaries.find((summary) => summary.playerId === "p2");

    expect(attacker?.strikesDealt).toBe(1);
    expect(attacker?.bluffsDeclared).toBe(1);
    expect(defender?.strikesReceived).toBe(1);
    expect(defender?.challengesMade).toBe(1);
    expect(defender?.challengesWon).toBe(1);
    expect(defender?.guardsCommitted).toBe(1);
    expect(defender?.hybridDefenses).toBe(1);

    // Replaying the same command response/realtime batch must be idempotent.
    expect(attacker?.strikesDealt).toBe(1);
    expect(defender?.challengesMade).toBe(1);
  });

  it("keeps hidden opponent Power unknown instead of reporting a false zero", () => {
    const hiddenPlayers: WirePlayerView[] = [
      samplePlayers[0]!,
      { ...samplePlayers[1]!, power: undefined },
    ];
    const summaries = tracker.getPlayerSummaries(hiddenPlayers, "p1");
    expect(summaries.find((summary) => summary.playerId === "p2")?.finalPower).toBeUndefined();
  });

  it("assigns distinctive colors with viewer priority", () => {
    const p1Color = getPlayerColor("p1", "p1", samplePlayers);
    const p2Color = getPlayerColor("p2", "p1", samplePlayers);
    expect(p1Color).toBe("#38bdf8"); // Sky blue for viewer
    expect(p2Color).not.toBe(p1Color);
  });
});
