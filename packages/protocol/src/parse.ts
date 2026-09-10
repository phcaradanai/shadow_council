import {
  PROTOCOL_VERSION,
  type CommandEnvelope,
  type CreateRoomBody,
  type JoinRoomBody,
  type ParseResult,
  type RematchBody,
  type StartMatchBody,
  type WireIntent,
} from "./types.js";

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown, field: string): ParseResult<string> =>
  typeof value === "string" && value.length > 0
    ? { ok: true, value }
    : {
        ok: false,
        error: { code: "InvalidPayload", message: `${field} must be a non-empty string.` },
      };

const optionalDisplayName = (record: RecordValue): ParseResult<string | undefined> => {
  const value = record.displayName;
  if (value === undefined) return { ok: true, value: undefined };
  return typeof value === "string" && value.length <= 64
    ? { ok: true, value }
    : {
        ok: false,
        error: {
          code: "InvalidPayload",
          message: "displayName must be a string of 64 characters or fewer.",
        },
      };
};

export const parseCreateRoomBody = (value: unknown): ParseResult<CreateRoomBody> => {
  if (!isRecord(value))
    return { ok: false, error: { code: "InvalidPayload", message: "JSON object required." } };
  const displayName = optionalDisplayName(value);
  if (!displayName.ok) return displayName;
  return displayName.value === undefined
    ? { ok: true, value: {} }
    : { ok: true, value: { displayName: displayName.value } };
};

export const parseJoinRoomBody = (value: unknown): ParseResult<JoinRoomBody> =>
  parseCreateRoomBody(value);

export const parseStartMatchBody = (value: unknown): ParseResult<StartMatchBody> => {
  if (!isRecord(value))
    return { ok: false, error: { code: "InvalidPayload", message: "JSON object required." } };
  if (value.commandId === undefined) return { ok: true, value: {} };
  if (
    typeof value.commandId !== "string" ||
    value.commandId.length === 0 ||
    value.commandId.length > 128
  ) {
    return {
      ok: false,
      error: { code: "InvalidPayload", message: "commandId must be 1–128 characters." },
    };
  }
  return { ok: true, value: { commandId: value.commandId } };
};

export const parseRematchBody = (value: unknown): ParseResult<RematchBody> =>
  parseStartMatchBody(value);

const parseIntent = (value: unknown): ParseResult<WireIntent> => {
  if (!isRecord(value))
    return { ok: false, error: { code: "InvalidPayload", message: "intent must be an object." } };
  const type = value.type;
  if (type === "RECOVER") return { ok: true, value: { type: "RECOVER" } };
  if (type === "STRIKE") {
    const targetId = stringValue(value.targetId, "targetId");
    if (!targetId.ok) return targetId;
    if (value.funding !== 0 && value.funding !== 1) {
      return { ok: false, error: { code: "InvalidPayload", message: "funding must be 0 or 1." } };
    }
    return {
      ok: true,
      value: { type: "STRIKE", targetId: targetId.value, funding: value.funding },
    };
  }
  if (type === "REACT") {
    if (value.choice !== "guard" && value.choice !== "challenge" && value.choice !== "yield") {
      return { ok: false, error: { code: "InvalidPayload", message: "choice is invalid." } };
    }
    return { ok: true, value: { type: "REACT", choice: value.choice } };
  }
  return { ok: false, error: { code: "InvalidPayload", message: "intent type is invalid." } };
};

export const parseCommandEnvelope = (value: unknown): ParseResult<CommandEnvelope> => {
  if (!isRecord(value))
    return { ok: false, error: { code: "InvalidPayload", message: "JSON object required." } };
  if (value.protocolVersion !== PROTOCOL_VERSION) {
    return {
      ok: false,
      error: { code: "InvalidPayload", message: "Unsupported protocol version." },
    };
  }
  const roomCode = stringValue(value.roomCode, "roomCode");
  const matchId = stringValue(value.matchId, "matchId");
  const commandId = stringValue(value.commandId, "commandId");
  const phaseToken = stringValue(value.phaseToken, "phaseToken");
  if (!roomCode.ok) return roomCode;
  if (!matchId.ok) return matchId;
  if (!commandId.ok) return commandId;
  if (!phaseToken.ok) return phaseToken;
  if (!Number.isInteger(value.expectedRevision) || Number(value.expectedRevision) < 0) {
    return {
      ok: false,
      error: {
        code: "InvalidPayload",
        message: "expectedRevision must be a non-negative integer.",
      },
    };
  }
  const intent = parseIntent(value.intent);
  if (!intent.ok) return intent;
  return {
    ok: true,
    value: {
      protocolVersion: PROTOCOL_VERSION,
      roomCode: roomCode.value,
      matchId: matchId.value,
      commandId: commandId.value,
      expectedRevision: Number(value.expectedRevision),
      phaseToken: phaseToken.value,
      intent: intent.value,
    },
  };
};
