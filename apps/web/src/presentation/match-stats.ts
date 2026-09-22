import type { WireDomainEvent, WireMatchView, WirePlayerView } from "@shadow-council/protocol";

export interface InfluenceSnapshot {
  readonly revision: number;
  readonly round: number;
  readonly step: number;
  readonly label: string;
  readonly phaseKind: string;
  readonly timestamp: number;
  readonly influences: Record<string, number>;
  readonly powers: Record<string, number | null>;
  readonly eliminated: Record<string, boolean>;
}

export interface PlayerStatsSummary {
  readonly playerId: string;
  readonly displayName: string;
  readonly isViewer: boolean;
  readonly isWinner: boolean;
  readonly eliminated: boolean;
  readonly finalInfluence: number;
  readonly peakInfluence: number;
  readonly minInfluence: number;
  readonly finalPower?: number;
  readonly color: string;
  readonly strikesDealt: number;
  readonly strikesReceived: number;
  readonly bluffsDeclared: number;
  readonly bluffsSucceeded: number;
  readonly challengesMade: number;
  readonly challengesWon: number;
  readonly guardsCommitted: number;
  readonly hybridDefenses: number;
  readonly yields: number;
  readonly tag: string;
}

interface CombatCounters {
  strikesDealt: number;
  strikesReceived: number;
  bluffsDeclared: number;
  bluffsSucceeded: number;
  challengesMade: number;
  challengesWon: number;
  guardsCommitted: number;
  hybridDefenses: number;
  yields: number;
}

const emptyCounters = (): CombatCounters => ({
  strikesDealt: 0,
  strikesReceived: 0,
  bluffsDeclared: 0,
  bluffsSucceeded: 0,
  challengesMade: 0,
  challengesWon: 0,
  guardsCommitted: 0,
  hybridDefenses: 0,
  yields: 0,
});

interface DefensePlanLike {
  readonly guard: number;
  readonly challenge: boolean;
}

const toDefensePlan = (value: unknown): DefensePlanLike => {
  if (typeof value === "object" && value !== null) {
    if ("guard" in value && "challenge" in value) {
      return {
        guard: Math.max(0, Math.min(3, Number(value.guard) || 0)),
        challenge: value.challenge === true,
      };
    }
    if ("type" in value && value.type === "guard" && "amount" in value) {
      return {
        guard: Math.max(1, Math.min(3, Number(value.amount) || 1)),
        challenge: false,
      };
    }
  }
  if (value === "challenge") return { guard: 0, challenge: true };
  if (value === "guard") return { guard: 1, challenge: false };
  return { guard: 0, challenge: false };
};

const stringField = (event: WireDomainEvent, key: string): string | undefined =>
  typeof event[key] === "string" ? String(event[key]) : undefined;

const numberField = (event: WireDomainEvent, key: string): number =>
  typeof event[key] === "number" ? Number(event[key]) : 0;

export const PLAYER_COLORS: readonly string[] = [
  "#38bdf8",
  "#f59e0b",
  "#10b981",
  "#a855f7",
  "#f43f5e",
  "#fb923c",
  "#06b6d4",
  "#94a3b8",
];

export const getPlayerColor = (
  playerId: string,
  viewerId: string,
  players: readonly WirePlayerView[],
): string => {
  if (playerId === viewerId) return PLAYER_COLORS[0]!;
  const otherPlayers = players.filter((player) => player.playerId !== viewerId);
  const index = otherPlayers.findIndex((player) => player.playerId === playerId);
  const colorIndex = (index >= 0 ? index + 1 : 1) % PLAYER_COLORS.length;
  return PLAYER_COLORS[colorIndex]!;
};

export class MatchStatsTracker {
  private snapshots: InfluenceSnapshot[] = [];
  private currentMatchId = "";
  private combatByPlayer: Record<string, CombatCounters> = {};
  private processedEventKeys = new Set<string>();

  constructor() {
    this.restoreFromStorage();
  }

  private getStorageKey(matchId: string): string {
    return `shadow-council.stats.${matchId}`;
  }

  private countersFor(playerId: string): CombatCounters {
    const existing = this.combatByPlayer[playerId];
    if (existing) return existing;
    const created = emptyCounters();
    this.combatByPlayer[playerId] = created;
    return created;
  }

