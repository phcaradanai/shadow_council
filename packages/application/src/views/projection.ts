import {
  legalIntentsFor,
  type Force,
  type Funding,
  type MatchState,
  type PlayerId,
  type SchemeType,
  type Threat,
} from "@shadow-council/domain";
import type { RoomGameSettings, RoomRecord } from "../ports.js";
import type { ApplicationEvent } from "../events.js";

export interface PublicPlayerView {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly influence: number;
  readonly power?: number; // Secret: omitted for opponents
  readonly hasScheme?: boolean; // Public indicator: whether the player has an active scheme
  readonly activeScheme?: SchemeType; // Secret: only viewer's active scheme type
  readonly eliminated: boolean;
  readonly connected: boolean;
}

export type PublicPhaseView =
  | {
      readonly kind: "ACTIVE_TURN";
      readonly activePlayerId: PlayerId;
      readonly phaseToken: string;
      readonly deadlineAt?: number;
    }
  | {
      readonly kind: "REACTION";
      readonly activePlayerId: PlayerId;
      readonly attackerId: PlayerId;
      readonly targetId: PlayerId;
      readonly phaseToken: string;
      readonly deadlineAt?: number;
      readonly threat?: Threat;
      readonly pendingForce?: Force; // Secret: only attacker can see their committed force
      readonly pendingFunding?: Funding; // backward compatibility
    }
  | { readonly kind: "FINISHED"; readonly winnerId: PlayerId };

export interface MatchView {
  readonly roomCode: string;
  readonly status: "PLAYING" | "FINISHED";
  readonly matchId: string;
  readonly viewerPlayerId: PlayerId;
  readonly revision: number;
  readonly round: number;
  readonly seatOrder: readonly PlayerId[];
  readonly players: readonly PublicPlayerView[];
  readonly phase: PublicPhaseView;
  readonly legalIntents: ReturnType<typeof legalIntentsFor>;
}

export interface RoomView {
  readonly roomId: string;
  readonly roomCode: string;
  readonly status: "LOBBY" | "PLAYING" | "FINISHED";
  readonly hostPlayerId: PlayerId;
  readonly members: readonly {
    readonly playerId: PlayerId;
    readonly displayName: string;
    readonly connected: boolean;
    readonly isBot: boolean;
    readonly botDifficulty?: "EASY" | "MEDIUM" | "HARD";
  }[];
  readonly matchId?: string;
  readonly settings: RoomGameSettings;
}

export interface ApplicationNotification {
  readonly room: RoomView;
  readonly match?: MatchView;
  readonly events: readonly ApplicationEvent[];
}

export const projectRoomView = (room: RoomRecord): RoomView => ({
  roomId: room.roomId,
  roomCode: room.roomCode,
  status: room.status,
  hostPlayerId: room.hostPlayerId,
  members: room.members.map(({ playerId, displayName, connected, isBot, botDifficulty }) => ({
    playerId,
    displayName,
    connected,
    isBot: !!isBot,
    ...(botDifficulty ? { botDifficulty } : {}),
  })),
  settings: room.settings,
  ...(room.matchId === undefined ? {} : { matchId: room.matchId }),
});

export const projectMatchView = (
  room: RoomRecord,
  state: MatchState,
  viewerPlayerId: PlayerId,
  deadlineAt?: number,
): MatchView => {
  const memberById = new Map(room.members.map((member) => [member.playerId, member]));
  const players = state.players.map((player) => {
    const member = memberById.get(player.playerId);
    const isViewer = player.playerId === viewerPlayerId;
    return {
      playerId: player.playerId,
      displayName: member?.displayName ?? "Player",
      influence: player.influence,
      // Power is secret: only visible to viewer
      ...(isViewer ? { power: player.power } : {}),
      // Scheme presence is public, but specific schemeType is secret to viewer!
      ...(player.activeScheme ? { hasScheme: true } : {}),
      ...(isViewer && player.activeScheme ? { activeScheme: player.activeScheme } : {}),
      eliminated: player.influence <= 0,
      connected: member?.connected ?? false,
    };
  });

  const phase = state.phase;
  const phaseView: PublicPhaseView =
    phase.kind === "ACTIVE_TURN"
      ? {
          kind: "ACTIVE_TURN",
          activePlayerId: phase.activePlayerId,
          phaseToken: phase.phaseToken,
          ...(deadlineAt !== undefined ? { deadlineAt } : {}),
        }
      : phase.kind === "REACTION"
        ? {
            kind: "REACTION",
            activePlayerId: phase.activePlayerId,
            attackerId: phase.pendingStrike.attackerId,
            targetId: phase.pendingStrike.targetId,
            phaseToken: phase.phaseToken,
            threat: phase.pendingStrike.threat,
            ...(deadlineAt !== undefined ? { deadlineAt } : {}),
            // Force / funding is secret to attacker only!
            ...(phase.pendingStrike.attackerId === viewerPlayerId
              ? {
                  pendingForce: phase.pendingStrike.force,
                  pendingFunding: phase.pendingStrike.force as Funding,
                }
              : {}),
          }
        : { kind: "FINISHED", winnerId: phase.winnerId };

  return {
    roomCode: room.roomCode,
    status: phase.kind === "FINISHED" ? "FINISHED" : "PLAYING",
    matchId: state.matchId,
    viewerPlayerId,
    revision: state.revision,
    round: state.round,
    seatOrder: state.seatOrder,
    players,
    phase: phaseView,
    legalIntents: legalIntentsFor(state, viewerPlayerId),
  };
};

export const projectEventsForViewer = <T extends ApplicationEvent>(
  events: readonly T[],
  viewerPlayerId: PlayerId,
): readonly T[] => {
  return events.map((event) => {
    const ev = event as ApplicationEvent;
    if (ev.type === "PowerRecovered") {
      if (ev.playerId !== viewerPlayerId) {
        const { power: _omitted, ...rest } = ev;
        return rest as unknown as T;
      }
    } else if (ev.type === "SchemePrepared") {
      // SchemeType is private to actor!
      if (ev.actorId !== viewerPlayerId) {
        const { schemeType: _omitted, ...rest } = ev;
        return rest as unknown as T;
      }
    } else if (ev.type === "AttackResolved") {
      let result = { ...ev };
      if (ev.attackerId !== viewerPlayerId) {
        const { attackerPower: _omitted, ...rest } = result;
        result = rest as typeof result;
      }
      if (ev.targetId !== viewerPlayerId) {
        const { targetPower: _omitted, ...rest } = result;
        result = rest as typeof result;
      }
      return result as unknown as T;
    }
    return event;
  });
};
