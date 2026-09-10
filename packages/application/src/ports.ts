import type {
  DomainEvent,
  MatchCommand,
  MatchId,
  MatchState,
  PlayerId,
} from "@shadow-council/domain";

export interface RoomMemberRecord {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly connected: boolean;
}

export type RoomStatus = "LOBBY" | "PLAYING" | "FINISHED";

export interface RoomGameSettings {
  readonly turnTimerEnabled: boolean;
  readonly turnTimeSeconds?: number;
}

export interface RoomRecord {
  readonly roomId: string;
  readonly roomCode: string;
  readonly hostPlayerId: PlayerId;
  readonly members: readonly RoomMemberRecord[];
  readonly status: RoomStatus;
  readonly matchId?: MatchId;
  readonly settings: RoomGameSettings;
}

export interface DeadlineRecord {
  readonly phaseToken: string;
  readonly deadlineAt: number;
  readonly kind: "ACTIVE_TURN" | "REACTION";
}

export interface CommandJournalEntry {
  readonly commandId: string;
  readonly actorId: PlayerId;
  readonly command: MatchCommand;
  readonly intentFingerprint: string;
  readonly acceptedRevision: number;
}

export interface CommandReceipt {
  readonly membershipToken: string;
  readonly commandId: string;
  readonly intentFingerprint: string;
  readonly revision: number;
  readonly events: readonly DomainEvent[];
}

export interface StoredMatch {
  readonly state: MatchState;
  readonly settings: RoomGameSettings;
  readonly deadline?: DeadlineRecord;
  readonly journal: readonly CommandJournalEntry[];
  readonly receipts: readonly CommandReceipt[];
}

export interface RoomStore {
  getByCode(roomCode: string): RoomRecord | undefined;
  save(room: RoomRecord): void;
  delete(roomCode: string): void;
}

export interface MatchStore {
  get(matchId: MatchId): StoredMatch | undefined;
  save(match: StoredMatch): void;
}

export interface MembershipRecord {
  readonly token: string;
  readonly roomCode: string;
  readonly playerId: PlayerId;
}

export interface MembershipStore {
  get(token: string): MembershipRecord | undefined;
  save(record: MembershipRecord): void;
  delete(token: string): void;
}

export interface CredentialGenerator {
  next(): string;
}

export interface RoomIdentityGenerator {
  nextRoomId(): string;
  nextRoomCode(): string;
  nextPlayerId(): PlayerId;
  nextMatchId(): MatchId;
  nextSeed(): string;
}

export interface Clock {
  now(): number;
}

export interface Scheduler {
  schedule(deadlineAt: number, key: string, callback: () => void): void;
  cancel(key: string): void;
}

export interface ApplicationPorts {
  readonly rooms: RoomStore;
  readonly matches: MatchStore;
  readonly memberships: MembershipStore;
  readonly credentials: CredentialGenerator;
  readonly identities: RoomIdentityGenerator;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
}
