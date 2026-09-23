import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export interface PlayerSession {
  context: BrowserContext;
  page: Page;
  name: string;
}

export const createPlayer = async (
  browser: Browser,
  name: string,
  locale: "th" | "en" = "en",
): Promise<PlayerSession> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript((loc) => {
    window.localStorage.setItem("shadow-council.locale", loc);
  }, locale);
  await page.goto("/");
  await page.waitForSelector("#app");
  return { context, page, name };
};

export const createRoom = async (host: PlayerSession): Promise<string> => {
  await host.page.fill("#create-name", host.name);
  await host.page.click('#form-create button[type="submit"]');
  await host.page.waitForSelector(".screen--lobby");
  const roomCodeElement = host.page.locator("#room-code-text");
  await expect(roomCodeElement).toBeVisible();
  const roomCode = (await roomCodeElement.textContent())?.trim() ?? "";
  expect(roomCode.length).toBeGreaterThan(0);
  return roomCode;
};

export const joinRoom = async (player: PlayerSession, roomCode: string): Promise<void> => {
  await player.page.fill("#join-code", roomCode);
  await player.page.fill("#join-name", player.name);
  await player.page.click('#form-join button[type="submit"]');
  await player.page.waitForSelector(".screen--lobby");
  await expect(player.page.locator(`.roster-item:has-text("${player.name}")`)).toBeVisible();
};

export const startMatch = async (host: PlayerSession): Promise<void> => {
  const startBtn = host.page.locator("#btn-start");
  await expect(startBtn).toBeEnabled();
  await startBtn.click();
  await host.page.waitForSelector(".screen--game");
};

export const declareStrike = async (
  page: Page,
  targetId: string,
  force: 0 | 1 | 2 | 3,
  threat?: 1 | 2 | 3,
): Promise<void> => {
  await page.waitForSelector("#strike-form");
  const strikeBtn = page.locator("#btn-strike");
  await expect(strikeBtn).toBeDisabled();

  const declaredThreat = threat ?? ((force === 0 ? 1 : force) as 1 | 2 | 3);

  await page.locator("#strike-target").selectOption(targetId);
  await page
    .locator(`label.threat-seal:has(input[name="threat"][value="${declaredThreat}"])`)
    .click();
  await expect(strikeBtn).toBeDisabled();

  const forceInput = page.locator(`input[name="force"][value="${force}"]`);
  await expect(forceInput).toBeEnabled();
  await page
    .locator(`label.force-stone:has(input[name="force"][value="${force}"])`)
    .click();

  await expect(strikeBtn).toBeEnabled();
  await strikeBtn.click();
};

export const defendStrike = async (
  page: Page,
  plan: { guard: 0 | 1 | 2 | 3; challenge: boolean },
): Promise<void> => {
  await page.waitForSelector("#defense-form");
  await page
    .locator(`label.defense-choice:has(input[name="defenseGuard"][value="${plan.guard}"])`)
    .click();

  const challenge = page.locator("#defense-challenge");
  const isChallengeChecked = await challenge.isChecked();
  if (plan.challenge !== isChallengeChecked) {
    await page.locator("label.challenge-toggle").click();
  }

  const submit = page.locator("#btn-lock-defense");
  await expect(submit).toBeEnabled();
  await submit.click();
};

export const reactToStrike = async (
  page: Page,
  choice: "guard" | "challenge" | "yield",
): Promise<void> => {
  if (choice === "guard") {
    await defendStrike(page, { guard: 1, challenge: false });
  } else if (choice === "challenge") {
    await defendStrike(page, { guard: 0, challenge: true });
  } else {
    await defendStrike(page, { guard: 0, challenge: false });
  }
};

export const getPlayerStat = async (
  page: Page,
  playerId: string,
  stat: "influence" | "power",
): Promise<number> => {
  const card = page.locator(`#player-${playerId}`);
  const statRow = card.locator(`.stat-row[data-stat="${stat}"]`);
  const text = await statRow.locator(".stat-num").textContent();
  const match = text?.match(/\((\d+)\/3\)/);
  if (!match || !match[1]) throw new Error(`Could not parse ${stat} from ${text}`);
  return parseInt(match[1], 10);
};

export const getPlayerIdFromCard = async (page: Page, name: string): Promise<string> => {
  const card = page.locator(`.player-card:has(.player-card__name:text-is("${name}"))`);
  const idAttr = await card.getAttribute("id");
  if (!idAttr || !idAttr.startsWith("player-")) {
    throw new Error(`Player card for ${name} has invalid id: ${idAttr}`);
  }
  return idAttr.replace("player-", "");
};

export const findActivePlayer = async (
  players: PlayerSession[],
): Promise<{ active: PlayerSession; nonActive: PlayerSession[] }> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    for (const player of players) {
      const isTurn = await player.page
        .locator(".turn-banner--your-turn")
        .isVisible()
        .catch(() => false);
      if (isTurn) {
        return {
          active: player,
          nonActive: players.filter((p) => p !== player),
        };
      }
    }
    await players[0].page.waitForTimeout(200);
  }
  throw new Error("Could not find active player with .turn-banner--your-turn");
};

export const configureRoomTurnTimer = async (
  host: PlayerSession,
  enabled: boolean,
  seconds?: number,
): Promise<void> => {
  const toggle = host.page.locator("#setting-timer-toggle");
  const isChecked = await toggle.isChecked();
  if (isChecked !== enabled) {
    await host.page.locator('label[for="setting-timer-toggle"]').click();
  }
  if (enabled && seconds !== undefined) {
    const select = host.page.locator("#setting-duration-select");
    await expect(select).toBeVisible();
    await select.selectOption(String(seconds));
  }
};
