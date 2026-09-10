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
  funding: 0 | 1,
): Promise<void> => {
  await page.waitForSelector("#strike-form");
  const strikeBtn = page.locator("#btn-strike");

  // Verify Declare Strike is disabled before deliberate selection
  await expect(strikeBtn).toBeDisabled();

  // Select target
  await page.locator("#strike-target").selectOption(targetId);

  // Still disabled if no funding selected
  const hasFundingChecked = await page.evaluate(() => {
    return document.querySelector('input[name="funding"]:checked') !== null;
  });
  if (!hasFundingChecked) {
    await expect(strikeBtn).toBeDisabled();
  }

  // Explicitly select funding
  await page.locator(`input[name="funding"][value="${funding}"]`).check();

  // Now enabled
  await expect(strikeBtn).toBeEnabled();
  await strikeBtn.click();
};

export const reactToStrike = async (
  page: Page,
  choice: "guard" | "challenge" | "yield",
): Promise<void> => {
  const btn = page.locator(`.reaction-btn[data-choice="${choice}"]`);
  await expect(btn).toBeVisible();
  await expect(btn).toBeEnabled();
  await btn.click();
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
