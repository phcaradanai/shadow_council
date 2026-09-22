import { describe, expect, it } from "vitest";
import { setLocale } from "../i18n/index.js";
import { renderRevealPanel } from "./RevealPanel.js";

const players = [
  {
    playerId: "a",
    displayName: "Ari",
    influence: 3,
    power: 1,
    eliminated: false,
    connected: true,
  },
  {
    playerId: "b",
    displayName: "Bo",
    influence: 3,
    eliminated: false,
    connected: true,
  },
] as const;

describe("RevealPanel", () => {
  it("explains a triggered Bulwark instead of hiding the cause of mitigation", () => {
    setLocale("en");
    const html = renderRevealPanel(
      [
        {
          type: "ReactionCommitted",
          targetId: "b",
          choice: { guard: 1, challenge: false },
        },
        {
          type: "ActionRevealed",
          attackerId: "a",
          targetId: "b",
          threat: 2,
          force: 2,
          genuine: true,
          triggeredScheme: "bulwark",
        },
        {
          type: "AttackResolved",
          attackerId: "a",
          targetId: "b",
          reaction: { guard: 1, challenge: false },
          attackerPowerCost: 2,
          targetPowerCost: 1,
          attackerInfluenceLoss: 0,
          targetInfluenceLoss: 0,
          attackerInfluence: 3,
          targetInfluence: 3,
          damageAbsorbed: 2,
        },
      ],
      players,
    );

    expect(html).toContain("Scheme Triggered");
    expect(html).toContain("Bulwark");
    expect(html).toContain("absorbed 1 damage");
  });

  it("explains Ambush retaliation when a bluff is caught", () => {
    setLocale("en");
    const html = renderRevealPanel(
      [
        {
          type: "ReactionCommitted",
          targetId: "b",
          choice: { guard: 0, challenge: true },
        },
        {
          type: "ActionRevealed",
          attackerId: "a",
          targetId: "b",
          threat: 2,
          force: 0,
          genuine: false,
          triggeredScheme: "ambush",
        },
        {
          type: "AttackResolved",
          attackerId: "a",
          targetId: "b",
          reaction: { guard: 0, challenge: true },
          attackerPowerCost: 0,
          targetPowerCost: 1,
          attackerInfluenceLoss: 2,
          targetInfluenceLoss: 0,
          attackerInfluence: 1,
          targetInfluence: 3,
          ambushDamage: 1,
        },
      ],
      players,
    );

    expect(html).toContain("Ambush");
    expect(html).toContain("bonus damage");
  });
});
