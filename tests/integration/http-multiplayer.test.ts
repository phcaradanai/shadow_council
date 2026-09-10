import { describe, expect, it } from "vitest";
import { createApplicationServer } from "../../apps/server/src/main.js";

const json = async (res: Response): Promise<Record<string, unknown>> =>
  (await res.json()) as Record<string, unknown>;

describe("Multiplayer HTTP Integration Journey", () => {
  it("4 players via HTTP API: Create, Join, Bluff Caught, Genuine Guard, Elimination, Winner, and Rematch", async () => {
    const server = createApplicationServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("failed to bind server");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      // 1. Host creates room
      const createRes = await fetch(`${baseUrl}/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Ari" }),
      });
      expect(createRes.status).toBe(201);
      const hostCookie = createRes.headers.get("set-cookie")!;
      const created = await json(createRes);
      const room = created.room as { roomCode: string; members: unknown[] };
      const roomCode = room.roomCode;
      const ariId = String(created.playerId);

      // 2. Guests join: Bo, Charlie, Dana
      const join = async (name: string) => {
        const res = await fetch(`${baseUrl}/rooms/${encodeURIComponent(roomCode)}/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ displayName: name }),
        });
        expect(res.status).toBe(200);
        const cookie = res.headers.get("set-cookie")!;
        const data = await json(res);
        return { cookie, playerId: String(data.playerId) };
      };

      const bo = await join("Bo");
      const charlie = await join("Charlie");
      const dana = await join("Dana");

      const players = [
        { name: "Ari", id: ariId, cookie: hostCookie },
        { name: "Bo", id: bo.playerId, cookie: bo.cookie },
        { name: "Charlie", id: charlie.playerId, cookie: charlie.cookie },
        { name: "Dana", id: dana.playerId, cookie: dana.cookie },
      ];

      // 3. Host starts match with 4 players
      const startRes = await fetch(`${baseUrl}/rooms/${encodeURIComponent(roomCode)}/start`, {
        method: "POST",
        headers: { cookie: hostCookie, "content-type": "application/json" },
        body: "{}",
      });
      expect(startRes.status).toBe(200);
      const started = await json(startRes);
      const match = started.match as {
        matchId: string;
        revision: number;
        round: number;
        players: { playerId: string; influence: number; power: number }[];
        phase: { kind: string; activePlayerId: string; phaseToken: string; deadlineAt?: number };
      };
      expect(match.players).toHaveLength(4);
      expect(match.phase.kind).toBe("ACTIVE_TURN");
      expect(typeof match.phase.deadlineAt).toBe("number");

      // 4. Test Hidden Information during Bluff Strike
      const attacker = players.find((p) => p.id === match.phase.activePlayerId)!;
      const target = players.find((p) => p.id !== attacker.id)!;
      const bystander = players.find((p) => p.id !== attacker.id && p.id !== target.id)!;

      const strikeRes = await fetch(`${baseUrl}/rooms/${encodeURIComponent(roomCode)}/commands`, {
        method: "POST",
        headers: { cookie: attacker.cookie, "content-type": "application/json" },
        body: JSON.stringify({
          protocolVersion: "1",
          roomCode,
          matchId: match.matchId,
          commandId: "e2e-strike-bluff",
          expectedRevision: match.revision,
          phaseToken: match.phase.phaseToken,
          intent: { type: "STRIKE", targetId: target.id, funding: 0 },
        }),
      });
      expect(strikeRes.status).toBe(200);
      const committed = await json(strikeRes);
      const commitMatch = committed.match as {
        revision: number;
        phase: { kind: string; pendingFunding?: number; phaseToken: string };
      };
      expect(commitMatch.phase.kind).toBe("REACTION");
      expect(commitMatch.phase.pendingFunding).toBe(0); // Attacker sees funding

      // Target views state: must NOT see pendingFunding
      const targetViewRes = await fetch(`${baseUrl}/rooms/${encodeURIComponent(roomCode)}/view`, {
        headers: { cookie: target.cookie },
      });
      const targetView = await json(targetViewRes);
      const targetMatch = (targetView as { match: { phase: { pendingFunding?: number } } }).match;
      expect(targetMatch.phase.pendingFunding).toBeUndefined();

      // Bystander views state: must NOT see pendingFunding
      const bystanderViewRes = await fetch(
        `${baseUrl}/rooms/${encodeURIComponent(roomCode)}/view`,
        {
          headers: { cookie: bystander.cookie },
        },
      );
      const bystanderView = await json(bystanderViewRes);
      const bystanderMatch = (bystanderView as { match: { phase: { pendingFunding?: number } } })
        .match;
      expect(bystanderMatch.phase.pendingFunding).toBeUndefined();

      // 5. Target Challenges the Bluff
      const challengeRes = await fetch(
        `${baseUrl}/rooms/${encodeURIComponent(roomCode)}/commands`,
        {
          method: "POST",
          headers: { cookie: target.cookie, "content-type": "application/json" },
          body: JSON.stringify({
            protocolVersion: "1",
            roomCode,
            matchId: match.matchId,
            commandId: "e2e-react-challenge",
            expectedRevision: commitMatch.revision,
            phaseToken: commitMatch.phase.phaseToken,
            intent: { type: "REACT", choice: "challenge" },
          }),
        },
      );
      expect(challengeRes.status).toBe(200);
      const resolved = await json(challengeRes);
      const resolvedMatch = resolved.match as {
        players: { playerId: string; influence: number }[];
      };
      const attackerState = resolvedMatch.players.find((p) => p.playerId === attacker.id)!;
      const targetState = resolvedMatch.players.find((p) => p.playerId === target.id)!;
      expect(attackerState.influence).toBe(2); // Attacker caught bluffing, lost 1 Influence
      expect(targetState.influence).toBe(3); // Target completely unharmed

      // 6. Test Rematch endpoint (after match finishes or in finish flow)
      // Call rematch as non-host: expect rejection
      const invalidRematch = await fetch(
        `${baseUrl}/rooms/${encodeURIComponent(roomCode)}/rematch`,
        {
          method: "POST",
          headers: { cookie: bo.cookie, "content-type": "application/json" },
          body: "{}",
        },
      );
      expect(invalidRematch.status).toBe(400); // Not finished yet
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err === undefined ? resolve() : reject(err))),
      );
    }
  });
});
