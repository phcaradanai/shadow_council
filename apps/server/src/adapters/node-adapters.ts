import { randomBytes, randomUUID } from "node:crypto";
import type {
  Clock,
  CredentialGenerator,
  MatchId,
  PlayerId,
  RoomIdentityGenerator,
  Scheduler,
} from "@shadow-council/application";

export class NodeClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class NodeCredentialGenerator implements CredentialGenerator {
  next(): string {
    return randomBytes(24).toString("base64url");
  }
}

export class NodeIdentityGenerator implements RoomIdentityGenerator {
  nextRoomId(): string {
    return `room-${randomUUID()}`;
  }

  nextRoomCode(): string {
    return randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  }

  nextPlayerId(): PlayerId {
    return `player-${randomUUID()}` as PlayerId;
  }

  nextMatchId(): MatchId {
    return `match-${randomUUID()}` as MatchId;
  }

  nextSeed(): string {
    return randomBytes(16).toString("hex");
  }
}

export class NodeScheduler implements Scheduler {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  schedule(deadlineAt: number, key: string, callback: () => void): void {
    this.cancel(key);
    const delay = Math.max(0, deadlineAt - Date.now());
    const timer = setTimeout(() => {
      this.timers.delete(key);
      callback();
    }, delay);
    this.timers.set(key, timer);
  }

  cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }
}
