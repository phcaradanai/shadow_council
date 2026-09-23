import { t } from "../i18n/index.js";
import { sounds } from "./sound.js";

export type StrikeCommitHandler = (
  targetId: string,
  threat: 1 | 2 | 3,
  force: 0 | 1 | 2 | 3,
) => void;

interface StrikePlan {
  readonly targetId: string;
  readonly targetName: string;
  readonly threat: 1 | 2 | 3;
  readonly force: 0 | 1 | 2 | 3;
}

export const attachStrikePlanner = (
  root: HTMLElement,
  isSubmitting: boolean,
  onStrike: StrikeCommitHandler,
): void => {
  const form = root.querySelector<HTMLFormElement>("#strike-form");
  const targetSelect = root.querySelector<HTMLSelectElement>("#strike-target");
  if (!form || !targetSelect) return;

  const targetCards = root.querySelectorAll<HTMLElement>(".seat[data-targetable='true']");
  const submit = form.querySelector<HTMLButtonElement>("#btn-strike");
  const styleEl = form.querySelector<HTMLElement>("#strike-plan-style");
  const targetEl = form.querySelector<HTMLElement>("#strike-plan-target");
  const threatEl = form.querySelector<HTMLElement>("#strike-plan-threat");
  const forceEl = form.querySelector<HTMLElement>("#strike-plan-force");
  const powerEl = form.querySelector<HTMLElement>("#strike-plan-power");
  const readEl = form.querySelector<HTMLElement>("#strike-plan-read");
  const currentPower = Number(form.dataset.currentPower ?? "0");

  const selectedThreat = (): 1 | 2 | 3 | undefined => {
    const input = form.querySelector<HTMLInputElement>('input[name="threat"]:checked');
    if (!input) return undefined;
    const value = Number(input.value);
    return value >= 1 && value <= 3 ? (value as 1 | 2 | 3) : undefined;
  };

  const selectedForce = (): 0 | 1 | 2 | 3 | undefined => {
    const input = form.querySelector<HTMLInputElement>('input[name="force"]:checked');
    if (!input || input.disabled) return undefined;
    const value = Number(input.value);
    return value >= 0 && value <= 3 ? (value as 0 | 1 | 2 | 3) : undefined;
  };

  const selectedPlan = (): StrikePlan | undefined => {
    const targetId = targetSelect.value;
    const option = targetSelect.selectedOptions[0];
    const threat = selectedThreat();
    const force = selectedForce();
    if (!targetId || !option || threat === undefined || force === undefined || force > threat) {
      return undefined;
    }
    return {
      targetId,
      targetName: option.dataset.name ?? option.textContent?.trim() ?? targetId,
      threat,
      force,
    };
  };

  const syncTargetHighlights = (): void => {
    const selectedId = targetSelect.value;
    targetCards.forEach((card) => {
      const selected = card.dataset.playerId === selectedId;
      card.classList.toggle("seat--selected-target", selected);
      if (selected) card.setAttribute("aria-selected", "true");
      else card.removeAttribute("aria-selected");
    });

    root.querySelector<HTMLElement>(".chamber")?.dispatchEvent(
      new CustomEvent("sc:target-preview", {
        detail: {
          targetId: selectedId || undefined,
          threat: selectedThreat() ?? 1,
        },
      }),
    );
  };

  const syncForceOptions = (): void => {
    const threat = selectedThreat();
    form.querySelectorAll<HTMLInputElement>('input[name="force"]').forEach((input) => {
      const force = Number(input.dataset.force ?? input.value);
      const affordable = input.dataset.affordable !== "0";
      const legal = threat !== undefined && force <= threat;
      input.disabled = isSubmitting || !affordable || !legal;

      const label = input.closest<HTMLLabelElement>(".force-token");
      label?.classList.toggle("force-token--disabled", !affordable || !legal);
      if (input.checked && input.disabled) input.checked = false;
    });
  };

  const renderPlan = (): void => {
    const plan = selectedPlan();
    const targetName =
      targetSelect.value && targetSelect.selectedOptions[0]
        ? (targetSelect.selectedOptions[0]!.dataset.name ??
          targetSelect.selectedOptions[0]!.textContent?.trim())
        : undefined;
    const threat = selectedThreat();
    const force = selectedForce();

    if (targetEl) targetEl.textContent = targetName || "—";
    if (threatEl) threatEl.textContent = threat === undefined ? "—" : String(threat);
    if (forceEl) forceEl.textContent = force === undefined ? "—" : String(force);
    if (powerEl) powerEl.textContent = String(Math.max(0, currentPower - (force ?? 0)));

    if (!plan) {
      if (styleEl) styleEl.textContent = t("action.planAwaiting");
      if (readEl) readEl.textContent = t("action.planHint");
      form.dataset.strikeStyle = "pending";
      if (submit) submit.disabled = true;
      return;
    }

    let style: "pure-bluff" | "partial-bluff" | "fully-backed";
    if (plan.force === 0) style = "pure-bluff";
    else if (plan.force < plan.threat) style = "partial-bluff";
    else style = "fully-backed";

    form.dataset.strikeStyle = style;
    if (styleEl) {
      styleEl.textContent =
        style === "pure-bluff"
          ? t("action.stylePureBluff")
          : style === "partial-bluff"
            ? t("action.stylePartialBluff")
            : t("action.styleFullyBacked");
    }
    if (readEl) {
      readEl.textContent =
        style === "pure-bluff"
          ? t("action.readPureBluff")
          : style === "partial-bluff"
            ? t("action.readPartialBluff", { force: plan.force, threat: plan.threat })
            : t("action.readFullyBacked", { threat: plan.threat });
    }
    if (submit) submit.disabled = isSubmitting;
  };

  targetCards.forEach((card) => {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    const chooseCard = () => {
      const targetId = card.dataset.playerId;
      if (!targetId) return;
      targetSelect.value = targetId;
      syncTargetHighlights();
      renderPlan();
      sounds.targetLock();
    };
    card.addEventListener("click", chooseCard);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        chooseCard();
      }
    });
  });

  targetSelect.addEventListener("change", () => {
    syncTargetHighlights();
    renderPlan();
    sounds.targetLock();
  });

  form.querySelectorAll<HTMLInputElement>('input[name="threat"]').forEach((input) => {
    input.addEventListener("change", () => {
      syncForceOptions();
      renderPlan();
      syncTargetHighlights();
      sounds.click();
    });
  });

  form.querySelectorAll<HTMLInputElement>('input[name="force"]').forEach((input) => {
    input.addEventListener("change", () => {
      renderPlan();
      sounds.click();
    });
  });

  syncTargetHighlights();
  syncForceOptions();
  renderPlan();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const plan = selectedPlan();
    if (!plan) return;
    sounds.threat();
    onStrike(plan.targetId, plan.threat, plan.force);
  });
};
