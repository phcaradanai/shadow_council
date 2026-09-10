import { describe, expect, it } from "vitest";
import { asMatchId, type MatchId } from "@shadow-council/domain";
import {
  GameApplication,
  IncrementingCredentialGenerator,
  IncrementingIdentityGenerator,
  MemoryMatchStore,
  MemoryMembershipStore,
  MemoryRoomStore,
  type ApplicationPorts,
  type Clock,
  type Scheduler,
  type SubmittedIntent,
} from "./index.js";

class FakeClock implements Clock {
  current = 0;

  now(): number {
    return this.current;
  }
}

class FakeScheduler implements Scheduler {
  schedule(): void {}

  cancel(): void {}
}

const makeApplication = (): GameApplication => {
  const ports: ApplicationPorts = {
    rooms: new MemoryRoomStore(),
    matches: new MemoryMatchStore(),
    memberships: new MemoryMembershipStore(),
    credentials: new IncrementingCredentialGenerator(),
    identities: new IncrementingIdentityGenerator(),
    clock: new FakeClock(),
    scheduler: new FakeScheduler(),
  };
  return new GameApplication(ports);
};

const createStarted = async () => {
  const app = makeApplication();
  const host = await app.createRoom({ displayName: "Ari" });
  const guest = await app.joinRoom(host.room.roomCode, { displayName: "Bo" });
  const started = await app.startMatch(host.room.roomCode, host.credential);
  const hostView = await app.getView(host.room.roomCode, host.credential);
  const guestView = await app.getView(guest.room.roomCode, guest.credential);
  if (hostView.match === undefined || guestView.match === undefined)
    throw new Error("match not started");
  return { app, host, guest, started, hostView: hostView.match, guestView: guestView.match };
};

const submit = (
  app: GameApplication,
  roomCode: string,
  credential: string,
  commandId: string,
  revision: number,
  phaseToken: string,
  matchId: MatchId,
  intent: SubmittedIntent,
) =>
  app.submitIntent({
    roomCode,
    credential,
    commandId,
    expectedRevision: revision,
    phaseToken,
    matchId,
    intent,
  });

