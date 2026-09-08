import { describe, expect, it } from "vitest";
import { createServerApplication } from "../main.js";
import { createHttpServer } from "./http-server.js";

const json = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("HTTP vertical slice", () => {
  it("creates, joins, starts, commits a Strike, and resolves a reaction", async () => {
    const server = createHttpServer(createServerApplication());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("server did not bind");
    const base = `http://127.0.0.1:${address.port}`;
    try {
      const createdResponse = await fetch(`${base}/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Ari" }),
      });
      expect(createdResponse.status).toBe(201);
      const created = await json(createdResponse);
      const hostCookie = createdResponse.headers.get("set-cookie");
      if (hostCookie === null) throw new Error("host cookie missing");
      const room = created.room as { roomCode: string };
      const guestResponse = await fetch(`${base}/rooms/${room.roomCode}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Bo" }),
      });
      expect(guestResponse.status).toBe(200);
      const guest = await json(guestResponse);
      const guestCookie = guestResponse.headers.get("set-cookie");
      if (guestCookie === null) throw new Error("guest cookie missing");
      const startedResponse = await fetch(`${base}/rooms/${room.roomCode}/start`, {
        method: "POST",
        headers: { cookie: hostCookie },
        body: "{}",
      });
      expect(startedResponse.status).toBe(200);
      const started = await json(startedResponse);
      const hostPlayerId = String(created.playerId);
      const guestPlayerId = String(guest.playerId);
      const match = started.match as {
        matchId: string;
        revision: number;
        phase: { kind: string; activePlayerId: string; phaseToken: string };
      };
      expect(match.phase.kind).toBe("ACTIVE_TURN");
      const attackerCookie = match.phase.activePlayerId === hostPlayerId ? hostCookie : guestCookie;
      const targetCookie = match.phase.activePlayerId === hostPlayerId ? guestCookie : hostCookie;
      const targetId = match.phase.activePlayerId === hostPlayerId ? guestPlayerId : hostPlayerId;
      const commitResponse = await fetch(`${base}/rooms/${room.roomCode}/commands`, {
        method: "POST",
        headers: { cookie: attackerCookie, "content-type": "application/json" },
        body: JSON.stringify({
          protocolVersion: "1",
          roomCode: room.roomCode,
          matchId: match.matchId,
          commandId: "strike-1",
          expectedRevision: match.revision,
          phaseToken: match.phase.phaseToken,
          intent: { type: "STRIKE", targetId, funding: 0 },
        }),
      });
      expect(commitResponse.status).toBe(200);
      const committed = await json(commitResponse);
      const reactionMatch = committed.match as { revision: number; phase: { phaseToken: string } };
      const reactionResponse = await fetch(`${base}/rooms/${room.roomCode}/commands`, {
        method: "POST",
        headers: { cookie: targetCookie, "content-type": "application/json" },
        body: JSON.stringify({
          protocolVersion: "1",
          roomCode: room.roomCode,
          matchId: match.matchId,
          commandId: "react-1",
          expectedRevision: reactionMatch.revision,
          phaseToken: reactionMatch.phase.phaseToken,
          intent: { type: "REACT", choice: "challenge" },
        }),
      });
      expect(reactionResponse.status).toBe(200);
      const resolved = await json(reactionResponse);
      expect(JSON.stringify(resolved.events)).toContain("ActionRevealed");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });
});
