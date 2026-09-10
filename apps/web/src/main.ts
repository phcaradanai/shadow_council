import { api, ApiError } from "./client/api.js";
import { RealtimeClient } from "./client/realtime.js";
import { session, type SessionState } from "./state/session.js";
import { renderHomeScreen } from "./screens/Home.js";
import { renderLobbyScreen } from "./screens/Lobby.js";
import { renderGameScreen } from "./screens/Game.js";
import { renderResultScreen } from "./screens/Result.js";
import {
  getLocale,
  setLocale,
  subscribeLocale,
  getLocalizedErrorMessage,
  type Locale,
} from "./i18n/index.js";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("#app root container missing from DOM");

document.documentElement.lang = getLocale();

// Delegated click listener for language switcher buttons across all screens
appRoot.addEventListener("click", (e) => {
  const target = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(".lang-btn");
  if (target && target.dataset.lang) {
    const nextLang = target.dataset.lang as "th" | "en";
    setLocale(nextLang);
  }
});

let cleanupTicker: (() => void) | undefined;

const realtime = new RealtimeClient(
  (room, match, events) => {
    session.updateFromNotification(room, match, events);
  },
  (status) => {
    session.setConnectionStatus(status);
  },
);

const handleAsync = async (action: () => Promise<void>): Promise<void> => {
  session.clearError();
  session.setSubmitting(true);
  try {
    await action();
  } catch (err) {
    const code = err instanceof ApiError ? err.code : undefined;
    const rawMsg =
      err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Request failed";
    session.setError(getLocalizedErrorMessage(code, rawMsg));
  }
};

const renderApp = (state: SessionState): void => {
  if (cleanupTicker) {
    cleanupTicker();
    cleanupTicker = undefined;
  }

  const { room, match, playerId, errorMessage, isSubmitting, connectionStatus, recentEvents } =
    state;

  if (!room || !playerId) {
    renderHomeScreen(
      appRoot,
      {
        onCreateRoom: (displayName) =>
          void handleAsync(async () => {
            realtime.resetRevisionTracking();
            const res = await api.createRoom(displayName);
            session.setRoomSession(res.room, res.playerId);
            realtime.connect(res.room.roomCode);
          }),
        onJoinRoom: (roomCode, displayName) =>
          void handleAsync(async () => {
            realtime.resetRevisionTracking();
            const res = await api.joinRoom(roomCode, displayName);
            session.setRoomSession(res.room, res.playerId);
            realtime.connect(res.room.roomCode);
          }),
      },
      errorMessage,
      isSubmitting,
    );
    return;
  }

  if (!match || room.status === "LOBBY") {
    renderLobbyScreen(
      appRoot,
      room,
      playerId,
      {
        onStartMatch: () =>
          void handleAsync(async () => {
            const commandId = session.nextCommandId();
            const res = await api.startMatch(room.roomCode, commandId);
            session.updateFromNotification(res.room, res.match, res.events);
          }),
        onUpdateSettings: (settings) =>
          void handleAsync(async () => {
            const res = await api.updateSettings(room.roomCode, settings);
            session.updateFromNotification(res.room, undefined, []);
          }),
        onLeaveRoom: () =>
          void handleAsync(async () => {
            await api.leaveRoom(room.roomCode).catch(() => ({ room: null }));
            realtime.disconnect();
            session.clearSession();
          }),
      },
      errorMessage,
      isSubmitting,
    );
    return;
  }

  if (match.phase.kind === "FINISHED") {
    renderResultScreen(
      appRoot,
      room,
      match,
      playerId,
      {
        onRematch: () =>
          void handleAsync(async () => {
            const commandId = session.nextCommandId();
            const res = await api.rematch(room.roomCode, commandId);
            session.updateFromNotification(res.room, undefined, []);
          }),
        onLeaveRoom: () =>
          void handleAsync(async () => {
            await api.leaveRoom(room.roomCode).catch(() => ({ room: null }));
            realtime.disconnect();
            session.clearSession();
          }),
      },
      errorMessage,
      isSubmitting,
    );
    return;
  }

  cleanupTicker = renderGameScreen(
    appRoot,
    room,
    match,
    playerId,
    recentEvents,
    {
      onStrike: (targetId, funding) =>
        void handleAsync(async () => {
          if (match.phase.kind !== "ACTIVE_TURN") return;
          const commandId = session.nextCommandId();
          const res = await api.submitCommand(
            room.roomCode,
            match.matchId,
            commandId,
            match.revision,
            match.phase.phaseToken,
            { type: "STRIKE", targetId, funding },
          );
          session.updateFromNotification(room, res.match, res.events);
        }),
      onRecover: () =>
        void handleAsync(async () => {
          if (match.phase.kind !== "ACTIVE_TURN") return;
          const commandId = session.nextCommandId();
          const res = await api.submitCommand(
            room.roomCode,
            match.matchId,
            commandId,
            match.revision,
            match.phase.phaseToken,
            { type: "RECOVER" },
          );
          session.updateFromNotification(room, res.match, res.events);
        }),
      onReact: (choice) =>
        void handleAsync(async () => {
          if (match.phase.kind !== "REACTION") return;
          const commandId = session.nextCommandId();
          const res = await api.submitCommand(
            room.roomCode,
            match.matchId,
            commandId,
            match.revision,
            match.phase.phaseToken,
            { type: "REACT", choice },
          );
          session.updateFromNotification(room, res.match, res.events);
        }),
      onLeaveRoom: () =>
        void handleAsync(async () => {
          await api.leaveRoom(room.roomCode).catch(() => ({ room: null }));
          realtime.disconnect();
          session.clearSession();
        }),
    },
    errorMessage,
    isSubmitting,
    connectionStatus,
  );
};

// Subscribe UI to store and locale
session.subscribe((state) => renderApp(state));
subscribeLocale((locale: Locale) => {
  document.documentElement.lang = locale;
  renderApp(session.getState());
});

// Auto-reconnect on boot if roomCode exists
const initSession = async (): Promise<void> => {
  const currentCode = session.getState().roomCode;
  if (!currentCode) return;

  try {
    const view = await api.fetchView(currentCode);
    if (view.room) {
      const viewerId = view.match?.viewerPlayerId ?? view.room.hostPlayerId;
      session.setRoomSession(view.room, viewerId);
      if (view.match) {
        session.updateFromNotification(view.room, view.match, []);
      }
      realtime.connect(currentCode);
    }
  } catch {
    // Session invalidated or expired; start fresh
    session.clearSession();
  }
};

void initSession();
