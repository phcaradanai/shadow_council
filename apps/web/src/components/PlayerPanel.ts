import type { WireMatchView, WirePlayerView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const renderInfluencePips = (influence: number): string => {
  const max = 3;
  let html = "";
  for (let i = 0; i < max; i++) {
    html +=
      i < influence
        ? '<span class="pip pip--influence">◆</span>'
        : '<span class="pip pip--empty">◇</span>';
  }
  return html;
};

const renderPowerPips = (power: number): string => {
  const max = 3;
  let html = "";
  for (let i = 0; i < max; i++) {
    html +=
      i < power
        ? '<span class="pip pip--power">⚡</span>'
        : '<span class="pip pip--empty">○</span>';
  }
  return html;
};

export const renderPlayerCard = (
  player: WirePlayerView,
  match: WireMatchView,
  viewerId: string,
): string => {
  const isSelf = player.playerId === viewerId;
  const isActive =
    match.phase.kind === "ACTIVE_TURN"
      ? match.phase.activePlayerId === player.playerId
      : match.phase.kind === "REACTION"
        ? match.phase.attackerId === player.playerId
        : false;
  const isTarget = match.phase.kind === "REACTION" && match.phase.targetId === player.playerId;
  const isEliminated = player.eliminated;
  const isOffline = !player.connected;

  const classes = [
    "player-card",
    isSelf ? "player-card--self" : "",
    isActive ? "player-card--active" : "",
    isTarget ? "player-card--target" : "",
    isEliminated ? "player-card--eliminated" : "",
    isOffline ? "player-card--offline" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const badges = [
    isSelf ? `<span class="badge badge--self" data-badge="self">${t("common.you")}</span>` : "",
    isActive
      ? `<span class="badge badge--active" data-badge="active">${t("player.badgeActive")}</span>`
      : "",
    isTarget
      ? `<span class="badge badge--target" data-badge="target">${t("player.badgeTarget")}</span>`
      : "",
    isEliminated
      ? `<span class="badge badge--eliminated" data-badge="eliminated">${t(
          "player.badgeEliminated",
        )}</span>`
      : "",
    isOffline
      ? `<span class="badge badge--offline" data-badge="offline">${t("common.offline")}</span>`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <article class="${classes}" id="player-${escapeHtml(player.playerId)}" tabindex="0" aria-label="Player ${escapeHtml(player.displayName)}">
      <header class="player-card__header">
        <h3 class="player-card__name">${escapeHtml(player.displayName)}</h3>
        <div class="player-card__badges">${badges}</div>
      </header>

      <div class="player-card__stats">
        <div class="stat-row" data-stat="influence">
          <span class="stat-label">${t("player.influenceLabel")}</span>
          <span class="stat-value" aria-label="${t("player.influenceAria", { current: player.influence, max: 3 })}">
            ${renderInfluencePips(player.influence)} <span class="stat-num">(${player.influence}/3)</span>
          </span>
        </div>
        <div class="stat-row" data-stat="power">
          <span class="stat-label">${t("player.powerLabel")}</span>
          <span class="stat-value" aria-label="${t("player.powerAria", { current: player.power, max: 3 })}">
            ${renderPowerPips(player.power)} <span class="stat-num">(${player.power}/3)</span>
          </span>
        </div>
      </div>
    </article>
  `;
};

export const renderPlayerGrid = (match: WireMatchView, viewerId: string): string => {
  return `
    <section class="players-section" aria-label="Player Roster">
      <h2 class="section-title">${t("player.aliveCount", { count: match.players.filter((p) => !p.eliminated).length })}</h2>
      <div class="players-grid">
        ${match.players.map((player) => renderPlayerCard(player, match, viewerId)).join("")}
      </div>
    </section>
  `;
};
