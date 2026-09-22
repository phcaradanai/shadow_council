import {
  legalIntentsFor,
  type LegalIntentDescription,
  type MatchId,
  type MatchState,
  type PlayerId,
} from "@shadow-council/domain";
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
  type SubmittedIntent,
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
            : projectMatchView(room, stored.state, membership.playerId, stored.deadline?.deadlineAt);
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

    const phase = stored.state.phase;
    const activePlayerId = phase.activePlayerId;

    const botMember = room.members.find((m) => m.playerId === activePlayerId && m.isBot);
    if (botMember === undefined) return;

    const difficulty: BotDifficulty = botMember.botDifficulty ?? "MEDIUM";
    let delay = this.calculateBotDelay(difficulty);

    if (stored.deadline?.deadlineAt !== undefined) {
      const now = this.ports.clock.now();
      const remainingTime = stored.deadline.deadlineAt - now;
      const buffer = 400;
      const maxAllowedDelay = Math.max(0, remainingTime - buffer);
      delay = Math.min(delay, maxAllowedDelay);
    }

    process.stdout.write(
      `Bot ${botMember.displayName} (${activePlayerId}) [${difficulty}] thinking for ${delay.toFixed(0)}ms\n`,
    );
    setTimeout(() => {
      void this.botMove(roomCode, activePlayerId, difficulty);
    }, delay);
  }

  private calculateBotDelay(difficulty: BotDifficulty): number {
    switch (difficulty) {
      case "EASY":
        return 1200 + Math.random() * 1000; // 1.2s - 2.2s
      case "HARD":
        return 300 + Math.random() * 500;   // 0.3s - 0.8s
      case "MEDIUM":
      default:
        return 700 + Math.random() * 700;   // 0.7s - 1.4s
    }
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
      if (stored.state.phase.activePlayerId !== botPlayerId) return;

      const legal = legalIntentsFor(stored.state, botPlayerId);
      if (legal.length === 0) {
        process.stdout.write(`Bot ${botPlayerId} has no legal moves\n`);
        return;
      }

      const intent = this.selectBotIntent(difficulty, stored.state, botPlayerId, legal);
      if (intent === undefined) {
        process.stdout.write(`Bot ${botPlayerId} failed to select intent\n`);
        return;
      }

      process.stdout.write(`Bot ${botPlayerId} [${difficulty}] submitting intent: ${intent.type}\n`);

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

  private selectBotIntent(
    difficulty: BotDifficulty,
    state: MatchState,
    botPlayerId: PlayerId,
    legal: readonly LegalIntentDescription[],
  ): SubmittedIntent | undefined {
    if (legal.length === 0) return undefined;

    const strikeOption = legal.find((l) => l.type === "STRIKE") as
      | Extract<LegalIntentDescription, { type: "STRIKE" }>
      | undefined;
    const recoverOption = legal.find((l) => l.type === "RECOVER");
    const schemeOption = legal.find((l) => l.type === "SCHEME") as
      | Extract<LegalIntentDescription, { type: "SCHEME" }>
      | undefined;
    const reactOption = legal.find((l) => l.type === "REACT") as
      | Extract<LegalIntentDescription, { type: "REACT" }>
      | undefined;

    const botState = state.players.find((p) => p.playerId === botPlayerId);
    const botPower = botState?.power ?? 0;

    // --- REACTION PHASE ---
    if (reactOption) {
      const choices = reactOption.choices;
      if (choices.length === 0) return undefined;

      const guardChoices = choices.filter(
        (c) => typeof c === "object" && c.type === "guard",
      );

      if (difficulty === "EASY") {
        const choice = choices[Math.floor(Math.random() * choices.length)]!;
        return { type: "REACT", choice };
      }

      if (difficulty === "MEDIUM") {
        if (guardChoices.length > 0) {
          const roll = Math.random();
          if (roll < 0.65) {
            // Pick a guard amount
            const guardChoice = guardChoices[guardChoices.length - 1]!;
            return { type: "REACT", choice: guardChoice };
          }
          if (roll < 0.9 && choices.includes("challenge")) return { type: "REACT", choice: "challenge" };
          return { type: "REACT", choice: choices.includes("yield") ? "yield" : guardChoices[0]! };
        }
        if (choices.includes("challenge") && Math.random() < 0.6) {
          return { type: "REACT", choice: "challenge" };
        }
        const fallback = choices.includes("yield") ? "yield" : choices[0]!;
        return { type: "REACT", choice: fallback };
      }

      // HARD DIFFICULTY
      if (guardChoices.length > 0) {
        return Math.random() < 0.85
          ? { type: "REACT", choice: guardChoices[guardChoices.length - 1]! }
          : { type: "REACT", choice: choices.includes("challenge") ? "challenge" : guardChoices[0]! };
      }
      if (choices.includes("challenge")) {
        return Math.random() < 0.75
          ? { type: "REACT", choice: "challenge" }
          : { type: "REACT", choice: choices.includes("yield") ? "yield" : "challenge" };
      }
      return { type: "REACT", choice: choices[0]! };
    }

    // --- ACTIVE TURN PHASE ---
    if (difficulty === "EASY") {
      const availableTypes: ("STRIKE" | "RECOVER" | "SCHEME")[] = [];
      if (strikeOption && strikeOption.targetIds.length > 0) availableTypes.push("STRIKE");
      if (recoverOption) availableTypes.push("RECOVER");
      if (schemeOption && schemeOption.schemeTypes.length > 0 && !botState?.activeScheme) {
        availableTypes.push("SCHEME");
      }

      if (availableTypes.length === 0) return undefined;
      const chosenType = availableTypes[Math.floor(Math.random() * availableTypes.length)]!;

      if (chosenType === "RECOVER") return { type: "RECOVER" };
      if (chosenType === "SCHEME") {
        const types = schemeOption!.schemeTypes;
        const schemeType = types[Math.floor(Math.random() * types.length)]!;
        return { type: "SCHEME", schemeType };
      }

      const targetId =
        strikeOption!.targetIds[Math.floor(Math.random() * strikeOption!.targetIds.length)]!;
      const threats = strikeOption!.threats ?? [1, 2, 3];
      const forces = strikeOption!.forces ?? [0];
      const threat = threats[Math.floor(Math.random() * threats.length)]!;
      const force = forces[Math.floor(Math.random() * forces.length)]!;
      return { type: "STRIKE", targetId, threat, force, funding: force };
    }

    if (difficulty === "MEDIUM") {
      // 1. Chance to prepare scheme if unshielded and have power
      if (schemeOption && botPower >= 1 && !botState?.activeScheme && Math.random() < 0.25) {
        return { type: "SCHEME", schemeType: Math.random() < 0.5 ? "ambush" : "bulwark" };
      }

      if (recoverOption) {
        if (botPower === 0 && Math.random() < 0.85) return { type: "RECOVER" };
        if (botPower < 2 && Math.random() < 0.45) return { type: "RECOVER" };
      }

      if (strikeOption && strikeOption.targetIds.length > 0) {
        const opponents = state.players.filter((p) => strikeOption.targetIds.includes(p.playerId));
        opponents.sort((a, b) => b.influence - a.influence);

        const targetId =
          Math.random() < 0.6 && opponents.length > 0
            ? opponents[0]!.playerId
            : strikeOption.targetIds[Math.floor(Math.random() * strikeOption.targetIds.length)]!;

        const threats = strikeOption.threats ?? [1, 2, 3];
        const threat = threats[Math.floor(Math.random() * threats.length)]!;
        const forces = strikeOption.forces ?? [0];
        const force =
          botPower >= threat && Math.random() < 0.55
            ? threat
            : forces[Math.floor(Math.random() * forces.length)]!;

        return { type: "STRIKE", targetId, threat, force, funding: force };
      }

      if (recoverOption) return { type: "RECOVER" };
    }

    // HARD DIFFICULTY: Tactical evaluation
    // 1. Prepare Bulwark if low influence and no scheme
    if (schemeOption && botPower >= 1 && !botState?.activeScheme && (botState?.influence ?? 3) <= 2 && Math.random() < 0.4) {
      return { type: "SCHEME", schemeType: "bulwark" };
    }

    // 2. Check for finisher: opponent at low influence
    if (strikeOption && strikeOption.targetIds.length > 0) {
      const opponents = state.players.filter((p) => strikeOption.targetIds.includes(p.playerId));
      const vulnerable = opponents.find((p) => p.influence === 1);

      if (vulnerable && Math.random() < 0.9) {
        const threat = 1;
        const force = botPower >= 1 ? 1 : 0;
        return { type: "STRIKE", targetId: vulnerable.playerId, threat, force, funding: force };
      }
    }

    // 3. Power restoration if empty
    if (recoverOption) {
      if (botPower === 0 && Math.random() < 0.95) return { type: "RECOVER" };
      if (botPower < 2 && Math.random() < 0.6) return { type: "RECOVER" };
    }

    // 4. Target leader with genuine threat or calculated bluff
    if (strikeOption && strikeOption.targetIds.length > 0) {
      const opponents = state.players.filter((p) => strikeOption.targetIds.includes(p.playerId));
      opponents.sort((a, b) => b.influence - a.influence || b.power - a.power);
      const targetId = opponents[0]!.playerId;

      const threat = (Math.min(2, Math.max(1, botPower)) as 1 | 2);
      const force = botPower >= threat && Math.random() < 0.65 ? threat : 0;
      return { type: "STRIKE", targetId, threat, force, funding: force };
    }

    if (recoverOption) return { type: "RECOVER" };

    return undefined;
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
