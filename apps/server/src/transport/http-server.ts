import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import {
  ApplicationError,
  GameApplication,
  matchIdFromWire,
  playerIdFromWire,
  type ReadViewResult,
  type SubmittedIntent,
} from "@shadow-council/application";
import {
  parseCommandEnvelope,
  parseCreateRoomBody,
  parseJoinRoomBody,
  parseStartMatchBody,
  PROTOCOL_VERSION,
  type CommandEnvelope,
  type WireIntent,
} from "@shadow-council/protocol";

const COOKIE_NAME = "sc_membership";
const MAX_BODY_BYTES = 64 * 1024;

const writeJson = (
  response: ServerResponse,
  status: number,
  body: unknown,
  headers?: Record<string, string>,
): void => {
  const payload = JSON.stringify(body);
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  response.end(payload);
};

const safeError = (
  error: unknown,
): {
  readonly status: number;
  readonly body: { readonly code: string; readonly message: string };
} => {
  if (error instanceof ApplicationError) {
    const status =
      error.code === "Unauthenticated" || error.code === "NotMember"
        ? 401
        : error.code === "RoomNotFound" || error.code === "MatchNotFound"
          ? 404
          : error.code === "StaleRevision" ||
              error.code === "StalePhase" ||
              error.code === "CommandIdConflict"
            ? 409
            : error.code === "NotHost"
              ? 403
              : error.code === "InvalidIntent" ||
                  error.code === "InvalidDisplayName" ||
                  error.code === "InvalidCommandId"
                ? 422
                : 400;
    return { status, body: { code: error.code, message: error.message } };
  }
  return {
    status: 500,
    body: { code: "InternalError", message: "The server could not complete the request." },
  };
};

const parseCookies = (header: string | undefined): Map<string, string> => {
  const result = new Map<string, string>();
  if (header === undefined) return result;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    try {
      result.set(
        part.slice(0, separator).trim(),
        decodeURIComponent(part.slice(separator + 1).trim()),
      );
    } catch {
      // Ignore malformed values and let authentication fail normally.
    }
  }
  return result;
};

const membershipToken = (request: IncomingMessage): string | undefined =>
  parseCookies(request.headers.cookie).get(COOKIE_NAME);

const cookie = (token: string): string =>
  `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

const clearCookie = (): string => `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;

