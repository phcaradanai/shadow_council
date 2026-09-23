import type { WireDomainEvent, WireMatchView } from "@shadow-council/protocol";
import { sounds } from "./sound.js";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

interface Point {
  readonly x: number;
  readonly y: number;
}

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const eventNumber = (event: WireDomainEvent | undefined, key: string): number => {
  const value = event?.[key];
  return typeof value === "number" ? value : 0;
};

const eventKey = (event: WireDomainEvent | undefined): string | undefined => {
  if (!event) return undefined;
  if (typeof event.revision === "number" && typeof event.ordinal === "number") {
    return `${event.type}:${event.revision}:${event.ordinal}`;
  }
  return JSON.stringify(event);
};

let lastRevealKey: string | undefined;
let lastReactionKey: string | undefined;
let lastTurnKey: string | undefined;

const centerOf = (element: HTMLElement, surface: SVGSVGElement): Point => {
  const rect = element.getBoundingClientRect();
  const surfaceRect = surface.getBoundingClientRect();
  return {
    x: rect.left - surfaceRect.left + rect.width / 2,
    y: rect.top - surfaceRect.top + rect.height / 2,
  };
};

const drawAttackLink = (
  root: HTMLElement,
  attackerId: string,
  targetId: string,
  threat: number,
  preview = false,
): (() => void) => {
  const svg = root.querySelector<SVGSVGElement>(".chamber-vfx__connections");
  const attacker = root.querySelector<HTMLElement>(`#player-${CSS.escape(attackerId)}`);
  const target = root.querySelector<HTMLElement>(`#player-${CSS.escape(targetId)}`);
  if (!svg || !attacker || !target) return () => {};

  const render = () => {
    const bounds = svg.getBoundingClientRect();
    const from = centerOf(attacker, svg);
    const to = centerOf(target, svg);
    svg.setAttribute("viewBox", `0 0 ${Math.max(1, bounds.width)} ${Math.max(1, bounds.height)}`);
    svg.innerHTML = `
      <defs>
        <filter id="attack-glow">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <line
        class="game-vfx__attack-line game-vfx__attack-line--threat-${Math.min(3, Math.max(1, threat))} ${preview ? "game-vfx__attack-line--preview" : ""}"
        x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"
        filter="url(#attack-glow)"
      />
      <circle class="game-vfx__attack-pulse ${preview ? "game-vfx__attack-pulse--preview" : ""}" cx="${to.x}" cy="${to.y}" r="24" />
    `;
  };

  render();
  window.addEventListener("resize", render);
  return () => {
    window.removeEventListener("resize", render);
    svg.replaceChildren();
  };
};

const spawnParticles = (
  layer: HTMLElement,
  tone: "danger" | "success" | "mystery",
  count = 14,
): void => {
  if (prefersReducedMotion()) return;
  const burst = document.createElement("div");
  burst.className = `vfx-burst vfx-burst--${tone}`;

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.className = "vfx-particle";
    const angle = (Math.PI * 2 * index) / count;
    const distance = 55 + (index % 4) * 18;
    particle.style.setProperty("--vx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--vy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--delay", `${(index % 5) * 18}ms`);
    burst.append(particle);
  }

  layer.append(burst);
  window.setTimeout(() => burst.remove(), 900);
};

const triggerRevealEffects = (
  root: HTMLElement,
  layer: HTMLElement,
  crestStage: HTMLElement | null,
  events: readonly WireDomainEvent[],
): void => {
  const revealed = [...events].reverse().find((event) => event.type === "ActionRevealed");
  const resolved = [...events].reverse().find((event) => event.type === "AttackResolved");
  if (!revealed || !resolved) return;

  const key = eventKey(resolved);
  if (key === undefined || key === lastRevealKey) return;
  lastRevealKey = key;

  const attackerLoss = eventNumber(resolved, "attackerInfluenceLoss");
  const targetLoss = eventNumber(resolved, "targetInfluenceLoss");
  const totalLoss = attackerLoss + targetLoss;
  const genuine = revealed.genuine === true;
  const tone = totalLoss > 0 ? "danger" : genuine ? "success" : "mystery";

  root.classList.add("vfx-reveal-flash");
  if (totalLoss > 0 && !prefersReducedMotion()) root.classList.add("vfx-screen-shake");
  spawnParticles(layer, tone, totalLoss > 0 ? 18 : 12);

  if (crestStage) {
    crestStage.classList.add("crest-content--revealing");
    window.setTimeout(() => crestStage.classList.remove("crest-content--revealing"), 1000);
  }

  const attackerEl = root.querySelector<HTMLElement>(
    `#player-${CSS.escape(String(revealed.attackerId))}`,
  );
  const targetEl = root.querySelector<HTMLElement>(
    `#player-${CSS.escape(String(revealed.targetId))}`,
  );
  if (attackerEl) {
    attackerEl.classList.add("seat--revealed");
    window.setTimeout(() => attackerEl.classList.remove("seat--revealed"), 600);
  }
  if (targetEl && targetLoss > 0) {
    targetEl.classList.add("seat--damaged");
    window.setTimeout(() => targetEl.classList.remove("seat--damaged"), 700);
  }

  sounds.reveal();
  if (events.some((event) => event.type === "PlayerEliminated")) sounds.elimination();

  window.setTimeout(() => {
    root.classList.remove("vfx-reveal-flash", "vfx-screen-shake");
  }, 650);
};

