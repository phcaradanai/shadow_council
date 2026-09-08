import type { RandomProvider } from "./random-provider.js";
import type { RandomState } from "../model.js";

export const SEEDED_ALGORITHM_VERSION = "xorshift32-v1";

const normalizeSeed = (seed: string): string => seed.trim().normalize("NFKC");

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash === 0 ? 0x6d2b79f5 : hash;
};

const nextUint32 = (value: number): number => {
  let next = value >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
};

const provider: RandomProvider = {
  algorithmVersion: SEEDED_ALGORITHM_VERSION,
  initialize(seed: string): RandomState {
    const normalized = normalizeSeed(seed);
    return {
      algorithmVersion: SEEDED_ALGORITHM_VERSION,
      seed: normalized,
      cursor: 0,
      value: hashSeed(normalized),
    };
  },
  nextInt(state: RandomState, exclusiveMax: number) {
    if (!Number.isInteger(exclusiveMax) || exclusiveMax <= 0) {
      throw new RangeError("exclusiveMax must be a positive integer");
    }
    if (state.algorithmVersion !== SEEDED_ALGORITHM_VERSION) {
      throw new RangeError("unsupported random algorithm version");
    }

    const range = 0x1_0000_0000;
    const limit = range - (range % exclusiveMax);
    let value = nextUint32(state.value);
    while (value >= limit) {
      value = nextUint32(value);
    }
    return {
      value: value % exclusiveMax,
      nextState: {
        ...state,
        cursor: state.cursor + 1,
        value,
      },
    };
  },
};

export const seededRandomProvider = (): RandomProvider => provider;

export const seededRandom = provider;