describe("application room and match flow", () => {
  it("creates, joins, starts, and projects role-specific state", async () => {
    const { host, guest, started, hostView, guestView } = await createStarted();
    expect(host.room.status).toBe("LOBBY");
    expect(guest.room.members).toHaveLength(2);
    expect(started.match.viewerPlayerId).toBe(host.playerId);
    const hostAri = hostView.players.find((p) => p.playerId === host.playerId);
    const hostBo = hostView.players.find((p) => p.playerId === guest.playerId);
    const guestAri = guestView.players.find((p) => p.playerId === host.playerId);
    const guestBo = guestView.players.find((p) => p.playerId === guest.playerId);
    expect(hostAri?.power).toBe(2);
    expect(hostBo?.power).toBeUndefined();
    expect(guestAri?.power).toBeUndefined();
    expect(guestBo?.power).toBe(2);
    expect(hostView.matchId).toBe(guestView.matchId);
    expect(JSON.stringify(hostView)).not.toMatch(/randomState|seed|credential|journal/);
    expect(JSON.stringify(guestView)).not.toMatch(/randomState|seed|credential|journal/);
  });

  it("returns the original start receipt for an idempotent retry", async () => {
    const app = makeApplication();
    const host = await app.createRoom({ displayName: "Ari" });
    await app.joinRoom(host.room.roomCode, { displayName: "Bo" });
    const first = await app.startMatch(host.room.roomCode, host.credential, "start-1");
    const retry = await app.startMatch(host.room.roomCode, host.credential, "start-1");
    expect(retry).toEqual(first);
  });

  it("keeps concealed funding visible only to the attacker before reaction", async () => {
    const { app, host, guest, hostView, guestView } = await createStarted();
    const attacker =
      hostView.phase.kind === "ACTIVE_TURN" ? hostView.phase.activePlayerId : host.playerId;
    const target = hostView.seatOrder.find((id) => id !== attacker);
    if (target === undefined) throw new Error("missing target");
    const attackerCredential = attacker === host.playerId ? host.credential : guest.credential;
    const targetCredential = attacker === host.playerId ? guest.credential : host.credential;
    const committed = await submit(
      app,
      host.room.roomCode,
      attackerCredential,
      "strike-1",
      hostView.revision,
      hostView.phase.kind === "ACTIVE_TURN" ? hostView.phase.phaseToken : "",
      asMatchId(hostView.matchId),
      { type: "STRIKE", targetId: target, funding: 1 },
    );
    expect(committed.match.phase.kind).toBe("REACTION");
    if (committed.match.phase.kind !== "REACTION") throw new Error("expected reaction");
    expect(committed.match.phase.pendingFunding).toBe(1);
    const targetAfter = await app.getView(host.room.roomCode, targetCredential);
    if (targetAfter.match?.phase.kind !== "REACTION") throw new Error("expected target reaction");
    expect(targetAfter.match.phase.pendingFunding).toBeUndefined();
    expect(JSON.stringify(targetAfter)).not.toContain('"funding":1');
    expect(
      committed.events.some((event) => event.type === "ActionCommitted" && "funding" in event),
    ).toBe(false);
    void guestView;
  });

  it("routes a reaction, publishes reveal, and deduplicates retries", async () => {
    const { app, host, guest, hostView } = await createStarted();
    if (hostView.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    const attacker = hostView.phase.activePlayerId;
    const target = hostView.seatOrder.find((id) => id !== attacker);
    if (target === undefined) throw new Error("missing target");
    const attackerCredential = attacker === host.playerId ? host.credential : guest.credential;
    const targetCredential = attacker === host.playerId ? guest.credential : host.credential;
    const committed = await submit(
      app,
      host.room.roomCode,
      attackerCredential,
      "strike-1",
      hostView.revision,
      hostView.phase.phaseToken,
      asMatchId(hostView.matchId),
      { type: "STRIKE", targetId: target, funding: 0 },
    );
    if (committed.match.phase.kind !== "REACTION") throw new Error("expected reaction");
    const resolved = await submit(
      app,
      host.room.roomCode,
      targetCredential,
      "react-1",
      committed.revision,
      committed.match.phase.phaseToken,
      asMatchId(hostView.matchId),
      { type: "REACT", choice: "challenge" },
    );
    expect(resolved.events.some((event) => event.type === "ActionRevealed")).toBe(true);
    const retry = await submit(
      app,
      host.room.roomCode,
      targetCredential,
      "react-1",
      committed.revision,
      committed.match.phase.phaseToken,
      asMatchId(hostView.matchId),
      { type: "REACT", choice: "challenge" },
    );
    expect(retry.duplicate).toBe(true);
    expect(retry.revision).toBe(resolved.revision);
    await expect(
      submit(
        app,
        host.room.roomCode,
        targetCredential,
        "react-1",
        committed.revision,
        committed.match.phase.phaseToken,
        asMatchId(hostView.matchId),
        { type: "REACT", choice: "yield" },
      ),
    ).rejects.toMatchObject({ code: "CommandIdConflict" });
  });

  it("applies a deadline expiry before rejecting a late command", async () => {
    const clock = new FakeClock();
    const app = new GameApplication({
      rooms: new MemoryRoomStore(),
      matches: new MemoryMatchStore(),
      memberships: new MemoryMembershipStore(),
      credentials: new IncrementingCredentialGenerator(),
      identities: new IncrementingIdentityGenerator(),
      clock,
      scheduler: new FakeScheduler(),
    });
    const host = await app.createRoom({ displayName: "Ari" });
    const guest = await app.joinRoom(host.room.roomCode, { displayName: "Bo" });
    const started = await app.startMatch(host.room.roomCode, host.credential);
    clock.current = 45_000;
    await expect(
      submit(
        app,
        host.room.roomCode,
        host.credential,
        "late-1",
        started.match.revision,
        started.match.phase.kind === "ACTIVE_TURN" ? started.match.phase.phaseToken : "",
        started.match.matchId as MatchId,
        { type: "RECOVER" },
      ),
    ).rejects.toMatchObject({ code: "StalePhase" });
    const advanced = await app.getView(host.room.roomCode, host.credential);
    expect(advanced.match?.revision).toBe(1);
    expect(advanced.match?.phase.kind).toBe("ACTIVE_TURN");
    void guest;
  });

  it("projects authoritative deadlineAt and keeps funding hidden from bystanders", async () => {
    const app = makeApplication();
    const p1 = await app.createRoom({ displayName: "Ari" });
    const p2 = await app.joinRoom(p1.room.roomCode, { displayName: "Bo" });
    const p3 = await app.joinRoom(p1.room.roomCode, { displayName: "Charlie" });
    const started = await app.startMatch(p1.room.roomCode, p1.credential);
    expect(started.match.phase.kind).toBe("ACTIVE_TURN");
    if (started.match.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    expect(typeof started.match.phase.deadlineAt).toBe("number");
    expect(started.match.phase.deadlineAt).toBeGreaterThan(0);

    const attackerId = started.match.phase.activePlayerId;
    const attackerCred =
      attackerId === p1.playerId
        ? p1.credential
        : attackerId === p2.playerId
          ? p2.credential
          : p3.credential;
    const otherPlayers = [p1, p2, p3].filter((p) => p.playerId !== attackerId);
    const targetPlayer = otherPlayers[0]!;
    const bystanderPlayer = otherPlayers[1]!;

    const committed = await submit(
      app,
      p1.room.roomCode,
      attackerCred,
      "strike-3p",
      started.match.revision,
      started.match.phase.phaseToken,
      asMatchId(started.match.matchId),
      { type: "STRIKE", targetId: targetPlayer.playerId, funding: 0 },
    );
    expect(committed.match.phase.kind).toBe("REACTION");
    if (committed.match.phase.kind !== "REACTION") throw new Error("expected reaction");
    expect(committed.match.phase.pendingFunding).toBe(0);
    expect(typeof committed.match.phase.deadlineAt).toBe("number");

    const targetView = await app.getView(p1.room.roomCode, targetPlayer.credential);
    if (targetView.match?.phase.kind !== "REACTION") throw new Error("expected reaction");
    expect(targetView.match.phase.pendingFunding).toBeUndefined();

    const bystanderView = await app.getView(p1.room.roomCode, bystanderPlayer.credential);
    if (bystanderView.match?.phase.kind !== "REACTION") throw new Error("expected reaction");
    expect(bystanderView.match.phase.pendingFunding).toBeUndefined();
    expect(JSON.stringify(targetView)).not.toContain('"pendingFunding"');
    expect(JSON.stringify(bystanderView)).not.toContain('"pendingFunding"');
  });

  it("supports rematch: returns finished room to lobby and allows new match", async () => {
    const { app, host, guest, hostView } = await createStarted();
    if (hostView.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    // Non-host cannot rematch
    await expect(app.rematch(host.room.roomCode, guest.credential)).rejects.toMatchObject({
      code: "RoomNotReady",
    });

    // We can simulate finishing by playing or setting finished state
    // Let's finish the game by eliminating a player
    const attackerId = hostView.phase.activePlayerId;
    const targetId = hostView.seatOrder.find((id) => id !== attackerId)!;
    const attackerCred = attackerId === host.playerId ? host.credential : guest.credential;
    const targetCred = attackerId === host.playerId ? guest.credential : host.credential;

    // Strike 1 + Challenge with target at low influence
    // Let's do 2 genuine challenged strikes to eliminate target (target loses 2 then 1)
    const c1 = await submit(
      app,
      host.room.roomCode,
      attackerCred,
      "s1",
      hostView.revision,
      hostView.phase.phaseToken,
      asMatchId(hostView.matchId),
      { type: "STRIKE", targetId, funding: 1 },
    );
    if (c1.match.phase.kind !== "REACTION") throw new Error("expected reaction");
    const r1 = await submit(
      app,
      host.room.roomCode,
      targetCred,
      "r1",
      c1.revision,
      c1.match.phase.phaseToken,
      asMatchId(hostView.matchId),
      { type: "REACT", choice: "challenge" },
    );
    // target has 1 influence left. Next turn:
    if (r1.match.phase.kind !== "ACTIVE_TURN") throw new Error("expected active");
    const nextAttacker = r1.match.phase.activePlayerId;
    const nextTarget = r1.match.seatOrder.find((id) => id !== nextAttacker)!;
    const nextAttackerCred = nextAttacker === host.playerId ? host.credential : guest.credential;
    const nextTargetCred = nextAttacker === host.playerId ? guest.credential : host.credential;

    const c2 = await submit(
      app,
      host.room.roomCode,
      nextAttackerCred,
      "s2",
      r1.match.revision,
      r1.match.phase.phaseToken,
      asMatchId(hostView.matchId),
      { type: "STRIKE", targetId: nextTarget, funding: 0 },
    );
    if (c2.match.phase.kind !== "REACTION") throw new Error("expected reaction");
    const r2 = await submit(
      app,
      host.room.roomCode,
      nextTargetCred,
      "r2",
      c2.revision,
      c2.match.phase.phaseToken,
      asMatchId(hostView.matchId),
      { type: "REACT", choice: "challenge" },
    );
    expect(r2.match.phase.kind).toBe("FINISHED");
    const finishedRoom = await app.getView(host.room.roomCode, host.credential);
    expect(finishedRoom.room.status).toBe("FINISHED");

    // Host initiates rematch
    const rematchRes = await app.rematch(host.room.roomCode, host.credential);
    expect(rematchRes.room.status).toBe("LOBBY");
    expect(rematchRes.room.members).toHaveLength(2);

    // Host can start a new match
    const newMatch = await app.startMatch(host.room.roomCode, host.credential);
    expect(newMatch.match.status).toBe("PLAYING");
    expect(newMatch.match.round).toBe(1);
    expect(newMatch.match.matchId).not.toBe(hostView.matchId);
  });

  it("allows host to configure room turn timer and enforces authorization", async () => {
    const app = makeApplication();
    const host = await app.createRoom({ displayName: "Host" });
    const guest = await app.joinRoom(host.room.roomCode, { displayName: "Guest" });

    // Initial default settings
    expect(host.room.settings).toEqual({ turnTimerEnabled: true, turnTimeSeconds: 45 });

    // Guest cannot update settings
    await expect(
      app.updateSettings(host.room.roomCode, guest.credential, { turnTimerEnabled: false }),
    ).rejects.toMatchObject({ code: "NotHost" });

    // Host updates settings to disabled
    const updated = await app.updateSettings(host.room.roomCode, host.credential, {
      turnTimerEnabled: false,
    });
    expect(updated.settings).toEqual({ turnTimerEnabled: false, turnTimeSeconds: 45 });

    // Host updates duration to 60s
    const updated60 = await app.updateSettings(host.room.roomCode, host.credential, {
      turnTimerEnabled: true,
      turnTimeSeconds: 60,
    });
    expect(updated60.settings).toEqual({ turnTimerEnabled: true, turnTimeSeconds: 60 });

    // Invalid duration rejected
    await expect(
      app.updateSettings(host.room.roomCode, host.credential, {
        turnTimerEnabled: true,
        turnTimeSeconds: 50,
      }),
    ).rejects.toMatchObject({ code: "InvalidSettings" });
  });

  it("applies turn timer enabled/disabled to match deadlines and preserves across rematch", async () => {
    const app = makeApplication();
    const host = await app.createRoom({ displayName: "Host" });
    await app.joinRoom(host.room.roomCode, { displayName: "Guest" });

    // Disable timer before start
    await app.updateSettings(host.room.roomCode, host.credential, { turnTimerEnabled: false });

    // Start match
    const started = await app.startMatch(host.room.roomCode, host.credential);
    expect(started.room.settings.turnTimerEnabled).toBe(false);
    expect((started.match.phase as { deadlineAt?: number }).deadlineAt).toBeUndefined();

    // Cannot update settings during match
    await expect(
      app.updateSettings(host.room.roomCode, host.credential, { turnTimerEnabled: true }),
    ).rejects.toMatchObject({ code: "RoomNotReady" });
  });

  it("hides opponent power in 3-player match projections and event streams", async () => {
    const app = makeApplication();
    const p1 = await app.createRoom({ displayName: "P1" });
    const p2 = await app.joinRoom(p1.room.roomCode, { displayName: "P2" });
    const p3 = await app.joinRoom(p1.room.roomCode, { displayName: "P3" });

    await app.startMatch(p1.room.roomCode, p1.credential);
    const v1 = await app.getView(p1.room.roomCode, p1.credential);
    const v2 = await app.getView(p1.room.roomCode, p2.credential);
    const v3 = await app.getView(p1.room.roomCode, p3.credential);

    // P1 sees only P1's power
    const v1_p1 = v1.match!.players.find((p) => p.playerId === p1.playerId);
    const v1_p2 = v1.match!.players.find((p) => p.playerId === p2.playerId);
    const v1_p3 = v1.match!.players.find((p) => p.playerId === p3.playerId);
    expect(v1_p1?.power).toBe(2);
    expect(v1_p2?.power).toBeUndefined();
    expect(v1_p3?.power).toBeUndefined();

    // P2 sees only P2's power
    const v2_p1 = v2.match!.players.find((p) => p.playerId === p1.playerId);
    const v2_p2 = v2.match!.players.find((p) => p.playerId === p2.playerId);
    const v2_p3 = v2.match!.players.find((p) => p.playerId === p3.playerId);
    expect(v2_p1?.power).toBeUndefined();
    expect(v2_p2?.power).toBe(2);
    expect(v2_p3?.power).toBeUndefined();

    // P3 sees only P3's power
    const v3_p1 = v3.match!.players.find((p) => p.playerId === p1.playerId);
    const v3_p2 = v3.match!.players.find((p) => p.playerId === p2.playerId);
    const v3_p3 = v3.match!.players.find((p) => p.playerId === p3.playerId);
    expect(v3_p1?.power).toBeUndefined();
    expect(v3_p2?.power).toBeUndefined();
    expect(v3_p3?.power).toBe(2);

    // Subscriber notifications for P2 and P3 must not leak recovered power of other players
    let p2NotifiedEvents: readonly any[] = [];
    await app.subscribe(p1.room.roomCode, p2.credential, (n) => {
      p2NotifiedEvents = n.events;
    });

    const activeId = v1.match!.phase.kind === "ACTIVE_TURN" ? v1.match!.phase.activePlayerId : "";
    const activeCred =
      activeId === p1.playerId
        ? p1.credential
        : activeId === p2.playerId
          ? p2.credential
          : p3.credential;

    const recoverRes = await submit(
      app,
      p1.room.roomCode,
      activeCred,
      "rec-1",
      v1.match!.revision,
      (v1.match!.phase as { phaseToken: string }).phaseToken,
      asMatchId(v1.match!.matchId),
      { type: "RECOVER" },
    );

    const recEvent = recoverRes.events.find((e) => e.type === "PowerRecovered");
    if (activeId === p1.playerId) {
      expect(recEvent).toHaveProperty("power");
      const p2RecEvent = p2NotifiedEvents.find((e) => e.type === "PowerRecovered");
      expect(p2RecEvent).toBeDefined();
      expect((p2RecEvent as any).power).toBeUndefined();
    }
  });
});
