import type { WireDomainEvent, WireMatchView, WirePlayerView } from "@shadow-council/protocol";

export interface InfluenceSnapshot {
  readonly revision: number;
  readonly round: number;
  readonly step: number;
  readonly label: string;
  readonly phaseKind: string;
  readonly timestamp: number;
  readonly influences: Record<string, number>;
  readonly powers: Record<string, number>;
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
  readonly finalPower: number;
  readonly color: string;
  readonly strikesDealt: number;
  readonly strikesReceived: number;
  readonly tag: string;
}

export const PLAYER_COLORS: readonly string[] = [
  "#38bdf8", // Sky blue (Viewer priority)
  "#f59e0b", // Amber / Gold
  "#10b981", // Emerald green
  "#a855f7", // Violet / Purple
  "#f43f5e", // Rose / Crimson
  "#fb923c", // Orange
  "#06b6d4", // Cyan
  "#94a3b8", // Slate
];

export const getPlayerColor = (
  playerId: string,
  viewerId: string,
  players: readonly WirePlayerView[],
): string => {
  if (playerId === viewerId) {
    return PLAYER_COLORS[0]!;
  }
  const otherPlayers = players.filter((p) => p.playerId !== viewerId);
  const index = otherPlayers.findIndex((p) => p.playerId === playerId);
  const colorIndex = (index >= 0 ? index + 1 : 1) % PLAYER_COLORS.length;
  return PLAYER_COLORS[colorIndex]!;
};

export class MatchStatsTracker {
  private snapshots: InfluenceSnapshot[] = [];
  private currentMatchId: string = "";
  private strikesDealtMap: Record<string, number> = {};
  private strikesReceivedMap: Record<string, number> = {};

  constructor() {
    this.restoreFromStorage();
  }

  private getStorageKey(matchId: string): string {
    return `shadow-council.stats.${matchId}`;
  }

  private restoreFromStorage(): void {
    try {
      const activeMatchId = sessionStorage.getItem("shadow-council.activeMatchId");
      if (!activeMatchId) return;
      this.currentMatchId = activeMatchId;
      const raw = sessionStorage.getItem(this.getStorageKey(activeMatchId));
      if (raw) {
        const parsed = JSON.parse(raw) as {
          snapshots: InfluenceSnapshot[];
          strikesDealt: Record<string, number>;
          strikesReceived: Record<string, number>;
        };
        this.snapshots = parsed.snapshots ?? [];
        this.strikesDealtMap = parsed.strikesDealt ?? {};
        this.strikesReceivedMap = parsed.strikesReceived ?? {};
      }
    } catch {
      // Storage unavailable
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
          strikesDealt: this.strikesDealtMap,
          strikesReceived: this.strikesReceivedMap,
        }),
      );
    } catch {
      // Storage unavailable
    }
  }

  reset(matchId?: string): void {
    this.snapshots = [];
    this.strikesDealtMap = {};
    this.strikesReceivedMap = {};
    this.currentMatchId = matchId ?? "";
    if (matchId) {
      this.persistToStorage();
    }
  }

  recordMatchState(match: WireMatchView, events: readonly WireDomainEvent[] = []): void {
    if (this.currentMatchId !== match.matchId) {
      this.currentMatchId = match.matchId;
      this.snapshots = [];
      this.strikesDealtMap = {};
      this.strikesReceivedMap = {};
      this.restoreFromStorage();
    }

    // Process events to track attacks
    for (const evt of events) {
      if (evt.type === "AttackResolved" || evt.type === "ActionCommitted") {
        const attackerId = typeof evt.attackerId === "string" ? evt.attackerId : undefined;
        const targetId = typeof evt.targetId === "string" ? evt.targetId : undefined;
        if (attackerId) {
          this.strikesDealtMap[attackerId] = (this.strikesDealtMap[attackerId] ?? 0) + 1;
        }
        if (targetId) {
          this.strikesReceivedMap[targetId] = (this.strikesReceivedMap[targetId] ?? 0) + 1;
        }
      }
    }

    const influences: Record<string, number> = {};
    const powers: Record<string, number> = {};
    const eliminated: Record<string, boolean> = {};

    for (const p of match.players) {
      influences[p.playerId] = p.influence;
      powers[p.playerId] = p.power ?? 0;
      eliminated[p.playerId] = p.eliminated || p.influence <= 0;
    }

    // Avoid duplicate snapshot for same revision if unchanged
    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    if (lastSnapshot && lastSnapshot.revision === match.revision) {
      return;
    }

    let label = `R${match.round}`;
    if (match.phase.kind === "FINISHED") {
      label = "End";
    } else if (match.revision === 0) {
      label = "Start";
    } else if (match.phase.kind === "REACTION") {
      label = `R${match.round} Clash`;
    } else {
      label = `R${match.round} T${match.revision}`;
    }

    const snapshot: InfluenceSnapshot = {
      revision: match.revision,
      round: match.round,
      step: this.snapshots.length,
      label,
      phaseKind: match.phase.kind,
      timestamp: Date.now(),
      influences,
      powers,
      eliminated,
    };

    this.snapshots.push(snapshot);
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
    return players.map((p) => {
      const isViewer = p.playerId === viewerId;
      const isWinner = p.playerId === winnerId;
      const color = getPlayerColor(p.playerId, viewerId, players);

      let peak = p.influence;
      let min = p.influence;
      for (const s of this.snapshots) {
        const inf = s.influences[p.playerId];
        if (inf !== undefined) {
          if (inf > peak) peak = inf;
          if (inf < min) min = inf;
        }
      }

      const strikesDealt = this.strikesDealtMap[p.playerId] ?? 0;
      const strikesReceived = this.strikesReceivedMap[p.playerId] ?? 0;

      let tag = "Participant";
      if (isWinner) {
        tag = peak === 3 && p.influence === 3 ? "Flawless Victor" : "Council Master";
      } else if (p.influence <= 0) {
        tag = strikesReceived >= 2 ? "Fierce Target" : "Eliminated";
      } else if (p.influence === 1) {
        tag = "Tenacious Survivor";
      } else if (p.influence >= 2) {
        tag = "Strong Contender";
      }

      return {
        playerId: p.playerId,
        displayName: p.displayName,
        isViewer,
        isWinner,
        eliminated: p.eliminated || p.influence <= 0,
        finalInfluence: p.influence,
        peakInfluence: peak,
        minInfluence: min,
        finalPower: p.power ?? 0,
        color,
        strikesDealt,
        strikesReceived,
        tag,
      };
    });
  }
}

export const matchStatsTracker = new MatchStatsTracker();
