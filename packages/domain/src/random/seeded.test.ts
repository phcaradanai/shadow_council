import { describe, expect, it } from "vitest";
import { seededRandom, SEEDED_ALGORITHM_VERSION } from "./seeded.js";

describe("seeded random provider", () => {
  it("matches the pinned xorshift32-v1 golden vector", () => {
    let state = seededRandom.initialize("golden");
    const draws: number[] = [];
    for (const bound of [2, 3, 10, 7]) {
      const draw = seededRandom.nextInt(state, bound);
      draws.push(draw.value);
      state = draw.nextState;
    }
    expect(draws).toEqual([0, 1, 3, 1]);
    expect(state).toEqual({
      algorithmVersion: SEEDED_ALGORITHM_VERSION,
      seed: "golden",
      cursor: 4,
      value: 766497803,
    });
  });

  it("does not mutate the input random state", () => {
    const state = seededRandom.initialize("immutable");
    const draw = seededRandom.nextInt(state, 5);
    expect(state.cursor).toBe(0);
    expect(draw.nextState.cursor).toBe(1);
  });
});
