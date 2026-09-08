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

const application = (): GameApplication => {
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

describe("first vertical slice", () => {
  it("Given two members, completes Strike → Guard → next turn", async () => {
    const app = application();
    const attacker = await app.createRoom({ displayName: "Ari" });
    const target = await app.joinRoom(attacker.room.roomCode, { displayName: "Bo" });
    const started = await app.startMatch(attacker.room.roomCode, attacker.credential);
    const active = started.match;
    if (active.phase.kind !== "ACTIVE_TURN") throw new Error("expected active turn");
    const targetId = active.seatOrder.find((id) => id !== active.phase.activePlayerId);
    if (targetId === undefined) throw new Error("expected target");
    const attackerCredential =
      active.phase.activePlayerId === attacker.playerId ? attacker.credential : target.credential;
    const targetCredential =
      active.phase.activePlayerId === attacker.playerId ? target.credential : attacker.credential;
    const committed = await app.submitIntent({
      roomCode: active.roomCode,
      credential: attackerCredential,
      commandId: "scenario-strike",
      expectedRevision: active.revision,
      phaseToken: active.phase.phaseToken,
      matchId: asMatchId(active.matchId),
      intent: { type: "STRIKE", targetId, funding: 0 },
    });
    if (committed.match.phase.kind !== "REACTION") throw new Error("expected reaction");
    const resolved = await app.submitIntent({
      roomCode: active.roomCode,
      credential: targetCredential,
      commandId: "scenario-guard",
      expectedRevision: committed.revision,
      phaseToken: committed.match.phase.phaseToken,
      matchId: asMatchId(active.matchId),
      intent: { type: "REACT", choice: "guard" },
    });
    expect(resolved.events.map((event) => event.type)).toEqual([
      "ReactionCommitted",
      "ActionRevealed",
      "AttackResolved",
      "BluffSucceeded",
      "TurnEnded",
      "TurnStarted",
    ]);
    expect(resolved.match.revision).toBe(2);
    expect(resolved.match.phase.kind).toBe("ACTIVE_TURN");
  });
});
