import {
  createMatch,
  decide,
  expirePhase,
  seededRandom,
  type DomainEvent,
  type MatchId,
  type PlayerId,
} from "@shadow-council/domain";
import { applicationError } from "../errors.js";
import {
  MAX_ROOM_MEMBERS,
  commandFingerprint,
  commandFor,
  deadlineFor,
  phaseTokenOf,
  type ReadViewResult,
  type StartMatchResult,
  type SubmitIntentInput,
  type SubmitIntentResult,
} from "../contracts.js";
import type { ApplicationPorts, MembershipRecord, RoomRecord, StoredMatch } from "../ports.js";
import { projectMatchView, projectRoomView } from "../views/projection.js";

export class MatchCoordinator {
  private readonly roomReceipts = new Map<string, StartMatchResult>();

  constructor(private readonly ports: ApplicationPorts) {}

  requireStoredMatch(room: RoomRecord): StoredMatch {
    if (room.matchId === undefined) {
      throw applicationError("MatchNotFound", "The room has no match.");
    }
    const stored = this.ports.matches.get(room.matchId);
    if (stored === undefined) {
      throw applicationError("MatchNotFound", "The match is unavailable.");
    }
    return stored;
  }

  readViewFrom(room: RoomRecord, playerId: PlayerId): ReadViewResult {
    const roomView = projectRoomView(room);
    if (room.matchId === undefined || room.status === "LOBBY") return { room: roomView };
    const stored = this.requireStoredMatch(room);
    return {
      room: roomView,
      match: projectMatchView(room, stored.state, playerId, stored.deadline?.deadlineAt),
    };
  }

  startMatch(
    room: RoomRecord,
    membership: MembershipRecord,
    commandId?: string,
  ): {
    readonly result: StartMatchResult;
    readonly nextRoom: RoomRecord;
    readonly stored: StoredMatch;
  } {
    if (commandId !== undefined && (commandId.trim().length === 0 || commandId.length > 128)) {
      throw applicationError("InvalidCommandId", "Command ID must be 1–128 characters.");
    }
    const receiptKey =
      commandId === undefined ? undefined : `${room.roomCode}:${membership.token}:${commandId}`;
    if (receiptKey !== undefined) {
      const receipt = this.roomReceipts.get(receiptKey);
      if (receipt !== undefined) {
        const stored = this.requireStoredMatch(room);
        return { result: receipt, nextRoom: room, stored };
      }
    }
    if (room.status !== "LOBBY") {
      throw applicationError("RoomNotReady", "This room is not in the lobby.");
    }
    if (room.hostPlayerId !== membership.playerId) {
      throw applicationError("NotHost", "Only the host may start.");
    }
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
    const result: StartMatchResult = {
      room: projectRoomView(nextRoom),
      match: projectMatchView(
        nextRoom,
        stored.state,
        membership.playerId,
        stored.deadline?.deadlineAt,
      ),
      events: created.value.events,
    };
    if (receiptKey !== undefined) this.roomReceipts.set(receiptKey, result);
    return { result, nextRoom, stored };
  }

  submitIntent(
    room: RoomRecord,
    membership: MembershipRecord,
    input: SubmitIntentInput,
  ): {
    readonly result: SubmitIntentResult;
    readonly nextRoom: RoomRecord;
    readonly updated?: StoredMatch;
    readonly events: readonly DomainEvent[];
  } {
    if (input.commandId.trim().length === 0 || input.commandId.length > 128) {
      throw applicationError("InvalidCommandId", "Command ID must be 1–128 characters.");
    }
    if (room.status === "LOBBY" || room.matchId === undefined) {
      throw applicationError("MatchNotFound", "The room has no started match.");
    }
    if (room.matchId !== input.matchId) {
      throw applicationError("MatchIdMismatch", "That match is not current.");
    }
    const stored = this.requireStoredMatch(room);
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
      return {
        result: {
          match: projectMatchView(
            room,
            stored.state,
            membership.playerId,
            stored.deadline?.deadlineAt,
          ),
          events: existing.events,
          revision: existing.revision,
          duplicate: true,
        },
        nextRoom: room,
        events: existing.events,
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
      if (result.error.code === "StalePhase") {
        throw applicationError("StalePhase", result.error.message);
      }
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
    return {
      result: {
        match: projectMatchView(
          nextRoom,
          updated.state,
          membership.playerId,
          updated.deadline?.deadlineAt,
        ),
        events: result.value.events,
        revision: updated.state.revision,
        duplicate: false,
      },
      nextRoom,
      updated,
      events: result.value.events,
    };
  }

  applyExpiry(
    room: RoomRecord,
    stored: StoredMatch,
  ):
    | {
        readonly nextRoom: RoomRecord;
        readonly updated: StoredMatch;
        readonly events: readonly DomainEvent[];
      }
    | undefined {
    const deadline = stored.deadline;
    if (deadline === undefined) return undefined;
    const expiryCommand = expirePhase(deadline.phaseToken);
    const result = decide(stored.state, expiryCommand, seededRandom);
    if (!result.ok) return undefined;
    const phase = stored.state.phase;
    if (phase.kind === "FINISHED") return undefined;
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
    return { nextRoom, updated, events: result.value.events };
  }

  expire(
    room: RoomRecord,
    matchId: MatchId,
    phaseToken: string,
  ):
    | {
        readonly nextRoom: RoomRecord;
        readonly updated: StoredMatch;
        readonly events: readonly DomainEvent[];
      }
    | undefined {
    if (room.matchId !== matchId) return undefined;
    const stored = this.ports.matches.get(matchId);
    if (stored === undefined || stored.deadline?.phaseToken !== phaseToken) return undefined;
    if (this.ports.clock.now() < stored.deadline.deadlineAt) return undefined;
    return this.applyExpiry(room, stored);
  }

  schedule(
    room: RoomRecord,
    stored: StoredMatch,
    onExpire: (roomCode: string, matchId: MatchId, phaseToken: string) => void,
  ): void {
    const deadline = stored.deadline;
    if (deadline === undefined || room.matchId === undefined) return;
    const key = `${room.roomCode}:${deadline.phaseToken}`;
    const matchId = room.matchId;
    this.ports.scheduler.schedule(deadline.deadlineAt, key, () => {
      onExpire(room.roomCode, matchId, deadline.phaseToken);
    });
  }
}
