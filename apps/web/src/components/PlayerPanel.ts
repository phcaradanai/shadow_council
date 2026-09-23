import type { WireMatchView, WirePlayerView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const renderInfluencePips = (influence: number): string =>
  Array.from({ length: 3 }, (_, index) =>
    index < influence
      ? '<span class="pip pip--influence" aria-hidden="true">◆</span>'
      : '<span class="pip pip--empty" aria-hidden="true">◇</span>',
  ).join("");

const renderPowerPips = (power: number): string =>
  Array.from({ length: 3 }, (_, index) =>
    index < power
      ? '<span class="pip pip--power" aria-hidden="true">⚡</span>'
      : '<span class="pip pip--empty" aria-hidden="true">○</span>',
  ).join("");

const visualSeatOrder = (
  players: readonly WirePlayerView[],
  viewerId: string,
): readonly WirePlayerView[] => {
  const viewerIndex = players.findIndex((player) => player.playerId === viewerId);
  if (viewerIndex < 0) return players;

  const opponents = [...players.slice(viewerIndex + 1), ...players.slice(0, viewerIndex)];
  return [...opponents, players[viewerIndex]!];
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

  const statusBadges = [
    isSelf ? `<span class="badge badge--self" data-badge="self">${t("common.you")}</span>` : "",
    isActive
      ? `<span class="badge badge--active" data-badge="active">${t("player.badgeActive")}</span>`
      : "",
    isTarget
      ? `<span class="badge badge--target" data-badge="target">${t("player.badgeTarget")}</span>`
      : "",
    isOffline
      ? `<span class="badge badge--offline" data-badge="offline">${t("common.offline")}</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const initial = player.displayName.trim().charAt(0).toUpperCase() || "C";
  const schemeBadge = player.hasScheme
    ? `<span class="seat-scheme" title="${t("player.schemeHidden")}">♟</span>`
    : "";

  return `
    <article
      class="${classes}"
      id="player-${escapeHtml(player.playerId)}"
      data-seat-role="${isSelf ? "self" : "opponent"}"
      ${isSelectableTarget ? `data-targetable="true" data-player-id="${escapeHtml(player.playerId)}" role="button" tabindex="0"` : `tabindex="0"`}
      aria-label="Player ${escapeHtml(player.displayName)}${isSelectedTarget ? ` (${t("player.selectedTarget")})` : ""}"
    >
      <div class="seat-target-ring" aria-hidden="true"></div>
      <div class="council-seat__sigil" aria-hidden="true">
        <span class="council-seat__initial">${escapeHtml(initial)}</span>
        ${schemeBadge}
        ${isSelectedTarget ? '<span class="council-seat__target-crosshair">⌖</span>' : ""}
      </div>

      <div class="council-seat__body">
        <div class="seat-identity">
          <h3 class="player-card__name">${escapeHtml(player.displayName)}</h3>
          <div class="player-card__badges">${statusBadges}</div>
        </div>

        <div class="player-card__stats seat-resources">
          <div class="stat-row seat-resource" data-stat="influence">
            <span class="stat-label" aria-hidden="true">◆</span>
            <span class="stat-value" aria-label="${t("player.influenceAria", { current: player.influence, max: 3 })}">
              ${renderInfluencePips(player.influence)}
              <span class="stat-num">(${player.influence}/3)</span>
            </span>
          </div>
          <div class="stat-row seat-resource seat-resource--power" data-stat="power">
            <span class="stat-label" aria-hidden="true">⚡</span>
            ${
              player.power !== undefined
                ? `<span class="stat-value" aria-label="${t("player.powerAria", { current: player.power, max: 3 })}">
                    ${renderPowerPips(player.power)}
                    <span class="stat-num">(${player.power}/3)</span>
                    <span class="stat-note">${t("player.powerPrivate")}</span>
                  </span>`
                : `<span class="stat-value stat-value--private" aria-label="${t("player.powerUnknownAria")}">
                    <span class="power-hidden">🔒 ?</span>
                  </span>`
            }
          </div>
        </div>

        ${
          isSelf && player.hasScheme && player.activeScheme
            ? `<div class="seat-secret">${player.activeScheme === "ambush" ? t("player.schemeAmbush") : t("player.schemeBulwark")}</div>`
            : ""
        }
      </div>

      ${isSelectableTarget && !isSelectedTarget ? `<div class="council-seat__prompt" aria-hidden="true">⌖</div>` : ""}
    </article>
  `;
};

export const renderPlayerGrid = (
  match: WireMatchView,
  viewerId: string,
  selectedTargetId?: string,
): string => {
  const orderedPlayers = visualSeatOrder(match.players, viewerId);
  const opponents = Math.max(0, orderedPlayers.length - 1);

  return `
    <section
      class="players-section council-table council-stage"
      aria-label="Council Chamber Table"
      data-player-count="${match.players.length}"
      data-opponent-count="${opponents}"
    >
      <div class="council-table__arena">
        <div class="council-table__surface" aria-hidden="true">
          <div class="council-table__crest">
            <span class="council-table__crest-mark">SC</span>
            <span class="council-table__crest-ring"></span>
          </div>
        </div>

        <div class="players-grid council-table__seats">
          ${orderedPlayers.map((player) => renderPlayerCard(player, match, viewerId, selectedTargetId)).join("")}
        </div>
      </div>
    </section>
  `;
};
