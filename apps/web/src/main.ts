const PROTOCOL_VERSION = "1";

interface RoomView {
  readonly roomCode: string;
  readonly status: "LOBBY" | "PLAYING" | "FINISHED";
  readonly hostPlayerId: string;
  readonly members: readonly {
    readonly playerId: string;
    readonly displayName: string;
    readonly connected: boolean;
  }[];
}

interface MatchView {
  readonly roomCode: string;
  readonly matchId: string;
  readonly viewerPlayerId: string;
  readonly revision: number;
  readonly round: number;
  readonly players: readonly {
    readonly playerId: string;
    readonly displayName: string;
    readonly influence: number;
    readonly power: number;
    readonly eliminated: boolean;
  }[];
  readonly phase:
    | { readonly kind: "ACTIVE_TURN"; readonly activePlayerId: string; readonly phaseToken: string }
    | {
        readonly kind: "REACTION";
        readonly activePlayerId: string;
        readonly attackerId: string;
        readonly targetId: string;
        readonly phaseToken: string;
        readonly pendingFunding?: 0 | 1;
      }
    | { readonly kind: "FINISHED"; readonly winnerId: string };
  readonly legalIntents: readonly {
    readonly type: string;
    readonly targetIds?: readonly string[];
    readonly funding?: readonly (0 | 1)[];
    readonly choices?: readonly string[];
  }[];
}

interface Notification {
  readonly room: RoomView;
  readonly match?: MatchView;
  readonly events?: readonly {
    readonly matchId?: string;
    readonly revision?: number;
    readonly ordinal?: number;
    readonly type: string;
  }[];
}

const root = document.querySelector<HTMLDivElement>("#app");
if (root === null) throw new Error("app root is missing");

let room: RoomView | undefined;
let match: MatchView | undefined;
let playerId: string | undefined;
let roomCode = "";
let nextCommand = 1;
let stream: EventSource | undefined;
let message = "";
let lastRevision = -1;
const seenEventIds = new Set<string>();
let lastEvents: readonly { readonly type: string }[] = [];

const storedRoomCode = sessionStorage.getItem("shadow-council.roomCode");
if (storedRoomCode !== null) roomCode = storedRoomCode;

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const requestJson = async (path: string, init?: RequestInit): Promise<Record<string, unknown>> => {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok)
    throw new Error(typeof body.message === "string" ? body.message : "Request failed");
  return body;
};

const connectStream = (): void => {
  stream?.close();
  if (roomCode.length === 0) return;
  stream = new EventSource(`/rooms/${encodeURIComponent(roomCode)}/events`);
  stream.onmessage = (event) => {
    const notification = JSON.parse(event.data) as Notification;
    const incomingRevision = notification.match?.revision ?? -1;
    if (incomingRevision >= 0 && incomingRevision < lastRevision) return;
    lastEvents = (notification.events ?? []).filter((item) => {
      if (item.matchId === undefined || item.revision === undefined || item.ordinal === undefined)
        return true;
      const id = `${item.matchId}:${item.revision}:${item.ordinal}`;
      if (seenEventIds.has(id)) return false;
      seenEventIds.add(id);
      return true;
    });
    if (incomingRevision >= 0) lastRevision = Math.max(lastRevision, incomingRevision);
    room = notification.room;
    match = notification.match;
    render();
  };
  stream.onerror = () => {
    message = "Realtime connection lost; the next snapshot will restore state.";
    render();
  };
};

const useSession = (body: Record<string, unknown>): void => {
  room = body.room as RoomView;
  playerId = typeof body.playerId === "string" ? body.playerId : playerId;
  roomCode = room.roomCode;
  lastRevision = -1;
  seenEventIds.clear();
  lastEvents = [];
  sessionStorage.setItem("shadow-council.roomCode", roomCode);
  message = "";
  connectStream();
  render();
};

const createRoom = async (name: string): Promise<void> => {
  useSession(
    await requestJson("/rooms", { method: "POST", body: JSON.stringify({ displayName: name }) }),
  );
};

