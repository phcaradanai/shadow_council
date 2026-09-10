import { describe, expect, it } from "vitest";
import {
  parseCommandEnvelope,
  parseCreateRoomBody,
  parseRematchBody,
  parseStartMatchBody,
  parseUpdateSettingsBody,
  PROTOCOL_VERSION,
} from "./index.js";

describe("wire protocol", () => {
  it("parses only supported intent shapes", () => {
    const result = parseCommandEnvelope({
      protocolVersion: PROTOCOL_VERSION,
      roomCode: "ABC123",
      matchId: "match-1",
      commandId: "cmd-1",
      expectedRevision: 2,
      phaseToken: "active-token",
      intent: { type: "STRIKE", targetId: "player-2", funding: 1 },
    });
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        intent: { type: "STRIKE", targetId: "player-2", funding: 1 },
      }),
    });
  });

  it("rejects malformed or unsupported payloads", () => {
    expect(parseCommandEnvelope({})).toMatchObject({
      ok: false,
      error: { code: "InvalidPayload" },
    });
    expect(
      parseCommandEnvelope({
        protocolVersion: PROTOCOL_VERSION,
        roomCode: "ABC123",
        matchId: "match-1",
        commandId: "cmd-1",
        expectedRevision: 0,
        phaseToken: "token",
        intent: { type: "STRIKE", targetId: "p", funding: 2 },
      }),
    ).toMatchObject({ ok: false, error: { code: "InvalidPayload" } });
  });

  it("allows omitted display name so the application can apply its own policy", () => {
    expect(parseCreateRoomBody({})).toEqual({ ok: true, value: {} });
    expect(parseCreateRoomBody({ displayName: 4 })).toMatchObject({ ok: false });
  });

  it("parses an optional idempotency key for starting a match", () => {
    expect(parseStartMatchBody({ commandId: "start-1" })).toEqual({
      ok: true,
      value: { commandId: "start-1" },
    });
    expect(parseStartMatchBody({ commandId: "" })).toMatchObject({ ok: false });
  });

  it("parses an optional idempotency key for rematch", () => {
    expect(parseRematchBody({ commandId: "rematch-1" })).toEqual({
      ok: true,
      value: { commandId: "rematch-1" },
    });
    expect(parseRematchBody({ commandId: "" })).toMatchObject({ ok: false });
  });

  it("parses valid room settings", () => {
    expect(parseUpdateSettingsBody({ turnTimerEnabled: true, turnTimeSeconds: 45 })).toEqual({
      ok: true,
      value: { turnTimerEnabled: true, turnTimeSeconds: 45 },
    });
    expect(parseUpdateSettingsBody({ turnTimerEnabled: false })).toEqual({
      ok: true,
      value: { turnTimerEnabled: false },
    });
  });

  it("rejects invalid room settings", () => {
    expect(parseUpdateSettingsBody(null)).toMatchObject({ ok: false });
    expect(parseUpdateSettingsBody({})).toMatchObject({ ok: false });
    expect(parseUpdateSettingsBody({ turnTimerEnabled: "true" })).toMatchObject({ ok: false });
    expect(parseUpdateSettingsBody({ turnTimerEnabled: true, turnTimeSeconds: -5 })).toMatchObject({
      ok: false,
    });
    expect(parseUpdateSettingsBody({ turnTimerEnabled: true, turnTimeSeconds: 0 })).toMatchObject({
      ok: false,
    });
    expect(
      parseUpdateSettingsBody({ turnTimerEnabled: true, turnTimeSeconds: 30.5 }),
    ).toMatchObject({
      ok: false,
    });
    expect(
      parseUpdateSettingsBody({ turnTimerEnabled: true, turnTimeSeconds: "45" }),
    ).toMatchObject({
      ok: false,
    });
  });
});
