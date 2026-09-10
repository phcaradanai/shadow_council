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

test.describe("Browser E2E: Thai Localization & Language Switcher", () => {
  let host: PlayerSession;
  let guest: PlayerSession;

  test.afterEach(async () => {
    await host?.context?.close();
    await guest?.context?.close();
  });

  test("New visitor defaults to Thai, views localized Home and Rules modal", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    // Navigate with completely clean storage (no pre-set locale)
    await page.goto("/");
    await page.waitForSelector("#app");

    // Default html lang attribute must be Thai
    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang).toBe("th");

    // Header switcher shows Thai as active
    const thBtn = page.locator('.lang-btn[data-lang="th"]');
    await expect(thBtn).toBeVisible();
    await expect(thBtn).toHaveClass(/active/);

    // Home screen contains natural Thai copy
    await expect(page.locator(".app-title")).toHaveText("สภาเงา");
    await expect(page.locator(".home-card h2").first()).toHaveText("ก่อตั้งสภาเงา");
    await expect(page.locator('#form-create button[type="submit"]')).toHaveText("สร้างห้อง");
    await expect(page.locator(".home-card h2").nth(1)).toHaveText("เข้าร่วมสภาเงา");
    await expect(page.locator('#form-join button[type="submit"]')).toHaveText("เข้าร่วมห้อง");

    // Open and verify Thai Rules Modal
    const rulesBtn = page.locator("#btn-rules-open");
    await rulesBtn.click();
    const modal = page.locator("#rules-modal");
    await expect(modal).toBeVisible();
    await expect(page.locator("#rules-modal-title")).toHaveText("📜 สภาเงา — กติกาใน 60 วินาที");
    await expect(page.locator("#rules-got-it")).toHaveText("เข้าใจแล้ว เริ่มเล่นกันเลย");

    // Close modal
    await page.locator("#rules-got-it").click();
    await expect(modal).toBeHidden();

    await context.close();
  });

  test("Full Thai Gameplay Journey: Lobby, Strike Bluff, Challenge, Reveal, and Standings", async ({
    browser,
  }) => {
    // Both players start in Thai
    host = await createPlayer(browser, "สมชาย", "th");
    guest = await createPlayer(browser, "นก", "th");

    // Verify Lobby in Thai
    const roomCode = await createRoom(host);
    await expect(host.page.locator(".app-title")).toHaveText("ห้องล็อบบี้");
    await expect(host.page.locator(".room-code-label")).toContainText("รหัสห้อง:");
    await expect(host.page.locator("#btn-copy-code")).toContainText("คัดลอกรหัส");

    await joinRoom(guest, roomCode);

    // Verify Roster badges in Thai
    await expect(host.page.locator('.badge--self[data-badge="self"]')).toHaveText("คุณ");
    await expect(host.page.locator('.badge--host[data-badge="host"]')).toHaveText("หัวหน้าห้อง");
    await expect(host.page.locator('.badge--online[data-badge="online"]').first()).toHaveText(
      "ออนไลน์",
    );

    // Host starts match in Thai
    const startBtn = host.page.locator("#btn-start");
    await expect(startBtn).toContainText("เริ่มการประลอง");
    await startMatch(host);

    // Both enter game in Thai
    await expect(host.page.locator(".screen--game")).toBeVisible();
    await expect(guest.page.locator(".screen--game")).toBeVisible();

    // Verify Thai game header and stats
    await expect(host.page.locator(".meta-tag").first()).toContainText("ห้อง:");
    await expect(host.page.locator(".meta-tag").nth(1)).toContainText("รอบที่ 1");
    await expect(
      host.page.locator('.player-card--self .stat-row[data-stat="influence"] .stat-label'),
    ).toHaveText("อิทธิพล (การอยู่รอด):");
    await expect(
      host.page.locator('.player-card--self .stat-row[data-stat="power"] .stat-label'),
    ).toHaveText("พลัง (พลังงาน):");

    // Find active player
    const { active, nonActive } = await findActivePlayer([host, guest]);
    const target = nonActive[0]!;

    const targetId = await getPlayerIdFromCard(active.page, target.name);
    const activeId = await getPlayerIdFromCard(target.page, active.name);

    // Active player sees Thai turn banner
    await expect(active.page.locator(".turn-banner--your-turn .turn-banner__badge")).toHaveText(
      "ตาของคุณ",
    );
    await expect(active.page.locator("#btn-recover")).toContainText("ฟื้นพลัง");
    await expect(active.page.locator("#btn-strike")).toContainText("ประกาศโจมตี");

    // Attacker declares a Bluff (0 Power)
    await declareStrike(active.page, targetId, 0);

    // Attacker sees Thai threat commitment banner
    await expect(active.page.locator(".turn-banner--threat")).toContainText("บลัฟ (ใช้ 0 พลัง)");

    // Target sees Thai UNDER ATTACK banner and Thai reaction buttons
    await expect(target.page.locator(".turn-banner__badge--danger")).toHaveText("ถูกจู่โจม");
    await expect(target.page.locator('.reaction-btn[data-choice="guard"]')).toContainText(
      "ป้องกัน",
    );
    await expect(target.page.locator('.reaction-btn[data-choice="challenge"]')).toContainText(
      "ท้าพิสูจน์",
    );
    await expect(target.page.locator('.reaction-btn[data-choice="yield"]')).toContainText(
      "ยอมจำนน",
    );

    // Target reacts with Challenge ("ท้าพิสูจน์")
    await reactToStrike(target.page, "challenge");

    // Both players observe Bluff Caught reveal in Thai
    await expect(active.page.locator(".reveal-card__title")).toHaveText("🚨 จับบลัฟได้!");
    await expect(target.page.locator(".reveal-card__title")).toHaveText("🚨 จับบลัฟได้!");

    // Check Influence damage correctly resolved
    await expect(await getPlayerStat(active.page, activeId, "influence")).toBe(2);
    await expect(await getPlayerStat(target.page, targetId, "influence")).toBe(3);

    // Verify Thai Event Log (Chronicle)
    await expect(active.page.locator(".event-log__summary")).toContainText("บันทึกเหตุการณ์");
  });

  test("In-game Language Switcher: seamless toggle without match restart or state loss", async ({
    browser,
  }) => {
    host = await createPlayer(browser, "สมชาย", "th");
    guest = await createPlayer(browser, "นก", "th");

    const roomCode = await createRoom(host);
    await joinRoom(guest, roomCode);
    await startMatch(host);

    // Verify host starts in Thai
    await expect(host.page.locator("html")).toHaveAttribute("lang", "th");
    await expect(
      host.page.locator('.player-card--self .stat-row[data-stat="influence"] .stat-label'),
    ).toHaveText("อิทธิพล (การอยู่รอด):");

    // Switch host to English during active match
    await host.page.locator('.lang-btn[data-lang="en"]').click();

    // Verify instant re-render to English without navigation
    await expect(host.page.locator("html")).toHaveAttribute("lang", "en");
    await expect(host.page.locator('.lang-btn[data-lang="en"]')).toHaveClass(/active/);
    await expect(
      host.page.locator('.player-card--self .stat-row[data-stat="influence"] .stat-label'),
    ).toHaveText("Influence (Survival):");
    await expect(host.page.locator(".app-header #btn-rules-open")).toContainText("Rules");

    // Guest remains independently in Thai
    await expect(guest.page.locator("html")).toHaveAttribute("lang", "th");
    await expect(
      guest.page.locator('.player-card--self .stat-row[data-stat="influence"] .stat-label'),
    ).toHaveText("อิทธิพล (การอยู่รอด):");

    // Switch host back to Thai
    await host.page.locator('.lang-btn[data-lang="th"]').click();
    await expect(host.page.locator("html")).toHaveAttribute("lang", "th");
    await expect(
      host.page.locator('.player-card--self .stat-row[data-stat="influence"] .stat-label'),
    ).toHaveText("อิทธิพล (การอยู่รอด):");
  });

  test("Locale preference persists across page reloads", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Default visit (Thai)
    await page.goto("/");
    await page.waitForSelector("#app");
    await expect(page.locator("html")).toHaveAttribute("lang", "th");

    // Switch to English
    await page.locator('.lang-btn[data-lang="en"]').click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".home-card h2").first()).toHaveText("Create a Council");

    // Reload page
    await page.reload();
    await page.waitForSelector("#app");

    // Language must remain English after reload
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".home-card h2").first()).toHaveText("Create a Council");

    // Switch back to Thai
    await page.locator('.lang-btn[data-lang="th"]').click();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(page.locator(".home-card h2").first()).toHaveText("ก่อตั้งสภาเงา");

    // Reload page again
    await page.reload();
    await page.waitForSelector("#app");

    // Language must remain Thai after reload
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(page.locator(".home-card h2").first()).toHaveText("ก่อตั้งสภาเงา");

    await context.close();
  });
});
