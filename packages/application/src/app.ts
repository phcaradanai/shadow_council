import { legalIntentsFor, type MatchId, type PlayerId } from "@shadow-council/domain";
import type { ApplicationEvent } from "./events.js";
import {
  type BotDifficulty,
  type CreateRoomResult,
  type JoinRoomResult,
  type ReadViewResult,
  type RematchResult,
  type StartMatchResult,
  type SubmitIntentInput,
  type SubmitIntentResult,
} from "./contracts.js";
import type { ApplicationPorts, RoomRecord } from "./ports.js";
import {
  projectEventsForViewer,
  projectMatchView,
  projectRoomView,
  type ApplicationNotification,
  type RoomView,
} from "./views/projection.js";
import { RoomManager } from "./rooms/room-manager.js";
import { MatchCoordinator } from "./matches/match-coordinator.js";
import {
  botDecisionPlayerId,
  botDelayMs,
  buildBotDecisionContext,
  selectBotIntent,
} from "./bots/bot-policy.js";

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

  async updateSettings(roomCode: string, credential: string, settings: unknown): Promise<RoomView> {
    return this.enqueue(roomCode, () => {
      const { room, roomView } = this.roomManager.updateSettings(roomCode, credential, settings);
      this.notify(roomCode, [], room);
      return roomView;
    });
  }

  async addBot(
    roomCode: string,
    credential: string | undefined,
    difficulty: BotDifficulty = "MEDIUM",
  ): Promise<RoomView> {
    return this.enqueue(roomCode, () => {
      const { room } = this.roomManager.addBot(roomCode, credential, difficulty);
      const nextRoom = this.roomManager.requireRoom(roomCode);
      this.notify(roomCode, [], nextRoom);
      return room;
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
    const stored = room.matchId === undefined ? undefined : this.ports.matches.get(room.matchId);

    if (listeners !== undefined) {
      for (const [token, subscriber] of listeners) {
        const membership = this.ports.memberships.get(token);
        if (membership === undefined) continue;
        const roomView = projectRoomView(room);
        const match =
          stored === undefined
            ? undefined
            : projectMatchView(
                room,
                stored.state,
                membership.playerId,
                stored.deadline?.deadlineAt,
              );
        const projectedEvents = projectEventsForViewer(events, membership.playerId);
        try {
          subscriber({
            room: roomView,
            ...(match === undefined ? {} : { match }),
            events: projectedEvents,
          });
        } catch {
          // A disconnected subscriber does not affect the committed match.
        }
      }
    }

    if (room.status === "PLAYING" && stored !== undefined) {
      this.triggerBots(roomCode, room);
    }
  }

  private triggerBots(roomCode: string, room: RoomRecord): void {
    const stored = room.matchId === undefined ? undefined : this.ports.matches.get(room.matchId);
    if (stored === undefined || stored.state.phase.kind === "FINISHED") return;

    const decisionPlayerId = botDecisionPlayerId(stored.state);
    if (decisionPlayerId === undefined) return;

    const botMember = room.members.find(
      (member) => member.playerId === decisionPlayerId && member.isBot,
    );
    if (botMember === undefined) return;

    const difficulty: BotDifficulty = botMember.botDifficulty ?? "MEDIUM";
    let delay = botDelayMs(difficulty);

    if (stored.deadline?.deadlineAt !== undefined) {
      const now = this.ports.clock.now();
      const remainingTime = stored.deadline.deadlineAt - now;
      const buffer = 400;
      const maxAllowedDelay = Math.max(0, remainingTime - buffer);
      delay = Math.min(delay, maxAllowedDelay);
    }

    process.stdout.write(
      `Bot ${botMember.displayName} (${decisionPlayerId}) [${difficulty}] thinking for ${delay.toFixed(0)}ms\n`,
    );
    setTimeout(() => {
      void this.botMove(roomCode, decisionPlayerId, difficulty);
    }, delay);
  }

  private async botMove(
    roomCode: string,
    botPlayerId: PlayerId,
    difficulty: BotDifficulty,
  ): Promise<void> {
    await this.enqueue(roomCode, () => {
      const room = this.ports.rooms.getByCode(roomCode);
      if (room === undefined || room.status !== "PLAYING" || room.matchId === undefined) return;
      const stored = this.ports.matches.get(room.matchId);
      if (stored === undefined || stored.state.phase.kind === "FINISHED") return;
      if (botDecisionPlayerId(stored.state) !== botPlayerId) return;

      const legal = legalIntentsFor(stored.state, botPlayerId);
      if (legal.length === 0) {
        process.stdout.write(`Bot ${botPlayerId} has no legal moves\n`);
        return;
      }

      const context = buildBotDecisionContext(stored.state, botPlayerId);
      if (context === undefined) return;
      const intent = selectBotIntent(difficulty, context, legal);
      if (intent === undefined) {
        process.stdout.write(`Bot ${botPlayerId} failed to select intent\n`);
        return;
      }

      process.stdout.write(
        `Bot ${botPlayerId} [${difficulty}] submitting intent: ${intent.type}\n`,
      );

      const input: SubmitIntentInput = {
        roomCode,
        credential: `bot:${botPlayerId}`,
        commandId: `bot:${room.matchId}:${stored.state.revision}:${Date.now()}`,
        expectedRevision: stored.state.revision,
        phaseToken: stored.state.phase.phaseToken,
        matchId: room.matchId,
        intent,
      };

      try {
        const { nextRoom, updated, events } = this.matchCoordinator.submitIntent(
          room,
          { token: input.credential, roomCode, playerId: botPlayerId },
          input,
        );

        if (updated !== undefined) {
          this.matchCoordinator.schedule(nextRoom, updated, (code, id, token) => {
            void this.handleExpire(code, id, token);
          });
        }
        this.notify(roomCode, events, nextRoom);
      } catch (err) {
        process.stdout.write(
          `Bot ${botPlayerId} submitIntent error: ${
            err instanceof Error ? err.message : String(err)
          }\n`,
        );
      }
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
