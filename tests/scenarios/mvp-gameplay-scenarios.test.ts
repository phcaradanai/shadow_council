import { describe, expect, it } from "vitest";
import { asMatchId } from "@shadow-council/domain";
import {
  GameApplication,
  IncrementingCredentialGenerator,
  IncrementingIdentityGenerator,
  MemoryMatchStore,
  MemoryMembershipStore,
  MemoryRoomStore,
  NoopScheduler,
  SystemClock,
  type ApplicationPorts,
} from "@shadow-council/application";

const createApp = (): GameApplication => {
  const ports: ApplicationPorts = {
    rooms: new MemoryRoomStore(),
    matches: new MemoryMatchStore(),
    memberships: new MemoryMembershipStore(),
    credentials: new IncrementingCredentialGenerator(),
    identities: new IncrementingIdentityGenerator(),
    clock: new SystemClock(),
    scheduler: new NoopScheduler(),
  };
  return new GameApplication(ports);
};

describe("MVP Gameplay Scenarios", () => {
  it("Scenario A: Successful bluff (Strike 0 → Yield → Target takes 1 damage, Attacker unharmed)", async () => {
    const app = createApp();
    const p1 = await app.createRoom({ displayName: "Ari" });
    const p2 = await app.joinRoom(p1.room.roomCode, { displayName: "Bo" });
    const started = await app.startMatch(p1.room.roomCode, p1.credential);

    const activeTurn = started.match;
    if (activeTurn.phase.kind !== "ACTIVE_TURN") throw new Error("expected active turn");
    const attackerId = activeTurn.phase.activePlayerId;
    const targetId = activeTurn.seatOrder.find((id) => id !== attackerId)!;
    const attackerCred = attackerId === p1.playerId ? p1.credential : p2.credential;
    const targetCred = attackerId === p1.playerId ? p2.credential : p1.credential;

    // Attacker claims Strike secretly funding 0 (bluff)
    const committed = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: attackerCred,
      commandId: "scenA-strike",
      expectedRevision: activeTurn.revision,
      phaseToken: activeTurn.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "STRIKE", targetId, funding: 0 },
    });
    expect(committed.match.phase.kind).toBe("REACTION");
    if (committed.match.phase.kind !== "REACTION") throw new Error("expected reaction");

    // Target yields
    const resolved = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: targetCred,
      commandId: "scenA-yield",
      expectedRevision: committed.revision,
      phaseToken: committed.match.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "REACT", choice: "yield" },
    });

    // Verify events and outcome
    expect(resolved.events.map((e) => e.type)).toContain("BluffSucceeded");
    expect(resolved.events.map((e) => e.type)).toContain("ActionRevealed");
    const targetState = resolved.match.players.find((p) => p.playerId === targetId)!;
    expect(targetState.influence).toBe(2); // took 1 damage
    expect(targetState.power).toBe(2); // yield is free
    expect(resolved.match.players.find((p) => p.playerId === attackerId)?.power).toBeUndefined(); // private

    const attackerView = await app.getView(activeTurn.roomCode, attackerCred);
    const attackerState = attackerView.match!.players.find((p) => p.playerId === attackerId)!;
    expect(attackerState.influence).toBe(3);
    expect(attackerState.power).toBe(2); // cost 0
    expect(resolved.match.phase.kind).toBe("ACTIVE_TURN");
  });

  it("Scenario B: Bluff caught (Strike 0 → Challenge → Attacker loses 1 Influence, Target unharmed)", async () => {
    const app = createApp();
    const p1 = await app.createRoom({ displayName: "Ari" });
    const p2 = await app.joinRoom(p1.room.roomCode, { displayName: "Bo" });
    const started = await app.startMatch(p1.room.roomCode, p1.credential);

    const activeTurn = started.match;
    if (activeTurn.phase.kind !== "ACTIVE_TURN") throw new Error("expected active turn");
    const attackerId = activeTurn.phase.activePlayerId;
    const targetId = activeTurn.seatOrder.find((id) => id !== attackerId)!;
    const attackerCred = attackerId === p1.playerId ? p1.credential : p2.credential;
    const targetCred = attackerId === p1.playerId ? p2.credential : p1.credential;

    // Attacker bluffs (funding 0)
    const committed = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: attackerCred,
      commandId: "scenB-strike",
      expectedRevision: activeTurn.revision,
      phaseToken: activeTurn.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "STRIKE", targetId, funding: 0 },
    });

    // Target challenges the bluff
    const resolved = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: targetCred,
      commandId: "scenB-challenge",
      expectedRevision: committed.revision,
      phaseToken: committed.match.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "REACT", choice: "challenge" },
    });

    // Attacker caught: loses 1 influence
    const targetState = resolved.match.players.find((p) => p.playerId === targetId)!;
    expect(targetState.influence).toBe(3);
    expect(targetState.power).toBe(2);
    expect(resolved.match.players.find((p) => p.playerId === attackerId)?.power).toBeUndefined(); // private

    const attackerView = await app.getView(activeTurn.roomCode, attackerCred);
    const attackerState = attackerView.match!.players.find((p) => p.playerId === attackerId)!;
    expect(attackerState.influence).toBe(2);
    expect(attackerState.power).toBe(2);
    expect(resolved.events.map((e) => e.type)).not.toContain("BluffSucceeded");
  });

  it("Scenario C: Genuine attack (Strike 1 → Challenge → Target crushed for 2 Influence)", async () => {
    const app = createApp();
    const p1 = await app.createRoom({ displayName: "Ari" });
    const p2 = await app.joinRoom(p1.room.roomCode, { displayName: "Bo" });
    const started = await app.startMatch(p1.room.roomCode, p1.credential);

    const activeTurn = started.match;
    if (activeTurn.phase.kind !== "ACTIVE_TURN") throw new Error("expected active turn");
    const attackerId = activeTurn.phase.activePlayerId;
    const targetId = activeTurn.seatOrder.find((id) => id !== attackerId)!;
    const attackerCred = attackerId === p1.playerId ? p1.credential : p2.credential;
    const targetCred = attackerId === p1.playerId ? p2.credential : p1.credential;

    // Attacker funds genuine attack (1 Power)
    const committed = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: attackerCred,
      commandId: "scenC-strike",
      expectedRevision: activeTurn.revision,
      phaseToken: activeTurn.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "STRIKE", targetId, funding: 1 },
    });

    // Target challenges genuine strike
    const resolved = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: targetCred,
      commandId: "scenC-challenge",
      expectedRevision: committed.revision,
      phaseToken: committed.match.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "REACT", choice: "challenge" },
    });

    const targetState = resolved.match.players.find((p) => p.playerId === targetId)!;
    expect(targetState.influence).toBe(1); // took 2 influence damage
    expect(targetState.power).toBe(2);
    expect(resolved.match.players.find((p) => p.playerId === attackerId)?.power).toBeUndefined(); // private

    const attackerView = await app.getView(activeTurn.roomCode, attackerCred);
    const attackerState = attackerView.match!.players.find((p) => p.playerId === attackerId)!;
    expect(attackerState.power).toBe(1); // spent 1 power
    expect(attackerState.influence).toBe(3);
  });

  it("Scenario D: Match completion to winner", async () => {
    const app = createApp();
    const p1 = await app.createRoom({ displayName: "Ari" });
    const p2 = await app.joinRoom(p1.room.roomCode, { displayName: "Bo" });
    const started = await app.startMatch(p1.room.roomCode, p1.credential);

    const activeTurn = started.match;
    if (activeTurn.phase.kind !== "ACTIVE_TURN") throw new Error("expected active turn");
    const attackerId = activeTurn.phase.activePlayerId;
    const targetId = activeTurn.seatOrder.find((id) => id !== attackerId)!;
    const attackerCred = attackerId === p1.playerId ? p1.credential : p2.credential;
    const targetCred = attackerId === p1.playerId ? p2.credential : p1.credential;

    // Strike 1 + Challenge -> target drops to 1 influence
    const c1 = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: attackerCred,
      commandId: "d-s1",
      expectedRevision: activeTurn.revision,
      phaseToken: activeTurn.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "STRIKE", targetId, funding: 1 },
    });
    const r1 = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: targetCred,
      commandId: "d-r1",
      expectedRevision: c1.revision,
      phaseToken: c1.match.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "REACT", choice: "challenge" },
    });

    // Next turn: target acts. Target bluffs Strike 0 on Attacker, Attacker challenges!
    if (r1.match.phase.kind !== "ACTIVE_TURN") throw new Error("expected active turn");
    const nextAttacker = r1.match.phase.activePlayerId;
    const nextTarget = r1.match.seatOrder.find((id) => id !== nextAttacker)!;
    const nextAttackerCred = nextAttacker === p1.playerId ? p1.credential : p2.credential;
    const nextTargetCred = nextAttacker === p1.playerId ? p2.credential : p1.credential;

    const c2 = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: nextAttackerCred,
      commandId: "d-s2",
      expectedRevision: r1.match.revision,
      phaseToken: r1.match.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "STRIKE", targetId: nextTarget, funding: 0 },
    });

    const r2 = await app.submitIntent({
      roomCode: activeTurn.roomCode,
      credential: nextTargetCred,
      commandId: "d-r2",
      expectedRevision: c2.revision,
      phaseToken: c2.match.phase.phaseToken,
      matchId: asMatchId(activeTurn.matchId),
      intent: { type: "REACT", choice: "challenge" },
    });

    // Next attacker had 1 influence, bluffed and was challenged -> eliminated!
    expect(r2.match.phase.kind).toBe("FINISHED");
    if (r2.match.phase.kind !== "FINISHED") throw new Error("expected finished");
    expect(r2.match.phase.winnerId).toBe(nextTarget);
    expect(r2.events.map((e) => e.type)).toContain("VictoryAchieved");
  });

  it("Scenario E: Reconnect restores permitted view without leaking secrets", async () => {
    const app = createApp();
    const p1 = await app.createRoom({ displayName: "Ari" });
    const p2 = await app.joinRoom(p1.room.roomCode, { displayName: "Bo" });
    const p3 = await app.joinRoom(p1.room.roomCode, { displayName: "Charlie" });
    const started = await app.startMatch(p1.room.roomCode, p1.credential);

    if (started.match.phase.kind !== "ACTIVE_TURN") throw new Error("expected active turn");
    const attackerId = started.match.phase.activePlayerId;
    const otherPlayers = [p1, p2, p3].filter((p) => p.playerId !== attackerId);
    const targetPlayer = otherPlayers[0]!;
    const bystanderPlayer = otherPlayers[1]!;
    const attackerCred =
      attackerId === p1.playerId
        ? p1.credential
        : attackerId === p2.playerId
          ? p2.credential
          : p3.credential;

    // Attacker bluffs
    await app.submitIntent({
      roomCode: started.match.roomCode,
      credential: attackerCred,
      commandId: "e-s1",
      expectedRevision: started.match.revision,
      phaseToken: started.match.phase.phaseToken,
      matchId: asMatchId(started.match.matchId),
      intent: { type: "STRIKE", targetId: targetPlayer.playerId, funding: 0 },
    });

    // Simulate disconnect of all three players
    await app.disconnect(started.match.roomCode, attackerCred);
    await app.disconnect(started.match.roomCode, targetPlayer.credential);
    await app.disconnect(started.match.roomCode, bystanderPlayer.credential);

    // Reconnect target
    const targetReconnected = await app.reconnect(started.match.roomCode, targetPlayer.credential);
    expect(targetReconnected.match?.phase.kind).toBe("REACTION");
    expect(targetReconnected.match?.phase.pendingFunding).toBeUndefined();

    // Reconnect bystander
    const bystanderReconnected = await app.reconnect(
      started.match.roomCode,
      bystanderPlayer.credential,
    );
    expect(bystanderReconnected.match?.phase.kind).toBe("REACTION");
    expect(bystanderReconnected.match?.phase.pendingFunding).toBeUndefined();

    // Reconnect attacker
    const attackerReconnected = await app.reconnect(started.match.roomCode, attackerCred);
    expect(attackerReconnected.match?.phase.kind).toBe("REACTION");
    expect(attackerReconnected.match?.phase.pendingFunding).toBe(0); // Only attacker receives it
  });
});
