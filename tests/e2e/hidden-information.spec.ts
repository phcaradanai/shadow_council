import { test, expect } from "@playwright/test";
import {
  createPlayer,
  createRoom,
  joinRoom,
  startMatch,
  declareStrike,
  getPlayerIdFromCard,
  findActivePlayer,
  type PlayerSession,
} from "./helpers.js";

test.describe("Browser E2E: Hidden Information Protection", () => {
  let player1: PlayerSession;
  let player2: PlayerSession;
  let player3: PlayerSession;

  test.afterEach(async () => {
    await player1?.context?.close();
    await player2?.context?.close();
    await player3?.context?.close();
  });

  test("Target and Bystander DOM and client storage leak NO attacker funding data during pending strike", async ({
    browser,
  }) => {
    // 1. Initialize 3 isolated browser contexts
    player1 = await createPlayer(browser, "Ari");
    player2 = await createPlayer(browser, "Bo");
    player3 = await createPlayer(browser, "Charlie");

    const roomCode = await createRoom(player1);
    await joinRoom(player2, roomCode);
    await joinRoom(player3, roomCode);

    // 3 players in lobby
    await expect(player1.page.locator(".roster-item")).toHaveCount(3);
    await expect(player2.page.locator(".roster-item")).toHaveCount(3);
    await expect(player3.page.locator(".roster-item")).toHaveCount(3);

    // Start match
    await startMatch(player1);
    await player1.page.waitForSelector(".screen--game");
    await player2.page.waitForSelector(".screen--game");
    await player3.page.waitForSelector(".screen--game");

    // Dynamically identify who has active turn, who is target, and who is bystander
    const { active: attacker, nonActive } = await findActivePlayer([player1, player2, player3]);
    const target = nonActive[0]!;
    const bystander = nonActive[1]!;

    const targetId = await getPlayerIdFromCard(attacker.page, target.name);

    // 2. Attacker commits a SECRET Bluff (0 Power) against Target
    await declareStrike(attacker.page, targetId, 0);

    // 3. Verify Attacker CAN see their own commitment
    await expect(attacker.page.locator(".turn-banner--threat")).toBeVisible();
    await expect(attacker.page.locator(".turn-banner--threat")).toContainText("BLUFF (0 Power)");

    // 4. Verify Target receives REACTION phase but ZERO funding information
    await expect(target.page.locator(".turn-banner--targeted")).toBeVisible();
    await expect(target.page.locator(".turn-banner__badge--danger")).toHaveText("UNDER ATTACK");

    // Inspect Target's complete DOM content
    const targetHtml = await target.page.content();
    expect(targetHtml).not.toContain("BLUFF (0 Power)");
    expect(targetHtml).not.toContain("GENUINE ATTACK (1 Power)");
    expect(targetHtml).not.toContain('"pendingFunding"');
    expect(targetHtml).not.toContain("pendingFunding");

    // Inspect Target's sessionStorage
    const targetStorage = await target.page.evaluate(() => JSON.stringify(sessionStorage));
    expect(targetStorage).not.toContain("pendingFunding");
    expect(targetStorage).not.toContain("funding");

    // 5. Verify Bystander observes clash without funding information
    await expect(
      bystander.page.locator(".turn-banner__badge:has-text('CLASH IN PROGRESS')"),
    ).toBeVisible();

    // Inspect Bystander's complete DOM content
    const bystanderHtml = await bystander.page.content();
    expect(bystanderHtml).not.toContain("BLUFF (0 Power)");
    expect(bystanderHtml).not.toContain("GENUINE ATTACK (1 Power)");
    expect(bystanderHtml).not.toContain('"pendingFunding"');
    expect(bystanderHtml).not.toContain("pendingFunding");

    // Inspect Bystander's sessionStorage
    const bystanderStorage = await bystander.page.evaluate(() => JSON.stringify(sessionStorage));
    expect(bystanderStorage).not.toContain("pendingFunding");
    expect(bystanderStorage).not.toContain("funding");
  });
});