const vibrate = (pattern: number | number[]): void => {
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Optional haptics only.
  }
};

export const attachGameEffects = (
  container: HTMLElement,
  match: WireMatchView,
  viewerId: string,
  events: readonly WireDomainEvent[],
): (() => void) => {
  const root = container.querySelector<HTMLElement>(".chamber");
  const layer = container.querySelector<HTMLElement>(".chamber-vfx");
  if (!root || !layer) return () => {};
  const crestStage = root.querySelector<HTMLElement>("#crest-stage");

  const cleanup: Array<() => void> = [];
  const phase = match.phase;
  const updateCrestStage = () => {
    if (!crestStage) return;
    const phase = match.phase;

    if (phase.kind === "ACTIVE_TURN") {
      const actorName =
        match.players.find((player) => player.playerId === phase.activePlayerId)?.displayName ?? "";
      const isActor = phase.activePlayerId === viewerId;
      crestStage.innerHTML = isActor
        ? `<div class="crest-content crest-content--ready"><span class="crest-badge">${t("game.turnYourTurn")}</span></div>`
        : `<div class="crest-content crest-content--waiting"><span class="crest-name">${escapeHtml(actorName)}</span><span class="crest-label">${t("game.turnWaitingFor", { player: "" }).replace("...", "").trim()}</span></div>`;
    } else if (phase.kind === "REACTION") {
      const threat = phase.threat ?? 1;
      crestStage.innerHTML = `
        <div class="crest-content crest-content--clash">
          <div class="crest-threat-display">
            <svg class="sc-icon crest-icon" aria-hidden="true"><use href="#icon-threat"/></svg>
            <span class="crest-threat-num">${threat}</span>
          </div>
          <span class="crest-label">Threat</span>
        </div>`;
    } else if (phase.kind === "FINISHED") {
      const winnerName =
        match.players.find((player) => player.playerId === phase.winnerId)?.displayName ?? "";
      crestStage.innerHTML = `
        <div class="crest-content crest-content--victory">
          <svg class="sc-icon crest-icon" aria-hidden="true"><use href="#icon-crown"/></svg>
          <span class="crest-name">${escapeHtml(winnerName)}</span>
        </div>`;
    } else {
      crestStage.innerHTML = "";
    }
  };
  updateCrestStage();
  cleanup.push(() => {
    if (crestStage) crestStage.innerHTML = "";
  });

  root.dataset.phase = phase.kind.toLowerCase();
  root.classList.toggle(
    "chamber--actor",
    phase.kind === "ACTIVE_TURN" && phase.activePlayerId === viewerId,
  );
  root.classList.toggle(
    "chamber--target",
    phase.kind === "REACTION" && phase.targetId === viewerId,
  );
  root.classList.toggle(
    "chamber--attacker",
    phase.kind === "REACTION" && phase.attackerId === viewerId,
  );
  match.players.forEach((player) => {
    if (!player.eliminated) return;
    const seat = root.querySelector<HTMLElement>(`#player-${CSS.escape(player.playerId)}`);
    if (!seat || seat.dataset.eliminatedAnimDone) return;

    seat.dataset.eliminatedAnimDone = "1";
    const wasEliminated = events.some(
      (event) => event.type === "PlayerEliminated" && event.playerId === player.playerId,
    );
    if (wasEliminated) {
      seat.classList.add("seat--eliminating");
      window.setTimeout(() => seat.classList.remove("seat--eliminating"), 1200);
    }
  });

  if (phase.kind === "ACTIVE_TURN" && phase.activePlayerId === viewerId) {
    const turnKey = `${match.matchId}:${match.revision}:${viewerId}`;
    if (turnKey !== lastTurnKey) {
      lastTurnKey = turnKey;
      root.classList.add("chamber-turn-enter");
      sounds.turn();
      window.setTimeout(() => root.classList.remove("chamber-turn-enter"), 520);
    }
  }

  if (phase.kind === "REACTION") {
    cleanup.push(drawAttackLink(root, phase.attackerId, phase.targetId, phase.threat ?? 1));

    const pressure = document.createElement("div");
    pressure.className = "vfx-threat-pressure";
    pressure.innerHTML = `
      <span aria-hidden="true">⚔</span>
      <strong>${phase.threat ?? 1}</strong>
    `;
    layer.append(pressure);
    cleanup.push(() => pressure.remove());
    const reactionKey = `${match.revision}:${phase.attackerId}:${phase.targetId}`;
    if (phase.targetId === viewerId && reactionKey !== lastReactionKey) {
      lastReactionKey = reactionKey;
      root.classList.add("chamber-under-attack");
      vibrate([28, 24, 42]);
      window.setTimeout(() => root.classList.remove("chamber-under-attack"), 800);
    }
  }

  triggerRevealEffects(root, layer, crestStage, events);

  let previewLinkCleanup: (() => void) | undefined;
  const onTargetPreview = (event: Event) => {
    if (phase.kind !== "ACTIVE_TURN" || phase.activePlayerId !== viewerId) return;
    const detail = (event as CustomEvent<{ targetId?: string; threat?: number }>).detail;
    previewLinkCleanup?.();
    previewLinkCleanup = undefined;
    if (!detail?.targetId) return;
    previewLinkCleanup = drawAttackLink(root, viewerId, detail.targetId, detail.threat ?? 1, true);
  };
  root.addEventListener("sc:target-preview", onTargetPreview as EventListener);
  cleanup.push(() => {
    root.removeEventListener("sc:target-preview", onTargetPreview as EventListener);
    previewLinkCleanup?.();
  });

  let defenseAura: HTMLElement | undefined;
  const renderDefenseAura = (guard: number, challenge: boolean) => {
    defenseAura?.remove();
    defenseAura = undefined;
    if (phase.kind !== "REACTION" || phase.targetId !== viewerId) return;

    const seat = root.querySelector<HTMLElement>(`#player-${CSS.escape(viewerId)}`);
    if (!seat) return;
    const seatRect = seat.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const aura = document.createElement("div");
    aura.className = `vfx-defense-aura ${challenge ? "vfx-defense-aura--challenge" : ""}`;
    aura.dataset.guard = String(guard);
    aura.style.left = `${seatRect.left - layerRect.left + seatRect.width / 2}px`;
    aura.style.top = `${seatRect.top - layerRect.top + seatRect.height / 2}px`;
    aura.innerHTML = `
      <span class="vfx-defense-aura__ring"></span>
      <span class="vfx-defense-aura__ring vfx-defense-aura__ring--two"></span>
      ${challenge ? '<span class="vfx-defense-aura__eye">👁</span>' : ""}
    `;
    layer.append(aura);
    defenseAura = aura;
  };

  const onDefensePreview = (event: Event) => {
    const detail = (event as CustomEvent<{ guard?: number; challenge?: boolean }>).detail;
    renderDefenseAura(detail?.guard ?? 0, detail?.challenge === true);
  };
  root.addEventListener("sc:defense-preview", onDefensePreview as EventListener);
  cleanup.push(() => {
    root.removeEventListener("sc:defense-preview", onDefensePreview as EventListener);
    defenseAura?.remove();
  });

  const onPointerMove = (event: PointerEvent) => {
    if (prefersReducedMotion()) return;
    const rect = root.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
    const y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
    root.style.setProperty("--parallax-x", x.toFixed(3));
    root.style.setProperty("--parallax-y", y.toFixed(3));
  };
  const onPointerLeave = () => {
    root.style.setProperty("--parallax-x", "0");
    root.style.setProperty("--parallax-y", "0");
  };
  root.addEventListener("pointermove", onPointerMove, { passive: true });
  root.addEventListener("pointerleave", onPointerLeave);
  cleanup.push(() => {
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerleave", onPointerLeave);
  });

  root.querySelectorAll<HTMLElement>(".council-seat").forEach((seat) => {
    const tilt = (event: PointerEvent) => {
      if (prefersReducedMotion()) return;
      const rect = seat.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      const y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      seat.style.setProperty("--seat-tilt-x", `${(-y * 2.3).toFixed(2)}deg`);
      seat.style.setProperty("--seat-tilt-y", `${(x * 3).toFixed(2)}deg`);
    };
    const reset = () => {
      seat.style.setProperty("--seat-tilt-x", "0deg");
      seat.style.setProperty("--seat-tilt-y", "0deg");
    };
    seat.addEventListener("pointermove", tilt, { passive: true });
    seat.addEventListener("pointerleave", reset);
    cleanup.push(() => {
      seat.removeEventListener("pointermove", tilt);
      seat.removeEventListener("pointerleave", reset);
    });
  });

  return () => cleanup.forEach((fn) => fn());
};
