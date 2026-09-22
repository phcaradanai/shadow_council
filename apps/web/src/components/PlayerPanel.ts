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
        ? '<span class="pip pip--influence" aria-hidden="true">◆</span>'
        : '<span class="pip pip--empty" aria-hidden="true">◇</span>';
  }
  return html;
};

const renderPowerPips = (power: number): string => {
  const max = 3;
  let html = "";
  for (let i = 0; i < max; i++) {
    html +=
      i < power
        ? '<span class="pip pip--power" aria-hidden="true">⚡</span>'
        : '<span class="pip pip--empty" aria-hidden="true">○</span>';
  }
  return html;
};

export const renderPlayerCard = (
  player: WirePlayerView,
  match: WireMatchView,
  viewerId: string,
  selectedTargetId?: string,
): string => {
  const isSelf = player.playerId === viewerId;
  const isTurnActor = match.phase.kind === "ACTIVE_TURN" && match.phase.activePlayerId === viewerId;
  const isActive =
    match.phase.kind === "ACTIVE_TURN"
      ? match.phase.activePlayerId === player.playerId
      : match.phase.kind === "REACTION"
        ? match.phase.attackerId === player.playerId
        : false;
  const isTarget = match.phase.kind === "REACTION" && match.phase.targetId === player.playerId;
  const isEliminated = player.eliminated;
  const isOffline = !player.connected;
  const isSelectableTarget = isTurnActor && !isSelf && !isEliminated;
  const isSelectedTarget = selectedTargetId === player.playerId;

  const classes = [
    "player-card",
    "council-seat",
    isSelf ? "player-card--self" : "",
    isActive ? "player-card--active" : "",
    isTarget ? "player-card--target" : "",
    isEliminated ? "player-card--eliminated" : "",
    isOffline ? "player-card--offline" : "",
    isSelectableTarget ? "player-card--selectable" : "",
    isSelectedTarget ? "player-card--selected-target" : "",
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
      ? `<span class="badge badge--eliminated" data-badge="eliminated">${t("player.badgeEliminated")}</span>`
      : "",
    isOffline
      ? `<span class="badge badge--offline" data-badge="offline">${t("common.offline")}</span>`
      : "",
    player.hasScheme
      ? `<span class="badge badge--scheme bg-indigo-950 text-indigo-300 border border-indigo-700 text-xs px-1.5 py-0.5 rounded font-mono" data-badge="scheme">♟️ ${
          isSelf && player.activeScheme
            ? player.activeScheme === "ambush"
              ? t("player.schemeAmbush")
              : t("player.schemeBulwark")
            : t("player.schemeHidden")
        }</span>`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const initial = player.displayName.trim().charAt(0).toUpperCase() || "C";

  return `
    <article
      class="${classes}"
      id="player-${escapeHtml(player.playerId)}"
      ${isSelectableTarget ? `data-targetable="true" data-player-id="${escapeHtml(player.playerId)}" role="button" tabindex="0"` : `tabindex="0"`}
      aria-label="Player ${escapeHtml(player.displayName)}${isSelectedTarget ? ` (${t("player.selectedTarget")})` : ""}"
    >
      <div class="council-seat__sigil" aria-hidden="true">
        <span class="council-seat__initial">${escapeHtml(initial)}</span>
        ${isSelectedTarget ? '<span class="council-seat__target-crosshair">🎯</span>' : ""}
      </div>

      <div class="council-seat__body">
        <header class="player-card__header">
          <div class="player-card__title-row">
            <h3 class="player-card__name">${escapeHtml(player.displayName)}</h3>
            ${isSelectedTarget ? `<span class="badge badge--target-locked">${t("player.selectedTarget")}</span>` : ""}
          </div>
          <div class="player-card__badges flex flex-wrap gap-1 mt-1">${badges}</div>
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
            ${
              player.power !== undefined
                ? `<span class="stat-value" aria-label="${t("player.powerAria", { current: player.power, max: 3 })}">
              ${renderPowerPips(player.power)} <span class="stat-num">(${player.power}/3)</span> <span class="stat-note">${t("player.powerPrivate")}</span>
            </span>`
                : `<span class="stat-value stat-value--private" aria-label="${t("player.powerUnknownAria")}">
              <span class="power-hidden">🔒 ?</span>
            </span>`
            }
          </div>
        </div>
      </div>

      ${isSelectableTarget && !isSelectedTarget ? `<div class="council-seat__prompt" aria-hidden="true">${t("player.targetPrompt")}</div>` : ""}
    </article>
  `;
};

export const renderPlayerGrid = (
  match: WireMatchView,
  viewerId: string,
  selectedTargetId?: string,
): string => {
  const aliveCount = match.players.filter((p) => !p.eliminated).length;
  return `
    <section class="players-section council-table" aria-label="Council Chamber Table">
      <div class="council-table__header">
        <h2 class="section-title">🏛️ ${t("player.aliveCount", { count: aliveCount })}</h2>
        <span class="council-table__hint">${t("action.targetHint")}</span>
      </div>
      <div class="players-grid council-table__seats">
        ${match.players.map((player) => renderPlayerCard(player, match, viewerId, selectedTargetId)).join("")}
      </div>
    </section>
  `;
};
