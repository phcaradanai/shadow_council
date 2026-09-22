import type { WirePlayerView } from "@shadow-council/protocol";
import {
  type InfluenceSnapshot,
  matchStatsTracker,
  getPlayerColor,
} from "../presentation/match-stats.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const chartSvg = (
  snapshots: readonly InfluenceSnapshot[],
  players: readonly WirePlayerView[],
  viewerId: string,
): string => {
  const width = 760;
  const height = 250;
  const padX = 38;
  const padY = 24;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;
  const points = snapshots.length > 0 ? snapshots : [{
    revision: 0,
    round: 1,
    step: 0,
    label: "Start",
    phaseKind: "ACTIVE_TURN",
    timestamp: 0,
    influences: Object.fromEntries(players.map((player) => [player.playerId, player.influence])),
    powers: Object.fromEntries(players.map((player) => [player.playerId, player.power ?? null])),
    eliminated: Object.fromEntries(players.map((player) => [player.playerId, player.eliminated])),
  }];

  const x = (index: number): number =>
    points.length <= 1 ? padX : padX + (index / (points.length - 1)) * plotW;
  const y = (value: number): number => padY + ((3 - value) / 3) * plotH;

  const grid = [0, 1, 2, 3]
    .map((value) => {
      const py = y(value);
      return `
        <line x1="${padX}" y1="${py}" x2="${width - padX}" y2="${py}" class="stats-svg__grid" />
        <text x="${padX - 12}" y="${py + 4}" text-anchor="end" class="stats-svg__axis">${value}</text>
      `;
    })
    .join("");

  const series = players
    .map((player) => {
      const color = getPlayerColor(player.playerId, viewerId, players);
      const polyline = points
        .map((point, index) => `${x(index)},${y(point.influences[player.playerId] ?? 0)}`)
        .join(" ");
      const dots = points
        .map((point, index) => {
          const value = point.influences[player.playerId] ?? 0;
          return `<circle cx="${x(index)}" cy="${y(value)}" r="3.5" fill="${color}" />`;
        })
        .join("");
      return `
        <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke" />
        ${dots}
      `;
    })
    .join("");

  const labels = points
    .map(
      (point, index) =>
        `<text x="${x(index)}" y="${height - 4}" text-anchor="middle" class="stats-svg__axis">${escapeHtml(point.label)}</text>`,
    )
    .join("");

  return `
    <svg class="stats-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Influence trajectory">
      ${grid}
      ${series}
      ${labels}
    </svg>
  `;
};

export function mountStatsDashboard(
  container: HTMLElement,
  snapshots: readonly InfluenceSnapshot[],
  players: readonly WirePlayerView[],
  viewerId: string,
  winnerId?: string,
  _inGame = false,
): () => void {
  const summaries = matchStatsTracker.getPlayerSummaries(players, viewerId, winnerId);

  container.innerHTML = `
    <section class="stats-dashboard stats-dashboard--native">
      <div class="stats-dashboard__header">
        <div>
          <h3 class="stats-dashboard__title">📊 Match Analytics</h3>
          <p class="stats-chart-caption">Influence trajectory and bluff/defense decisions from this match.</p>
        </div>
      </div>

      <div class="stats-dashboard__chart-wrap">
        ${chartSvg(snapshots, players, viewerId)}
        <div class="stats-native-legend">
          ${players
            .map((player) => {
              const color = getPlayerColor(player.playerId, viewerId, players);
              return `
                <span class="stats-native-legend__item">
                  <span class="stats-native-legend__dot" style="background:${color}"></span>
                  ${escapeHtml(player.displayName)}${player.playerId === viewerId ? " (You)" : ""}
                </span>
              `;
            })
            .join("")}
        </div>
      </div>

      <div class="stats-dashboard__performance-grid">
        ${summaries
          .map(
            (summary) => `
              <article
                class="stats-player-card ${summary.isWinner ? "stats-player-card--winner" : ""} ${summary.isViewer ? "stats-player-card--viewer" : ""}"
                style="border-left-color:${summary.color}"
              >
                <div class="stats-player-card__header">
                  <div class="stats-player-card__title">
                    <span class="stats-player-card__avatar">${summary.isWinner ? "🏆" : summary.eliminated ? "💀" : "👤"}</span>
                    <div>
                      <h4 class="stats-player-card__name">${escapeHtml(summary.displayName)}${summary.isViewer ? ' <span class="badge badge--self">You</span>' : ""}</h4>
                      <span class="stats-player-card__tag">${escapeHtml(summary.tag)}</span>
                    </div>
                  </div>
                  <div class="stats-player-card__influence-badge">
                    <span>Influence</span>
                    <strong>${summary.finalInfluence}/3</strong>
                  </div>
                </div>

                <div class="stats-metrics-grid">
                  <div class="stats-metric-item"><span>Final Power</span><strong>${summary.finalPower === undefined ? "Hidden" : `${summary.finalPower}/3`}</strong></div>
                  <div class="stats-metric-item"><span>Strikes</span><strong>⚔️ ${summary.strikesDealt}</strong></div>
                  <div class="stats-metric-item"><span>Bluffs Worked</span><strong>🎭 ${summary.bluffsSucceeded}/${summary.bluffsDeclared}</strong></div>
                  <div class="stats-metric-item"><span>Challenges Won</span><strong>👁️ ${summary.challengesWon}/${summary.challengesMade}</strong></div>
                  <div class="stats-metric-item"><span>Hybrid Defense</span><strong>🛡️👁️ ${summary.hybridDefenses}</strong></div>
                  <div class="stats-metric-item"><span>Yields</span><strong>🏳️ ${summary.yields}</strong></div>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;

  return () => {
    container.replaceChildren();
  };
}
