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
    expect(hostView.players).toEqual(guestView.players);
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
});