const joinRoom = async (code: string, name: string): Promise<void> => {
  useSession(
    await requestJson(`/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ displayName: name }),
    }),
  );
};

const refresh = async (): Promise<void> => {
  if (roomCode.length === 0) return;
  const result = await requestJson(`/rooms/${encodeURIComponent(roomCode)}/view`);
  room = result.room as RoomView;
  match = result.match as MatchView | undefined;
  if (match !== undefined) {
    playerId = match.viewerPlayerId;
    lastRevision = Math.max(lastRevision, match.revision);
  }
  render();
};

const startMatch = async (): Promise<void> => {
  const result = await requestJson(`/rooms/${encodeURIComponent(roomCode)}/start`, {
    method: "POST",
    body: "{}",
  });
  room = result.room as RoomView;
  match = result.match as MatchView;
  lastRevision = Math.max(lastRevision, match.revision);
  lastEvents = (result.events as readonly { readonly type: string }[]) ?? [];
  render();
};

const submit = async (intent: Record<string, unknown>): Promise<void> => {
  if (match === undefined || playerId === undefined || match.phase.kind === "FINISHED") return;
  const phaseToken = match.phase.phaseToken;
  const commandId = `browser-${nextCommand}`;
  nextCommand += 1;
  const result = await requestJson(`/rooms/${encodeURIComponent(roomCode)}/commands`, {
    method: "POST",
    body: JSON.stringify({
      protocolVersion: PROTOCOL_VERSION,
      roomCode,
      matchId: match.matchId,
      commandId,
      expectedRevision: match.revision,
      phaseToken,
      intent,
    }),
  });
  match = result.match as MatchView;
  lastRevision = Math.max(lastRevision, match.revision);
  lastEvents = (result.events as readonly { readonly type: string }[]) ?? [];
  render();
};

const onSubmit = (action: () => Promise<void>): void => {
  void action().catch((error: unknown) => {
    message = error instanceof Error ? error.message : "Request failed";
    render();
  });
};

const renderLanding = (): void => {
  root.innerHTML = `
    <h1>Shadow Council</h1>
    <p class="muted">A small authoritative Strike / Recover bluff loop.</p>
    <section><h2>Create room</h2><form id="create"><input name="name" required maxlength="32" placeholder="Display name" /><button>Create</button></form></section>
    <section><h2>Join room</h2><form id="join"><input name="code" required placeholder="Room code" /><input name="name" required maxlength="32" placeholder="Display name" /><button>Join</button></form></section>
    ${message.length === 0 ? "" : `<p class="error">${escapeHtml(message)}</p>`}
  `;
  root.querySelector<HTMLFormElement>("#create")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    onSubmit(() => createRoom(String(form.get("name") ?? "")));
  });
  root.querySelector<HTMLFormElement>("#join")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    onSubmit(() => joinRoom(String(form.get("code") ?? ""), String(form.get("name") ?? "")));
  });
};

const renderLobby = (): void => {
  if (room === undefined) return;
  root.innerHTML = `
    <h1>Room ${escapeHtml(room.roomCode)}</h1>
    <p class="muted">Share this code with the other local player.</p>
    <section><h2>Players</h2><div class="players">${room.members.map((member) => `<article class="player"><strong>${escapeHtml(member.displayName)}</strong><br /><span class="muted">${member.connected ? "connected" : "disconnected"}</span></article>`).join("")}</div></section>
    ${room.hostPlayerId === playerId ? `<button id="start" ${room.members.length < 2 ? "disabled" : ""}>Start match</button>` : `<p class="muted">Waiting for the host to start…</p>`}
    ${message.length === 0 ? "" : `<p class="error">${escapeHtml(message)}</p>`}
  `;
  root
    .querySelector<HTMLButtonElement>("#start")
    ?.addEventListener("click", () => onSubmit(startMatch));
};

const renderMatch = (): void => {
  if (room === undefined || match === undefined) return;
  const phase = match.phase;
  const phaseLabel =
    phase.kind === "ACTIVE_TURN"
      ? `Active turn: ${escapeHtml(phase.activePlayerId)}`
      : phase.kind === "REACTION"
        ? `Reaction: ${escapeHtml(phase.targetId)}`
        : `Winner: ${escapeHtml(phase.winnerId)}`;
  const controls =
    phase.kind === "ACTIVE_TURN" && phase.activePlayerId === playerId
      ? `<fieldset><legend>Your turn</legend><label>Target <select id="target">${(match.legalIntents.find((intent) => intent.type === "STRIKE")?.targetIds ?? []).map((id) => `<option value="${escapeHtml(id)}">${escapeHtml(id)}</option>`).join("")}</select></label><label>Funding <select id="funding">${(match.legalIntents.find((intent) => intent.type === "STRIKE")?.funding ?? []).map((funding) => `<option value="${funding}">${funding}</option>`).join("")}</select></label><button id="strike">Strike</button>${match.legalIntents.some((intent) => intent.type === "RECOVER") ? `<button id="recover">Recover</button>` : ""}</fieldset>`
      : phase.kind === "REACTION" && phase.targetId === playerId
        ? `<fieldset><legend>Choose a reaction</legend>${(match.legalIntents.find((intent) => intent.type === "REACT")?.choices ?? []).map((choice) => `<button class="reaction" data-choice="${choice}">${choice}</button>`).join("")}</fieldset>`
        : `<p class="muted">Waiting for the server…</p>`;
  root.innerHTML = `<h1>Shadow Council</h1><p>Room ${escapeHtml(room.roomCode)} · Round ${match.round} · Revision ${match.revision}</p><p><strong>${phaseLabel}</strong></p><section><h2>Players</h2><div class="players">${match.players.map((player) => `<article class="player"><strong>${escapeHtml(player.displayName)}</strong><br />Influence ${player.influence} · Power ${player.power}${player.eliminated ? " · eliminated" : ""}</article>`).join("")}</div></section>${controls}${message.length === 0 ? "" : `<p class="error">${escapeHtml(message)}</p>`}`;
  if (lastEvents.length > 0) {
    const section = document.createElement("section");
    section.setAttribute("aria-live", "polite");
    section.innerHTML = `<h2>Latest resolution</h2><p>${lastEvents.map((event) => escapeHtml(event.type)).join(" → ")}</p>`;
    root.append(section);
  }
  root.querySelector<HTMLButtonElement>("#strike")?.addEventListener("click", () => {
    const target = root.querySelector<HTMLSelectElement>("#target")?.value;
    const funding = Number(root.querySelector<HTMLSelectElement>("#funding")?.value);
    if (target !== undefined && (funding === 0 || funding === 1))
      onSubmit(() => submit({ type: "STRIKE", targetId: target, funding }));
  });
  root
    .querySelector<HTMLButtonElement>("#recover")
    ?.addEventListener("click", () => onSubmit(() => submit({ type: "RECOVER" })));
  root
    .querySelectorAll<HTMLButtonElement>(".reaction")
    .forEach((button) =>
      button.addEventListener("click", () =>
        onSubmit(() => submit({ type: "REACT", choice: button.dataset.choice })),
      ),
    );
};

const render = (): void => {
  if (room === undefined) renderLanding();
  else if (match === undefined) renderLobby();
  else renderMatch();
};

void refresh().catch(() => render());
render();