  private restoreFromStorage(): void {
    try {
      const activeMatchId = sessionStorage.getItem("shadow-council.activeMatchId");
      if (!activeMatchId) return;
      this.currentMatchId = activeMatchId;
      const raw = sessionStorage.getItem(this.getStorageKey(activeMatchId));
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        snapshots?: InfluenceSnapshot[];
        combatByPlayer?: Record<string, CombatCounters>;
        processedEventKeys?: string[];
        strikesDealt?: Record<string, number>;
        strikesReceived?: Record<string, number>;
      };
      this.snapshots = parsed.snapshots ?? [];
      this.combatByPlayer = parsed.combatByPlayer ?? {};
      this.processedEventKeys = new Set(parsed.processedEventKeys ?? []);

      // Migrate older local snapshots that only tracked strike totals.
      for (const [playerId, count] of Object.entries(parsed.strikesDealt ?? {})) {
        this.countersFor(playerId).strikesDealt = count;
      }
      for (const [playerId, count] of Object.entries(parsed.strikesReceived ?? {})) {
        this.countersFor(playerId).strikesReceived = count;
      }
    } catch {
      // Storage unavailable or stale payload.
    }
  }

  private persistToStorage(): void {
    if (!this.currentMatchId) return;
    try {
      sessionStorage.setItem("shadow-council.activeMatchId", this.currentMatchId);
      sessionStorage.setItem(
        this.getStorageKey(this.currentMatchId),
        JSON.stringify({
          snapshots: this.snapshots,
          combatByPlayer: this.combatByPlayer,
          processedEventKeys: [...this.processedEventKeys],
        }),
      );
    } catch {
      // Storage unavailable.
    }
  }

  reset(matchId?: string): void {
    this.snapshots = [];
    this.combatByPlayer = {};
    this.processedEventKeys.clear();
    this.currentMatchId = matchId ?? "";
    if (matchId) this.persistToStorage();
  }

  private eventKey(event: WireDomainEvent): string {
    if (event.revision !== undefined && event.ordinal !== undefined) {
      return `${event.matchId ?? this.currentMatchId}:${event.revision}:${event.ordinal}`;
    }
    return JSON.stringify(event);
  }

  private recordCombatEvent(event: WireDomainEvent): void {
    if (event.type === "ActionCommitted") {
      const attackerId = stringField(event, "attackerId");
      const targetId = stringField(event, "targetId");
      if (attackerId) this.countersFor(attackerId).strikesDealt += 1;
      if (targetId) this.countersFor(targetId).strikesReceived += 1;
      return;
    }

    if (event.type === "ActionRevealed") {
      const attackerId = stringField(event, "attackerId");
      if (attackerId && event.genuine === false) {
        this.countersFor(attackerId).bluffsDeclared += 1;
      }
      return;
    }

    if (event.type === "BluffSucceeded") {
      const attackerId = stringField(event, "attackerId");
      if (attackerId) this.countersFor(attackerId).bluffsSucceeded += 1;
      return;
    }

    if (event.type === "ReactionCommitted") {
      const targetId = stringField(event, "targetId");
      if (!targetId) return;
      const plan = toDefensePlan(event.choice);
      const counters = this.countersFor(targetId);
      if (plan.challenge) counters.challengesMade += 1;
      if (plan.guard > 0) counters.guardsCommitted += 1;
      if (plan.guard > 0 && plan.challenge) counters.hybridDefenses += 1;
      if (plan.guard === 0 && !plan.challenge) counters.yields += 1;
      return;
    }

    if (event.type === "AttackResolved") {
      const targetId = stringField(event, "targetId");
      if (!targetId) return;
      const plan = toDefensePlan(event.reaction);
      if (plan.challenge && numberField(event, "attackerInfluenceLoss") > 0) {
        this.countersFor(targetId).challengesWon += 1;
      }
    }
  }

  recordMatchState(match: WireMatchView, events: readonly WireDomainEvent[] = []): void {
    if (this.currentMatchId !== match.matchId) {
      this.currentMatchId = match.matchId;
      this.snapshots = [];
      this.combatByPlayer = {};
      this.processedEventKeys.clear();
      this.restoreFromStorage();
    }

    for (const event of events) {
      const key = this.eventKey(event);
      if (this.processedEventKeys.has(key)) continue;
      this.processedEventKeys.add(key);
      this.recordCombatEvent(event);
    }

    const influences: Record<string, number> = {};
    const powers: Record<string, number | null> = {};
    const eliminated: Record<string, boolean> = {};

    for (const player of match.players) {
      influences[player.playerId] = player.influence;
      powers[player.playerId] = player.power ?? null;
      eliminated[player.playerId] = player.eliminated || player.influence <= 0;
    }

    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    if (lastSnapshot?.revision === match.revision) {
      this.persistToStorage();
      return;
    }

    let label = `R${match.round}`;
    if (match.phase.kind === "FINISHED") label = "End";
    else if (match.revision === 0) label = "Start";
    else if (match.phase.kind === "REACTION") label = `R${match.round} Clash`;
    else label = `R${match.round} T${match.revision}`;

    this.snapshots.push({
      revision: match.revision,
      round: match.round,
      step: this.snapshots.length,
      label,
      phaseKind: match.phase.kind,
      timestamp: Date.now(),
      influences,
      powers,
      eliminated,
    });
    this.persistToStorage();
  }

  getSnapshots(): readonly InfluenceSnapshot[] {
    return this.snapshots;
  }

  getPlayerSummaries(
    players: readonly WirePlayerView[],
    viewerId: string,
    winnerId?: string,
  ): readonly PlayerStatsSummary[] {
    return players.map((player) => {
      const isViewer = player.playerId === viewerId;
      const isWinner = player.playerId === winnerId;
      const color = getPlayerColor(player.playerId, viewerId, players);
      const counters = this.combatByPlayer[player.playerId] ?? emptyCounters();

      let peak = player.influence;
      let min = player.influence;
      for (const snapshot of this.snapshots) {
        const influence = snapshot.influences[player.playerId];
        if (influence === undefined) continue;
        peak = Math.max(peak, influence);
        min = Math.min(min, influence);
      }

      let tag = "Participant";
      if (isWinner) tag = peak === 3 && player.influence === 3 ? "Flawless Victor" : "Council Master";
      else if (player.influence <= 0) tag = counters.strikesReceived >= 2 ? "Fierce Target" : "Eliminated";
      else if (player.influence === 1) tag = "Tenacious Survivor";
      else if (player.influence >= 2) tag = "Strong Contender";

      return {
        playerId: player.playerId,
        displayName: player.displayName,
        isViewer,
        isWinner,
        eliminated: player.eliminated || player.influence <= 0,
        finalInfluence: player.influence,
        peakInfluence: peak,
        minInfluence: min,
        ...(player.power !== undefined ? { finalPower: player.power } : {}),
        color,
        ...counters,
        tag,
      };
    });
  }
}

export const matchStatsTracker = new MatchStatsTracker();
