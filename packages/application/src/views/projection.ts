import {
  legalIntentsFor,
  type Funding,
  type MatchState,
  type PlayerId,
} from "@shadow-council/domain";
import type { RoomRecord } from "../ports.js";
import type { ApplicationEvent } from "../events.js";

export interface PublicPlayerView {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly influence: number;
  readonly power: number;
  readonly eliminated: boolean;
  readonly connected: boolean;
}

export type PublicPhaseView =
  | {
      readonly kind: "ACTIVE_TURN";
      readonly activePlayerId: PlayerId;
      readonly phaseToken: string;
    }
  | {
      readonly kind: "REACTION";
      readonly activePlayerId: PlayerId;
      readonly attackerId: PlayerId;
      readonly targetId: PlayerId;
      readonly phaseToken: string;
      readonly pendingFunding?: Funding;
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
  }[];
  readonly matchId?: string;
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
  members: room.members.map(({ playerId, displayName, connected }) => ({
    playerId,
    displayName,
    connected,
  })),
  ...(room.matchId === undefined ? {} : { matchId: room.matchId }),
});

export const projectMatchView = (
  room: RoomRecord,
  state: MatchState,
  viewerPlayerId: PlayerId,
): MatchView => {
  const memberById = new Map(room.members.map((member) => [member.playerId, member]));
  const players = state.players.map((player) => {
    const member = memberById.get(player.playerId);
    return {
      playerId: player.playerId,
      displayName: member?.displayName ?? "Player",
      influence: player.influence,
      power: player.power,
      eliminated: player.influence <= 0,
      connected: member?.connected ?? false,
    };
  });
  const phase = state.phase;
  const phaseView: PublicPhaseView =
    phase.kind === "ACTIVE_TURN"
      ? { kind: "ACTIVE_TURN", activePlayerId: phase.activePlayerId, phaseToken: phase.phaseToken }
      : phase.kind === "REACTION"
        ? {
            kind: "REACTION",
            activePlayerId: phase.activePlayerId,
            attackerId: phase.pendingStrike.attackerId,
            targetId: phase.pendingStrike.targetId,
            phaseToken: phase.phaseToken,
            ...(phase.pendingStrike.attackerId === viewerPlayerId
              ? { pendingFunding: phase.pendingStrike.funding }
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
