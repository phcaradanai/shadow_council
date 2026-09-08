import type { MatchId, PlayerId } from "@shadow-council/domain";
import type {
  MatchStore,
  MembershipRecord,
  MembershipStore,
  RoomIdentityGenerator,
  RoomRecord,
  RoomStore,
  StoredMatch,
} from "../ports.js";

export class MemoryRoomStore implements RoomStore {
  private readonly rooms = new Map<string, RoomRecord>();

  getByCode(roomCode: string): RoomRecord | undefined {
    return this.rooms.get(roomCode);
  }

  save(room: RoomRecord): void {
    this.rooms.set(room.roomCode, room);
  }

  delete(roomCode: string): void {
    this.rooms.delete(roomCode);
  }
}

export class MemoryMatchStore implements MatchStore {
  private readonly matches = new Map<MatchId, StoredMatch>();

  get(matchId: MatchId): StoredMatch | undefined {
    return this.matches.get(matchId);
  }

  save(match: StoredMatch): void {
    this.matches.set(match.state.matchId, match);
  }
}

export class MemoryMembershipStore implements MembershipStore {
  private readonly memberships = new Map<string, MembershipRecord>();

  get(token: string): MembershipRecord | undefined {
    return this.memberships.get(token);
  }

  save(record: MembershipRecord): void {
    this.memberships.set(record.token, record);
  }

  delete(token: string): void {
    this.memberships.delete(token);
  }
}

export class IncrementingIdentityGenerator implements RoomIdentityGenerator {
  private roomCounter = 1;
  private codeCounter = 1;
  private playerCounter = 1;
  private matchCounter = 1;
  private seedCounter = 1;

  nextRoomId(): string {
    const value = `room-${this.roomCounter}`;
    this.roomCounter += 1;
    return value;
  }

  nextRoomCode(): string {
    const code = String(this.codeCounter).padStart(6, "0");
    this.codeCounter += 1;
    return code;
  }

  nextPlayerId(): PlayerId {
    const value = `player-${this.playerCounter}` as PlayerId;
    this.playerCounter += 1;
    return value;
  }

  nextMatchId(): MatchId {
    const value = `match-${this.matchCounter}` as MatchId;
    this.matchCounter += 1;
    return value;
  }

  nextSeed(): string {
    const value = `seed-${this.seedCounter}`;
    this.seedCounter += 1;
    return value;
  }
}

export class IncrementingCredentialGenerator {
  private counter = 1;

  next(): string {
    const value = `credential-${this.counter}`;
    this.counter += 1;
    return value;
  }
}

export class SystemClock {
  now(): number {
    return Date.now();
  }
}

export class NoopScheduler {
  schedule(): void {
    // A server adapter replaces this with an actual timer scheduler.
  }

  cancel(): void {
    // No-op for deterministic application tests.
  }
}
