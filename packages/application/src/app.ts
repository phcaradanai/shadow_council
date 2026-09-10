import type { MatchId } from "@shadow-council/domain";
import type { ApplicationEvent } from "./events.js";
import type {
  CreateRoomResult,
  JoinRoomResult,
  ReadViewResult,
  RematchResult,
  StartMatchResult,
  SubmitIntentInput,
  SubmitIntentResult,
} from "./contracts.js";
import type { ApplicationPorts, RoomRecord } from "./ports.js";
import {
  projectMatchView,
  projectRoomView,
  type ApplicationNotification,
  type RoomView,
} from "./views/projection.js";
import { RoomManager } from "./rooms/room-manager.js";
import { MatchCoordinator } from "./matches/match-coordinator.js";

type Subscriber = (notification: ApplicationNotification) => void;

export class GameApplication {
  private readonly queues = new Map<string, Promise<void>>();
  private readonly subscribers = new Map<string, Map<string, Subscriber>>();
  private readonly roomManager: RoomManager;
  private readonly matchCoordinator: MatchCoordinator;

  constructor(private readonly ports: ApplicationPorts) {
    this.roomManager = new RoomManager(ports);
    this.matchCoordinator = new MatchCoordinator(ports);
  }

  async createRoom(request?: { readonly displayName?: string }): Promise<CreateRoomResult> {
    return this.roomManager.createRoom(request);
  }

  async joinRoom(
    roomCode: string,
    request?: { readonly displayName?: string },
  ): Promise<JoinRoomResult> {
    return this.enqueue(roomCode, () => {
      const { result, nextRoom } = this.roomManager.joinRoom(roomCode, request);
      const name =
        result.room.members.find((member) => member.playerId === result.playerId)?.displayName ??
        "";
      this.notify(
        roomCode,
        [{ type: "PlayerJoined", roomCode, playerId: result.playerId, displayName: name }],
        nextRoom,
      );
      return result;
    });
  }

  async leaveRoom(roomCode: string, credential: string): Promise<RoomView | undefined> {
    return this.enqueue(roomCode, () => {
      const { roomView, nextRoom, events } = this.roomManager.leaveRoom(roomCode, credential);
      if (nextRoom === undefined) {
        this.subscribers.delete(roomCode);
        return undefined;
      }
      this.notify(roomCode, events, nextRoom);
      return roomView;
    });
  }

  async reconnect(roomCode: string, credential: string): Promise<ReadViewResult> {
    return this.enqueue(roomCode, () => {
      const { membership, room } = this.roomManager.reconnect(roomCode, credential);
      this.notify(roomCode, [], room);
      return this.matchCoordinator.readViewFrom(room, membership.playerId);
    });
  }

  async disconnect(roomCode: string, credential: string): Promise<void> {
    await this.enqueue(roomCode, () => {
      const room = this.roomManager.disconnect(roomCode, credential);
      this.notify(roomCode, [], room);
    });
  }

  async rematch(roomCode: string, credential: string): Promise<RematchResult> {
    return this.enqueue(roomCode, () => {
      const { room, result } = this.roomManager.rematch(roomCode, credential);
      this.notify(roomCode, [], room);
      return result;
    });
  }

  async startMatch(
    roomCode: string,
    credential: string,
    commandId?: string,
  ): Promise<StartMatchResult> {
    return this.enqueue(roomCode, () => {
      const membership = this.roomManager.requireMembership(roomCode, credential);
      const room = this.roomManager.requireRoom(roomCode);
      const { result, nextRoom, stored } = this.matchCoordinator.startMatch(
        room,
        membership,
        commandId,
      );
      this.matchCoordinator.schedule(nextRoom, stored, (code, id, token) => {
        void this.handleExpire(code, id, token);
      });
      this.notify(roomCode, result.events, nextRoom);
      return result;
    });
  }

  async getView(roomCode: string, credential: string): Promise<ReadViewResult> {
    return this.enqueue(roomCode, () => {
      const membership = this.roomManager.requireMembership(roomCode, credential);
      const room = this.roomManager.requireRoom(roomCode);
      return this.matchCoordinator.readViewFrom(room, membership.playerId);
    });
  }

  async submitIntent(input: SubmitIntentInput): Promise<SubmitIntentResult> {
    return this.enqueue(input.roomCode, () => {
      const membership = this.roomManager.requireMembership(input.roomCode, input.credential);
      const room = this.roomManager.requireRoom(input.roomCode);
      const { result, nextRoom, updated, events } = this.matchCoordinator.submitIntent(
        room,
        membership,
        input,
      );
      if (updated !== undefined) {
        this.matchCoordinator.schedule(nextRoom, updated, (code, id, token) => {
          void this.handleExpire(code, id, token);
        });
      }
      this.notify(input.roomCode, events, nextRoom);
      return result;
    });
  }

  async subscribe(
    roomCode: string,
    credential: string,
    subscriber: Subscriber,
  ): Promise<() => void> {
    return this.enqueue(roomCode, () => {
      const membership = this.roomManager.requireMembership(roomCode, credential);
      const room = this.roomManager.requireRoom(roomCode);
      let roomSubscribers = this.subscribers.get(roomCode);
      if (roomSubscribers === undefined) {
        roomSubscribers = new Map();
        this.subscribers.set(roomCode, roomSubscribers);
      }
      roomSubscribers.set(credential, subscriber);
      const view = this.matchCoordinator.readViewFrom(room, membership.playerId);
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

  private async handleExpire(
    roomCode: string,
    matchId: MatchId,
    phaseToken: string,
  ): Promise<void> {
    await this.enqueue(roomCode, () => {
      const room = this.ports.rooms.getByCode(roomCode);
      if (room === undefined) return;
      const expired = this.matchCoordinator.expire(room, matchId, phaseToken);
      if (expired === undefined) return;
      this.matchCoordinator.schedule(expired.nextRoom, expired.updated, (code, id, token) => {
        void this.handleExpire(code, id, token);
      });
      this.notify(roomCode, expired.events, expired.nextRoom);
    });
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
          : projectMatchView(room, stored.state, membership.playerId, stored.deadline?.deadlineAt);
      try {
        subscriber({ room: roomView, ...(match === undefined ? {} : { match }), events });
      } catch {
        // A disconnected subscriber does not affect the committed match.
      }
    }
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
