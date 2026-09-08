import {
  createMatch,
  decide,
  expirePhase,
  seededRandom,
  type DomainEvent,
  type MatchId,
  type PlayerId,
} from "@shadow-council/domain";
import { applicationError } from "./errors.js";
import type { ApplicationEvent } from "./events.js";
import {
  MAX_ROOM_MEMBERS,
  commandFingerprint,
  commandFor,
  deadlineFor,
  phaseTokenOf,
  validateDisplayName,
  type CreateRoomResult,
  type JoinRoomResult,
  type ReadViewResult,
  type StartMatchResult,
  type SubmitIntentInput,
  type SubmitIntentResult,
  type SubmittedIntent,
} from "./contracts.js";
import type { ApplicationPorts, MembershipRecord, RoomRecord, StoredMatch } from "./ports.js";
import {
  projectMatchView,
  projectRoomView,
  type ApplicationNotification,
  type MatchView,
  type RoomView,
} from "./views/projection.js";

type Subscriber = (notification: ApplicationNotification) => void;

export class GameApplication {
  private readonly queues = new Map<string, Promise<void>>();
  private readonly subscribers = new Map<string, Map<string, Subscriber>>();
  private readonly roomReceipts = new Map<string, StartMatchResult>();

  constructor(private readonly ports: ApplicationPorts) {}