const readBody = (request: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    let total = 0;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer | string) => {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      total += buffer.length;
      if (total > MAX_BODY_BYTES) {
        reject(new ApplicationError("InvalidIntent", "Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(buffer);
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown);
      } catch {
        reject(new ApplicationError("InvalidIntent", "Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });

const ensureSameOrigin = (request: IncomingMessage): void => {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (origin === undefined || host === undefined) return;
  try {
    if (new URL(origin).host !== host)
      throw new ApplicationError("NotMember", "Origin is not allowed.");
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError("NotMember", "Origin is not allowed.");
  }
};

const wireIntent = (intent: WireIntent): SubmittedIntent => {
  if (intent.type === "STRIKE")
    return { type: "STRIKE", targetId: playerIdFromWire(intent.targetId), funding: intent.funding };
  if (intent.type === "RECOVER") return { type: "RECOVER" };
  return { type: "REACT", choice: intent.choice };
};

const readEnvelope = (envelope: CommandEnvelope) => ({
  roomCode: envelope.roomCode,
  matchId: matchIdFromWire(envelope.matchId),
  commandId: envelope.commandId,
  expectedRevision: envelope.expectedRevision,
  phaseToken: envelope.phaseToken,
  intent: wireIntent(envelope.intent),
});

const viewBody = (result: ReadViewResult): unknown => result;

export const createHttpServer = (application: GameApplication): Server =>
  createServer((request, response) => {
    void handleRequest(application, request, response).catch((error: unknown) => {
      const safe = safeError(error);
      if (!response.headersSent) writeJson(response, safe.status, safe.body);
      else response.end();
    });
  });

const handleRequest = async (
  application: GameApplication,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  const method = request.method ?? "GET";
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const parts = requestUrl.pathname.split("/").filter(Boolean);

  if (method === "GET" && requestUrl.pathname === "/health") {
    writeJson(response, 200, { ok: true, protocolVersion: PROTOCOL_VERSION });
    return;
  }
  if (method === "GET" && requestUrl.pathname === "/") {
    const html = await readFile("apps/web/index.html", "utf8").catch(
      () => "<!doctype html><html><body><h1>Shadow Council</h1></body></html>",
    );
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
    return;
  }
  if (method === "GET" && requestUrl.pathname === "/app.js") {
    const script = await readFile("apps/web/dist/main.js", "utf8").catch(() => undefined);
    if (script === undefined) {
      writeJson(response, 404, { code: "NotFound", message: "Web client is not built." });
      return;
    }
    response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    response.end(script);
    return;
  }

  if (method === "POST" && requestUrl.pathname === "/rooms") {
    ensureSameOrigin(request);
    const parsed = parseCreateRoomBody(await readBody(request));
    if (!parsed.ok) {
      writeJson(response, 400, parsed.error);
      return;
    }
    const result = await application.createRoom(parsed.value);
    writeJson(
      response,
      201,
      { room: result.room, playerId: result.playerId },
      { "set-cookie": cookie(result.credential) },
    );
    return;
  }

  if (parts[0] !== "rooms" || parts[1] === undefined) {
    writeJson(response, 404, { code: "NotFound", message: "Not found." });
    return;
  }
  const roomCode = decodeURIComponent(parts[1]);
  const token = membershipToken(request);

  if (method === "POST" && parts[2] === "join" && parts.length === 3) {
    ensureSameOrigin(request);
    const parsed = parseJoinRoomBody(await readBody(request));
    if (!parsed.ok) {
      writeJson(response, 400, parsed.error);
      return;
    }
    const result = await application.joinRoom(roomCode, parsed.value);
    writeJson(
      response,
      200,
      { room: result.room, playerId: result.playerId },
      { "set-cookie": cookie(result.credential) },
    );
    return;
  }

  if (token === undefined) throw new ApplicationError("Unauthenticated", "Membership is required.");
  if (method === "GET" && parts[2] === "view" && parts.length === 3) {
    const result = await application.reconnect(roomCode, token);
    writeJson(response, 200, viewBody(result));
    return;
  }
  if (method === "POST" && parts[2] === "start" && parts.length === 3) {
    ensureSameOrigin(request);
    const parsed = parseStartMatchBody(await readBody(request));
    if (!parsed.ok) {
      writeJson(response, 400, parsed.error);
      return;
    }
    const result = await application.startMatch(roomCode, token, parsed.value.commandId);
    writeJson(response, 200, result);
    return;
  }
  if (method === "POST" && parts[2] === "leave" && parts.length === 3) {
    ensureSameOrigin(request);
    const result = await application.leaveRoom(roomCode, token);
    writeJson(response, 200, { room: result ?? null }, { "set-cookie": clearCookie() });
    return;
  }
  if (method === "POST" && parts[2] === "commands" && parts.length === 3) {
    ensureSameOrigin(request);
    const body = parseCommandEnvelope(await readBody(request));
    if (!body.ok) {
      writeJson(response, 400, body.error);
      return;
    }
    if (body.value.roomCode !== roomCode) {
      writeJson(response, 409, {
        code: "MatchIdMismatch",
        message: "The room code does not match the request path.",
      });
      return;
    }
    const result = await application.submitIntent({
      ...readEnvelope(body.value),
      credential: token,
    });
    writeJson(response, 200, result);
    return;
  }
  if (method === "GET" && parts[2] === "events" && parts.length === 3) {
    response.writeHead(200, {
      "cache-control": "no-cache",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    });
    const subscription = await application.subscribe(roomCode, token, (notification) => {
      if (response.writableEnded) return;
      response.write(`data: ${JSON.stringify(notification)}\n\n`);
    });
    request.on("close", () => {
      subscription();
    });
    return;
  }
  writeJson(response, 404, { code: "NotFound", message: "Not found." });
};
