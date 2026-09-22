import { describe, expect, it } from "vitest";
import { setLocale } from "../i18n/index.js";
import { formatReactionChoice } from "./EventLog.js";

describe("EventLog defense plan formatting", () => {
  it("renders composed DefensePlans instead of object coercion", () => {
    setLocale("en");

    expect(formatReactionChoice({ guard: 1, challenge: true })).toBe("Guard 1 + Challenge");
    expect(formatReactionChoice({ guard: 0, challenge: true })).toBe("Challenge");
    expect(formatReactionChoice({ guard: 2, challenge: false })).toBe("Guard 2");
    expect(formatReactionChoice({ guard: 0, challenge: false })).toBe("Yield");
    expect(formatReactionChoice({ guard: 1, challenge: true })).not.toContain("[object Object]");
  });
});