  async createRoom(request?: { readonly displayName?: string }): Promise<CreateRoomResult> {
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
    };
    this.ports.rooms.save(room);
    this.ports.memberships.save({ token: credential, roomCode, playerId });
    return { room: projectRoomView(room), playerId, credential };
  }

  async joinRoom(
    roomCode: string,
    request?: { readonly displayName?: string },
  ): Promise<JoinRoomResult> {
    const name = validateDisplayName(request?.displayName);
    return this.enqueue(roomCode, () => {
      const room = this.requireRoom(roomCode);
      if (room.status !== "LOBBY")
        throw applicationError("RoomNotReady", "This match has already started.");
      if (room.members.length >= MAX_ROOM_MEMBERS)
        throw applicationError("RoomFull", "This room is full.");
      const playerId = this.ports.identities.nextPlayerId();
      const credential = this.ports.credentials.next();
      const nextRoom: RoomRecord = {
        ...room,
        members: [...room.members, { playerId, displayName: name, connected: true }],
      };
      this.ports.rooms.save(nextRoom);
      this.ports.memberships.save({ token: credential, roomCode, playerId });
      this.notify(
        roomCode,
        [{ type: "PlayerJoined", roomCode, playerId, displayName: name }],
        nextRoom,
      );
      return { room: projectRoomView(nextRoom), playerId, credential };
    });
  }

  async leaveRoom(roomCode: string, credential: string): Promise<RoomView | undefined> {
    return this.enqueue(roomCode, () => {
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
        this.notify(roomCode, [], nextRoom);
        return projectRoomView(nextRoom);
      }
      const members = room.members.filter((member) => member.playerId !== membership.playerId);
      this.ports.memberships.delete(credential);
      if (members.length === 0) {
        this.ports.rooms.delete(roomCode);
        this.subscribers.delete(roomCode);
        return undefined;
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
      this.notify(roomCode, events, nextRoom);
      return projectRoomView(nextRoom);
    });
  }

  async reconnect(roomCode: string, credential: string): Promise<ReadViewResult> {
    return this.enqueue(roomCode, () => {
      const membership = this.requireMembership(roomCode, credential);
      const room = this.requireRoom(roomCode);
      const nextRoom: RoomRecord = {
        ...room,
        members: room.members.map((member) =>
          member.playerId === membership.playerId ? { ...member, connected: true } : member,
        ),
      };
      this.ports.rooms.save(nextRoom);
      this.notify(roomCode, [], nextRoom);
      return this.readViewFrom(nextRoom, membership.playerId);
    });
  }

  async disconnect(roomCode: string, credential: string): Promise<void> {
    await this.enqueue(roomCode, () => {
      const membership = this.requireMembership(roomCode, credential);
      const room = this.requireRoom(roomCode);
      const nextRoom: RoomRecord = {
        ...room,
        members: room.members.map((member) =>
          member.playerId === membership.playerId ? { ...member, connected: false } : member,
        ),
      };
      this.ports.rooms.save(nextRoom);
      this.notify(roomCode, [], nextRoom);
    });
  }

  async startMatch(
    roomCode: string,
    credential: string,
    commandId?: string,
  ): Promise<StartMatchResult> {
    if (commandId !== undefined && (commandId.trim().length === 0 || commandId.length > 128)) {
      throw applicationError("InvalidCommandId", "Command ID must be 1–128 characters.");
    }
    return this.enqueue(roomCode, () => {
      const membership = this.requireMembership(roomCode, credential);
      const receiptKey =
        commandId === undefined ? undefined : `${roomCode}:${credential}:${commandId}`;
      if (receiptKey !== undefined) {
        const receipt = this.roomReceipts.get(receiptKey);
        if (receipt !== undefined) return receipt;
      }
      const room = this.requireRoom(roomCode);
      if (room.status !== "LOBBY")
        throw applicationError("RoomNotReady", "This room is not in the lobby.");
      if (room.hostPlayerId !== membership.playerId)
        throw applicationError("NotHost", "Only the host may start.");
      const connected = room.members.filter((member) => member.connected);
      if (connected.length < 2 || connected.length > MAX_ROOM_MEMBERS) {
        throw applicationError(
          "RoomNotReady",
          "At least two connected players are required to start.",
        );
      }
      const matchId = this.ports.identities.nextMatchId();
      const created = createMatch(
        {
          matchId,
          playerIds: connected.map((member) => member.playerId),
          seed: this.ports.identities.nextSeed(),
        },
        seededRandom,
      );
      if (!created.ok) throw applicationError("RoomNotReady", created.error.message);
      const initialDeadline = deadlineFor(
        { state: created.value.state, journal: [], receipts: [] },
        this.ports.clock.now(),
      );
      const stored: StoredMatch = {
        state: created.value.state,
        journal: [],
        receipts: [],
        ...(initialDeadline === undefined ? {} : { deadline: initialDeadline }),
      };
      this.ports.matches.save(stored);
      const nextRoom: RoomRecord = { ...room, status: "PLAYING", matchId };
      this.ports.rooms.save(nextRoom);
      this.schedule(nextRoom, stored);
      this.notify(roomCode, created.value.events, nextRoom);
      const result: StartMatchResult = {
        room: projectRoomView(nextRoom),
        match: projectMatchView(nextRoom, stored.state, membership.playerId),
        events: created.value.events,
      };
      if (receiptKey !== undefined) this.roomReceipts.set(receiptKey, result);
      return result;
    });
  }

  async getView(roomCode: string, credential: string): Promise<ReadViewResult> {
    return this.enqueue(roomCode, () => {
      const membership = this.requireMembership(roomCode, credential);
      const room = this.requireRoom(roomCode);
      return this.readViewFrom(room, membership.playerId);
    });
  }

  async submitIntent(input: SubmitIntentInput): Promise<SubmitIntentResult> {
    if (input.commandId.trim().length === 0 || input.commandId.length > 128) {
      throw applicationError("InvalidCommandId", "Command ID must be 1–128 characters.");
    }
    return this.enqueue(input.roomCode, () => {
      const membership = this.requireMembership(input.roomCode, input.credential);
      const room = this.requireRoom(input.roomCode);
      if (room.status === "LOBBY" || room.matchId === undefined) {
        throw applicationError("MatchNotFound", "The room has no started match.");
      }
      if (room.matchId !== input.matchId)
        throw applicationError("MatchIdMismatch", "That match is not current.");
      const stored = this.ports.matches.get(room.matchId);
      if (stored === undefined)
        throw applicationError("MatchNotFound", "The match is unavailable.");
      const fingerprint = commandFingerprint(input);
      const existing = stored.receipts.find(
        (receipt) =>
          receipt.membershipToken === input.credential && receipt.commandId === input.commandId,
      );
      if (existing !== undefined) {
        if (existing.intentFingerprint !== fingerprint) {
          throw applicationError(
            "CommandIdConflict",
            "That command ID was already used for another intent.",
          );
        }
        const current = this.requireStoredMatch(room);
        return {
          match: projectMatchView(room, current.state, membership.playerId),
          events: existing.events,
          revision: existing.revision,
          duplicate: true,
        };
      }

      if (stored.deadline !== undefined && this.ports.clock.now() >= stored.deadline.deadlineAt) {
        this.applyExpiry(room, stored);
        throw applicationError("StalePhase", "The phase deadline has passed.");
      }
      if (stored.state.phase.kind === "FINISHED") {
        throw applicationError("InvalidIntent", "The match has already finished.");
      }
      const currentPhaseToken = phaseTokenOf(stored);
      if (input.expectedRevision !== stored.state.revision) {
        throw applicationError("StaleRevision", "The match revision is stale.");
      }
      if (currentPhaseToken === undefined || currentPhaseToken !== input.phaseToken) {
        throw applicationError("StalePhase", "The match phase is stale.");
      }
      const command = commandFor(membership.playerId, input.intent);
      const result = decide(stored.state, command, seededRandom);
      if (!result.ok) {
        if (result.error.code === "StalePhase")
          throw applicationError("StalePhase", result.error.message);
        throw applicationError("InvalidIntent", result.error.message);
      }

      const nextDeadline = deadlineFor(
        { state: result.value.state, journal: stored.journal, receipts: stored.receipts },
        this.ports.clock.now(),
      );
      const updated: StoredMatch = {
        state: result.value.state,
        journal: [
          ...stored.journal,
          {
            commandId: input.commandId,
            actorId: membership.playerId,
            command,
            intentFingerprint: fingerprint,
            acceptedRevision: result.value.state.revision,
          },
        ],
        receipts: [
          ...stored.receipts,
          {
            membershipToken: input.credential,
            commandId: input.commandId,
            intentFingerprint: fingerprint,
            revision: result.value.state.revision,
            events: result.value.events,
          },
        ],
        ...(nextDeadline === undefined ? {} : { deadline: nextDeadline }),
      };
      this.ports.matches.save(updated);
      const nextRoom: RoomRecord =
        result.value.state.phase.kind === "FINISHED" ? { ...room, status: "FINISHED" } : room;
      if (nextRoom !== room) this.ports.rooms.save(nextRoom);
      this.schedule(nextRoom, updated);
      this.notify(input.roomCode, result.value.events, nextRoom);
      return {
        match: projectMatchView(nextRoom, updated.state, membership.playerId),
        events: result.value.events,
        revision: updated.state.revision,
        duplicate: false,
      };
    });
  }

  async subscribe(
    roomCode: string,
    credential: string,
    subscriber: Subscriber,
  ): Promise<() => void> {
    return this.enqueue(roomCode, () => {
      const membership = this.requireMembership(roomCode, credential);
      const room = this.requireRoom(roomCode);
      let roomSubscribers = this.subscribers.get(roomCode);
      if (roomSubscribers === undefined) {
        roomSubscribers = new Map();
        this.subscribers.set(roomCode, roomSubscribers);
      }
      roomSubscribers.set(credential, subscriber);
      const view = this.readViewFrom(room, membership.playerId);
      try {
        subscriber({
          room: view.room,
          ...(view.match === undefined ? {} : { match: view.match }),
          events: [],
        });
      } catch {
        // Delivery failures must not roll back committed state.
      }
      return () => {
        const current = this.subscribers.get(roomCode);
        current?.delete(credential);
      };
    });
  }

  private uniqueRoomCode(): string {
    for (;;) {
      const code = this.ports.identities.nextRoomCode();
      if (this.ports.rooms.getByCode(code) === undefined) return code;
    }
  }

  private requireRoom(roomCode: string): RoomRecord {
    const room = this.ports.rooms.getByCode(roomCode);
    if (room === undefined) throw applicationError("RoomNotFound", "Room not found.");
    return room;
  }

  private requireMembership(roomCode: string, token: string): MembershipRecord {
    if (token.trim().length === 0)
      throw applicationError("Unauthenticated", "Membership is required.");
    const membership = this.ports.memberships.get(token);
    if (membership === undefined)
      throw applicationError("Unauthenticated", "Membership is required.");
    if (membership.roomCode !== roomCode)
      throw applicationError("NotMember", "You are not a member of this room.");
    return membership;
  }

  private requireStoredMatch(room: RoomRecord): StoredMatch {
    if (room.matchId === undefined)
      throw applicationError("MatchNotFound", "The room has no match.");
    const stored = this.ports.matches.get(room.matchId);
    if (stored === undefined) throw applicationError("MatchNotFound", "The match is unavailable.");
    return stored;
  }

  private readViewFrom(room: RoomRecord, playerId: PlayerId): ReadViewResult {
    const roomView = projectRoomView(room);
    if (room.matchId === undefined || room.status === "LOBBY") return { room: roomView };
    const stored = this.requireStoredMatch(room);
    return { room: roomView, match: projectMatchView(room, stored.state, playerId) };
  }

  private notify(roomCode: string, events: readonly ApplicationEvent[], room: RoomRecord): void {
    const listeners = this.subscribers.get(roomCode);
    if (listeners === undefined) return;
    const stored = room.matchId === undefined ? undefined : this.ports.matches.get(room.matchId);
    for (const [token, subscriber] of listeners) {
      const membership = this.ports.memberships.get(token);
      if (membership === undefined) continue;
      const roomView = projectRoomView(room);
      const match =
        stored === undefined
          ? undefined
          : projectMatchView(room, stored.state, membership.playerId);
      try {
        subscriber({ room: roomView, ...(match === undefined ? {} : { match }), events });
      } catch {
        // A disconnected subscriber does not affect the committed match.
      }
    }
  }

  private schedule(room: RoomRecord, stored: StoredMatch): void {
    const deadline = stored.deadline;
    if (deadline === undefined || room.matchId === undefined) return;
    const key = `${room.roomCode}:${deadline.phaseToken}`;
    this.ports.scheduler.schedule(deadline.deadlineAt, key, () => {
      void this.expire(room.roomCode, room.matchId!, deadline.phaseToken).catch(() => undefined);
    });
  }

  private applyExpiry(room: RoomRecord, stored: StoredMatch): void {
    const deadline = stored.deadline;
    if (deadline === undefined) return;
    const expiryCommand = expirePhase(deadline.phaseToken);
    const result = decide(stored.state, expiryCommand, seededRandom);
    if (!result.ok) return;
    const phase = stored.state.phase;
    if (phase.kind === "FINISHED") return;
    const actorId = phase.kind === "REACTION" ? phase.pendingStrike.targetId : phase.activePlayerId;
    const nextDeadline = deadlineFor(
      { state: result.value.state, journal: stored.journal, receipts: stored.receipts },
      this.ports.clock.now(),
    );
    const updated: StoredMatch = {
      state: result.value.state,
      journal: [
        ...stored.journal,
        {
          commandId: `expire:${deadline.phaseToken}`,
          actorId,
          command: expiryCommand,
          intentFingerprint: `expire:${deadline.phaseToken}`,
          acceptedRevision: result.value.state.revision,
        },
      ],
      receipts: stored.receipts,
      ...(nextDeadline === undefined ? {} : { deadline: nextDeadline }),
    };
    this.ports.matches.save(updated);
    const nextRoom: RoomRecord =
      result.value.state.phase.kind === "FINISHED" ? { ...room, status: "FINISHED" } : room;
    if (nextRoom !== room) this.ports.rooms.save(nextRoom);
    this.schedule(nextRoom, updated);
    this.notify(room.roomCode, result.value.events, nextRoom);
  }

  private async expire(roomCode: string, matchId: MatchId, phaseToken: string): Promise<void> {
    await this.enqueue(roomCode, () => {
      const room = this.requireRoom(roomCode);
      if (room.matchId !== matchId) return;
      const stored = this.ports.matches.get(matchId);
      if (stored === undefined || stored.deadline?.phaseToken !== phaseToken) return;
      if (this.ports.clock.now() < stored.deadline.deadlineAt) return;
      this.applyExpiry(room, stored);
    });
  }

  private enqueue<T>(roomCode: string, operation: () => T): Promise<T> {
    const previous = this.queues.get(roomCode) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    this.queues.set(
      roomCode,
      current.then(
        () => undefined,
        () => undefined,
      ),
    );
    return current;
  }
}
