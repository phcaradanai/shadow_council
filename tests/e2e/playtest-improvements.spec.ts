import { test, expect } from "@playwright/test";
import {
  createPlayer,
  createRoom,
  joinRoom,
  startMatch,
  declareStrike,
  reactToStrike,
  configureRoomTurnTimer,
  getPlayerIdFromCard,
  findActivePlayer,
  type PlayerSession,
} from "./helpers.js";

test.describe("Browser E2E: Playtest Improvements (Turn Timer & Private Power)", () => {
  let player1: PlayerSession;
  let player2: PlayerSession;

  test.afterEach(async () => {
    await player1?.context?.close();
    await player2?.context?.close();
  });

  test("Lobby: Host modifies timer toggle & duration; Guest observes live SSE updates; Guest cannot edit", async ({
    browser,
  }) => {
    player1 = await createPlayer(browser, "HostAlice");
    player2 = await createPlayer(browser, "GuestBob");

    const roomCode = await createRoom(player1);
    await joinRoom(player2, roomCode);

    // Initial state: Timer enabled (45s default)
    await expect(player1.page.locator("#setting-timer-toggle")).toBeChecked();
    await expect(player1.page.locator("#timer-status-text")).toContainText("Turn Timer Enabled");
    await expect(player1.page.locator("#setting-duration-select")).toHaveValue("45");

    // Guest sees read-only settings
    await expect(player2.page.locator("#setting-timer-toggle")).not.toBeVisible();
    await expect(player2.page.locator(".settings-card .badge--active")).toHaveText(
      "Turn Timer Enabled",
    );
    await expect(player2.page.locator("#duration-setting-row")).toBeVisible();
    await expect(player2.page.locator("#duration-setting-row .setting-value")).toContainText("45s");
    await expect(player2.page.locator(".settings-hint")).toBeVisible();

    // 1. Host changes duration to 60s
    await player1.page.locator("#setting-duration-select").selectOption("60");

    // Guest receives SSE update in real-time
    await expect(player2.page.locator("#duration-setting-row .setting-value")).toContainText("60s");

    // 2. Host toggles timer OFF
    await player1.page.locator('label[for="setting-timer-toggle"]').click();
    await expect(player1.page.locator("#timer-status-text")).toContainText("No Time Limit");
    await expect(player1.page.locator("#duration-setting-row")).toBeHidden();

    // Guest receives SSE update: Disabled, duration row hidden
    await expect(player2.page.locator(".settings-card .badge--secondary")).toHaveText(
      "No Time Limit",
    );
    await expect(player2.page.locator("#duration-setting-row")).toBeHidden();

    // 3. Host toggles timer back ON
    await player1.page.locator('label[for="setting-timer-toggle"]').click();
    await expect(player1.page.locator("#timer-status-text")).toContainText("Turn Timer Enabled");
    await expect(player1.page.locator("#duration-setting-row")).toBeVisible();

    // Guest receives SSE update: Enabled again
    await expect(player2.page.locator(".settings-card .badge--active")).toHaveText(
      "Turn Timer Enabled",
    );
    await expect(player2.page.locator("#duration-setting-row")).toBeVisible();
  });

  test("Match with Timer Disabled: shows No Time Limit indicator and allows deliberate play", async ({
    browser,
  }) => {
    player1 = await createPlayer(browser, "HostTimer");
    player2 = await createPlayer(browser, "GuestTimer");

    const roomCode = await createRoom(player1);
    await joinRoom(player2, roomCode);

    // Host disables timer before starting
    await configureRoomTurnTimer(player1, false);
    await expect(player2.page.locator(".settings-card .badge--secondary")).toHaveText(
      "No Time Limit",
    );

    await startMatch(player1);
    await player1.page.waitForSelector(".screen--game");
    await player2.page.waitForSelector(".screen--game");

    // Both players see the No Time Limit indicator
    await expect(player1.page.locator(".countdown--no-limit")).toBeVisible();
    await expect(player1.page.locator(".countdown--no-limit")).toContainText("No Time Limit");
    await expect(player2.page.locator(".countdown--no-limit")).toBeVisible();
    await expect(player2.page.locator(".countdown--no-limit")).toContainText("No Time Limit");

    // Gameplay works normally with disabled timer
    const { active, nonActive } = await findActivePlayer([player1, player2]);
    const target = nonActive[0]!;
    const targetId = await getPlayerIdFromCard(active.page, target.name);

    await declareStrike(active.page, targetId, 1);
    await expect(target.page.locator(".reaction-panel")).toBeVisible();
    await expect(target.page.locator(".countdown--no-limit")).toBeVisible();

    await reactToStrike(target.page, "guard");

    // After resolution, new turn still has No Time Limit
    await expect(player1.page.locator(".countdown--no-limit")).toBeVisible();
    await expect(player2.page.locator(".countdown--no-limit")).toBeVisible();
  });

  test("Thai Localization: Lobby settings and No Time Limit indicator render completely in Thai", async ({
    browser,
  }) => {
    player1 = await createPlayer(browser, "เจ้าบ้าน", "th");
    player2 = await createPlayer(browser, "ลูกทีม", "th");

    const roomCode = await createRoom(player1);
    await joinRoom(player2, roomCode);

    // Host sees Thai settings
    await expect(player1.page.locator(".settings-card .card__title")).toContainText(
      "การตั้งค่าการประลอง",
    );
    await expect(player1.page.locator("#timer-status-text")).toContainText("จำกัดเวลาต่อเทิร์น");

    // Host disables timer
    await configureRoomTurnTimer(player1, false);
    await expect(player1.page.locator("#timer-status-text")).toContainText("ไม่จำกัดเวลา");

    // Guest sees Thai disabled badge
    await expect(player2.page.locator(".settings-card .badge--secondary")).toHaveText(
      "ไม่จำกัดเวลา",
    );

    await startMatch(player1);
    await player1.page.waitForSelector(".screen--game");
    await player2.page.waitForSelector(".screen--game");

    // Both see Thai "ไม่จำกัดเวลา"
    await expect(player1.page.locator(".countdown--no-limit")).toContainText("ไม่จำกัดเวลา");
    await expect(player2.page.locator(".countdown--no-limit")).toContainText("ไม่จำกัดเวลา");

    // Player cards show Thai private power badge and hidden opponent power
    const p1SelfCard = player1.page.locator(".player-card--self");
    await expect(p1SelfCard.locator(".stat-note")).toHaveText("(ส่วนตัว)");

    const p1OppCard = player1.page.locator(".player-card:not(.player-card--self)");
    const hiddenValue = p1OppCard.locator(".stat-value--private");
    await expect(hiddenValue).toBeVisible();
    await expect(hiddenValue.locator(".power-hidden")).toHaveText("🔒 ?");
    await expect(hiddenValue).toHaveAttribute("aria-label", "พลังของคู่ต่อสู้ถูกซ่อนไว้");
  });

  test("Rematch Flow preserves configured room settings into new lobby", async ({ browser }) => {
    player1 = await createPlayer(browser, "HostRematch");
    player2 = await createPlayer(browser, "GuestRematch");

    const roomCode = await createRoom(player1);
    await joinRoom(player2, roomCode);

    // Host configures 90s timer
    await configureRoomTurnTimer(player1, true, 90);
    await expect(player2.page.locator("#duration-setting-row .setting-value")).toContainText("90s");

    await startMatch(player1);
    await player1.page.waitForSelector(".screen--game");
    await player2.page.waitForSelector(".screen--game");

    // Pick initial active player as designated loser
    const initial = await findActivePlayer([player1, player2]);
    const designatedLoser = initial.active;
    const designatedWinner = initial.nonActive[0]!;

    const winnerTargetId = await getPlayerIdFromCard(designatedLoser.page, designatedWinner.name);
    const loserTargetId = await getPlayerIdFromCard(designatedWinner.page, designatedLoser.name);

    // Turn 1 (Loser): Loser bluffs, Winner challenges -> Loser drops to 2 Influence
    await declareStrike(designatedLoser.page, winnerTargetId, 0);
    await reactToStrike(designatedWinner.page, "challenge");

    // Turn 2 (Winner): Winner attacks genuine (1 Power), Loser yields -> Loser drops to 1 Influence
    await findActivePlayer([designatedWinner]);
    await declareStrike(designatedWinner.page, loserTargetId, 1);
    await reactToStrike(designatedLoser.page, "yield");

    // Turn 3 (Loser): Loser bluffs, Winner challenges -> Loser drops to 0 Influence (Eliminated!)
    await findActivePlayer([designatedLoser]);
    await declareStrike(designatedLoser.page, winnerTargetId, 0);
    await reactToStrike(designatedWinner.page, "challenge");

    // Both on Result screen
    await player1.page.waitForSelector(".screen--result");
    await player2.page.waitForSelector(".screen--result");

    // Host initiates rematch
    await player1.page.click("#btn-rematch");

    // Both back in Lobby
    await player1.page.waitForSelector(".screen--lobby");
    await player2.page.waitForSelector(".screen--lobby");

    // Verify 90s setting was preserved!
    await expect(player1.page.locator("#setting-timer-toggle")).toBeChecked();
    await expect(player1.page.locator("#setting-duration-select")).toHaveValue("90");
    await expect(player2.page.locator(".settings-card .badge--active")).toHaveText(
      "Turn Timer Enabled",
    );
    await expect(player2.page.locator("#duration-setting-row .setting-value")).toContainText("90s");
  });
});
