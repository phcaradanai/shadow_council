import type { WireMatchView, WirePlayerView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const svgIcon = (id: string): string =>
  `<svg class="sc-icon" aria-hidden="true" focusable="false"><use href="#${id}"/></svg>`;

const renderInfluencePips = (influence: number): string =>
  Array.from(
    { length: 3 },
    (_, index) =>
      `<span class="pip pip--influence ${index < influence ? "pip--filled" : "pip--empty"}" aria-hidden="true">
      ${svgIcon("icon-influence")}
    </span>`,
  ).join("");

const renderPowerPips = (power: number): string =>
  Array.from(
    { length: 3 },
    (_, index) =>
      `<span class="pip pip--power ${index < power ? "pip--filled" : "pip--empty"}" aria-hidden="true">
      ${svgIcon("icon-power")}
    </span>`,
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

const characterVariant = (player: WirePlayerView): number => {
  const seed = `${player.playerId}:${player.displayName}`;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 6;
};

const ARCHETYPES = [
  { key: "shade", hue: 270, mask: true },
  { key: "phantom", hue: 200, mask: false },
  { key: "oracle", hue: 50, mask: false },
  { key: "warden", hue: 120, mask: true },
  { key: "envoy", hue: 20, mask: false },
  { key: "regent", hue: 340, mask: true },
] as const;

const renderPortrait = (player: WirePlayerView): string => {
  const variant = characterVariant(player);
  const archetype = ARCHETYPES[variant]!;
  const initial = player.displayName.trim().charAt(0).toUpperCase() || "C";

  return `
    <div class="portrait portrait--${archetype.key}" data-archetype="${archetype.key}" aria-hidden="true">
      <span class="portrait__ring"></span>
      <span class="portrait__bust"></span>
      <span class="portrait__sigil">${escapeHtml(initial)}</span>
      ${archetype.mask ? '<span class="portrait__mask"></span>' : ""}
    </div>
  `;
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
  const archetype = ARCHETYPES[characterVariant(player)]!;
  const influenceAria = t("player.influenceAria", { current: player.influence, max: 3 });
  const powerKnown = player.power !== undefined;
  const powerAria = powerKnown
    ? t("player.powerAria", { current: player.power!, max: 3 })
    : t("player.powerUnknownAria");

  const classes = [
    "seat",
    "council-seat",
    "player-card",
    isSelf ? "player-card--self" : "",
    isActive ? "seat--active" : "",
    isTarget ? "seat--target" : "",
    isEliminated ? "seat--eliminated" : "",
    isOffline ? "seat--offline" : "",
    isSelectableTarget ? "seat--selectable" : "",
    isSelectedTarget ? "seat--selected-target" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const schemeBadge = player.hasScheme
    ? `<span class="seat__scheme" role="img" aria-label="${escapeHtml(t("player.schemeHidden"))}" title="${escapeHtml(t("player.schemeHidden"))}">${svgIcon("icon-scheme")}</span>`
    : "";
  const selfLabel = isSelf ? `${escapeHtml(t("common.you"))}: ` : "";
  const selectedSuffix = isSelectedTarget ? ` (${escapeHtml(t("player.selectedTarget"))})` : "";
  const schemeText =
    player.activeScheme === "ambush" ? t("player.schemeAmbush") : t("player.schemeBulwark");

  return `
    <article
      class="${classes}"
      id="player-${escapeHtml(player.playerId)}"
      data-seat-role="${isSelf ? "self" : "opponent"}"
      data-archetype="${archetype.key}"
      ${isSelectableTarget ? `data-targetable="true" data-player-id="${escapeHtml(player.playerId)}" role="button" tabindex="0"` : `tabindex="0"`}
      ${isSelectedTarget ? 'aria-selected="true"' : ""}
      aria-label="${selfLabel}${escapeHtml(player.displayName)}${selectedSuffix}"
    >
      <div class="seat__target-ring" aria-hidden="true"></div>

      <div class="seat__portrait-wrap">
        ${renderPortrait(player)}
        ${schemeBadge}
        ${isSelectedTarget ? '<span class="seat__crosshair" aria-hidden="true"></span>' : ""}
      </div>

      <div class="seat__identity">
        <h3 class="seat__name player-card__name">${escapeHtml(player.displayName)}</h3>
      </div>

      <div class="seat__resources" role="status" aria-label="${escapeHtml(`${influenceAria}; ${powerAria}`)}">
        <span class="seat__resource-row seat__resource-row--influence stat-row" data-stat="influence">
          <span class="stat-label sr-only">${t("player.influenceLabel")}</span>
          ${svgIcon("icon-influence")}
          ${renderInfluencePips(player.influence)}
          <span class="stat-num sr-only">(${player.influence}/3)</span>
        </span>
        <span class="seat__resource-row seat__resource-row--power stat-row" data-stat="power">
          <span class="stat-label sr-only">${t("player.powerLabel")}</span>
          ${svgIcon("icon-power")}
          ${
            powerKnown
              ? renderPowerPips(player.power!)
              : `<span class="stat-value--private" aria-label="${escapeHtml(t("player.powerUnknownAria"))}"><span class="power-hidden">🔒 ?</span></span>`
          }
          ${
            isSelf
              ? `<span class="stat-num sr-only">(${player.power ?? 0}/3)</span><span class="stat-note sr-only">${t("player.powerPrivate")}</span>`
              : '<span class="stat-num sr-only">(🔒 ?/3)</span>'
          }
        </span>
      </div>

      ${
        isSelf && player.hasScheme && player.activeScheme
          ? `<div class="seat__scheme-info">${escapeHtml(schemeText)}</div>`
          : ""
      }

      ${isSelectableTarget && !isSelectedTarget ? '<div class="seat__prompt" aria-hidden="true"></div>' : ""}
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
      data-player-count="${match.players.length}"
      data-opponent-count="${opponents}"
    >
      <div class="council-table__arena">
        <div class="council-table__surface">
          <div class="council-table__crest">
            <svg class="crest-seal" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(212,175,55,0.15)" stroke-width="1"/>
              <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(212,175,55,0.08)" stroke-width="1"/>
              <path d="M60 10 L67 35 L95 35 L73 52 L81 78 L60 62 L39 78 L47 52 L25 35 L53 35 Z"
                fill="none" stroke="rgba(212,175,55,0.12)" stroke-width="1" stroke-linejoin="round"/>
            </svg>
            <div class="crest-action-stage" id="crest-stage" aria-live="polite"></div>
          </div>
        </div>

        <div class="players-grid council-table__seats">
          ${orderedPlayers.map((player) => renderPlayerCard(player, match, viewerId, selectedTargetId)).join("")}
        </div>
      </div>
    </section>
  `;
};
