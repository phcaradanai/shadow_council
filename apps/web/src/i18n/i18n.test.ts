import { describe, expect, it, beforeEach } from "vitest";
import { en } from "./locales/en.js";
import { th } from "./locales/th.js";
import {
  t,
  getLocale,
  setLocale,
  subscribeLocale,
  getLocalizedErrorMessage,
  DEFAULT_LOCALE,
} from "./index.js";

describe("i18n Localization Subsystem", () => {
  beforeEach(() => {
    setLocale(DEFAULT_LOCALE);
  });

  it("maintains 100% exact key parity between English and Thai dictionaries", () => {
    const enKeys = Object.keys(en).sort();
    const thKeys = Object.keys(th).sort();

    expect(enKeys).toEqual(thKeys);
    expect(enKeys.length).toBeGreaterThan(60);

    for (const key of enKeys) {
      const enVal = en[key as keyof typeof en];
      const thVal = th[key as keyof typeof th];
      expect(typeof enVal).toBe("string");
      expect(typeof thVal).toBe("string");
      expect(enVal.trim().length).toBeGreaterThan(0);
      expect(thVal.trim().length).toBeGreaterThan(0);
    }
  });

  it("defaults to Thai locale", () => {
    expect(DEFAULT_LOCALE).toBe("th");
    expect(getLocale()).toBe("th");
    expect(t("common.title")).toBe("สภาเงา");
  });

  it("translates English when locale is switched", () => {
    setLocale("en");
    expect(getLocale()).toBe("en");
    expect(t("common.title")).toBe("SHADOW COUNCIL");
    expect(t("common.you")).toBe("YOU");

    setLocale("th");
    expect(getLocale()).toBe("th");
    expect(t("common.title")).toBe("สภาเงา");
    expect(t("common.you")).toBe("คุณ");
  });

  it("interpolates parameters accurately in both languages", () => {
    setLocale("en");
    expect(t("lobby.rosterTitle", { count: 3 })).toBe("Connected Members (3 / 6)");
    expect(t("game.turnWaitingFor", { player: "Corvus" })).toBe("Waiting for Corvus...");

    setLocale("th");
    expect(t("lobby.rosterTitle", { count: 3 })).toBe("สมาชิกที่เชื่อมต่อ (3 / 6)");
    expect(t("game.turnWaitingFor", { player: "Corvus" })).toBe("กำลังรอ Corvus...");
  });

  it("notifies subscribers upon locale changes", () => {
    let notifiedLocale = "";
    const unsubscribe = subscribeLocale((loc) => {
      notifiedLocale = loc;
    });

    setLocale("en");
    expect(notifiedLocale).toBe("en");

    setLocale("th");
    expect(notifiedLocale).toBe("th");

    unsubscribe();
    setLocale("en");
    expect(notifiedLocale).toBe("th"); // Did not fire after unsubscribe
  });

  it("maps known API error codes to localized strings", () => {
    setLocale("th");
    expect(getLocalizedErrorMessage("RoomNotFound")).toBe("ไม่พบห้องประลองนี้");
    expect(getLocalizedErrorMessage("NotHost")).toBe("เฉพาะหัวหน้าห้องเท่านั้นที่ทำรายการนี้ได้");

    setLocale("en");
    expect(getLocalizedErrorMessage("RoomNotFound")).toBe("Room not found.");
    expect(getLocalizedErrorMessage("NotHost")).toBe("Only the room host can perform this action.");

    // Unknown error falls back safely
    expect(getLocalizedErrorMessage("UnknownErrorCode")).toBe(
      "Something went wrong. Please try again.",
    );
    setLocale("th");
    expect(getLocalizedErrorMessage("UnknownErrorCode")).toBe(
      "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    );
  });

  it("handles unknown keys gracefully without throwing", () => {
    // @ts-expect-error test runtime behavior for unknown keys
    const result = t("non.existent.key");
    expect(result).toBe("non.existent.key");
  });
});
