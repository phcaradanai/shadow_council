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

  test("Target and Bystander DOM and client storage leak NO committed Force during pending strike", async ({
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

    // 2. Attacker commits a SECRET partial bluff: public Threat 2, private Force 1.
    await declareStrike(attacker.page, targetId, 1, 2);

    // 3. Verify attacker can see their own private commitment
    await expect(attacker.page.locator(".turn-banner--threat")).toBeVisible();

    // 4. Target receives only public Threat pressure; the VFX layer must not encode private Force.
    await expect(target.page.locator(".turn-banner--targeted")).toBeVisible();
    await expect(target.page.locator(".turn-banner__badge--danger")).toHaveText("UNDER ATTACK");
    await expect(target.page.locator(".vfx-threat-pressure strong")).toHaveText("2");
    await expect(target.page.locator(".game-vfx__attack-line--threat-2")).toHaveCount(1);
    const targetVfxHtml = await target.page.locator(".game-vfx-layer").innerHTML();
    expect(targetVfxHtml.toLowerCase()).not.toContain("force");

    // Inspect Target's complete DOM content
    const targetHtml = await target.page.content();
    expect(targetHtml).not.toContain('"pendingForce"');
    expect(targetHtml).not.toContain("pendingForce");
    expect(targetHtml).not.toContain('"pendingFunding"');
    expect(targetHtml).not.toContain("pendingFunding");

    // Inspect Target's sessionStorage
    const targetStorage = await target.page.evaluate(() => JSON.stringify(sessionStorage));
    expect(targetStorage).not.toContain("pendingForce");
    expect(targetStorage).not.toContain("pendingFunding");

    // 5. Bystander sees the same public Threat presentation and no private Force.
    await expect(
      bystander.page.locator(".turn-banner__badge:has-text('CLASH IN PROGRESS')"),
    ).toBeVisible();
    await expect(bystander.page.locator(".vfx-threat-pressure strong")).toHaveText("2");
    const bystanderVfxHtml = await bystander.page.locator(".game-vfx-layer").innerHTML();
    expect(bystanderVfxHtml.toLowerCase()).not.toContain("force");

    // Inspect Bystander's complete DOM content
    const bystanderHtml = await bystander.page.content();
    expect(bystanderHtml).not.toContain('"pendingForce"');
    expect(bystanderHtml).not.toContain("pendingForce");
    expect(bystanderHtml).not.toContain('"pendingFunding"');
    expect(bystanderHtml).not.toContain("pendingFunding");

    // Inspect Bystander's sessionStorage
    const bystanderStorage = await bystander.page.evaluate(() => JSON.stringify(sessionStorage));
    expect(bystanderStorage).not.toContain("pendingForce");
    expect(bystanderStorage).not.toContain("pendingFunding");
  });

  test("Opponent Power is strictly hidden from DOM, client storage, and target options", async ({
    browser,
  }) => {
    player1 = await createPlayer(browser, "Alice");
    player2 = await createPlayer(browser, "Bob");
    player3 = await createPlayer(browser, "Carol");

    const roomCode = await createRoom(player1);
    await joinRoom(player2, roomCode);
    await joinRoom(player3, roomCode);

    await startMatch(player1);
    await player1.page.waitForSelector(".screen--game");
    await player2.page.waitForSelector(".screen--game");
    await player3.page.waitForSelector(".screen--game");

    // Check Player 1's view:
    // 1. Player 1 can see own power with (Private) label
    const p1OwnCard = player1.page.locator(".player-card--self");
    await expect(p1OwnCard).toBeVisible();
    await expect(p1OwnCard.locator('.stat-row[data-stat="power"] .stat-num')).toContainText(
      "(2/3)",
    );
    await expect(p1OwnCard.locator('.stat-row[data-stat="power"] .stat-note')).toContainText(
      "(Private)",
    );

    // 2. Opponents' cards have hidden power indicator
    const opponentCards = player1.page.locator(".player-card:not(.player-card--self)");
    expect(await opponentCards.count()).toBe(2);

    for (let i = 0; i < 2; i++) {
      const oppCard = opponentCards.nth(i);
      const powerStat = oppCard.locator('.stat-row[data-stat="power"]');
      const hiddenValue = powerStat.locator(".stat-value--private");
      await expect(hiddenValue).toBeVisible();
      await expect(hiddenValue).toHaveAttribute("aria-label", "Opponent power is hidden");
      await expect(hiddenValue.locator(".power-hidden")).toHaveText("🔒 ?");
    }

    // 3. Find active player and verify Strike target options do not show opponent power
    const { active } = await findActivePlayer([player1, player2, player3]);
    const targetOptions = active.page.locator("#strike-target option:not([value=''])");
    const optionTexts = await targetOptions.allTextContents();
    expect(optionTexts.length).toBeGreaterThan(0);
    for (const text of optionTexts) {
      // Target option should have Influence (◆) but never Power (⚡)
      expect(text).toContain("◆");
      expect(text).not.toContain("⚡");
      expect(text).not.toMatch(/⚡\s*\d+/);
    }
  });
});
