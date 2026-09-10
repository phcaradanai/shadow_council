import { test, expect } from "@playwright/test";
import {
  createPlayer,
  createRoom,
  joinRoom,
  startMatch,
  declareStrike,
  reactToStrike,
  getPlayerStat,
  getPlayerIdFromCard,
  findActivePlayer,
  type PlayerSession,
} from "./helpers.js";

test.describe("Browser E2E: Real Gameplay Journeys", () => {
  let host: PlayerSession;
  let guest: PlayerSession;

  test.afterEach(async () => {
    await host?.context?.close();
    await guest?.context?.close();
  });

  test("Journey A: Room flow - Create, Join, and Start Match with isolated views", async ({
    browser,
  }) => {
    host = await createPlayer(browser, "Ari");
    guest = await createPlayer(browser, "Bo");

    const roomCode = await createRoom(host);
    await joinRoom(guest, roomCode);

    // Verify both see the 2 connected members in lobby
    await expect(host.page.locator(".roster-item")).toHaveCount(2);
    await expect(guest.page.locator(".roster-item")).toHaveCount(2);
    await expect(host.page.locator(".badge--self")).toHaveText("YOU");
    await expect(guest.page.locator(".badge--self")).toHaveText("YOU");

    // Host starts match
    await startMatch(host);

    // Both should enter the game screen
    await expect(host.page.locator(".screen--game")).toBeVisible();
    await expect(guest.page.locator(".screen--game")).toBeVisible();

    // Verify header tags and round
    await expect(host.page.locator(".meta-tag:has-text('Round 1')")).toBeVisible();
    await expect(guest.page.locator(".meta-tag:has-text('Round 1')")).toBeVisible();

    // Verify self card identification
    await expect(host.page.locator(".player-card--self .player-card__name")).toHaveText("Ari");
    await expect(guest.page.locator(".player-card--self .player-card__name")).toHaveText("Bo");
  });

  test("Journey B & C: Combat Resolution - Bluff Caught & Genuine Guard", async ({ browser }) => {
    host = await createPlayer(browser, "Ari");
    guest = await createPlayer(browser, "Bo");

    const roomCode = await createRoom(host);
    await joinRoom(guest, roomCode);
    await startMatch(host);
    await host.page.waitForSelector(".screen--game");
    await guest.page.waitForSelector(".screen--game");

    // Dynamically identify initial active player (randomized seat 0)
    let { active, nonActive } = await findActivePlayer([host, guest]);
    let target = nonActive[0]!;

    let targetId = await getPlayerIdFromCard(active.page, target.name);
    let activeId = await getPlayerIdFromCard(target.page, active.name);

    // --- Journey B: Bluff Caught ---
    // Active player declares Bluff (0 Power) on target
    await declareStrike(active.page, targetId, 0);

    // Target receives UNDER ATTACK banner and reaction options
    await expect(target.page.locator(".turn-banner__badge--danger")).toHaveText("UNDER ATTACK");
    await expect(target.page.locator(".reaction-panel")).toBeVisible();

    // Target challenges the strike
    await reactToStrike(target.page, "challenge");

    // Both observe Bluff Caught outcome
    await expect(active.page.locator(".reveal-card__title")).toHaveText("🚨 BLUFF CAUGHT!");
    await expect(target.page.locator(".reveal-card__title")).toHaveText("🚨 BLUFF CAUGHT!");

    // Attacker lost 1 Influence (now 2), Target kept 3
    await expect(await getPlayerStat(active.page, activeId, "influence")).toBe(2);
    await expect(await getPlayerStat(target.page, targetId, "influence")).toBe(3);

    // --- Journey C: Genuine Strike & Guard ---
    // Next turn advances to the other player
    ({ active, nonActive } = await findActivePlayer([host, guest]));
    target = nonActive[0]!;
    targetId = await getPlayerIdFromCard(active.page, target.name);
    activeId = await getPlayerIdFromCard(target.page, active.name);

    // Active player declares Genuine Attack (1 Power) on target
    await declareStrike(active.page, targetId, 1);

    // Target receives UNDER ATTACK banner
    await expect(target.page.locator(".turn-banner__badge--danger")).toHaveText("UNDER ATTACK");

    // Target guards (spends 1 Power)
    await reactToStrike(target.page, "guard");

    // Both observe Attack Blocked outcome
    await expect(active.page.locator(".reveal-card__title")).toHaveText("🛡️ ATTACK BLOCKED!");
    await expect(target.page.locator(".reveal-card__title")).toHaveText("🛡️ ATTACK BLOCKED!");

    // Both spent 1 Power (each down to 1), neither lost influence
    await expect(await getPlayerStat(active.page, activeId, "power")).toBe(1);
    await expect(await getPlayerStat(target.page, targetId, "power")).toBe(1);
  });

  test("Journey D & E: Match Completion to Winner & Rematch Flow", async ({ browser }) => {
    host = await createPlayer(browser, "Ari");
    guest = await createPlayer(browser, "Bo");

    const roomCode = await createRoom(host);
    await joinRoom(guest, roomCode);
    await startMatch(host);
    await host.page.waitForSelector(".screen--game");
    await guest.page.waitForSelector(".screen--game");

    // Pick initial active player as designated loser
    const initial = await findActivePlayer([host, guest]);
    const designatedLoser = initial.active;
    const designatedWinner = initial.nonActive[0]!;

    const winnerTargetId = await getPlayerIdFromCard(designatedLoser.page, designatedWinner.name);
    const loserTargetId = await getPlayerIdFromCard(designatedWinner.page, designatedLoser.name);

    // Turn 1 (Loser): Loser bluffs, Winner challenges -> Loser drops to 2 Influence
    await declareStrike(designatedLoser.page, winnerTargetId, 0);
    await reactToStrike(designatedWinner.page, "challenge");
    await expect(designatedLoser.page.locator(".reveal-card__title")).toHaveText(
      "🚨 BLUFF CAUGHT!",
    );

    // Turn 2 (Winner): Winner attacks genuine (1 Power), Loser yields -> Loser drops to 1 Influence
    await findActivePlayer([designatedWinner]);
    await declareStrike(designatedWinner.page, loserTargetId, 1);
    await reactToStrike(designatedLoser.page, "yield");

    // Turn 3 (Loser): Loser bluffs, Winner challenges -> Loser drops to 0 Influence (Eliminated!)
    await findActivePlayer([designatedLoser]);
    await declareStrike(designatedLoser.page, winnerTargetId, 0);
    await reactToStrike(designatedWinner.page, "challenge");

    // --- Journey D: Result Screen & Standings ---
    // Winner sees VICTORY IS YOURS!
    await expect(designatedWinner.page.locator(".screen--result")).toBeVisible();
    await expect(designatedWinner.page.locator(".result-headline")).toHaveText("VICTORY IS YOURS!");
    await expect(designatedWinner.page.locator(".result-row--winner")).toContainText(
      designatedWinner.name,
    );
    await expect(designatedWinner.page.locator(".result-row--eliminated")).toContainText(
      designatedLoser.name,
    );

    // Loser sees Result Screen with Winner's name
    await expect(designatedLoser.page.locator(".screen--result")).toBeVisible();
    await expect(designatedLoser.page.locator(".result-headline")).toContainText(
      `${designatedWinner.name} PREVAILS!`,
    );

    // Verify gameplay action controls are gone on both screens
    await expect(designatedWinner.page.locator("#strike-form")).toHaveCount(0);
    await expect(designatedLoser.page.locator("#strike-form")).toHaveCount(0);

    // --- Journey E: Rematch Flow ---
    // Room Host clicks rematch (host.page)
    const rematchBtn = host.page.locator("#btn-rematch");
    await expect(rematchBtn).toBeVisible();
    await rematchBtn.click();

    // Both players return to Lobby screen with membership intact
    await expect(host.page.locator(".screen--lobby")).toBeVisible();
    await expect(guest.page.locator(".screen--lobby")).toBeVisible();
    await expect(host.page.locator(".roster-item")).toHaveCount(2);
    await expect(guest.page.locator(".roster-item")).toHaveCount(2);

    // Host starts match again
    await startMatch(host);

    // Both enter a new game with reset stats
    await expect(host.page.locator(".screen--game")).toBeVisible();
    await expect(guest.page.locator(".screen--game")).toBeVisible();

    const hostId = await getPlayerIdFromCard(guest.page, "Ari");
    const guestId = await getPlayerIdFromCard(host.page, "Bo");
    await expect(await getPlayerStat(host.page, hostId, "influence")).toBe(3);
    await expect(await getPlayerStat(guest.page, guestId, "influence")).toBe(3);
  });

  test("Journey F: Mid-game Reconnection & State Restoration", async ({ browser }) => {
    host = await createPlayer(browser, "Ari");
    guest = await createPlayer(browser, "Bo");

    const roomCode = await createRoom(host);
    await joinRoom(guest, roomCode);
    await startMatch(host);
    await host.page.waitForSelector(".screen--game");
    await guest.page.waitForSelector(".screen--game");

    const { active, nonActive } = await findActivePlayer([host, guest]);
    const target = nonActive[0]!;
    const targetId = await getPlayerIdFromCard(active.page, target.name);
    const activeId = await getPlayerIdFromCard(target.page, active.name);

    // Active player declares Bluff on target
    await declareStrike(active.page, targetId, 0);

    // Target is in REACTION phase ("UNDER ATTACK")
    await expect(target.page.locator(".turn-banner__badge--danger")).toHaveText("UNDER ATTACK");

    // Target refreshes the page mid-reaction!
    await target.page.reload();

    // Verify Target reconnects and restores the exact state
    await expect(target.page.locator(".screen--game")).toBeVisible();
    await expect(target.page.locator(".turn-banner__badge--danger")).toHaveText("UNDER ATTACK");
    await expect(target.page.locator(".reaction-panel")).toBeVisible();
    await expect(target.page.locator(".player-card--self .player-card__name")).toHaveText(
      target.name,
    );

    // Target can still execute reaction after reconnecting
    await reactToStrike(target.page, "challenge");

    // Both observe Bluff Caught outcome
    await expect(active.page.locator(".reveal-card__title")).toHaveText("🚨 BLUFF CAUGHT!");
    await expect(target.page.locator(".reveal-card__title")).toHaveText("🚨 BLUFF CAUGHT!");
    await expect(await getPlayerStat(active.page, activeId, "influence")).toBe(2);
  });
});
