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

  it("serves static web assets and modular client scripts", async () => {
    const server = createHttpServer(createServerApplication());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("server did not bind");
    const base = `http://127.0.0.1:${address.port}`;
    try {
      const indexRes = await fetch(`${base}/`);
      expect(indexRes.status).toBe(200);
      expect(indexRes.headers.get("content-type")).toContain("text/html");

      const cssRes = await fetch(`${base}/style.css`);
      expect(cssRes.status).toBe(200);
      expect(cssRes.headers.get("content-type")).toContain("text/css");

      const appJsRes = await fetch(`${base}/app.js`);
      expect(appJsRes.status).toBe(200);
      expect(appJsRes.headers.get("content-type")).toContain("text/javascript");

      const apiJsRes = await fetch(`${base}/client/api.js`);
      expect(apiJsRes.status).toBe(200);
      expect(apiJsRes.headers.get("content-type")).toContain("text/javascript");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });

  it("handles room turn timer settings configuration and authorization over HTTP", async () => {
    const server = createHttpServer(createServerApplication());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("server did not bind");
    const base = `http://127.0.0.1:${address.port}`;
    try {
      const createdResponse = await fetch(`${base}/rooms`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Host" }),
      });
      const created = await json(createdResponse);
      const hostCookie = createdResponse.headers.get("set-cookie")!;
      const room = created.room as { roomCode: string; settings: { turnTimerEnabled: boolean } };
      expect(room.settings.turnTimerEnabled).toBe(true);

      const guestResponse = await fetch(`${base}/rooms/${room.roomCode}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: "Guest" }),
      });
      const guestCookie = guestResponse.headers.get("set-cookie")!;

      // Guest cannot update settings -> 403
      const guestUpdate = await fetch(`${base}/rooms/${room.roomCode}/settings`, {
        method: "POST",
        headers: { cookie: guestCookie, "content-type": "application/json" },
        body: JSON.stringify({ turnTimerEnabled: false }),
      });
      expect(guestUpdate.status).toBe(403);

      // Malformed body -> 400
      const malformed = await fetch(`${base}/rooms/${room.roomCode}/settings`, {
        method: "POST",
        headers: { cookie: hostCookie, "content-type": "application/json" },
        body: JSON.stringify({ turnTimerEnabled: "invalid" }),
      });
      expect(malformed.status).toBe(400);

      // Disallowed duration -> 422
      const disallowedDuration = await fetch(`${base}/rooms/${room.roomCode}/settings`, {
        method: "POST",
        headers: { cookie: hostCookie, "content-type": "application/json" },
        body: JSON.stringify({ turnTimerEnabled: true, turnTimeSeconds: 50 }),
      });
      expect(disallowedDuration.status).toBe(422);

      // Host updates settings -> 200
      const hostUpdate = await fetch(`${base}/rooms/${room.roomCode}/settings`, {
        method: "POST",
        headers: { cookie: hostCookie, "content-type": "application/json" },
        body: JSON.stringify({ turnTimerEnabled: false }),
      });
      expect(hostUpdate.status).toBe(200);
      const hostUpdated = await json(hostUpdate);
      expect(
        (hostUpdated.room as { settings: { turnTimerEnabled: boolean } }).settings.turnTimerEnabled,
      ).toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error === undefined ? resolve() : reject(error))),
      );
    }
  });
});
