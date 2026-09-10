import { applicationError } from "../errors.js";
import type { ApplicationEvent } from "../events.js";
import {
  DEFAULT_ROOM_SETTINGS,
  MAX_ROOM_MEMBERS,
  validateDisplayName,
  validateRoomGameSettings,
  type CreateRoomResult,
  type JoinRoomResult,
  type RematchResult,
} from "../contracts.js";
import type { ApplicationPorts, MembershipRecord, RoomRecord } from "../ports.js";
import { projectRoomView, type RoomView } from "../views/projection.js";

export class RoomManager {
  constructor(private readonly ports: ApplicationPorts) {}

  uniqueRoomCode(): string {
    for (;;) {
      const code = this.ports.identities.nextRoomCode();
      if (this.ports.rooms.getByCode(code) === undefined) return code;
    }
  }

  requireRoom(roomCode: string): RoomRecord {
    const room = this.ports.rooms.getByCode(roomCode);
    if (room === undefined) throw applicationError("RoomNotFound", "Room not found.");
    return room;
  }

  requireMembership(roomCode: string, token: string): MembershipRecord {
    if (token.trim().length === 0) {
      throw applicationError("Unauthenticated", "Membership is required.");
    }
    const membership = this.ports.memberships.get(token);
    if (membership === undefined) {
      throw applicationError("Unauthenticated", "Membership is required.");
    }
    if (membership.roomCode !== roomCode) {
      throw applicationError("NotMember", "You are not a member of this room.");
    }
    return membership;
  }

  createRoom(request?: { readonly displayName?: string }): CreateRoomResult {
    const name = validateDisplayName(request?.displayName);
    const roomCode = this.uniqueRoomCode();
    const playerId = this.ports.identities.nextPlayerId();
    const credential = this.ports.credentials.next();
    const room: RoomRecord = {
      roomId: this.ports.identities.nextRoomId(),
      roomCode,
      hostPlayerId: playerId,
      members: [{ playerId, displayName: name, connected: true }],
      status: "LOBBY",
      settings: DEFAULT_ROOM_SETTINGS,
    };
    this.ports.rooms.save(room);
    this.ports.memberships.save({ token: credential, roomCode, playerId });
    return { room: projectRoomView(room), playerId, credential };
  }

  joinRoom(
    roomCode: string,
    request?: { readonly displayName?: string },
  ): { readonly result: JoinRoomResult; readonly nextRoom: RoomRecord } {
    const name = validateDisplayName(request?.displayName);
    const room = this.requireRoom(roomCode);
    if (room.status !== "LOBBY") {
      throw applicationError("RoomNotReady", "This match has already started.");
    }
    if (room.members.length >= MAX_ROOM_MEMBERS) {
      throw applicationError("RoomFull", "This room is full.");
    }
    const playerId = this.ports.identities.nextPlayerId();
    const credential = this.ports.credentials.next();
    const nextRoom: RoomRecord = {
      ...room,
      members: [...room.members, { playerId, displayName: name, connected: true }],
    };
    this.ports.rooms.save(nextRoom);
    this.ports.memberships.save({ token: credential, roomCode, playerId });
    return {
      result: { room: projectRoomView(nextRoom), playerId, credential },
      nextRoom,
    };
  }

  leaveRoom(
    roomCode: string,
    credential: string,
  ): {
    readonly roomView?: RoomView;
    readonly nextRoom?: RoomRecord;
    readonly events: readonly ApplicationEvent[];
  } {
    const membership = this.requireMembership(roomCode, credential);
    const room = this.requireRoom(roomCode);
    if (room.status !== "LOBBY") {
      const nextRoom: RoomRecord = {
        ...room,
        members: room.members.map((member) =>
          member.playerId === membership.playerId ? { ...member, connected: false } : member,
        ),
      };
      this.ports.rooms.save(nextRoom);
      return { roomView: projectRoomView(nextRoom), nextRoom, events: [] };
    }
    const members = room.members.filter((member) => member.playerId !== membership.playerId);
    this.ports.memberships.delete(credential);
    if (members.length === 0) {
      this.ports.rooms.delete(roomCode);
      return { events: [] };
    }
    const nextRoom: RoomRecord = {
      ...room,
      hostPlayerId:
        room.hostPlayerId === membership.playerId ? members[0]!.playerId : room.hostPlayerId,
      members,
    };
    this.ports.rooms.save(nextRoom);
    const events: ApplicationEvent[] = [
      { type: "PlayerLeft", roomCode, playerId: membership.playerId },
    ];
    if (nextRoom.hostPlayerId !== room.hostPlayerId) {
      events.push({ type: "HostChanged", roomCode, hostPlayerId: nextRoom.hostPlayerId });
    }
    return { roomView: projectRoomView(nextRoom), nextRoom, events };
  }

  reconnect(
    roomCode: string,
    credential: string,
  ): { readonly membership: MembershipRecord; readonly room: RoomRecord } {
    const membership = this.requireMembership(roomCode, credential);
    const room = this.requireRoom(roomCode);
    const nextRoom: RoomRecord = {
      ...room,
      members: room.members.map((member) =>
        member.playerId === membership.playerId ? { ...member, connected: true } : member,
      ),
    };
    this.ports.rooms.save(nextRoom);
    return { membership, room: nextRoom };
  }

  disconnect(roomCode: string, credential: string): RoomRecord {
    const membership = this.requireMembership(roomCode, credential);
    const room = this.requireRoom(roomCode);
    const nextRoom: RoomRecord = {
      ...room,
      members: room.members.map((member) =>
        member.playerId === membership.playerId ? { ...member, connected: false } : member,
      ),
    };
    this.ports.rooms.save(nextRoom);
    return nextRoom;
  }

  rematch(
    roomCode: string,
    credential: string,
  ): { readonly room: RoomRecord; readonly result: RematchResult } {
    const membership = this.requireMembership(roomCode, credential);
    const room = this.requireRoom(roomCode);
    if (room.status !== "FINISHED") {
      throw applicationError("RoomNotReady", "Match must be finished before rematch.");
    }
    if (room.hostPlayerId !== membership.playerId) {
      throw applicationError("NotHost", "Only the host may initiate a rematch.");
    }
    const { matchId: _discarded, ...rest } = room;
    const nextRoom: RoomRecord = {
      ...rest,
      status: "LOBBY",
    };
    this.ports.rooms.save(nextRoom);
    return {
      room: nextRoom,
      result: { room: projectRoomView(nextRoom) },
    };
  }

  updateSettings(
    roomCode: string,
    credential: string,
    rawSettings: unknown,
  ): { readonly room: RoomRecord; readonly roomView: RoomView } {
    const membership = this.requireMembership(roomCode, credential);
    const room = this.requireRoom(roomCode);
    if (room.status !== "LOBBY") {
      throw applicationError("RoomNotReady", "Settings can only be changed in the lobby.");
    }
    if (room.hostPlayerId !== membership.playerId) {
      throw applicationError("NotHost", "Only the host may update room settings.");
    }
    const settings = validateRoomGameSettings(rawSettings);
    const nextRoom: RoomRecord = {
      ...room,
      settings,
    };
    this.ports.rooms.save(nextRoom);
    return {
      room: nextRoom,
      roomView: projectRoomView(nextRoom),
    };
  }
}
